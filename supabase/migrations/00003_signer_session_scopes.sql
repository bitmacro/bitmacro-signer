-- Limit what a connected app can ask the bunker to do.
-- Existing rows receive the same default the panel uses: public key plus kinds 1, 6 and 7.
-- Run this on the Signer database before starting signer-web / signer-daemon 1.0.0.

ALTER TABLE public.signer_sessions
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL
  DEFAULT ARRAY['get_public_key', 'sign_event:1', 'sign_event:6', 'sign_event:7']::text[];

COMMENT ON COLUMN public.signer_sessions.scopes IS
  'NIP-46 methods this session may call. sign_event:N allows one kind. A bare sign_event allows every kind. Decrypt scopes are opt-in.';
