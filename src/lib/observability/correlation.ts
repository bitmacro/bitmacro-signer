import { randomUUID } from 'crypto'

export type CorrelationIds = {
  journey_id: string
  request_id: string
}

export function getCorrelationIds(request: Request): CorrelationIds {
  const journey = request.headers.get('x-journey-id')?.trim() || 'none'
  const req = request.headers.get('x-request-id')?.trim() || randomUUID()
  return { journey_id: journey, request_id: req }
}
