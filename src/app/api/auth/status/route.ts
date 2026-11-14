import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  getSessionCookieClaims,
  setSessionCookie,
} from "@/lib/auth/session-cookie";
import { apiGET } from "@/lib/observability/api-route-wrapper";
import {
  getDaemonInternalConfig,
  getDaemonStatus,
} from "@/lib/daemon-internal";
import { isRunning } from "@/lib/bunker";
import { createServiceRoleClient } from "@/lib/supabase/server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/auth/status — current session identity, bunker running flag, and vault row presence.
 * No valid cookie → 200 with `identity_id: null` (avoids noisy 401 in DevTools for logged-out polls).
 */
async function handleGet(request: Request) {
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

  let claims: { identityId: string; bootId: string | null } | null;
  try {
    claims = await getSessionCookieClaims();
  } catch {
    return jsonError("Server misconfigured: session secret unavailable", 503);
  }

  const loggedOut = (sessionEnded?: string) =>
    NextResponse.json({
      identity_id: null,
      is_running: false,
      vault_exists: false,
      npub: null,
      ...(sessionEnded ? { session_ended: sessionEnded } : {}),
    });

  if (!claims) {
    return loggedOut();
  }
  const identityId = claims.identityId;

  let running = false;
  if (daemonCfg) {
    const st = await getDaemonStatus(daemonCfg, identityId);
    running = st.running;
    /**
     * Daemon restarted since this session was unlocked (different boot id, or a
     * session from before boot ids existed): the bunker is gone, so end the web
     * session too. Not when the daemon is unreachable — a blip must not log out.
     */
    if (st.reachable && st.bootId && st.bootId !== claims.bootId) {
      await clearSessionCookie().catch(() => {});
      return loggedOut("daemon_restarted");
    }
  } else {
    running = isRunning(identityId);
  }

  /** Sliding session: new JWT + `Set-Cookie` maxAge while the current token is still valid. */
  try {
    await setSessionCookie(identityId, claims.bootId);
  } catch {
    /* Non-fatal: verified identity above; client keeps prior cookie for this response. */
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
