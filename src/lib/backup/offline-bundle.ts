import type { VaultPayload } from "@/lib/vault";

/** Wire format embedded in PDF + QR (minified JSON). */
export const OFFLINE_BUNDLE_KIND = "bitmacro-signer-offline-vault" as const;
export const OFFLINE_BUNDLE_VERSION = 1 as const;

export type OfflineVaultBundle = {
  v: typeof OFFLINE_BUNDLE_VERSION;
  kind: typeof OFFLINE_BUNDLE_KIND;
  /** BitMacro Identity id (UUID). */
  identity_id: string;
  /** User npub (bech32). */
  npub: string;
  /** Same ciphertext as server vault row — decrypt with vault passphrase (PBKDF2 + AES-GCM). */
  blob: string;
  salt: string;
  iv: string;
};

export function buildOfflineVaultBundle(
  identityId: string,
  npub: string,
  vault: VaultPayload,
): OfflineVaultBundle {
  return {
    v: OFFLINE_BUNDLE_VERSION,
    kind: OFFLINE_BUNDLE_KIND,
    identity_id: identityId,
    npub: npub.trim(),
    blob: vault.blob,
    salt: vault.salt,
    iv: vault.iv,
  };
}

export function serializeOfflineBundleForQr(bundle: OfflineVaultBundle): string {
  return JSON.stringify(bundle);
}
