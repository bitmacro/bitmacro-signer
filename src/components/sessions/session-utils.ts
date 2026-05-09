/** Shared types and helpers for the client sessions UI (no server imports). */

export type SessionRow = {
  id: string;
  vault_id: string;
  app_pubkey: string;
  app_name: string | null;
  nip46_relay_urls?: string[] | null;
  used: boolean;
  expires_at: string;
  created_at: string;
};

export type SessionStatus = "pending" | "used" | "expired";

export type StatusFilter = "all" | SessionStatus;

export type SortMode = "expires" | "newest" | "oldest";

export function getSessionStatus(
  row: SessionRow,
  nowMs = Date.now(),
): SessionStatus {
  if (row.used) return "used";
  if (new Date(row.expires_at).getTime() <= nowMs) return "expired";
  return "pending";
}

/** For ordering: pending (0) → expired (1) → used (2). */
function sessionSortTier(row: SessionRow, nowMs: number): 0 | 1 | 2 {
  const s = getSessionStatus(row, nowMs);
  if (s === "pending") return 0;
  if (s === "expired") return 1;
  return 2;
}

export function filterSessionsByStatus(
  rows: SessionRow[],
  filter: StatusFilter,
  nowMs = Date.now(),
): SessionRow[] {
  if (filter === "all") return rows;
  return rows.filter((r) => getSessionStatus(r, nowMs) === filter);
}

function compareExpiresSoonest(a: SessionRow, b: SessionRow, nowMs: number): number {
  const ta = sessionSortTier(a, nowMs);
  const tb = sessionSortTier(b, nowMs);
  if (ta !== tb) return ta - tb;
  const ea = new Date(a.expires_at).getTime();
  const eb = new Date(b.expires_at).getTime();
  if (ta === 0) return ea - eb;
  if (ta === 1) return eb - ea;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function sortSessions(
  rows: SessionRow[],
  mode: SortMode,
  nowMs = Date.now(),
): SessionRow[] {
  const copy = [...rows];
  if (mode === "newest") {
    copy.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return copy;
  }
  if (mode === "oldest") {
    copy.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return copy;
  }
  copy.sort((a, b) => compareExpiresSoonest(a, b, nowMs));
  return copy;
}

/** Human-readable relative instant (e.g. "in 2 days", "3 hours ago"). */
export function formatRelativeToNow(
  target: Date,
  now: Date,
  locale: string,
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMs = target.getTime() - now.getTime();
  const diffM = diffMs / 60000;
  if (Math.abs(diffM) < 60) {
    return rtf.format(Math.round(diffM), "minute");
  }
  const diffH = diffMs / 3600000;
  if (Math.abs(diffH) < 48) {
    return rtf.format(Math.round(diffH), "hour");
  }
  const diffD = diffMs / 86400000;
  return rtf.format(Math.round(diffD), "day");
}

export function truncateHexMiddle(hex: string, head = 14, tail = 12): string {
  const t = hex.trim();
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}
