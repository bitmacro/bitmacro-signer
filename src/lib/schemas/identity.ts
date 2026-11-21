import { z } from "zod";

import { NPUB_REGEX } from "./auth";

/** POST /api/identities/bootstrap — create or resolve identity by npub (Signer-only bootstrap). */
export const identityBootstrapBodySchema = z.object({
  npub: z
    .string()
    .trim()
    .regex(NPUB_REGEX, "Invalid npub format"),
  /** Signed proof that the caller holds this npub. */
  proof: z.unknown(),
});

export type IdentityBootstrapBody = z.infer<typeof identityBootstrapBodySchema>;
