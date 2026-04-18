import { describe, expect, it } from "vitest";

import {
  buildOfflineVaultBundle,
  OFFLINE_BUNDLE_KIND,
  serializeOfflineBundleForQr,
  tryParseOfflineVaultBundleJson,
} from "./offline-bundle";

describe("offline-bundle", () => {
  it("serializes round-trip shape", () => {
    const b = buildOfflineVaultBundle(
      "00000000-0000-4000-8000-000000000001",
      "npub1test",
      { blob: "a", salt: "b", iv: "c" },
    );
    expect(b.kind).toBe(OFFLINE_BUNDLE_KIND);
    expect(b.v).toBe(1);
    const s = serializeOfflineBundleForQr(b);
    const p = JSON.parse(s) as typeof b;
    expect(p.blob).toBe("a");
    expect(p.npub).toBe("npub1test");
  });

  it("tryParseOfflineVaultBundleJson accepts serialized bundle", () => {
    const b = buildOfflineVaultBundle(
      "00000000-0000-4000-8000-000000000001",
      "npub1test",
      { blob: "a", salt: "b", iv: "c" },
    );
    const raw = serializeOfflineBundleForQr(b);
    const r = tryParseOfflineVaultBundleJson(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.payload).toEqual({ blob: "a", salt: "b", iv: "c" });
    expect(r.data.npub).toBe("npub1test");
  });

  it("tryParseOfflineVaultBundleJson rejects wrong kind", () => {
    const r = tryParseOfflineVaultBundleJson(
      JSON.stringify({
        v: 1,
        kind: "other",
        identity_id: "x",
        npub: "n",
        blob: "a",
        salt: "b",
        iv: "c",
      }),
    );
    expect(r.ok).toBe(false);
  });
});
