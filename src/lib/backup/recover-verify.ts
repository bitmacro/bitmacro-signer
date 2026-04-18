import { getPublicKey } from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";

/**
 * Returns true if `nsec` decodes to the same public key as `expectedNpub` (bech32).
 * Used after local decrypt to catch truncated/corrupt ciphertext from bad PDF copy.
 */
export function decryptedNsecMatchesNpub(nsec: string, expectedNpub: string): boolean {
  try {
    const d = nip19.decode(nsec.trim());
    if (d.type !== "nsec") return false;
    const pk = getPublicKey(d.data);
    return nip19.npubEncode(pk) === expectedNpub.trim();
  } catch {
    return false;
  }
}
