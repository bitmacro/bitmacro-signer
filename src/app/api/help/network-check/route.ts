import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET — lightweight connectivity check from inside the container (DNS + TLS + OpenAI edge).
 * Does not return the API key. Safe to curl from LAN: /api/help/network-check
 */
export async function GET() {
  const baseRaw =
    process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://api.openai.com";
  let host: string;
  try {
    host = new URL(baseRaw).hostname;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_OPENAI_BASE_URL", base: baseRaw },
      { status: 400 },
    );
  }

  const dns = await import("node:dns/promises");
  const dns4: string[] = [];
  const dns6: string[] = [];
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

  let httpsMs: number | null = null;
  let httpsStatus: number | null = null;
  let httpsError: string | null = null;

  const url = `${baseRaw}/v1/models`;
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
  }

  return NextResponse.json({
    ok: httpsError == null && httpsStatus != null,
    host,
    base: baseRaw,
    dns: { A: dns4, AAAA: dns6 },
    https: {
      url,
      ms: httpsMs,
      status: httpsStatus,
      error: httpsError,
    },
    hint:
      httpsError || (httpsStatus != null && httpsStatus >= 500)
        ? "Set OPENAI_BASE_URL to an HTTPS reverse proxy on a host this machine can reach (e.g. VPS on WireGuard)."
        : null,
  });
}
