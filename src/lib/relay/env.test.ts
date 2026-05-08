import { afterEach, describe, expect, it, vi } from "vitest";

import { getBunkerRelayUrlServer, getRelayUrlServer } from "@/lib/relay/env";

describe("relay env helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getRelayUrlServer prefers RELAY_URL over NEXT_PUBLIC", () => {
    vi.stubEnv("RELAY_URL", "wss://a.example");
    vi.stubEnv("NEXT_PUBLIC_RELAY_URL", "wss://b.example");
    expect(getRelayUrlServer()).toBe("wss://a.example");
  });

  it("getBunkerRelayUrlServer prefers BUNKER_RELAY_URL", () => {
    vi.stubEnv("BUNKER_RELAY_URL", "wss://nip46.example");
    vi.stubEnv("RELAY_URL", "wss://cloud.example");
    vi.stubEnv("NEXT_PUBLIC_RELAY_URL", "wss://pub.example");
    expect(getBunkerRelayUrlServer()).toBe("wss://nip46.example");
  });

  it("getBunkerRelayUrlServer falls back to RELAY_URL", () => {
    vi.stubEnv("RELAY_URL", "wss://r.example");
    vi.stubEnv("NEXT_PUBLIC_RELAY_URL", "wss://n.example");
    expect(getBunkerRelayUrlServer()).toBe("wss://r.example");
  });
});
