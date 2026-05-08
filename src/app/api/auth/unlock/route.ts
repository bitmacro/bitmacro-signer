import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session-cookie";
import { apiPOST } from "@/lib/observability/api-route-wrapper";
import { pushLokiStructured } from "@/lib/observability/loki-http-push";
import { authUnlockBodySchema } from "@/lib/schemas/auth";
import { isRunning, startBunker, stopBunker } from "@/lib/bunker";
import {
  getDaemonBunkerRunning,
  getDaemonInternalConfig,
  notifyDaemonLock,
  notifyDaemonUnlock,
} from "@/lib/daemon-internal";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { VaultDecryptError, decryptNsec } from "@/lib/vault";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status },
  );
}

function daemonBaseForLog(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl.slice(0, 80);
  }
}

/**
 * POST /api/auth/unlock — resolve identity by npub, decrypt vault with passphrase, start bunker, session cookie.
 * Self-host with DAEMON_INTERNAL_URL: forwards nsec to signer-daemon (internal HTTP); otherwise startBunker in-process (dev).
 */
async function handlePost(request: Request) {
  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return jsonError("Server misconfigured: Supabase service role unavailable", 503);
  }

  let daemonCfg: ReturnType<typeof getDaemonInternalConfig>;
  try {
    daemonCfg = getDaemonInternalConfig();
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Server misconfigured",
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = authUnlockBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { npub, passphrase } = parsed.data;

  const { data: identity, error: idErr } = await supabase
    .from("identities")
    .select("id")
    .eq("npub", npub)
    .maybeSingle();

  if (idErr) {
    return jsonError(idErr.message, 500);
  }
  if (!identity?.id) {
    return jsonError("Npub not registered", 404);
  }

  const identity_id = identity.id as string;
  const journey = identity_id.slice(0, 8);

  const { data: vault, error: vaultErr } = await supabase
    .from("signer_vaults")
    .select("blob, salt, iv")
    .eq("identity_id", identity_id)
    .maybeSingle();

  if (vaultErr) {
    return jsonError(vaultErr.message, 500);
  }
  if (!vault?.blob || !vault?.salt || !vault?.iv) {
    return NextResponse.json({
      ok: true,
      vault_exists: false,
      identity_id,
      is_running: false,
    });
  }

  let nsec: string;
  try {
    nsec = await decryptNsec(
      { blob: vault.blob, salt: vault.salt, iv: vault.iv },
      passphrase,
    );
  } catch (e) {
    if (e instanceof VaultDecryptError) {
      return jsonError("Incorrect passphrase", 401);
    }
    throw e;
  }

  try {
    void pushLokiStructured(
      "info",
      {
        component: "auth-unlock-api",
        event: "auth_unlock_decrypted",
        journey_id: journey,
        request_id: randomUUID(),
        message:
          "Vault decrypted OK; invoking bunker start (daemon or in-process)",
        identityIdShort: journey,
        mode: daemonCfg ? "daemon" : "in_process",
        ...(daemonCfg
          ? { daemonHost: daemonBaseForLog(daemonCfg.baseUrl) }
          : {}),
      },
      { streamLabels: { subsystem: "signer-web-api" } },
    ).catch(() => {});

    if (daemonCfg) {
      void pushLokiStructured(
        "info",
        {
          component: "auth-unlock-api",
          event: "auth_unlock_daemon_invoke",
          journey_id: journey,
          request_id: randomUUID(),
          message: "POST /internal/unlock to signer-daemon (nsec omitted)",
          identityIdShort: journey,
          daemonHost: daemonBaseForLog(daemonCfg.baseUrl),
        },
        { streamLabels: { subsystem: "signer-web-api" } },
      ).catch(() => {});

      const out = await notifyDaemonUnlock(daemonCfg, identity_id, nsec);
      if (!out.ok) {
        void pushLokiStructured(
          "error",
          {
            component: "auth-unlock-api",
            event: "auth_unlock_daemon_rejected",
            journey_id: journey,
            request_id: randomUUID(),
            message: `Daemon returned ${out.status}: ${(out.message ?? "").slice(0, 280)}`,
            identityIdShort: journey,
            daemonHost: daemonBaseForLog(daemonCfg.baseUrl),
            upstreamStatus: out.status,
            daemonErrorPreview: (out.message ?? "").slice(0, 400),
          },
          { streamLabels: { subsystem: "signer-web-api" } },
        ).catch(() => {});

        return jsonError(
          out.message || "Daemon did not accept unlock",
          out.status >= 400 && out.status < 600 ? out.status : 502,
        );
      }

      void pushLokiStructured(
        "info",
        {
          component: "auth-unlock-api",
          event: "auth_unlock_daemon_ok",
          journey_id: journey,
          request_id: randomUUID(),
          message:
            "Daemon accepted unlock (startBunker completed on signer-daemon)",
          identityIdShort: journey,
          daemonHost: daemonBaseForLog(daemonCfg.baseUrl),
        },
        { streamLabels: { subsystem: "signer-web-api" } },
      ).catch(() => {});
    } else {
      await startBunker(identity_id, nsec);
      void pushLokiStructured(
        "info",
        {
          component: "auth-unlock-api",
          event: "auth_unlock_in_process_bunker_ok",
          journey_id: journey,
          request_id: randomUUID(),
          message: "startBunker finished in Next.js process",
          identityIdShort: journey,
        },
        { streamLabels: { subsystem: "signer-web-api" } },
      ).catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to start bunker";
    void pushLokiStructured(
      "error",
      {
        component: "auth-unlock-api",
        event: "auth_unlock_bunker_threw",
        journey_id: journey,
        request_id: randomUUID(),
        message: msg.slice(0, 400),
        identityIdShort: journey,
        errPreview: msg.slice(0, 500),
      },
      { streamLabels: { subsystem: "signer-web-api" } },
    ).catch(() => {});

    return jsonError(msg, 502);
  } finally {    nsec = "";
  }

  try {
    await setSessionCookie(identity_id);
  } catch (e) {
    if (daemonCfg) {
      await notifyDaemonLock(daemonCfg, identity_id).catch(() => {});
    } else {
      await stopBunker(identity_id).catch(() => {});
    }
    const msg =
      e instanceof Error ? e.message : "Failed to set session cookie";
    return jsonError(msg, 503);
  }

  let is_running = false;
  if (daemonCfg) {
    is_running = await getDaemonBunkerRunning(daemonCfg, identity_id);
  } else {
    is_running = isRunning(identity_id);
  }

  void pushLokiStructured(
    "info",
    {
      component: "auth-unlock-api",
      event: "auth_unlock_response_ok",
      journey_id: journey,
      request_id: randomUUID(),
      message: "Unlock flow complete; cookie set; returning JSON to client",
      identityIdShort: journey,
      is_running_after_status_poll: is_running,
    },
    { streamLabels: { subsystem: "signer-web-api" } },
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    vault_exists: true,
    identity_id,
    is_running,
  });
}

export const POST = apiPOST("POST /api/auth/unlock", handlePost);
