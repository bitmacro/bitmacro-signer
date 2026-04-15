import { describe, expect, it, vi, beforeEach } from "vitest";

import { VaultDecryptError } from "@/lib/vault";

const TEST_NPUB =
  "npub1rwzv24nmzfjypx2a8m264ws9vht3uxp5vpypnluuzl67n4waq78suk0wul";
const TEST_IDENTITY_ID = "550e8400-e29b-41d4-a716-446655440000";

const mocks = vi.hoisted(() => ({
  decryptNsec: vi.fn(),
  startBunker: vi.fn(),
  stopBunker: vi.fn(),
  isRunning: vi.fn(),
  setSessionCookie: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/vault", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/vault")>();
  return { ...mod, decryptNsec: mocks.decryptNsec };
});

vi.mock("@/lib/bunker", () => ({
  startBunker: mocks.startBunker,
  stopBunker: mocks.stopBunker,
  isRunning: mocks.isRunning,
}));

vi.mock("@/lib/auth/session-cookie", () => ({
  setSessionCookie: mocks.setSessionCookie,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

function makeSupabaseMock(opts: {
  identity: { id: string } | null;
  identityErr?: { message: string };
  vault: { blob: string; salt: string; iv: string } | null;
  vaultErr?: { message: string };
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "identities") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.identity,
                error: opts.identityErr ?? null,
              }),
            }),
          }),
        };
      }
      if (table === "signer_vaults") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.vault,
                error: opts.vaultErr ?? null,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

describe("POST /api/auth/unlock", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isRunning.mockReturnValue(true);
  });

  it("returns 400 when body is invalid", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npub: "bad", passphrase: "x" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when npub is not registered", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({
        identity: null,
        vault: null,
      }),
    );
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npub: TEST_NPUB, passphrase: "secret" }),
      }),
    );
    expect(res.status).toBe(404);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("Npub not registered");
    expect(mocks.decryptNsec).not.toHaveBeenCalled();
  });

  it("returns vault_exists false when no vault row", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({
        identity: { id: TEST_IDENTITY_ID },
        vault: null,
      }),
    );
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npub: TEST_NPUB, passphrase: "secret" }),
      }),
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      ok: boolean;
      vault_exists: boolean;
      identity_id: string;
      is_running: boolean;
    };
    expect(j).toEqual({
      ok: true,
      vault_exists: false,
      identity_id: TEST_IDENTITY_ID,
      is_running: false,
    });
    expect(mocks.decryptNsec).not.toHaveBeenCalled();
    expect(mocks.startBunker).not.toHaveBeenCalled();
  });

  it("returns 401 when passphrase decrypt fails", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({
        identity: { id: TEST_IDENTITY_ID },
        vault: { blob: "b", salt: "s", iv: "i" },
      }),
    );
    mocks.decryptNsec.mockRejectedValue(new VaultDecryptError());
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npub: TEST_NPUB, passphrase: "wrong" }),
      }),
    );
    expect(res.status).toBe(401);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe("Passphrase incorrecta");
    expect(mocks.startBunker).not.toHaveBeenCalled();
  });

  it("starts bunker and sets session when decrypt succeeds", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseMock({
        identity: { id: TEST_IDENTITY_ID },
        vault: { blob: "b", salt: "s", iv: "i" },
      }),
    );
    mocks.decryptNsec.mockResolvedValue("nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8f4t4w");
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npub: TEST_NPUB, passphrase: "good" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.decryptNsec).toHaveBeenCalledOnce();
    expect(mocks.startBunker).toHaveBeenCalledWith(
      TEST_IDENTITY_ID,
      "nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8f4t4w",
    );
    expect(mocks.setSessionCookie).toHaveBeenCalledWith(TEST_IDENTITY_ID);
    const j = (await res.json()) as {
      ok: boolean;
      vault_exists: boolean;
      identity_id: string;
      is_running: boolean;
    };
    expect(j.ok).toBe(true);
    expect(j.vault_exists).toBe(true);
    expect(j.identity_id).toBe(TEST_IDENTITY_ID);
    expect(j.is_running).toBe(true);
  });
});
