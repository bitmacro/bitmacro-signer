import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBunkerUri,
  bunkerPubkeyToHex,
  isSessionValid,
  type Session,
} from "./ttl";

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
  describe("bunkerPubkeyToHex", () => {
    it("passes through 64-char hex (lowercased)", () => {
      const hex =
        "ABCDEF0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
      expect(bunkerPubkeyToHex(hex)).toBe(hex.toLowerCase());
    });

    it("decodes npub1 to hex", () => {
      const npub =
        "npub1rwzv24nmzfjypx2a8m264ws9vht3uxp5vpypnluuzl67n4waq78suk0wul";
      expect(bunkerPubkeyToHex(npub)).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("buildBunkerUri", () => {
    it("builds bunker:// with hex pubkey and encoded relay and secret", () => {
      const pkHex =
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
      expect(
        buildBunkerUri(
          pkHex,
          "wss://relay.example.com/nostr",
          "raw+secret/value",
        ),
      ).toBe(
        `bunker://${pkHex}?relay=wss%3A%2F%2Frelay.example.com%2Fnostr&secret=raw%2Bsecret%2Fvalue`,
      );
    });

    it("normalizes npub to hex in bunker:// host", () => {
      const npub =
        "npub1rwzv24nmzfjypx2a8m264ws9vht3uxp5vpypnluuzl67n4waq78suk0wul";
      const hex = bunkerPubkeyToHex(npub);
      const uri = buildBunkerUri(
        npub,
        "wss://relay.example.com",
        "s",
      );
      expect(uri.startsWith(`bunker://${hex}?`)).toBe(true);
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
