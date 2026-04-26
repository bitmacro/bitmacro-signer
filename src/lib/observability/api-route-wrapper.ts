import { getCorrelationIds } from '@/lib/observability/correlation'
import { routeHttpLogger } from '@/lib/observability/route-http-logger'
import { ApiLogEvents } from './api-log-events'
import {
  peekJsonBodyForLog,
  safeRequestHeaderSnapshot,
  sanitizeForRequestLog,
  sanitizeQueryParams,
} from './request-log-sanitize'

const C = 'API'

/** Next.js route `context`: `params` is required (Promise) for type compatibility with the framework. */
export type ParamsBag = { params: Promise<Record<string, string | string[]>> }

function endpointOutcome(status: number): 'ok' | 'client_error' | 'server_error' | 'redirect' {
  if (status >= 500) return 'server_error'
  if (status >= 400) return 'client_error'
  if (status >= 300 && status < 400) return 'redirect'
  return 'ok'
}

async function resolvePathParams(ctx: ParamsBag): Promise<unknown> {
  try {
    return sanitizeForRequestLog(await ctx.params)
  } catch {
    return { _error: 'params_await_failed' }
  }
}

function wrapNoBodyMethod(
  method: 'GET' | 'HEAD' | 'OPTIONS',
  routeId: string,
  handler: (req: Request, ctx: ParamsBag) => Promise<Response>
): (req: Request, ctx: ParamsBag) => Promise<Response> {
  return async (request: Request, context: ParamsBag) => {
    const ids = getCorrelationIds(request)
    const t0 = Date.now()
    const url = new URL(request.url)
    const pathParams = await resolvePathParams(context)
    await routeHttpLogger.info(C, `→ ${routeId}`, {
      event: ApiLogEvents.requestStart,
      route: routeId,
      method,
      path: url.pathname,
      search: sanitizeQueryParams(url.searchParams),
      path_params: pathParams,
      headers: safeRequestHeaderSnapshot(request),
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      skipUserLookup: true,
    })
    try {
      const res = await handler(request, context)
      const duration_ms = Date.now() - t0
      const ctxLog = {
        event: ApiLogEvents.requestEnd,
        route: routeId,
        method,
        status: res.status,
        duration_ms,
        outcome: endpointOutcome(res.status),
        journey_id: ids.journey_id,
        request_id: ids.request_id,
        skipUserLookup: true,
      }
      if (res.status >= 500) {
        await routeHttpLogger.error(C, `← ${routeId} HTTP ${res.status}`, new Error('Bad upstream status'), ctxLog)
      } else if (res.status >= 400) {
        await routeHttpLogger.warn(C, `← ${routeId} HTTP ${res.status}`, ctxLog)
      } else {
        await routeHttpLogger.info(C, `← ${routeId} ${res.status} ${duration_ms}ms`, ctxLog)
      }
      return res
    } catch (err) {
      const duration_ms = Date.now() - t0
      await routeHttpLogger.error(
        C,
        `✖ ${routeId} unhandled`,
        err instanceof Error ? err : new Error(String(err)),
        {
          event: ApiLogEvents.requestError,
          route: routeId,
          method,
          duration_ms,
          journey_id: ids.journey_id,
          request_id: ids.request_id,
          skipUserLookup: true,
        }
      )
      throw err
    }
  }
}

export function apiGET(
  routeId: string,
  handler: (req: Request, ctx: ParamsBag) => Promise<Response>
): (req: Request, ctx: ParamsBag) => Promise<Response> {
  return wrapNoBodyMethod('GET', routeId, handler)
}

export function apiHEAD(
  routeId: string,
  handler: (req: Request, ctx: ParamsBag) => Promise<Response>
): (req: Request, ctx: ParamsBag) => Promise<Response> {
  return wrapNoBodyMethod('HEAD', routeId, handler)
}

export function apiOPTIONS(
  routeId: string,
  handler: (req: Request, ctx: ParamsBag) => Promise<Response>
): (req: Request, ctx: ParamsBag) => Promise<Response> {
  return wrapNoBodyMethod('OPTIONS', routeId, handler)
}

