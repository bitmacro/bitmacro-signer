/**
 * Strip nested fields whose names resemble secrets before Loki push / aggregations.
 * Length/count fields like secretParamLen are kept.
 */

const MAX_DEPTH = 8;
const MAX_STRING = 520;
const MAX_ARRAY = 40;

const COMPOUND_TOKEN_KEYS = new Set(
  ["authtoken", "bearertoken", "accesstoken", "refreshtoken", "idtoken"].map(
    (x) => x.toLowerCase(),
  ),
);

/** Keys we never ship as structured fields (plaintext / transport secrets). */
const EXACT_SENSITIVE_KEYS = new Set(
  [
    "content",
    "plaintext",
    "authorization",
    "cookie",
    "nsec",
    "privkey",
    "privatekey",
    "decryptkey",
    "convkey",
    "ciphertext",
  ].map((k) => k.toLowerCase()),
);

function keyLooksSensitive(key: string): boolean {
  const k = key.toLowerCase();
  if (COMPOUND_TOKEN_KEYS.has(k)) return true;
  if (EXACT_SENSITIVE_KEYS.has(k)) return true;
  if (/(?:^|_)password$/i.test(k) || /(?:^|_)passphrase$/i.test(k))
    return true;
  // *_token / access_token, not "tokenization"
  if (/(?:^|_|^oauth)(access_|refresh_|id_|)(token)$/i.test(k)) return true;
  if (/^token$/i.test(k)) return true;
  if (/secret$/i.test(k) && /^(.*?_)?secret$/i.test(k)) return true; // *_secret as suffix only
  if (/^_secret|^secret_/i.test(k)) return true;
  if (/^secret$/i.test(k)) return true;
  return false;
}

function truncateString(s: string): string {
  if (s.length <= MAX_STRING) return s;
  return `${s.slice(0, MAX_STRING)}…[trunc]`;
}

function sanitizeRecursive(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();

  if (Array.isArray(value)) {
    const cap = Math.min(value.length, MAX_ARRAY);
    const out = value.slice(0, cap).map((v) => sanitizeRecursive(v, depth + 1));
    if (value.length > cap) out.push(`[+${value.length - cap} more]`);
    return out;
  }

  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (keyLooksSensitive(k)) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = sanitizeRecursive(v, depth + 1);
    }
    return out;
  }

  return truncateString(String(value));
}

export function sanitizeTelemetryContext(
  ctx: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!ctx || Object.keys(ctx).length === 0) return undefined;
  return sanitizeRecursive(ctx, 0) as Record<string, unknown>;
}
