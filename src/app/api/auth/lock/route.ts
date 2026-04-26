import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionCookie } from "@/lib/auth/session-cookie";
import { apiPOST } from "@/lib/observability/api-route-wrapper";
import {
  getDaemonInternalConfig,
  notifyDaemonLock,
} from "@/lib/daemon-internal";
import { stopBunker } from "@/lib/bunker";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/auth/lock — stop bunker for session identity and clear cookie.
 */
async function handlePost(request: Request) {
  void request;
  let daemonCfg: ReturnType<typeof getDaemonInternalConfig>;
  try {
    daemonCfg = getDaemonInternalConfig();
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Server misconfigured",
      503,
    );
  }

  try {
    const identityId = await getSessionCookie();
    if (!identityId) {
      return jsonError("Unauthorized", 401);
    }
    if (daemonCfg) {
      await notifyDaemonLock(daemonCfg, identityId).catch(() => {});
    } else {
      await stopBunker(identityId).catch(() => {});
    }
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Server misconfigured: session secret unavailable", 503);
  }
}

export const POST = apiPOST("POST /api/auth/lock", handlePost);
