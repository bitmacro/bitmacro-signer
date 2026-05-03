import { createHash, randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  authorizeAppFromNostrConnect,
  completeConnect,
  getActiveNip46RelayUrlsForIdentity,
  hashSessionSecretForLookup,
} from "./app-keys";
import { parseNostrConnectUri } from "./nostr-connect-uri";

const IDENTITY_ID = "550e8400-e29b-41d4-a716-446655440000";
const VAULT_ID = "660e8400-e29b-41d4-a716-446655440001";
const CLIENT_PK = "b".repeat(64);
const SESSION_ID = "770e8400-e29b-41d4-a716-446655440002";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@bitmacro/relay-connect", () => ({
  relayConnectLog: vi.fn(),
}));

vi.mock("@/lib/relay/env", () => ({
  getRelayUrlServer: () => "wss://default-signer.relay.example/nostr",
}));

function vaultTableMock(vaultId: string | null, err: { message: string } | null = null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: vaultId ? { id: vaultId } : null,
          error: err,
        }),
      }),
    }),
  };
}

describe("hashSessionSecretForLookup", () => {
  it("uses sha256 of decoded bytes for 32-byte base64url (bunker QR secrets)", () => {
    const raw = randomBytes(32);
    const b64 = raw.toString("base64url");
    expect(hashSessionSecretForLookup(b64)).toBe(
      createHash("sha256").update(raw).digest("hex"),
    );
  });

  it("uses sha256 of UTF-8 for short nostrconnect-style secrets", () => {
    const s = "0s8j2djs";
    expect(hashSessionSecretForLookup(s)).toBe(
      createHash("sha256").update(s, "utf8").digest("hex"),
    );
  });

  it("trims whitespace before hashing short secrets", () => {
    expect(hashSessionSecretForLookup("  abc  ")).toBe(
      hashSessionSecretForLookup("abc"),
    );
  });

  it("throws on empty secret", () => {
    expect(() => hashSessionSecretForLookup("")).toThrow(/empty/);
    expect(() => hashSessionSecretForLookup("   ")).toThrow(/empty/);
  });
});

describe("authorizeAppFromNostrConnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts session with nip46_relay_urls and hashed short secret", async () => {
    const uri =
      "nostrconnect://" +
      CLIENT_PK +
      "?relay=wss%3A%2F%2Fclient.relay.example&secret=nctest123&name=Primal";
    const parsed = parseNostrConnectUri(uri);
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: { id: SESSION_ID },
          error: null,
        }),
      }),
    });

    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "signer_vaults") {
          return vaultTableMock(VAULT_ID);
        }
        if (table === "signer_sessions") {
          return {
            delete: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({ error: null }),
                }),
              }),
            }),
            insert: insert,
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const out = await authorizeAppFromNostrConnect(
      IDENTITY_ID,
      parsed,
      undefined,
      48,
    );
    expect(out.sessionId).toBe(SESSION_ID);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        vault_id: VAULT_ID,
        app_pubkey: CLIENT_PK,
        app_name: "Primal",
        nip46_relay_urls: ["wss://client.relay.example"],
        used: false,
        secret_hash: hashSessionSecretForLookup("nctest123"),
      }),
    );
  });

  it("uses app_name override when URI also has name", async () => {
    const parsed = parseNostrConnectUri(
      `nostrconnect://${CLIENT_PK}?relay=wss%3A%2F%2Fa&secret=x&name=URI`,
    );
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({ data: { id: SESSION_ID }, error: null }),
      }),
    });
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "signer_vaults") return vaultTableMock(VAULT_ID);
        if (table === "signer_sessions") {
          return {
            delete: () => ({
              eq: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
            }),
            insert,
          };
        }
        throw new Error(table);
      }),
    });
    await authorizeAppFromNostrConnect(
      IDENTITY_ID,
      parsed,
      "Override",
      24,
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ app_name: "Override" }),
    );
  });
});

describe("completeConnect with short UTF-8 secret (nostrconnect)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks used when session row is pre-bound to client pubkey", async () => {
    const secret = "nctest-secret";
    const secretHash = hashSessionSecretForLookup(secret);
    const updateChain = vi.fn().mockResolvedValue({ error: null });

    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "signer_vaults") {
          return vaultTableMock(VAULT_ID);
        }
        if (table === "signer_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gt: () => ({
                      maybeSingle: async () => ({
                        data: {
                          id: SESSION_ID,
                          app_pubkey: CLIENT_PK,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update: () => ({
              eq: () => updateChain(),
            }),
          };
        }
        throw new Error(table);
      }),
    });

    await completeConnect(IDENTITY_ID, CLIENT_PK, secret);

    expect(updateChain).toHaveBeenCalled();
    expect(secretHash.length).toBe(64);
  });
});

describe("getActiveNip46RelayUrlsForIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prepends default relay and dedupes session relays", async () => {
    const defaultRelay = "wss://default-signer.relay.example/nostr";

    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "signer_vaults") return vaultTableMock(VAULT_ID);
        if (table === "signer_sessions") {
          return {
            select: () => ({
              eq: () => ({
                gt: () =>
                  Promise.resolve({
                    data: [
                      {
                        nip46_relay_urls: [
                          "wss://extra1",
                          defaultRelay,
                          "wss://extra1",
                        ],
                      },
                      { nip46_relay_urls: null },
                    ],
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(table);
      }),
    });

    const urls = await getActiveNip46RelayUrlsForIdentity(IDENTITY_ID);
    expect(urls[0]).toBe(defaultRelay);
    expect(urls).toEqual([defaultRelay, "wss://extra1"]);
  });
});
