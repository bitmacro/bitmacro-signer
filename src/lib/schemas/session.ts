import { z } from "zod";

/** POST /api/sessions — authorize a client app for an Identity vault. */
const sessionCreateFieldsSchema = z.object({
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
  /** NIP-46 client-initiated URI (`nostrconnect://…`) from the app (e.g. Primal Remote Signer). */
  nostrconnect_uri: z
    .string()
    .optional()
    .transform((s) => {
      if (s == null) return undefined;
      const t = s.trim();
      return t.length === 0 ? undefined : t;
    }),
});

export const sessionCreateBodySchema = sessionCreateFieldsSchema.superRefine(
  (data, ctx) => {
    if (data.nostrconnect_uri && data.app_pubkey?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "app_pubkey cannot be combined with nostrconnect_uri",
        path: ["app_pubkey"],
      });
    }
  },
);

export type SessionCreateBody = z.infer<typeof sessionCreateBodySchema>;

/** For GET query validation (same `identity_id` as POST body). */
export const sessionIdentityIdQuerySchema = sessionCreateFieldsSchema.shape
  .identity_id;
