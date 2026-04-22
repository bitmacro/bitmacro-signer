import { NextResponse } from "next/server";

import { getSignerBuildInfo } from "@/lib/signer-build";

export const dynamic = "force-dynamic";

/**
 * Public build metadata for security transparency: semver + optional git SHA
 * (same values shown in the UI). No secrets.
 */
export async function GET() {
  const info = getSignerBuildInfo();
  return NextResponse.json({
    name: info.name,
    version: info.version,
    commit: info.commit,
    commitShort: info.commitShort,
    repository: info.repository,
    verifyUrl: info.verifyUrl,
    deploymentEnvironment: info.deploymentEnvironment,
    /** Image build-args (Docker); confirms you are not running a stale local :latest cache. */
    imageVersion: process.env.BITMACRO_SIGNER_VERSION?.trim() || null,
  });
}
