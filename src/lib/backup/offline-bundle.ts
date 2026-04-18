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

/** Fields required to decrypt + identify an offline vault bundle (v1). */
export type OfflineBundleDecryptFields = {
  payload: VaultPayload;
  npub: string;
};

/**
 * Parses and validates pasted JSON for local recovery ({@link decryptNsec}).
 * Requires `blob`, `salt`, `iv`, `npub`, `kind` and matching {@link OFFLINE_BUNDLE_KIND}.
 */
export function tryParseOfflineVaultBundleJson(
  raw: string,
): { ok: true; data: OfflineBundleDecryptFields } | { ok: false } {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (!obj || typeof obj !== "object") return { ok: false };
  const o = obj as Record<string, unknown>;
  const { blob, salt, iv, npub, kind } = o;
  if (
    typeof blob !== "string" ||
    typeof salt !== "string" ||
    typeof iv !== "string" ||
    typeof npub !== "string" ||
    typeof kind !== "string" ||
    !blob ||
    !salt ||
    !iv ||
    !npub
  ) {
    return { ok: false };
  }
  if (kind !== OFFLINE_BUNDLE_KIND) return { ok: false };
  if (o.v !== undefined && o.v !== OFFLINE_BUNDLE_VERSION) return { ok: false };
  return {
    ok: true,
    data: {
      payload: { blob, salt, iv },
      npub,
    },
  };
}
