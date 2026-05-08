import { randomUUID } from "node:crypto";

import type { RelayConnectLogEntry } from "@bitmacro/relay-connect";

import { pushLokiStructured } from "@/lib/observability/loki-http-push";
import { sanitizeTelemetryContext } from "@/lib/observability/sanitize-log-context";

const SERVICE =
  process.env.BITMACRO_LOG_DAEMON_SERVICE?.trim() || "bitmacro-signer-daemon";

function coerceLevel(l: RelayConnectLogEntry["level"]) {
  if (l === "error" || l === "warn" || l === "debug") return l;
  return "info" as const;
}

function journeyFromContext(ctx: Record<string, unknown> | undefined): string {
  const id = ctx?.identityId;
  if (typeof id === "string" && id.length >= 8) return id.slice(0, 8);
  return randomUUID().slice(0, 8);
}

/**
 * Forward relay-connect daemon logs to Loki (non-blocking).
 * Sensitive fields stripped via {@link sanitizeTelemetryContext}.
 */
export function enqueueDaemonRelayConnectLoki(entry: RelayConnectLogEntry): void {
  if (!process.env.LOKI_HOST?.trim()) return;

  const ctxRaw = entry.context as Record<string, unknown> | undefined;
  const safeCtx = sanitizeTelemetryContext(ctxRaw);
  const journey_id = journeyFromContext(safeCtx);

  void pushLokiStructured(
    coerceLevel(entry.level),
    {
      service: SERVICE,
      ...(safeCtx ?? {}),
      component:
        typeof safeCtx?.component === "string"
          ? safeCtx.component
          : "relay-connect",
      event: "relay_connect_log",
      journey_id,
      request_id: randomUUID(),
      message: entry.message,
      tsRelayConnect: entry.timestamp,
    },
    { streamLabels: { subsystem: "signer-daemon", source: "relay-connect-sink" } },
  ).catch(() => {
    /* Loki unreachable — stdout already emitted by sink */
  });
}

function journeyFromIdentityId(identityId?: string): string {
  if (typeof identityId === "string" && identityId.length >= 8) {
    return identityId.slice(0, 8);
  }
  return randomUUID().slice(0, 8);
}

/** Internal HTTP (unlock, refresh) — same Loki stream as daemon, separate `source` label. */
export function enqueueDaemonInternalHttpLoki(
  level: "info" | "warn" | "error",
  event: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  if (!process.env.LOKI_HOST?.trim()) return;
  const raw = context ?? {};
  const safe = sanitizeTelemetryContext(raw) ?? {};
  const id = typeof raw.identityId === "string" ? raw.identityId : undefined;
  void pushLokiStructured(
    level,
    {
      service: SERVICE,
      ...safe,
      component: "daemon-internal-http",
      event,
      journey_id: journeyFromIdentityId(id),
      request_id: randomUUID(),
      message,
    },
    { streamLabels: { subsystem: "signer-daemon", source: "internal-http" } },
  ).catch(() => {
    /* optional Loki */
  });
}
