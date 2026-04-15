import { z } from "zod";

/** POST /api/auth/unlock */
export const authUnlockBodySchema = z.object({
  identity_id: z.string().uuid(),
  password: z.string().min(1),
});

export type AuthUnlockBody = z.infer<typeof authUnlockBodySchema>;
