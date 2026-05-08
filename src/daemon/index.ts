/**
 * Standalone bunker process (Server / Docker). NIP-46 via internal HTTP (signer-web → daemon).
 * Cold start: no DAEMON_VAULT_PASSPHRASE; nsec is supplied only via POST /internal/unlock.
 */

import type http from "node:http";

import {
  type RelayConnectLogLevel,
  setRelayConnectLogSink,
} from "@bitmacro/relay-connect";

import {
  enqueueDaemonInternalHttpLoki,
  enqueueDaemonRelayConnectLoki,
} from "@/daemon/loki-forward";
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

function relayConnectMinLevel(): RelayConnectLogLevel {
  const v = process.env.RELAY_CONNECT_LOG_MIN_LEVEL?.trim().toLowerCase();
  if (v === "debug" || v === "info" || v === "warn" || v === "error") return v;
  /* Default noisy for bunker/NIP-46 troubleshooting; tighten with RELAY_CONNECT_LOG_MIN_LEVEL=info */
  return "debug";
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
  /** Without this, `relayConnectLog` in nip46-loop writes nowhere — Docker logs would stay silent. */
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
      enqueueDaemonRelayConnectLoki(entry);
    },
    { minLevel: relayConnectMinLevel() },
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
    const relayUrl = getRelayUrlServer();
    log("info", "daemon bunker default RELAY_URL (sessions may add extras)", {
      relayUrl,
    });
    enqueueDaemonInternalHttpLoki(
      "info",
      "daemon_boot_relay_env",
      "daemon cold start — RELAY_URL/NEXT_PUBLIC_RELAY_URL resolved for nip46-loop default relay",
      { relayUrl, relayConnectLogMinLevel: relayConnectMinLevel() },
    );
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
    lokiPushRelayConnectSink: Boolean(process.env.LOKI_HOST?.trim()),
    relayConnectLogMinLevel: relayConnectMinLevel(),
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

main();
