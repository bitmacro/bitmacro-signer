import { NextResponse } from "next/server";

import { getSessionCookie } from "@/lib/auth/session-cookie";
import { apiDELETE, type ParamsBag } from "@/lib/observability/api-route-wrapper";
import { revokeSessionForIdentity } from "@/lib/session/app-keys";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * DELETE /api/sessions/:id — remove a client session for the signed-in Identity (cookie).
 */
async function handleDelete(_request: Request, context: ParamsBag) {
  let identityId: string | null;
  try {
    identityId = await getSessionCookie();
  } catch {
    return jsonError("Server misconfigured: session support unavailable", 503);
  }
  if (!identityId) {
    return jsonError("Unauthorized", 401);
  }

  const params = await context.params;
  const raw = params?.id;
  const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
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

export const DELETE = apiDELETE("DELETE /api/sessions/:id", handleDelete);
