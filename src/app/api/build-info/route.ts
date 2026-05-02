import { NextResponse } from "next/server";

import { apiGET } from "@/lib/observability/api-route-wrapper";
import { getSignerBuildInfo } from "@/lib/signer-build";

export const dynamic = "force-dynamic";

/**
 * Public build metadata for security transparency: semver + optional git SHA
 * (same values shown in the UI). No secrets.
 */
const NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

async function handleGet(request: Request) {
  void request;
  const info = getSignerBuildInfo();
  return NextResponse.json(
    {
      name: info.name,
      version: info.version,
      commit: info.commit,
      commitShort: info.commitShort,
      repository: info.repository,
      verifyUrl: info.verifyUrl,
      deploymentEnvironment: info.deploymentEnvironment,
      /** Image build-args (Docker); confirms you are not running a stale local :latest cache. */
      imageVersion: process.env.BITMACRO_SIGNER_VERSION?.trim() || null,
    },
    { headers: NO_STORE_HEADERS },
  );
}

export const GET = apiGET("GET /api/build-info", handleGet);
