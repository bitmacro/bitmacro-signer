import { describe, expect, it } from "vitest";
import {
  VaultDecryptError,
  decryptNsec,
  encryptNsec,
} from "./aes-gcm";

describe("vault / aes-gcm", () => {
  it("encrypt → decrypt round-trip", async () => {
    const nsec =
      "nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8f4t4w";
    const password = "correct horse battery staple 🔐";
    const payload = await encryptNsec(nsec, password);
    expect(payload.blob.length).toBeGreaterThan(0);
    expect(payload.salt.length).toBeGreaterThan(0);
    expect(payload.iv.length).toBeGreaterThan(0);
    const roundTrip = await decryptNsec(payload, password);
    expect(roundTrip).toBe(nsec);
  });

  it("rejects wrong password (authentication tag)", async () => {
    const payload = await encryptNsec("nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8f4t4w", "secret-a");
    await expect(decryptNsec(payload, "secret-b")).rejects.toThrow(VaultDecryptError);
  });
});
