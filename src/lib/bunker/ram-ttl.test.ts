import { describe, expect, it } from "vitest";

import {
  decideBunkerRamStop,
  DEFAULT_BUNKER_RAM_TTL_MS,
  parseOperatorRamTtlMs,
  RAM_TIMER_MAX_CHUNK_MS,
  RAM_TTL_RECHECK_MS,
  RAM_TTL_THIRTY_DAYS_MS,
} from "./ram-ttl";

const H = 60 * 60 * 1000;
const started = 1_700_000_000_000;

describe("parseOperatorRamTtlMs", () => {
  it("treats empty and non-digits as no ceiling", () => {
    expect(parseOperatorRamTtlMs(undefined)).toBeNull();
    expect(parseOperatorRamTtlMs("")).toBeNull();
    expect(parseOperatorRamTtlMs("86400000.5")).toBeNull();
  });

  it("parses a digit ceiling, including zero", () => {
    expect(parseOperatorRamTtlMs("86400000")).toBe(86_400_000);
    expect(parseOperatorRamTtlMs("0")).toBe(0);
  });
});

describe("decideBunkerRamStop", () => {
  it("stops 24h after unlock when nothing is authorized", () => {
    const d = decideBunkerRamStop({
      nowMs: started,
      startedAtMs: started,
      operatorCapMs: null,
      openSessionExpiresAtMs: [],
    });
    expect(d.reason).toBe("idle_floor");
    expect(d.stopAtMs).toBe(started + DEFAULT_BUNKER_RAM_TTL_MS);
    expect(d.nextDelayMs).toBe(RAM_TTL_RECHECK_MS);
  });

  it("keeps a 30-day session and never hands that delay to setTimeout", () => {
    expect(RAM_TTL_THIRTY_DAYS_MS).toBe(2_592_000_000);
    expect(RAM_TTL_THIRTY_DAYS_MS).toBeGreaterThan(RAM_TIMER_MAX_CHUNK_MS);

    const sessionEnd = started + RAM_TTL_THIRTY_DAYS_MS;
    let now = started;
    let steps = 0;
    while (now < sessionEnd) {
      const d = decideBunkerRamStop({
        nowMs: now,
        startedAtMs: started,
        operatorCapMs: null,
        openSessionExpiresAtMs: [sessionEnd],
      });
      expect(d.expired).toBe(false);
      expect(d.reason).toBe("session_expires_at");
      expect(d.stopAtMs).toBe(sessionEnd);
      expect(d.nextDelayMs).toBeGreaterThan(0);
      expect(d.nextDelayMs).toBeLessThanOrEqual(RAM_TIMER_MAX_CHUNK_MS);
      expect(d.nextDelayMs).toBeLessThan(RAM_TTL_THIRTY_DAYS_MS);
      now += d.nextDelayMs;
      steps += 1;
    }
    expect(steps).toBeGreaterThan(1);
    expect(now).toBe(sessionEnd);
    const done = decideBunkerRamStop({
      nowMs: now,
      startedAtMs: started,
      operatorCapMs: null,
      openSessionExpiresAtMs: [sessionEnd],
    });
    expect(done.expired).toBe(true);
    expect(done.nextDelayMs).toBe(0);
  });

  it("clamps a single wake when the recheck itself exceeds the Node limit", () => {
    const d = decideBunkerRamStop({
      nowMs: started,
      startedAtMs: started,
      operatorCapMs: null,
      openSessionExpiresAtMs: [started + RAM_TTL_THIRTY_DAYS_MS],
      recheckMs: RAM_TTL_THIRTY_DAYS_MS,
    });
    expect(d.nextDelayMs).toBe(RAM_TIMER_MAX_CHUNK_MS);
  });

  it("still holds the session after the 24h floor", () => {
    const sessionEnd = started + RAM_TTL_THIRTY_DAYS_MS;
    const d = decideBunkerRamStop({
      nowMs: started + 25 * H,
      startedAtMs: started,
      operatorCapMs: null,
      openSessionExpiresAtMs: [sessionEnd],
    });
    expect(d.expired).toBe(false);
    expect(d.reason).toBe("session_expires_at");
    expect(d.stopAtMs).toBe(sessionEnd);
  });

  it("expires once the idle floor has passed and no session remains", () => {
    const d = decideBunkerRamStop({
      nowMs: started + 25 * H,
      startedAtMs: started,
      operatorCapMs: null,
      openSessionExpiresAtMs: [],
    });
    expect(d.expired).toBe(true);
    expect(d.reason).toBe("idle_floor");
    expect(d.nextDelayMs).toBe(0);
  });

  it("lets an operator ceiling block a 30-day session", () => {
    const d = decideBunkerRamStop({
      nowMs: started,
      startedAtMs: started,
      operatorCapMs: 24 * H,
      openSessionExpiresAtMs: [started + RAM_TTL_THIRTY_DAYS_MS],
    });
    expect(d.reason).toBe("operator_cap");
    expect(d.stopAtMs).toBe(started + 24 * H);
    expect(d.latestSessionExpiresAtMs).toBe(started + RAM_TTL_THIRTY_DAYS_MS);
  });
});
