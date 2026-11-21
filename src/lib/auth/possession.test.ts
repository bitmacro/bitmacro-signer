import { generateSecretKey, getPublicKey } from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";
import { describe, expect, it } from "vitest";

import {
  bootstrapCommitment,
  possessionIsValid,
  signPossession,
  vaultCommitment,
} from "./possession";

function keypair(): { secret: string; npub: string } {
  const sk = generateSecretKey();
  try {
    return {
      secret: nip19.nsecEncode(sk),
      npub: nip19.npubEncode(getPublicKey(sk)),
    };
  } finally {
    sk.fill(0);
  }
}

describe("possession proof", () => {
  it("accepts a fresh bootstrap proof for the same npub", () => {
    const { secret, npub } = keypair();
    const event = signPossession(secret, "bootstrap", bootstrapCommitment(npub));
    expect(
      possessionIsValid(event, {
        purpose: "bootstrap",
        npub,
        commitment: bootstrapCommitment(npub),
      }),
    ).toBe(true);
  });

  it("rejects a proof reused for a different vault blob", () => {
    const { secret, npub } = keypair();
    const base = {
      identityId: "550e8400-e29b-41d4-a716-446655440000",
      salt: "salt",
      iv: "iv",
      bunkerPubkey: npub,
    };
    const event = signPossession(
      secret,
      "vault",
      vaultCommitment({ ...base, blob: "blob-a" }),
    );
    expect(
      possessionIsValid(event, {
        purpose: "vault",
        npub,
        commitment: vaultCommitment({ ...base, blob: "blob-b" }),
      }),
    ).toBe(false);
  });
});
