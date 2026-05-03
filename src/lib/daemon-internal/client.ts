import type { DaemonInternalConfig } from "./env";

export type { DaemonInternalConfig };

async function fetchWithAuth(
  cfg: DaemonInternalConfig,
  path: string,
  init: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = 30_000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${cfg.baseUrl}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        ...rest.headers,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/** Ask the daemon to re-run `startBunker` subscriptions (e.g. after `nostrconnect://` relays change). No-op if that identity is not running. */
export async function notifyDaemonRefreshNip46Relays(
  cfg: DaemonInternalConfig,
  identityId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const res = await fetchWithAuth(cfg, "/internal/refresh-nip46-relays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: identityId }),
  });
  if (res.ok) {
    return { ok: true };
  }
  let message = res.statusText;
  try {
    const j = (await res.json()) as { error?: string };
    if (j.error) message = j.error;
  } catch {
    const t = await res.text();
    if (t) message = t.slice(0, 200);
  }
  return { ok: false, status: res.status, message };
}

/**
 * Sends nsec to the daemon (internal network). The caller should clear the string after success/failure.
 */
export async function notifyDaemonUnlock(
  cfg: DaemonInternalConfig,
  identityId: string,
  nsec: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const res = await fetchWithAuth(cfg, "/internal/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: identityId, nsec }),
  });
  if (res.ok) {
    return { ok: true };
  }
  let message = res.statusText;
  try {
    const j = (await res.json()) as { error?: string };
    if (j.error) message = j.error;
  } catch {
    const t = await res.text();
    if (t) message = t.slice(0, 200);
  }
  return { ok: false, status: res.status, message };
}

export async function notifyDaemonLock(
  cfg: DaemonInternalConfig,
  identityId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const res = await fetchWithAuth(cfg, "/internal/lock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: identityId }),
  });
  if (res.ok) {
    return { ok: true };
  }
  let message = res.statusText;
  try {
    const j = (await res.json()) as { error?: string };
    if (j.error) message = j.error;
  } catch {
    const t = await res.text();
    if (t) message = t.slice(0, 200);
  }
  return { ok: false, status: res.status, message };
}

export async function getDaemonBunkerRunning(
  cfg: DaemonInternalConfig,
  identityId: string,
): Promise<boolean> {
  const res = await fetchWithAuth(
    cfg,
    `/internal/status?identity_id=${encodeURIComponent(identityId)}`,
    { method: "GET" },
  );
  if (!res.ok) {
    return false;
  }
  try {
    const j = (await res.json()) as { running?: boolean };
    return Boolean(j.running);
  } catch {
    return false;
  }
}
