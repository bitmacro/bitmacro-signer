import { z } from "zod";

/** POST /api/sessions — authorize a client app for an Identity vault. */
export const sessionCreateBodySchema = z.object({
  identity_id: z.string().uuid(),
  /** If omitted, session stays «pending» until NIP-46 `connect` (pubkey = client keypair on device). */
  app_pubkey: z.string().optional(),
  /** Label you set when generating the QR (NIP-46 does not send the app name). */
  app_name: z
    .string()
    .max(120)
    .optional()
    .transform((s) => {
      if (s == null) return undefined;
      const t = s.trim();
      return t.length === 0 ? undefined : t;
    }),
  ttl_hours: z.number().int().positive().max(8760).optional(),
});

export type SessionCreateBody = z.infer<typeof sessionCreateBodySchema>;
