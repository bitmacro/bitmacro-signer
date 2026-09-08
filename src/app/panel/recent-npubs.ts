import { NPUB_REGEX } from "@/lib/schemas/auth";

const STORAGE_KEY = "bm_signer_recent_npubs";
const MAX = 8;
const PICTURE_MAX = 2048;

export type RecentIdentity = {
  npub: string;
  name?: string;
  picture?: string;
  nip05?: string;
};

type ProfilePatch = {
  npub: string;
  name?: string;
  picture?: string;
  nip05?: string;
};

function normalize(npub: string): string {
  return npub.trim().toLowerCase();
}

function cleanName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim().slice(0, 80);
  return t || undefined;
}

function cleanNip05(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim().slice(0, 120);
  return t || undefined;
}

function cleanPicture(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  if (t.length === 0 || t.length > PICTURE_MAX) return undefined;
  if (!/^https?:\/\//i.test(t)) return undefined;
  return t;
}

function asIdentity(raw: unknown): RecentIdentity | null {
  if (typeof raw === "string") {
    const npub = normalize(raw);
    return NPUB_REGEX.test(npub) ? { npub } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const npub = typeof rec.npub === "string" ? normalize(rec.npub) : "";
  if (!NPUB_REGEX.test(npub)) return null;
  return {
    npub,
    name: cleanName(rec.name),
    picture: cleanPicture(rec.picture),
    nip05: cleanNip05(rec.nip05),
  };
}

function persist(items: RecentIdentity[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 2, items }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function listRecentIdentities(): RecentIdentity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const source = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : [];
    const out: RecentIdentity[] = [];
    const seen = new Set<string>();
    for (const row of source) {
      const id = asIdentity(row);
      if (!id || seen.has(id.npub)) continue;
      seen.add(id.npub);
      out.push(id);
      if (out.length >= MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function listRecentNpubs(): string[] {
  return listRecentIdentities().map((x) => x.npub);
}

export function rememberNpub(
  npub: string,
  profile?: Omit<ProfilePatch, "npub">,
): RecentIdentity[] {
  const value = normalize(npub);
  if (!NPUB_REGEX.test(value)) return listRecentIdentities();
  const current = listRecentIdentities();
  const prev = current.find((x) => x.npub === value);
  const entry: RecentIdentity = {
    npub: value,
    name: cleanName(profile?.name) ?? prev?.name,
    picture: cleanPicture(profile?.picture) ?? prev?.picture,
    nip05: cleanNip05(profile?.nip05) ?? prev?.nip05,
  };
  const next = [entry, ...current.filter((x) => x.npub !== value)].slice(
    0,
    MAX,
  );
  persist(next);
  return next;
}

export function patchRecentProfiles(
  patches: ProfilePatch[],
): RecentIdentity[] {
  const byNpub = new Map<string, ProfilePatch>();
  for (const p of patches) {
    const npub = normalize(p.npub);
    if (!NPUB_REGEX.test(npub)) continue;
    byNpub.set(npub, p);
  }
  const next = listRecentIdentities().map((item) => {
    const p = byNpub.get(item.npub);
    if (!p) return item;
    return {
      npub: item.npub,
      name: cleanName(p.name) ?? item.name,
      picture: cleanPicture(p.picture) ?? item.picture,
      nip05: cleanNip05(p.nip05) ?? item.nip05,
    };
  });
  persist(next);
  return next;
}

export function forgetNpub(npub: string): RecentIdentity[] {
  const value = normalize(npub);
  const next = listRecentIdentities().filter((x) => x.npub !== value);
  persist(next);
  return next;
}

export function identityLabel(item: RecentIdentity, fallback: string): string {
  return item.name?.trim() || item.nip05?.trim() || fallback;
}
