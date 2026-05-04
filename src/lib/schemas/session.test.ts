import { describe, expect, it } from "vitest";

import { sessionCreateBodySchema } from "./session";

const ID = "550e8400-e29b-41d4-a716-446655440000";

describe("sessionCreateBodySchema", () => {
  it("accepts minimal bunker flow body", () => {
    const r = sessionCreateBodySchema.safeParse({ identity_id: ID });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nostrconnect_uri).toBeUndefined();
    }
  });

  it("accepts nostrconnect_uri without app_pubkey", () => {
    const pk = "b".repeat(64);
    const r = sessionCreateBodySchema.safeParse({
      identity_id: ID,
      nostrconnect_uri: `nostrconnect://${pk}?relay=wss%3A%2F%2Fr&secret=x`,
    });
    expect(r.success).toBe(true);
  });

  it("rejects app_pubkey together with nostrconnect_uri", () => {
    const uriHost = "b".repeat(64);
    const r = sessionCreateBodySchema.safeParse({
      identity_id: ID,
      app_pubkey: "c".repeat(64),
      nostrconnect_uri: `nostrconnect://${uriHost}?relay=wss%3A%2F%2Fx&secret=1`,
    });
    expect(r.success).toBe(false);
  });

  it("trims empty nostrconnect_uri to undefined", () => {
    const r = sessionCreateBodySchema.safeParse({
      identity_id: ID,
      nostrconnect_uri: "   ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nostrconnect_uri).toBeUndefined();
  });
});
