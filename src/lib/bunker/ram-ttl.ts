/**
 * How long decrypted key material may stay in bunker RAM.
 *
 * Unset `BUNKER_SESSION_RAM_TTL_MS`: stay until the later of 24h after unlock
 * and the latest unexpired client session.
 * Set `BUNKER_SESSION_RAM_TTL_MS`: hard ceiling from unlock. A longer session
 * cannot extend past it.
 *
 * Node clamps `setTimeout` above {@link RAM_TIMER_MAX_CHUNK_MS} (2^31 − 1).
 * Thirty days is 2_592_000_000 ms, so the loop wakes in short chunks and
 * recomputes. Callers must schedule `nextDelayMs`, never the raw stop time.
 */

/** Node `TIMEOUT_MAX` (2^31 − 1). Longer delays are truncated. */
export const RAM_TIMER_MAX_CHUNK_MS = 2_147_483_647;

/** 30 days. Above {@link RAM_TIMER_MAX_CHUNK_MS}; must not be passed to `setTimeout`. */
export const RAM_TTL_THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Upper bound between DB re-reads while the bunker is up. */
export const RAM_TTL_RECHECK_MS = 60 * 60 * 1000;

/** Residence after unlock when the operator set no ceiling and no session runs longer. */
export const DEFAULT_BUNKER_RAM_TTL_MS = 24 * 60 * 60 * 1000;

export type RamTtlReason = "operator_cap" | "idle_floor" | "session_expires_at";

export type RamTtlDecision = {
  stopAtMs: number;
  reason: RamTtlReason;
  latestSessionExpiresAtMs: number | null;
  openSessionCount: number;
  operatorCapMs: number | null;
  remainingMs: number;
  /** 0 when {@link expired} is true. Otherwise in `1 .. RAM_TIMER_MAX_CHUNK_MS`. */
  nextDelayMs: number;
  expired: boolean;
};

/** Digit string → ms. Empty or non-digits → no operator ceiling. `0` is a real ceiling. */
export function parseOperatorRamTtlMs(raw: string | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function decideBunkerRamStop(input: {
  nowMs: number;
  startedAtMs: number;
  operatorCapMs: number | null;
  openSessionExpiresAtMs: number[];
  recheckMs?: number;
  maxChunkMs?: number;
}): RamTtlDecision {
  const finite = input.openSessionExpiresAtMs.filter((n) => Number.isFinite(n));
  const latestSessionExpiresAtMs =
    finite.length > 0 ? Math.max(...finite) : null;

  const idleMs = input.operatorCapMs ?? DEFAULT_BUNKER_RAM_TTL_MS;
  const idleUntilMs = input.startedAtMs + idleMs;

  let stopAtMs = idleUntilMs;
  let reason: RamTtlReason =
    input.operatorCapMs != null ? "operator_cap" : "idle_floor";

  if (
    input.operatorCapMs == null &&
    latestSessionExpiresAtMs != null &&
    latestSessionExpiresAtMs > stopAtMs
  ) {
    stopAtMs = latestSessionExpiresAtMs;
    reason = "session_expires_at";
  }

  const remainingMs = stopAtMs - input.nowMs;
  const expired = remainingMs <= 0;
  const recheck = input.recheckMs ?? RAM_TTL_RECHECK_MS;
  const maxChunk = input.maxChunkMs ?? RAM_TIMER_MAX_CHUNK_MS;
  const nextDelayMs = expired
    ? 0
    : Math.max(1, Math.floor(Math.min(remainingMs, recheck, maxChunk)));

  return {
    stopAtMs,
    reason,
    latestSessionExpiresAtMs,
    openSessionCount: finite.length,
    operatorCapMs: input.operatorCapMs,
    remainingMs,
    nextDelayMs,
    expired,
  };
}
