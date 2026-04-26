import { NextResponse } from "next/server";

import { identityBootstrapBodySchema } from "@/lib/schemas/identity";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getCorrelationIds } from "@/lib/observability/correlation";
import { apiPOST } from "@/lib/observability/api-route-wrapper";
import { pushLokiStructured } from "@/lib/observability/loki-http-push";
import { SignerEvents } from "@/lib/observability/signer-log-events";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status },
  );
}

/**
 * POST /api/identities/bootstrap — ensures an `identities` row for the npub (idempotent).
 * Used by the “I don’t have an npub yet” onboarding flow before POST /api/vault.
 */
async function handlePost(request: Request) {
  const ids = getCorrelationIds(request);
  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch {
    await pushLokiStructured("error", {
      component: "identities_bootstrap",
      event: SignerEvents.identityBootstrap.failed,
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      message: "supabase service role unavailable",
    });
    return jsonError("Server misconfigured: Supabase service role unavailable", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await pushLokiStructured("warn", {
      component: "identities_bootstrap",
      event: SignerEvents.identityBootstrap.failed,
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      message: "invalid json",
    });
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = identityBootstrapBodySchema.safeParse(body);
  if (!parsed.success) {
    await pushLokiStructured("warn", {
      component: "identities_bootstrap",
      event: SignerEvents.identityBootstrap.failed,
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      message: "validation failed",
    });
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { npub } = parsed.data;
  await pushLokiStructured("info", {
    component: "identities_bootstrap",
    event: SignerEvents.identityBootstrap.started,
    journey_id: ids.journey_id,
    request_id: ids.request_id,
    message: "bootstrap",
  });

  const { data: existing, error: selErr } = await supabase
    .from("identities")
    .select("id")
    .eq("npub", npub)
    .maybeSingle();

  if (selErr) {
    await pushLokiStructured("error", {
      component: "identities_bootstrap",
      event: SignerEvents.identityBootstrap.failed,
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      message: "select failed",
    });
    return jsonError(selErr.message, 500);
  }
  if (existing?.id) {
    await pushLokiStructured("info", {
      component: "identities_bootstrap",
      event: SignerEvents.identityBootstrap.success,
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      message: "existing identity",
      created: false,
    });
    return NextResponse.json({
      identity_id: existing.id as string,
      created: false,
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("identities")
    .insert({ npub })
    .select("id")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      const { data: race } = await supabase
        .from("identities")
        .select("id")
        .eq("npub", npub)
        .maybeSingle();
      if (race?.id) {
        await pushLokiStructured("info", {
          component: "identities_bootstrap",
          event: SignerEvents.identityBootstrap.success,
          journey_id: ids.journey_id,
          request_id: ids.request_id,
          message: "race insert deduped",
          created: false,
        });
        return NextResponse.json({
          identity_id: race.id as string,
          created: false,
        });
      }
    }
    await pushLokiStructured("error", {
      component: "identities_bootstrap",
      event: SignerEvents.identityBootstrap.failed,
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      message: "insert failed",
    });
    return jsonError(insErr.message, 500);
  }

  if (!inserted?.id) {
    await pushLokiStructured("error", {
      component: "identities_bootstrap",
      event: SignerEvents.identityBootstrap.failed,
      journey_id: ids.journey_id,
      request_id: ids.request_id,
      message: "no id returned",
    });
    return jsonError("Insert did not return identity id", 500);
  }

  await pushLokiStructured("info", {
    component: "identities_bootstrap",
    event: SignerEvents.identityBootstrap.success,
    journey_id: ids.journey_id,
    request_id: ids.request_id,
    message: "created",
    created: true,
  });
  return NextResponse.json({
    identity_id: inserted.id as string,
    created: true,
  });
}

export const POST = apiPOST("POST /api/identities/bootstrap", handlePost);
