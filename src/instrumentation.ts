/**
 * Keeps this entry free of Node built-in imports so Turbopack does not analyze `node:dns`
 * for the Edge Runtime graph (see Next.js warning on instrumentation + node:*).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  await import("./lib/register-node-instrumentation");
}
