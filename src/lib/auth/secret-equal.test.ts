import { describe, expect, it } from "vitest";

import { secretEqual } from "./secret-equal";

describe("secretEqual", () => {
  it("matches equal strings and rejects different lengths", () => {
    expect(secretEqual("daemon-token", "daemon-token")).toBe(true);
    expect(secretEqual("daemon-token", "daemon-token-x")).toBe(false);
    expect(secretEqual("a", "b")).toBe(false);
  });
});
