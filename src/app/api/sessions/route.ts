import { NextResponse } from "next/server";

import { sessionCreateBodySchema } from "@/lib/schemas/session";
import {
  authorizeApp,
  listSessions,
} from "@/lib/session/app-keys";
import { buildBunkerUri } from "@/lib/session/ttl";
import type { Session } from "@/lib/session/ttl";
import { createServiceRoleClient } from "@/lib/supabase/server";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status },
  );
}

function isPgError(e: unknown): e is Error & { pgCode?: string } {
  return e instanceof Error && "pgCode" in e;
}

export type SessionListItem = Omit<Session, "secret_hash">;

function toPublicSession(s: Session): SessionListItem {
  return {
    id: s.id,
    vault_id: s.vault_id,
    app_pubkey: s.app_pubkey,
    app_name: s.app_name,
    used: s.used,
    expires_at: s.expires_at,
    created_at: s.created_at,
  };
}

/**
 * POST /api/sessions — authorize app, return session_id, secret, bunker_uri.
 */
export async function POST(request: Request) {
  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return jsonError("Server misconfigured: Supabase service role unavailable", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = sessionCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { identity_id, app_pubkey, app_name, ttl_hours } = parsed.data;

  const relayUrl = process.env.NEXT_PUBLIC_RELAY_URL;
  if (!relayUrl?.trim()) {
    return jsonError("Server misconfigured: NEXT_PUBLIC_RELAY_URL is not set", 503);
  }

  const { data: vault, error: vaultError } = await supabase
    .from("signer_vaults")
    .select("bunker_pubkey")
    .eq("identity_id", identity_id)
    .maybeSingle();

  if (vaultError) {
    return jsonError(vaultError.message, 500);
  }
  if (!vault?.bunker_pubkey) {
    return jsonError("Vault not found for this identity", 404);
  }

  let sessionId: string;
  let secret: string;
  try {
    const out = await authorizeApp(
      identity_id,
      app_pubkey,
      app_name,
      ttl_hours,
    );
    sessionId = out.sessionId;
    secret = out.secret;
  } catch (e: unknown) {
    if (isPgError(e) && e.pgCode === "23505") {
      return jsonError(
        "Session already exists for this app_pubkey (unexpected conflict)",
        409,
      );
    }
    throw e;
  }

  const bunker_uri = buildBunkerUri(
    vault.bunker_pubkey,
    relayUrl.trim(),
    secret,
  );

  return NextResponse.json({
    session_id: sessionId,
    secret,
    bunker_uri,
  });
}

/**
 * GET /api/sessions?identity_id=<uuid> — list sessions for vault (no secret_hash).
 */
export async function GET(request: Request) {
  try {
    createServiceRoleClient();
  } catch {
    return jsonError("Server misconfigured: Supabase service role unavailable", 503);
  }

  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("identity_id");
  if (!rawId) {
    return jsonError("Query parameter identity_id is required", 400);
  }

  const idResult = sessionCreateBodySchema.shape.identity_id.safeParse(rawId);
  if (!idResult.success) {
    return jsonError("Invalid identity_id", 400);
  }

  let rows: Session[];
  try {
    rows = await listSessions(idResult.data);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("no vault for identity_id")) {
      return jsonError("Vault not found for this identity", 404);
    }
    throw e;
  }

  return NextResponse.json(rows.map(toPublicSession));
}
