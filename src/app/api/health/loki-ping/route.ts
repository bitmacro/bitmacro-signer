import { NextResponse } from "next/server";

import { getCorrelationIds } from "@/lib/observability/correlation";
import { apiGET } from "@/lib/observability/api-route-wrapper";
import { pushLokiStructured } from "@/lib/observability/loki-http-push";
import { SignerEvents } from "@/lib/observability/signer-log-events";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/loki-ping — teste de push Loki (service=bitmacro-signer).
 * Grafana: {service_name="bitmacro-signer"} |= "signer.loki.ping"
 */
async function handleGet(request: Request) {
  const ids = getCorrelationIds(request);
  await pushLokiStructured("info", {
    component: "health",
    event: SignerEvents.loki.ping,
    journey_id: ids.journey_id,
    request_id: ids.request_id,
    message: "LOKI_PING",
    probe: true,
  });
  return NextResponse.json({
    ok: true,
    service: "bitmacro-signer",
    event: SignerEvents.loki.ping,
    at: new Date().toISOString(),
  });
}

export const GET = apiGET("GET /api/health/loki-ping", handleGet);
