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
): Promise<
  { ok: true; bootId: string | null } | { ok: false; status: number; message: string }
> {
  const res = await fetchWithAuth(cfg, "/internal/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: identityId, nsec }),
  });
  if (res.ok) {
    let bootId: string | null = null;
    try {
      const j = (await res.json()) as { boot_id?: unknown };
      bootId = typeof j.boot_id === "string" ? j.boot_id : null;
    } catch {
      /* older daemon without boot_id */
    }
    return { ok: true, bootId };
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

/** After `nostrconnect://` DB row exists: optionally push outbound `connect` if bunker is unlocked. */
export async function notifyDaemonNostrConnectInitiate(
  cfg: DaemonInternalConfig,
  body: {
    identity_id: string;
    client_pubkey_hex: string;
    relay_urls: string[];
    secret: string;
  },
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const res = await fetchWithAuth(cfg, "/internal/nostrconnect-initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
 * Bunker running flag plus the daemon process boot id.
 * `reachable: false` when the daemon did not answer (callers must not end sessions on that).
 */
export async function getDaemonStatus(
  cfg: DaemonInternalConfig,
  identityId: string,
): Promise<{ reachable: boolean; running: boolean; bootId: string | null }> {
  try {
    const res = await fetchWithAuth(
      cfg,
      `/internal/status?identity_id=${encodeURIComponent(identityId)}`,
      { method: "GET", timeoutMs: 10_000 },
    );
    if (!res.ok) {
      return { reachable: false, running: false, bootId: null };
    }
    const j = (await res.json()) as { running?: boolean; boot_id?: unknown };
    return {
      reachable: true,
      running: Boolean(j.running),
      bootId: typeof j.boot_id === "string" ? j.boot_id : null,
    };
  } catch {
    return { reachable: false, running: false, bootId: null };
  }
}

export async function getDaemonBunkerRunning(
  cfg: DaemonInternalConfig,
  identityId: string,
): Promise<boolean> {
  return (await getDaemonStatus(cfg, identityId)).running;
}
