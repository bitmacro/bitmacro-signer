/**
 * Logger usado só pelo api-route-wrapper (Loki push, sem Supabase getUser).
 */
import { pushLokiStructured } from '@/lib/observability/loki-http-push'

const service = () => (process.env.BITMACRO_LOG_SERVICE as string) || 'bitmacro-signer'

function stripNoise(ctx: Record<string, unknown>) {
  const { skipUserLookup: _s, ...rest } = ctx
  return rest
}

export const routeHttpLogger = {
  info: async (component: string, message: string, context: Record<string, unknown> = {}) => {
    const c = stripNoise(context)
    await pushLokiStructured('info', {
      service: service(),
      component,
      event: String(c.event ?? 'api.http'),
      journey_id: String(c.journey_id ?? 'none'),
      request_id: String(c.request_id ?? 'none'),
      message,
      ...c,
    })
  },
  warn: async (component: string, message: string, context: Record<string, unknown> = {}) => {
    const c = stripNoise(context)
    await pushLokiStructured('warn', {
      service: service(),
      component,
      event: String(c.event ?? 'api.http'),
      journey_id: String(c.journey_id ?? 'none'),
      request_id: String(c.request_id ?? 'none'),
      message,
      ...c,
    })
  },
  error: async (
    component: string,
    message: string,
    error?: Error | unknown,
    context: Record<string, unknown> = {}
  ) => {
    const c = stripNoise(context)
    const errMsg = error instanceof Error ? error.message : error != null ? String(error) : undefined
    const errStack = error instanceof Error ? error.stack?.slice(0, 8000) : undefined
    await pushLokiStructured('error', {
      service: service(),
      component,
      event: String(c.event ?? 'api.http.error'),
      journey_id: String(c.journey_id ?? 'none'),
      request_id: String(c.request_id ?? 'none'),
      message,
      err_message: errMsg,
      err_stack: errStack,
      ...c,
    })
  },
}
