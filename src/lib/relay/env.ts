/**
 * Relay URL for NIP-46 / bunker.
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