export function apiPOST(
  routeId: string,
  handler: (req: Request, ctx: ParamsBag) => Promise<Response>
): (req: Request, ctx: ParamsBag) => Promise<Response> {
  return async (request: Request, context: ParamsBag) => {
    const ids = getCorrelationIds(request)
    const t0 = Date.now()
    const url = new URL(request.url)
    const pathParams = await resolvePathParams(context)
    const body = await peekJsonBodyForLog(request)
    await routeHttpLogger.info(C, `→ ${routeId}`, {
      event: ApiLogEvents.requestStart,
      route: routeId,
      method: 'POST',
      path: url.pathname,
      search: sanitizeQueryParams(url.searchParams),
      path_params: pathParams,
      body,
      headers: safeRequestHeaderSnapshot(request),
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      skipUserLookup: true,
    })
    try {
      const res = await handler(request, context)
      const duration_ms = Date.now() - t0
      const ctxLog = {
        event: ApiLogEvents.requestEnd,
        route: routeId,
        method: 'POST',
        status: res.status,
        duration_ms,
        outcome: endpointOutcome(res.status),
        journey_id: ids.journey_id,
        request_id: ids.request_id,
        skipUserLookup: true,
      }
      if (res.status >= 500) {
        await routeHttpLogger.error(C, `← ${routeId} HTTP ${res.status}`, new Error('Bad upstream status'), ctxLog)
      } else if (res.status >= 400) {
        await routeHttpLogger.warn(C, `← ${routeId} HTTP ${res.status}`, ctxLog)
      } else {
        await routeHttpLogger.info(C, `← ${routeId} ${res.status} ${duration_ms}ms`, ctxLog)
      }
      return res
    } catch (err) {
      const duration_ms = Date.now() - t0
      await routeHttpLogger.error(
        C,
        `✖ ${routeId} unhandled`,
        err instanceof Error ? err : new Error(String(err)),
        {
          event: ApiLogEvents.requestError,
          route: routeId,
          method: 'POST',
          duration_ms,
          journey_id: ids.journey_id,
          request_id: ids.request_id,
          skipUserLookup: true,
        }
      )
      throw err
    }
  }
}

export function apiDELETE(
  routeId: string,
  handler: (req: Request, ctx: ParamsBag) => Promise<Response>
): (req: Request, ctx: ParamsBag) => Promise<Response> {
  return async (request: Request, context: ParamsBag) => {
    const ids = getCorrelationIds(request)
    const t0 = Date.now()
    const url = new URL(request.url)
    const pathParams = await resolvePathParams(context)
    const body = await peekJsonBodyForLog(request)
    await routeHttpLogger.info(C, `→ ${routeId}`, {
      event: ApiLogEvents.requestStart,
      route: routeId,
      method: 'DELETE',
      path: url.pathname,
      search: sanitizeQueryParams(url.searchParams),
      path_params: pathParams,
      body,
      headers: safeRequestHeaderSnapshot(request),
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      skipUserLookup: true,
    })
    try {
      const res = await handler(request, context)
      const duration_ms = Date.now() - t0
      const ctxLog = {
        event: ApiLogEvents.requestEnd,
        route: routeId,
        method: 'DELETE',
        status: res.status,
        duration_ms,
        outcome: endpointOutcome(res.status),
        journey_id: ids.journey_id,
        request_id: ids.request_id,
        skipUserLookup: true,
      }
      if (res.status >= 500) {
        await routeHttpLogger.error(C, `← ${routeId} HTTP ${res.status}`, new Error('Bad upstream status'), ctxLog)
      } else if (res.status >= 400) {
        await routeHttpLogger.warn(C, `← ${routeId} HTTP ${res.status}`, ctxLog)
      } else {
        await routeHttpLogger.info(C, `← ${routeId} ${res.status} ${duration_ms}ms`, ctxLog)
      }
      return res
    } catch (err) {
      const duration_ms = Date.now() - t0
      await routeHttpLogger.error(
        C,
        `✖ ${routeId} unhandled`,
        err instanceof Error ? err : new Error(String(err)),
        {
          event: ApiLogEvents.requestError,
          route: routeId,
          method: 'DELETE',
          duration_ms,
          journey_id: ids.journey_id,
          request_id: ids.request_id,
          skipUserLookup: true,
        }
      )
      throw err
    }
  }
}

