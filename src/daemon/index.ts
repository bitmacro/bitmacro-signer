/**
 * Standalone bunker process (Server / Docker). Runs the NIP-46 loop for configured identities.
 * Does not use Next.js — import graph must stay free of `next/*`.
 */

import { startBunker, stopBunker, isRunning } from "@/lib/bunker";
import { getRelayUrlServer } from "@/lib/relay/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { VaultDecryptError, decryptNsec } from "@/lib/vault";

function log(level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) {
  const line = `[signer-daemon] ${level.toUpperCase()} ${message}${extra ? ` ${JSON.stringify(extra)}` : ""}`;
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function parseIdentityIds(): string[] {
  const raw = process.env.DAEMON_IDENTITY_IDS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  if (v && /^\d+$/.test(v)) {
    return Math.max(1000, Number.parseInt(v, 10));
  }
  return fallback;
}

const passphrase = process.env.DAEMON_VAULT_PASSPHRASE?.trim() ?? "";
const healthMs = envInt("DAEMON_HEALTHCHECK_INTERVAL_MS", 30_000);
const vaultRetryMs = envInt("DAEMON_VAULT_RETRY_INTERVAL_MS", 60_000);

const identityIds = parseIdentityIds();
const passphraseDecryptFailed = new Set<string>();
const noVaultNotified = new Set<string>();

let shuttingDown = false;

async function tryStartIdentity(identityId: string): Promise<void> {
  if (shuttingDown) return;
  if (isRunning(identityId)) return;
  if (passphraseDecryptFailed.has(identityId)) return;

  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    log("error", "Supabase service role unavailable", {
      err: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  const { data: vault, error } = await supabase
    .from("signer_vaults")
    .select("blob, salt, iv")
    .eq("identity_id", identityId)
    .maybeSingle();

  if (error) {
    log("error", "vault query failed", { identityId, err: error.message });
    return;
  }

  if (!vault?.blob || !vault?.salt || !vault?.iv) {
    if (!noVaultNotified.has(identityId)) {
      noVaultNotified.add(identityId);
      log(
        "info",
        "waiting for vault row — cria no onboarding ou POST /api/vault; a retentar em background",
        { identityId },
      );
    }
    return;
  }

  if (!passphrase) {
    log(
      "warn",
      "vault exists but DAEMON_VAULT_PASSPHRASE is unset — set passphrase (same as cofre) to start bunker",
      { identityId },
    );
    return;
  }

  let nsec: string;
  try {
    nsec = await decryptNsec(
      { blob: vault.blob, salt: vault.salt, iv: vault.iv },
      passphrase,
    );
  } catch (e) {
    if (e instanceof VaultDecryptError) {
      log("error", "passphrase did not decrypt vault — fix DAEMON_VAULT_PASSPHRASE", {
        identityId,
      });
      passphraseDecryptFailed.add(identityId);
    } else {
      log("error", "decrypt failed", {
        identityId,
        err: e instanceof Error ? e.message : String(e),
      });
    }
    return;
  }

  try {
    await startBunker(identityId, nsec);
    log("info", "bunker started", { identityId });
  } catch (e) {
    log("error", "startBunker failed", {
      identityId,
      err: e instanceof Error ? e.message : String(e),
    });
  } finally {
    nsec = "";
  }
}

async function tryStartAll(): Promise<void> {
  if (shuttingDown) return;
  for (const id of identityIds) {
    try {
      await tryStartIdentity(id);
    } catch (e) {
      log("error", "tryStartIdentity unexpected", {
        identityId: id,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

function healthLog(): void {
  if (shuttingDown) return;
  const status = identityIds.map((id) => ({
    identity_id: id,
    running: isRunning(id),
  }));
  log("info", "healthcheck", { identities: status });
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", `shutdown (${signal}) — stopping bunkers`);
  for (const id of identityIds) {
    try {
      await stopBunker(id);
    } catch (e) {
      log("warn", "stopBunker during shutdown", {
        identityId: id,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }
  process.exit(0);
}

function main(): void {
  if (identityIds.length === 0) {
    log("error", "DAEMON_IDENTITY_IDS is empty or missing — set comma-separated UUIDs");
    process.exit(1);
  }

  try {
    createServiceRoleClient();
  } catch (e) {
    log("error", "missing Supabase env for service role", {
      err: e instanceof Error ? e.message : String(e),
    });
    process.exit(1);
  }

  try {
    getRelayUrlServer();
  } catch {
    log(
      "error",
      "RELAY_URL or NEXT_PUBLIC_RELAY_URL is required for the bunker relay connection",
    );
    process.exit(1);
  }

  log("info", "daemon starting", {
    identities: identityIds.length,
    healthMs,
    vaultRetryMs,
    hasPassphrase: Boolean(passphrase),
  });

  void tryStartAll();

  setInterval(() => {
    void tryStartAll();
  }, vaultRetryMs);

  setInterval(healthLog, healthMs);

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

main();
