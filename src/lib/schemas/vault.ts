import { z } from "zod";

/** POST /api/vault — encrypted vault payload + bunker npub. */
export const vaultCreateBodySchema = z.object({
  identity_id: z.string().uuid(),
  blob: z.string().min(1),
  salt: z.string().min(1),
  iv: z.string().min(1),
  bunker_pubkey: z.string().min(1),
});

export type VaultCreateBody = z.infer<typeof vaultCreateBodySchema>;
