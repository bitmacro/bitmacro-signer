import { z } from "zod";

/** POST /api/sessions — authorize a client app for an Identity vault. */
export const sessionCreateBodySchema = z.object({
  identity_id: z.string().uuid(),
  /** Se omitido, a sessão fica «pending» até o NIP-46 `connect` (pubkey = client-keypair no cliente). */
  app_pubkey: z.string().optional(),
  /** Etiqueta definida por ti ao gerar o QR (o NIP-46 não envia o nome da app). */
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
