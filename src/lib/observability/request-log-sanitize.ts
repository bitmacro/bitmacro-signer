/**
 * Redação de inputs para logs (Loki) — nunca expor segredos, tokens, PII completa, nem invoices.
 */

const SENSITIVE_KEY_RE = /(password|passphrase|secret|token|apikey|api_key|authorization|auth|cookie|bearer|refresh|webhook|macaroon|csurf)/i
const PII_KEY_RE = /(email|phone|ssn|credit|card|address_line)/i

const MAX_STRING = 200
const MAX_DEPTH = 8
const MAX_KEYS = 60
const MAX_ARRAY = 30

function truncate(s: string, n = MAX_STRING): string {
  if (s.length <= n) return s
  return `${s.slice(0, n)}…(len=${s.length})`
}

function maskNpub(n: string): string {
  const t = n.trim()
  if (t.length < 20) return '[npub:short]'
  return `${t.slice(0, 12)}…${t.slice(-6)}`
}

function maskEmail(s: string): string {
  const t = s.trim()
  const at = t.indexOf('@')
  if (at < 1) return '[email]'
  const local = t.slice(0, at)
  const domain = t.slice(at + 1)
  const a = local.slice(0, 2)
  return `${a}***@${domain}`
}

function maskBoltOrLongString(s: string): string {
  if (s.startsWith('lnbc') || s.startsWith('lntb') || s.startsWith('lni')) {
    return `lightning_invoice(len=${s.length},prefix=${s.slice(0, 8)}…)`
  }
  return truncate(s)
}

/**
 * Object / array / value sanitization for logging.
 */
export function sanitizeForRequestLog(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[max depth]'
  if (value === null || value === undefined) return value
  if (typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') {
    const t = value
    if (t.length > 8_000) return `[string len=${t.length}]`
    if (/^npub1[acdefghjklmnpqrstuvwxyz023456789]{20,90}$/i.test(t)) return maskNpub(t)
    if (t.includes('@') && t.includes('.')) return maskEmail(t)
    if (t.startsWith('lnbc') || t.startsWith('lntb')) return maskBoltOrLongString(t)
    return truncate(t, MAX_STRING)
  }
  if (Array.isArray(value)) {
    const slice = value.slice(0, MAX_ARRAY)
    return slice.map((v) => sanitizeForRequestLog(v, depth + 1))
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    const keys = Object.keys(o)
    for (const k of keys.slice(0, MAX_KEYS)) {
      const low = k.toLowerCase()
      if (SENSITIVE_KEY_RE.test(k) || SENSITIVE_KEY_RE.test(low)) {
        out[k] = '[REDACTED]'
        continue
      }
      if (low === 'npub' || low.endsWith('_npub')) {
        out[k] = typeof o[k] === 'string' ? maskNpub(o[k] as string) : sanitizeForRequestLog(o[k], depth + 1)
        continue
      }
      if (low.includes('email')) {
        out[k] = typeof o[k] === 'string' ? maskEmail(o[k] as string) : sanitizeForRequestLog(o[k], depth + 1)
        continue
      }
      if (low.includes('voucher') || low === 'code' || low.includes('payment_hash') || low.includes('payment_request')) {
        out[k] = typeof o[k] === 'string' ? maskBoltOrLongString(String(o[k])) : sanitizeForRequestLog(o[k], depth + 1)
        continue
      }
      if (PII_KEY_RE.test(k)) {
        out[k] = typeof o[k] === 'string' ? '[PII_REDACTED]' : '[REDACTED_OBJECT]'
        continue
      }
      out[k] = sanitizeForRequestLog(o[k], depth + 1)
    }
    if (keys.length > MAX_KEYS) {
      out._truncated_key_count = keys.length - MAX_KEYS
    }
    return out
  }
  return String(value)
}

export function sanitizeQueryParams(sp: URLSearchParams): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of sp.entries()) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = sanitizeForRequestLog(v)
    }
  }
  return out
}

/** Cabeçalhos seguros (sem cookies / auth) */
export function safeRequestHeaderSnapshot(request: Request): Record<string, string> {
  const pick = [
    'content-type',
    'content-length',
    'accept',
    'x-forwarded-for',
    'x-vercel-id',
    'x-forwarded-proto',
    'referer',
  ] as const
  const o: Record<string, string> = {}
  for (const h of pick) {
    const v = request.headers.get(h)
    if (v) o[h] = h === 'referer' ? truncate(v, 150) : truncate(v, 200)
  }
  return o
}

export async function peekJsonBodyForLog(request: Request): Promise<unknown> {
  const method = request.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return undefined
  const ct = request.headers.get('content-type') ?? ''
  if (!ct.toLowerCase().includes('application/json')) {
    return { _content_type: ct || 'none', _note: 'body not parsed (non-JSON)' }
  }
  const clone = request.clone()
  const text = await clone.text().catch(() => '')
  if (!text) return { _empty: true }
  if (text.length > 1_000_000) {
    return { _too_large: true, length: text.length }
  }
  try {
    return sanitizeForRequestLog(JSON.parse(text) as unknown)
  } catch {
    return { _json_parse_error: true, length: text.length }
  }
}
