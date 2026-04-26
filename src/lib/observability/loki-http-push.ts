/**
 * Push com await para Loki — adequado a serverless / curta duração do processo.
 */
const DEFAULT_SERVICE =
  (process.env.BITMACRO_LOG_SERVICE as string | undefined) || 'bitmacro-signer'

export type StructuredLogInput = {
  service?: string
  component: string
  event: string
  journey_id: string
  request_id: string
  message: string
  [key: string]: unknown
}

function basicAuthHeader(user: string, pass: string): string {
  const pair = `${user}:${pass}`
  if (typeof Buffer !== 'undefined') {
    return `Basic ${Buffer.from(pair, 'utf8').toString('base64')}`
  }
  return `Basic ${btoa(pair)}`
}

export async function pushLokiStructured(
  level: 'info' | 'warn' | 'error' | 'debug',
  input: StructuredLogInput
): Promise<void> {
  const base = process.env.LOKI_HOST?.replace(/\/$/, '')
  const user = process.env.LOKI_USER
  const pass = process.env.LOKI_PASSWORD
  if (!base || !user || !pass) return

  const service = String(input.service ?? DEFAULT_SERVICE)
  const { service: _s, message, ...rest } = input
  const line = JSON.stringify({ level, msg: message, service, ...rest })
  const tsNs = String(BigInt(Date.now()) * BigInt(1_000_000))

  const body = {
    streams: [
      {
        stream: { service, service_name: service },
        values: [[tsNs, line]],
      },
    ],
  }

  try {
    const res = await fetch(`${base}/loki/api/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuthHeader(user, pass),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok && process.env.NODE_ENV === 'development') {
      const t = await res.text()
      console.warn('[Loki push]', res.status, t.slice(0, 200))
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Loki push failed]', e)
    }
  }
}
