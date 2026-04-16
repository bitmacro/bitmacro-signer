import { z } from "zod";

/** POST /api/sessions — authorize a client app for an Identity vault. */
export const sessionCreateBodySchema = z.object({
  identity_id: z.string().uuid(),
  /** Se omitido, a sessão fica «pending» até o NIP-46 `connect` (pubkey = client-keypair no cliente). */
  app_pubkey: z.string().optional(),
  app_name: z.string().min(1).optional(),
  ttl_hours: z.number().int().positive().max(8760).optional(),
});

export type SessionCreateBody = z.infer<typeof sessionCreateBodySchema>;
