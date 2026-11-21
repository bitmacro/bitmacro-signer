/** What a connected app may ask the bunker to do. Kinds 1, 6 and 7 match notes, reposts and reactions. */
export const DEFAULT_SESSION_SCOPES = [
  "get_public_key",
  "sign_event:1",
  "sign_event:6",
  "sign_event:7",
] as const;

const BARE_METHODS = new Set([
  "get_public_key",
  "nip04_encrypt",
  "nip04_decrypt",
  "nip44_encrypt",
  "nip44_decrypt",
  "sign_event",
]);

const MAX_SCOPES = 32;

export function scopesForNewSession(choice: {
  allowEncrypt: boolean;
  allowDecrypt: boolean;
}): string[] {
  const scopes: string[] = [...DEFAULT_SESSION_SCOPES];
  if (choice.allowEncrypt) {
    scopes.push("nip04_encrypt", "nip44_encrypt");
  }
  if (choice.allowDecrypt) {
    scopes.push("nip04_decrypt", "nip44_decrypt");
  }
  return scopes;
}

/** Returns a cleaned list, or null when a token is not a known permission. */
export function normalizeSessionScopes(input: readonly string[]): string[] | null {
  if (input.length === 0 || input.length > MAX_SCOPES) return null;
  const out: string[] = [];
  for (const raw of input) {
    const token = raw.trim();
    if (!isKnownScope(token)) return null;
    if (!out.includes(token)) out.push(token);
  }
  return out.length > 0 ? out : null;
}

export function resolveSessionScopes(input: string[] | undefined): string[] {
  if (input == null) return [...DEFAULT_SESSION_SCOPES];
  const normalized = normalizeSessionScopes(input);
  if (!normalized) {
    throw new Error("invalid session scopes");
  }
  return normalized;
}

export function storedScopesOrDefault(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_SESSION_SCOPES];
  const tokens = value.filter((item): item is string => typeof item === "string");
  return normalizeSessionScopes(tokens) ?? [...DEFAULT_SESSION_SCOPES];
}

export function scopeAllows(
  scopes: readonly string[],
  method: string,
  kind?: number,
): boolean {
  if (method === "sign_event") {
    if (scopes.includes("sign_event")) return true;
    if (kind == null || !Number.isInteger(kind)) return false;
    return scopes.includes(`sign_event:${kind}`);
  }
  return scopes.includes(method);
}

function isKnownScope(token: string): boolean {
  if (BARE_METHODS.has(token)) return true;
  const match = /^sign_event:(\d+)$/.exec(token);
  if (!match) return false;
  const kind = Number(match[1]);
  return kind >= 0 && kind <= 65535;
}
