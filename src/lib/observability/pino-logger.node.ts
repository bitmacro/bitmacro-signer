import pino from 'pino'

const SERVICE = process.env.BITMACRO_LOG_SERVICE || 'bitmacro-signer'

export type StructuredLogInput = {
  service?: string
  component: string
  event: string
  journey_id: string
  request_id: string
  message: string
  [key: string]: unknown
}

let root: pino.Logger | null = null

function getRoot(): pino.Logger {
  if (root) return root
  const hasLoki =
    Boolean(process.env.LOKI_HOST) && Boolean(process.env.LOKI_USER) && Boolean(process.env.LOKI_PASSWORD)

  const base: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  }

  if (hasLoki) {
    const transport = pino.transport({
      target: 'pino-loki',
      options: {
        host: process.env.LOKI_HOST,
        basicAuth: {
          username: process.env.LOKI_USER,
          password: process.env.LOKI_PASSWORD,
        },
        batching: { interval: 5, maxBufferSize: 10_000 },
        labels: { service: SERVICE },
        propsToLabels: ['service'],
        silenceErrors: true,
        timeout: 30_000,
      },
    })
    root = pino({ ...base, base: { service: SERVICE } }, transport)
  } else {
    root = pino({ ...base, base: { service: SERVICE } })
  }
  return root
}

export function logStructured(
  level: 'info' | 'warn' | 'error' | 'debug',
  input: StructuredLogInput
): void {
  const {
    service: svcIn,
    component,
    event,
    journey_id,
    request_id,
    message,
    ...rest
  } = input
  const service = svcIn ?? SERVICE
  const line = { service, component, event, journey_id, request_id, ...rest }
  getRoot()[level](line, message)
}
