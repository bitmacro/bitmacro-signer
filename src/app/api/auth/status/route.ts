import { NextResponse } from "next/server";

import { getSessionCookie } from "@/lib/auth/session-cookie";
import { isRunning } from "@/lib/bunker";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/auth/status — current session identity and bunker running flag.
 */
export async function GET() {
  let identityId: string | null;
  try {
    identityId = await getSessionCookie();
  } catch {
    return jsonError("Server misconfigured: session secret unavailable", 503);
  }

  if (!identityId) {
    return jsonError("Unauthorized", 401);
  }

  return NextResponse.json({
    identity_id: identityId,
    is_running: isRunning(identityId),
  });
}
