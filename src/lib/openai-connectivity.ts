/** Errors when the server cannot reach the OpenAI HTTP API (firewall, DNS, no egress, proxy). */

const CONNECTIVITY_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function collectErrorChain(err: unknown): unknown[] {
  const out: unknown[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 8 && cur != null; i++) {
    out.push(cur);
    if (typeof cur === "object" && cur !== null && "cause" in cur) {
      cur = (cur as { cause: unknown }).cause;
    } else {
      break;
    }
  }
  return out;
}

function codeFromNodeError(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  const c = (e as { code?: unknown }).code;
  return typeof c === "string" ? c : undefined;
}

export function isLikelyOpenAiConnectivityError(err: unknown): boolean {
  for (const node of collectErrorChain(err)) {
    const code = codeFromNodeError(node);
    if (code && CONNECTIVITY_CODES.has(code)) return true;
  }

  const msg =
    err instanceof Error
      ? `${err.message}\n${String((err as Error & { cause?: unknown }).cause ?? "")}`
      : String(err);

  if (
    /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|connect timeout|request timed out|timed out|socket hang up/i.test(
      msg,
    )
  ) {
    return true;
  }

  if (err instanceof Error) {
    const n = err.name;
    if (n === "APIConnectionError" || n === "APIUserAbortError") {
      return true;
    }
  }

  return false;
}
