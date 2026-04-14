import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildBunkerUri, isSessionValid, type Session } from "./ttl";

function session(partial: Partial<Session> & Pick<Session, "expires_at">): Session {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    vault_id: "00000000-0000-4000-8000-000000000002",
    app_pubkey: "abc",
    app_name: null,
    secret_hash: "deadbeef",
    used: false,
    created_at: "2025-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("session / ttl", () => {
  describe("buildBunkerUri", () => {
    it("builds bunker:// with encoded relay and secret query params", () => {
      expect(
        buildBunkerUri(
          "npub1test",
          "wss://relay.example.com/nostr",
          "raw+secret/value",
        ),
      ).toBe(
        "bunker://npub1test?relay=wss%3A%2F%2Frelay.example.com%2Fnostr&secret=raw%2Bsecret%2Fvalue",
      );
    });
  });

  describe("isSessionValid", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00.000Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns false when used is true", () => {
      expect(
        isSessionValid(
          session({
            used: true,
            expires_at: "2026-01-01T00:00:00.000Z",
          }),
        ),
      ).toBe(false);
    });

    it("returns false when expires_at is not after now", () => {
      expect(
        isSessionValid(
          session({
            used: false,
            expires_at: "2025-06-15T11:59:59.000Z",
          }),
        ),
      ).toBe(false);
    });

    it("returns true when not used and expires_at is in the future", () => {
      expect(
        isSessionValid(
          session({
            used: false,
            expires_at: "2025-06-16T00:00:00.000Z",
          }),
        ),
      ).toBe(true);
    });
  });
});
