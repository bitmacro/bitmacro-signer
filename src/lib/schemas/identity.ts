import { z } from "zod";

import { NPUB_REGEX } from "./auth";

/** POST /api/identities/bootstrap — create or resolve identity by npub (Signer-only bootstrap). */
export const identityBootstrapBodySchema = z.object({
  npub: z
    .string()
    .trim()
    .regex(NPUB_REGEX, "Invalid npub format"),
});

export type IdentityBootstrapBody = z.infer<typeof identityBootstrapBodySchema>;
