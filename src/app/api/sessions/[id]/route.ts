import { NextResponse } from "next/server";

import { getSessionCookie } from "@/lib/auth/session-cookie";
import { revokeSessionForIdentity } from "@/lib/session/app-keys";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * DELETE /api/sessions/:id — remove a client session for the signed-in Identity (cookie).
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let identityId: string | null;
  try {
    identityId = await getSessionCookie();
  } catch {
    return jsonError("Server misconfigured: session support unavailable", 503);
  }
  if (!identityId) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return jsonError("Session id is required", 400);
  }

  let revoked: boolean;
  try {
    revoked = await revokeSessionForIdentity(identityId, id);
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      e.message.includes("SUPABASE_SERVICE_ROLE_KEY")
    ) {
      return jsonError(
        "Server misconfigured: Supabase service role unavailable",
        503,
      );
    }
    throw e;
  }

  if (!revoked) {
    return jsonError("Session not found", 404);
  }

  return NextResponse.json({ revoked: true });
}
