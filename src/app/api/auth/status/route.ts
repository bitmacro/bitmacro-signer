import { NextResponse } from "next/server";

import { getSessionCookie } from "@/lib/auth/session-cookie";
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
export async function GET() {
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
  try {
    const supabase = createServiceRoleClient();
    const { data: vaultRow } = await supabase
      .from("signer_vaults")
      .select("id")
      .eq("identity_id", identityId)
      .maybeSingle();
    vault_exists = Boolean(vaultRow?.id);
  } catch {
    /* ignore — status still useful without vault flag */
  }

  return NextResponse.json({
    identity_id: identityId,
    is_running: running,
    vault_exists,
  });
}
