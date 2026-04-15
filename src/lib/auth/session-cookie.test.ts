import { describe, expect, it } from "vitest";

import {
  SESSION_COOKIE_NAME,
  signSessionCookieValue,
  verifySessionCookieValue,
} from "./session-cookie";

const testSecret = new TextEncoder().encode(
  "unit-test-secret-at-least-16b",
);

describe("session-cookie JWT", () => {
  it("round-trips identity_id via sign + verify", async () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const token = await signSessionCookieValue(id, testSecret);
    expect(token.length).toBeGreaterThan(20);
    await expect(verifySessionCookieValue(token, testSecret)).resolves.toBe(
      id,
    );
  });

  it("returns null for tampered token", async () => {
    const token = await signSessionCookieValue(
      "550e8400-e29b-41d4-a716-446655440000",
      testSecret,
    );
    const tampered = token.slice(0, -4) + "xxxx";
    await expect(verifySessionCookieValue(tampered, testSecret)).resolves.toBe(
      null,
    );
  });

  it("returns null for wrong secret", async () => {
    const token = await signSessionCookieValue(
      "550e8400-e29b-41d4-a716-446655440000",
      testSecret,
    );
    const other = new TextEncoder().encode("other-secret-16chars!");
    await expect(verifySessionCookieValue(token, other)).resolves.toBe(null);
  });

  it("exports stable cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("bm_signer_session");
  });
});
