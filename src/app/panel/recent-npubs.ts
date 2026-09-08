import { NPUB_REGEX } from "@/lib/schemas/auth";

const STORAGE_KEY = "bm_signer_recent_npubs";
const MAX = 8;

function normalize(npub: string): string {
  return npub.trim().toLowerCase();
}

export function listRecentNpubs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && NPUB_REGEX.test(x))
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberNpub(npub: string): string[] {
  const value = normalize(npub);
  if (!NPUB_REGEX.test(value)) return listRecentNpubs();
  const next = [value, ...listRecentNpubs().filter((x) => x !== value)].slice(
    0,
    MAX,
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

export function forgetNpub(npub: string): string[] {
  const value = normalize(npub);
  const next = listRecentNpubs().filter((x) => x !== value);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
