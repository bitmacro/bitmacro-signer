import { describe, expect, it } from "vitest";

import {
  DEFAULT_SESSION_SCOPES,
  normalizeSessionScopes,
  resolveSessionScopes,
  scopeAllows,
  scopesForNewSession,
} from "./scopes";

describe("session scopes", () => {
  it("defaults to public key and kinds 1, 6 and 7", () => {
    expect(resolveSessionScopes(undefined)).toEqual([...DEFAULT_SESSION_SCOPES]);
    expect(scopeAllows(DEFAULT_SESSION_SCOPES, "sign_event", 1)).toBe(true);
    expect(scopeAllows(DEFAULT_SESSION_SCOPES, "sign_event", 0)).toBe(false);
    expect(scopeAllows(DEFAULT_SESSION_SCOPES, "nip44_decrypt")).toBe(false);
  });

  it("adds encrypt and decrypt only when chosen", () => {
    const scopes = scopesForNewSession({
      allowEncrypt: true,
      allowDecrypt: false,
    });
    expect(scopes).toContain("nip44_encrypt");
    expect(scopes).not.toContain("nip44_decrypt");
  });

  it("rejects an unknown token", () => {
    expect(normalizeSessionScopes(["sign_event:1", "get_private_key"])).toBe(
      null,
    );
  });

  it("treats a bare sign_event as every kind", () => {
    expect(scopeAllows(["sign_event"], "sign_event", 22242)).toBe(true);
  });
});
