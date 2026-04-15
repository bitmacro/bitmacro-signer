import { z } from "zod";

/** npub: `npub1` + 58 bech32 chars (total 63) — aligned with bitmacro-app Identity API */
export const NPUB_REGEX = /^npub1[acdefghjklmnpqrstuvwxyz023456789]{58}$/;

/** POST /api/auth/unlock — Nostr npub + vault passphrase */
export const authUnlockBodySchema = z.object({
  npub: z
    .string()
    .trim()
    .regex(NPUB_REGEX, "Invalid npub format"),
  passphrase: z.string().min(1),
});

export type AuthUnlockBody = z.infer<typeof authUnlockBodySchema>;