export function apiPUT(
  routeId: string,
  handler: (req: Request, ctx: ParamsBag) => Promise<Response>
): (req: Request, ctx: ParamsBag) => Promise<Response> {
  return async (request: Request, context: ParamsBag) => {
    const ids = getCorrelationIds(request)
    const t0 = Date.now()
    const url = new URL(request.url)
    const pathParams = await resolvePathParams(context)
    const body = await peekJsonBodyForLog(request)
    await routeHttpLogger.info(C, `→ ${routeId}`, {
      event: ApiLogEvents.requestStart,
      route: routeId,
      method: 'PUT',
      path: url.pathname,
      search: sanitizeQueryParams(url.searchParams),
      path_params: pathParams,
      body,
      headers: safeRequestHeaderSnapshot(request),
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      skipUserLookup: true,
    })
    try {
      const res = await handler(request, context)
      const duration_ms = Date.now() - t0
      const ctxLog = {
        event: ApiLogEvents.requestEnd,
        route: routeId,
        method: 'PUT',
        status: res.status,
        duration_ms,
        outcome: endpointOutcome(res.status),
        journey_id: ids.journey_id,
        request_id: ids.request_id,
        skipUserLookup: true,
      }
      if (res.status >= 500) {
        await routeHttpLogger.error(C, `← ${routeId} HTTP ${res.status}`, new Error('Bad upstream status'), ctxLog)
      } else if (res.status >= 400) {
        await routeHttpLogger.warn(C, `← ${routeId} HTTP ${res.status}`, ctxLog)
      } else {
        await routeHttpLogger.info(C, `← ${routeId} ${res.status} ${duration_ms}ms`, ctxLog)
      }
      return res
    } catch (err) {
      const duration_ms = Date.now() - t0
      await routeHttpLogger.error(
        C,
        `✖ ${routeId} unhandled`,
        err instanceof Error ? err : new Error(String(err)),
        {
          event: ApiLogEvents.requestError,
          route: routeId,
          method: 'PUT',
          duration_ms,
          journey_id: ids.journey_id,
          request_id: ids.request_id,
          skipUserLookup: true,
        }
      )
      throw err
    }
  }
}

function wrapBodyMethod(
  method: 'PATCH',
  routeId: string,
  handler: (req: Request, ctx: ParamsBag) => Promise<Response>
): (req: Request, ctx: ParamsBag) => Promise<Response> {
  return async (request: Request, context: ParamsBag) => {
    const ids = getCorrelationIds(request)
    const t0 = Date.now()
    const url = new URL(request.url)
    const pathParams = await resolvePathParams(context)
    const body = await peekJsonBodyForLog(request)
    await routeHttpLogger.info(C, `→ ${routeId}`, {
      event: ApiLogEvents.requestStart,
      route: routeId,
      method,
      path: url.pathname,
      search: sanitizeQueryParams(url.searchParams),
      path_params: pathParams,
      body,
      headers: safeRequestHeaderSnapshot(request),
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      skipUserLookup: true,
    })
    try {
      const res = await handler(request, context)
      const duration_ms = Date.now() - t0
      const ctxLog = {
        event: ApiLogEvents.requestEnd,
        route: routeId,
        method,
        status: res.status,
        duration_ms,
        outcome: endpointOutcome(res.status),
        journey_id: ids.journey_id,
        request_id: ids.request_id,
        skipUserLookup: true,
      }
      if (res.status >= 500) {
        await routeHttpLogger.error(C, `← ${routeId} HTTP ${res.status}`, new Error('Bad upstream status'), ctxLog)
      } else if (res.status >= 400) {
        await routeHttpLogger.warn(C, `← ${routeId} HTTP ${res.status}`, ctxLog)
      } else {
        await routeHttpLogger.info(C, `← ${routeId} ${res.status} ${duration_ms}ms`, ctxLog)
      }
      return res
    } catch (err) {
      const duration_ms = Date.now() - t0
      await routeHttpLogger.error(
        C,
        `✖ ${routeId} unhandled`,
        err instanceof Error ? err : new Error(String(err)),
        {
          event: ApiLogEvents.requestError,
          route: routeId,
          method,
          duration_ms,
          journey_id: ids.journey_id,
          request_id: ids.request_id,
          skipUserLookup: true,
        }
      )
      throw err
    }
  }
}

export const apiPATCH = (routeId: string, handler: (req: Request, ctx: ParamsBag) => Promise<Response>) =>
  wrapBodyMethod('PATCH', routeId, handler)
