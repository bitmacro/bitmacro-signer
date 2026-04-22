import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET — lightweight connectivity check from inside the container (DNS + TLS + OpenAI edge).
 * Does not return the API key. Safe to curl from LAN: /api/help/network-check
 */
/** Path for GET /v1/models probe — base may be `https://api.openai.com` or full SDK base `…/v1`. */
function openAiModelsProbeUrl(baseNoTrailingSlash: string): string {
  if (baseNoTrailingSlash.endsWith("/v1")) {
    return `${baseNoTrailingSlash}/models`;
  }
  return `${baseNoTrailingSlash}/v1/models`;
}

const IPV4_LITERAL = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function errorChainCode(e: unknown): string | undefined {
  let cur: unknown = e;
  for (let i = 0; i < 6 && cur != null; i++) {
    if (typeof cur === "object" && cur !== null && "code" in cur) {
      const c = (cur as { code: unknown }).code;
      if (typeof c === "string" && c.length > 0) return c;
    }
    cur =
      cur instanceof Error && "cause" in cur
        ? (cur as Error & { cause?: unknown }).cause
        : undefined;
  }
  return undefined;
}

export async function GET() {
  const usingRelay = Boolean(process.env.OPENAI_BASE_URL?.trim());
  const baseRaw =
    process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://api.openai.com";
  let host: string;
  let probeUrl: URL;
  try {
    probeUrl = new URL(baseRaw);
    host = probeUrl.hostname;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_OPENAI_BASE_URL", base: baseRaw },
      { status: 400 },
    );
  }

  const dns = await import("node:dns/promises");
  const dns4: string[] = [];
  const dns6: string[] = [];
  if (IPV4_LITERAL.test(host)) {
    dns4.push(host);
  } else {
    try {
      for (const a of await dns.resolve4(host)) dns4.push(a);
    } catch {
      /* empty */
    }
    try {
      for (const a of await dns.resolve6(host)) dns6.push(a);
    } catch {
      /* empty */
    }
  }

  let httpsMs: number | null = null;
  let httpsStatus: number | null = null;
  let httpsError: string | null = null;
  let httpsCode: string | undefined;

  const url = openAiModelsProbeUrl(baseRaw);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });
    httpsMs = Date.now() - t0;
    httpsStatus = res.status;
  } catch (e) {
    httpsMs = Date.now() - t0;
    httpsError = e instanceof Error ? e.message : String(e);
    httpsCode = errorChainCode(e);
  }

  const probeFailed =
    httpsError != null || (httpsStatus != null && httpsStatus >= 500);

  let hint: string | null = null;
  if (probeFailed) {
    if (usingRelay) {
      hint =
        "OPENAI_BASE_URL is set but this container cannot reach the relay. Typical: nothing listens on that host:port on the VPS (nginx not running / wrong listen), or firewall. On the VPS: confirm `listen 10.0.0.1:8090` and reload nginx. From the Beelink host: `curl -v http://10.0.0.1:8090/v1/models` (expect 401/200). From the container: `docker exec signer-web wget -qO- --timeout=5 http://10.0.0.1:8090/v1/models` or install curl.";
    } else {
      hint =
        "Direct OpenAI unreachable from this host. Set OPENAI_BASE_URL to an HTTP(S) reverse proxy this machine can reach (e.g. VPS WireGuard IP). See bitmacro-server README.";
    }
  }

  return NextResponse.json({
    ok: httpsError == null && httpsStatus != null,
    host,
    base: baseRaw,
    dns: { A: dns4, AAAA: dns6 },
    // Key `https` kept for jq/docs; `scheme` reflects the actual URL (http or https).
    https: {
      url,
      scheme: probeUrl.protocol.replace(":", ""),
      ms: httpsMs,
      status: httpsStatus,
      error: httpsError,
      code: httpsCode ?? null,
    },
    hint,
  });
}
