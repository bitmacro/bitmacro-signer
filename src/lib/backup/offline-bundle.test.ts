import { describe, expect, it } from "vitest";

import {
  buildOfflineVaultBundle,
  OFFLINE_BUNDLE_KIND,
  serializeOfflineBundleForQr,
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
});
