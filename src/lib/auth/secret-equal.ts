import { createHash, timingSafeEqual } from "node:crypto";

/** Compare two secrets without leaking which one mismatched, including length. */
export function secretEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}
