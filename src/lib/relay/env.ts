/**
 * Relay URL for NIP-46 / bunker default (Supabase session union, daemon `startBunker`).
 *
 * Prefer `RELAY_URL` — it is read at **runtime** in Node (Docker, `next start`).
 * `NEXT_PUBLIC_RELAY_URL` is inlined at **Next.js build time**; changing it only in
 * the container env does not update the compiled server bundle.
 */

export function getRelayUrlServer(): string {
  const u =
    process.env.RELAY_URL?.trim() || process.env.NEXT_PUBLIC_RELAY_URL?.trim();
  if (!u) {
    throw new Error("RELAY_URL or NEXT_PUBLIC_RELAY_URL is not set");
  }
  return u;
}

/**
 * Relay embedded in `bunker://…?relay=` (QR / link from `POST /api/sessions`).
 * **Must** match a WebSocket where `signer-daemon` subscribes (`getActiveNip46RelayUrlsForIdentity` first entry is daemon `RELAY_URL`).
 *
 * When the product shows a “default” relay (e.g. `wss://relay.bitmacro.cloud`) but the bunker listens only on a dedicated NIP-46 relay (e.g. `wss://nip46.bitmacro.io`), set **`BUNKER_RELAY_URL`** on signer-web to the same URL as the daemon; keep `NEXT_PUBLIC_RELAY_URL` for general client copy if needed.
 */
export function getBunkerRelayUrlServer(): string {
  const u =
    process.env.BUNKER_RELAY_URL?.trim() ||
    process.env.RELAY_URL?.trim() ||
    process.env.NEXT_PUBLIC_RELAY_URL?.trim();
  if (!u) {
    throw new Error(
      "BUNKER_RELAY_URL, RELAY_URL, or NEXT_PUBLIC_RELAY_URL is not set",
    );
  }
  return u;
}
