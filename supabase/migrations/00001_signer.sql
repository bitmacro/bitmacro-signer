-- BitMacro Signer: vault blobs + app sessions
-- Requires public.identities (bitmacro-id) to exist before this migration runs.

-- ---------------------------------------------------------------------------
-- signer_vaults: one encrypted vault per Identity (UUID = identities.id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.signer_vaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL UNIQUE REFERENCES public.identities (id) ON DELETE CASCADE,
  blob text NOT NULL,
  salt text NOT NULL,
  iv text NOT NULL,
  bunker_pubkey text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.signer_vaults IS 'AES-GCM vault payload (blob/salt/iv); bunker_pubkey is the bunker npub. identity_id = identities.id (BitMacro Identity, not Supabase Auth).';

-- ---------------------------------------------------------------------------
-- signer_sessions: authorized Nostr clients (NIP-46); secret stored as SHA-256 only
-- ---------------------------------------------------------------------------
CREATE TABLE public.signer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid NOT NULL REFERENCES public.signer_vaults (id) ON DELETE CASCADE,
  app_pubkey text NOT NULL,
  app_name text,
  secret_hash text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vault_id, app_pubkey)
);

COMMENT ON TABLE public.signer_sessions IS 'Per-app session; secret_hash = sha256(raw secret), never store plaintext secret.';

CREATE INDEX idx_signer_sessions_secret_hash ON public.signer_sessions (secret_hash);
CREATE INDEX idx_signer_sessions_app_pubkey ON public.signer_sessions (app_pubkey);
CREATE INDEX idx_signer_sessions_expires_pending ON public.signer_sessions (expires_at)
  WHERE used = false;

-- ---------------------------------------------------------------------------
-- RLS: enabled for future policies. No policies yet — bitmacro-id uses its own auth
-- (not Supabase Auth), so auth.uid() does not apply. Access control is enforced
-- server-side with the service role key; do not expose that key to the browser.
-- ---------------------------------------------------------------------------
ALTER TABLE public.signer_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signer_sessions ENABLE ROW LEVEL SECURITY;

-- TODO: definir após confirmar modelo de auth do bitmacro-id
-- CREATE POLICY "signer_vaults_select_own"
--   ON public.signer_vaults
--   FOR SELECT
--   TO authenticated
--   USING (...);

-- TODO: definir após confirmar modelo de auth do bitmacro-id
-- CREATE POLICY "signer_vaults_update_own"
--   ON public.signer_vaults
--   FOR UPDATE ...

-- TODO: definir após confirmar modelo de auth do bitmacro-id
-- CREATE POLICY "signer_sessions_select_owner"
--   ON public.signer_sessions
--   FOR SELECT ...

-- TODO: definir após confirmar modelo de auth do bitmacro-id
-- CREATE POLICY "signer_sessions_insert_owner"
--   ON public.signer_sessions
--   FOR INSERT ...

-- TODO: definir após confirmar modelo de auth do bitmacro-id
-- CREATE POLICY "signer_sessions_delete_owner"
--   ON public.signer_sessions
--   FOR DELETE ...
