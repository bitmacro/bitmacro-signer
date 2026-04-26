import { NextResponse } from "next/server";

import { getSessionCookie } from "@/lib/auth/session-cookie";
import { apiGET } from "@/lib/observability/api-route-wrapper";
import {
  getDaemonBunkerRunning,
  getDaemonInternalConfig,
} from "@/lib/daemon-internal";
import { isRunning } from "@/lib/bunker";
import { createServiceRoleClient } from "@/lib/supabase/server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/auth/status — current session identity, bunker running flag, and vault row presence.
 */
async function handleGet(_request: Request) {
  let daemonCfg: ReturnType<typeof getDaemonInternalConfig>;
  try {
    daemonCfg = getDaemonInternalConfig();
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Server misconfigured",
      503,
    );
  }

  let identityId: string | null;
  try {
    identityId = await getSessionCookie();
  } catch {
    return jsonError("Server misconfigured: session secret unavailable", 503);
  }

  if (!identityId) {
    return jsonError("Unauthorized", 401);
  }

  let running = false;
  if (daemonCfg) {
    running = await getDaemonBunkerRunning(daemonCfg, identityId);
  } else {
    running = isRunning(identityId);
  }

  let vault_exists = false;
  let npub: string | null = null;
  try {
    const supabase = createServiceRoleClient();
    const [{ data: vaultRow }, { data: idRow }] = await Promise.all([
      supabase
        .from("signer_vaults")
        .select("id")
        .eq("identity_id", identityId)
        .maybeSingle(),
      supabase
        .from("identities")
        .select("npub")
        .eq("id", identityId)
        .maybeSingle(),
    ]);
    vault_exists = Boolean(vaultRow?.id);
    const n = idRow?.npub;
    npub = typeof n === "string" && n.trim() ? n.trim() : null;
  } catch {
    /* ignore — status still useful without vault flag / npub */
  }

  return NextResponse.json({
    identity_id: identityId,
    is_running: running,
    vault_exists,
    npub,
  });
}

export const GET = apiGET("GET /api/auth/status", handleGet);
