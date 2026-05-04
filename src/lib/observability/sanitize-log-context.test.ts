import { describe, expect, it } from "vitest";

import { sanitizeTelemetryContext } from "./sanitize-log-context";

describe("sanitizeTelemetryContext", () => {
  it("redacts nested secret-like keys", () => {
    const out = sanitizeTelemetryContext({
      ok: true,
      authToken: "leak-me",
      nested: { content: "body" },
    });
    expect(out?.ok).toBe(true);
    expect(out?.authToken).toBe("[redacted]");
    expect(out?.nested).toEqual({ content: "[redacted]" });
  });

  it("passes lengths and prefixes", () => {
    expect(
      sanitizeTelemetryContext({ bunkerPk: "094bdaf1519f", secretParamLen: 12 }),
    ).toEqual({ bunkerPk: "094bdaf1519f", secretParamLen: 12 });
  });
});
