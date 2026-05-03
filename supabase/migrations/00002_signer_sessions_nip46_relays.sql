-- NIP-46 client-initiated (nostrconnect://): relays chosen by the client.
-- NULL = bunker:// flow (use env RELAY_URL / NEXT_PUBLIC_RELAY_URL only).

ALTER TABLE public.signer_sessions
  ADD COLUMN IF NOT EXISTS nip46_relay_urls text[] NULL;

COMMENT ON COLUMN public.signer_sessions.nip46_relay_urls IS
  'When set, one or more wss URLs from nostrconnect://; the daemon subscribes on each in addition to the default relay. NULL for bunker:// sessions.';
