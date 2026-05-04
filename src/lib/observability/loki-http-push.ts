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

export type PushLokiOptions = {
  /** Merged into Loki stream labels (`subsystem`, `deployment`, …). */
  streamLabels?: Record<string, string>
}

export async function pushLokiStructured(
  level: 'info' | 'warn' | 'error' | 'debug',
  input: StructuredLogInput,
  options?: PushLokiOptions,
): Promise<void> {
  const base = process.env.LOKI_HOST?.replace(/\/$/, '')
  const user = process.env.LOKI_USER
  const pass = process.env.LOKI_PASSWORD
  if (!base || !user || !pass) return

  const { message, service: inputService, ...rest } = input
  const service = String(inputService ?? DEFAULT_SERVICE)
  const line = JSON.stringify({ level, msg: message, service, ...rest })
  const tsNs = String(BigInt(Date.now()) * BigInt(1_000_000))

  const stream: Record<string, string> = { service, service_name: service }
  if (options?.streamLabels) {
    for (const [k, v] of Object.entries(options.streamLabels)) {
      const ks = k.trim()
      const vs = String(v).trim()
      if (ks && vs) stream[ks] = vs
    }
  }

  const body = {
    streams: [
      {
        stream,
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
