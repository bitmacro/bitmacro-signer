import { generateSecretKey, getPublicKey } from "nostr-tools";
import { nsecEncode, npubEncode } from "nostr-tools/nip19";

/** Ciphertext + params persisted alongside the vault record (e.g. Supabase). All binary fields are base64url. */
export interface VaultPayload {
  blob: string;
  salt: string;
  iv: string;
}

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 32;
const IV_BYTES = 12;
const AES_BITS = 256;

/** Thrown when decryption fails (e.g. wrong password, tampered blob, bad tag). Never includes secrets in the message. */
export class VaultDecryptError extends Error {
  constructor(
    message = "Failed to decrypt vault: invalid password or corrupted payload",
  ) {
    super(message);
    this.name = "VaultDecryptError";
  }
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not available in this environment");
  }
  return subtle;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = globalThis.btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) {
    b64 += "=".repeat(4 - pad);
  }
  const binary = globalThis.atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)!;
  }
  return out;
}

/**
 * Derives an AES-GCM-256 key from a password and salt using PBKDF2 (SHA-256).
 * The password bytes are zeroed only when callers discard them; do not log the password.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const material = await subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );
  const saltBuf = new Uint8Array(salt);
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: AES_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Generates a Nostr keypair and returns bech32 `nsec` / `npub`.
 * Must run in a browser — do not call from Node/Route Handlers (secrets belong client-side only).
 * Never log `nsec`, `npub`, or raw secret key bytes.
 */
export function generateKeypair(): { nsec: string; npub: string } {
  if (typeof globalThis.window === "undefined") {
    throw new Error(
      "generateKeypair must run in the browser: nsec material must not be generated on the server",
    );
  }
  const sk = generateSecretKey();
  try {
    const pkHex = getPublicKey(sk);
    const nsec = nsecEncode(sk);
    const npub = npubEncode(pkHex);
    return { nsec, npub };
  } finally {
    sk.fill(0);
  }
}

/**
 * Encrypts `nsec` with a user password. Generates random salt (32 B) and IV (12 B for AES-GCM).
 * Do not log `nsec`, password, key, IV, salt, or ciphertext.
 */
export async function encryptNsec(nsec: string, password: string): Promise<VaultPayload> {
  const subtle = getSubtle();
  const salt = new Uint8Array(SALT_BYTES);
  const iv = new Uint8Array(IV_BYTES);
  globalThis.crypto.getRandomValues(salt);
  globalThis.crypto.getRandomValues(iv);

  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(nsec);
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    plaintext,
  );
  const blob = toBase64Url(new Uint8Array(ciphertext));
  return {
    blob,
    salt: toBase64Url(salt),
    iv: toBase64Url(iv),
  };
}

/**
 * Decrypts the vault blob. On failure (wrong password, tampering), throws {@link VaultDecryptError}.
 * Do not log password, derived keys, plaintext, or raw decryption errors that might leak material.
 */
export async function decryptNsec(
  payload: VaultPayload,
  password: string,
): Promise<string> {
  const subtle = getSubtle();
  const salt = fromBase64Url(payload.salt);
  const iv = fromBase64Url(payload.iv);
  const cipher = fromBase64Url(payload.blob);
  const key = await deriveKey(password, salt);
  try {
    const buf = await subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(cipher),
    );
    return new TextDecoder().decode(buf);
  } catch {
    // Never log the underlying error: details vary by runtime; do not risk leaking material.
    throw new VaultDecryptError();
  }
}
