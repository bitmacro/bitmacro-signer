/**
 * Standalone bunker process (Server / Docker). NIP-46 via HTTP interno (signer-web → daemon).
 * Arranca a frio: sem DAEMON_VAULT_PASSPHRASE; nsec entra só por POST /internal/unlock.
 */

import type http from "node:http";

import { setRelayConnectLogSink } from "@bitmacro/relay-connect";

import { stopAllBunkers } from "@/lib/bunker";
import { getRelayUrlServer } from "@/lib/relay/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { startInternalHttpServer } from "./internal-http";

function log(
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) {
  const line = `[signer-daemon] ${level.toUpperCase()} ${message}${extra ? ` ${JSON.stringify(extra)}` : ""}`;
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function envPort(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  if (v && /^\d+$/.test(v)) {
    const n = Number.parseInt(v, 10);
    if (n > 0 && n < 65536) return n;
  }
  return fallback;
}

let httpServer: http.Server | null = null;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", `shutdown (${signal}) — stopping bunkers`);
  try {
    await stopAllBunkers();
  } catch (e) {
    log("warn", "stopAllBunkers", {
      err: e instanceof Error ? e.message : String(e),
    });
  }
  if (httpServer) {
    await new Promise<void>((resolve) => {
      httpServer!.close(() => resolve());
    });
    httpServer = null;
  }
  process.exit(0);
}

function main(): void {
  /** Sem isto, `relayConnectLog` no nip46-loop não escreve lado algum — docker logs ficavam mudos. */
  setRelayConnectLogSink(
    (entry) => {
      const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
      const line = `[signer-daemon] ${entry.level.toUpperCase()} [relay-connect] ${entry.message}${ctx}`;
      if (entry.level === "error") {
        console.error(line);
      } else if (entry.level === "warn") {
        console.warn(line);
      } else {
        console.log(line);
      }
    },
    { minLevel: "info" },
  );

  const token = process.env.DAEMON_INTERNAL_TOKEN?.trim();
  if (!token) {
    log("error", "DAEMON_INTERNAL_TOKEN is required");
    process.exit(1);
  }

  try {
    createServiceRoleClient();
  } catch (e) {
    log("error", "Supabase service role unavailable", {
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

  const port = envPort("DAEMON_INTERNAL_PORT", 47_777);

  httpServer = startInternalHttpServer({
    port,
    token,
    log,
  });

  log("info", "daemon starting (cold — unlock via signer-web POST /internal/unlock)", {
    internalPort: port,
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

main();
