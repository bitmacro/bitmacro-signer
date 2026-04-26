/** Catálogo de eventos de tracing HTTP (Loki: filtrar por event=api.request.*) */
export const ApiLogEvents = {
  requestStart: 'api.request.start',
  requestEnd: 'api.request.end',
  requestError: 'api.request.error',
} as const
