import dns from "node:dns";

/**
 * Prefer A records over AAAA for outbound HTTPS (OpenAI, etc.).
 * Complements NODE_OPTIONS=--dns-result-order=ipv4first for standalone/runtime edge cases.
 */
export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    dns.setDefaultResultOrder("ipv4first");
  }
}
