import { describe, expect, it } from "vitest";

import { resetAttempts, takeAttempt } from "./attempt-limit";

describe("takeAttempt", () => {
  it("blocks the call that exceeds the window", () => {
    resetAttempts();
    expect(takeAttempt("k", 2, 60_000, 1_000).ok).toBe(true);
    expect(takeAttempt("k", 2, 60_000, 1_100).ok).toBe(true);
    const blocked = takeAttempt("k", 2, 60_000, 1_200);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
