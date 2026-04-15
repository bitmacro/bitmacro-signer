import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionCookie } from "@/lib/auth/session-cookie";
import { stopBunker } from "@/lib/bunker";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/auth/lock — stop bunker for session identity and clear cookie.
 */
export async function POST() {
  try {
    const identityId = await getSessionCookie();
    if (!identityId) {
      return jsonError("Unauthorized", 401);
    }
    await stopBunker(identityId).catch(() => {});
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Server misconfigured: session secret unavailable", 503);
  }
}
