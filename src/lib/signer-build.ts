import {
  SIGNER_PACKAGE_NAME,
  SIGNER_PACKAGE_VERSION,
  SIGNER_REPOSITORY_URL,
} from "@/lib/signer-version";

export type SignerBuildInfo = {
  name: string;
  version: string;
  /** Full git SHA when embedded by CI / container (best audit trail). */
  commit: string | null;
  commitShort: string | null;
  repository: string;
  /** Direct link to exact tree on GitHub when commit is known. */
  verifyUrl: string;
  /** Vercel: production | preview; elsewhere often unset. */
  deploymentEnvironment: string | null;
};

/**
 * Resolves build metadata for API and server components.
 * Commit: prefer explicit SIGNER_GIT_COMMIT, then Vercel, then NEXT_PUBLIC_* (local).
 */
export function getSignerBuildInfo(): SignerBuildInfo {
  const raw =
    process.env.SIGNER_GIT_COMMIT?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_SIGNER_GIT_COMMIT?.trim() ||
    null;

  const commit = raw && /^[0-9a-f]{7,40}$/i.test(raw) ? raw.toLowerCase() : null;
  const commitShort = commit ? commit.slice(0, 7) : null;

  const verifyUrl = commit
    ? `${SIGNER_REPOSITORY_URL}/commit/${commit}`
    : `${SIGNER_REPOSITORY_URL}/tree/main`;

  const deploymentEnvironment =
    process.env.VERCEL_ENV?.trim() ||
    (process.env.NODE_ENV === "production" ? "production" : null);

  return {
    name: SIGNER_PACKAGE_NAME,
    version: SIGNER_PACKAGE_VERSION,
    commit,
    commitShort,
    repository: SIGNER_REPOSITORY_URL,
    verifyUrl,
    deploymentEnvironment,
  };
}
