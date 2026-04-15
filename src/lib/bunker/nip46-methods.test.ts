import { describe, expect, it, vi } from "vitest";
import { generateSecretKey, getPublicKey, verifyEvent } from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";
import * as nip44 from "nostr-tools/nip44";

import {
  parseNip46RpcPayload,
  runNip46Method,
  type Nip46MethodDeps,
} from "./nip46-methods";

function testDeps(overrides: Partial<Nip46MethodDeps> = {}): Nip46MethodDeps {
  const bunkerSecretKey = generateSecretKey();
  const bunkerPubkeyHex = getPublicKey(bunkerSecretKey);
  return {
    bunkerSecretKey,
    bunkerPubkeyHex,
    completeConnect: vi.fn().mockResolvedValue(undefined),
    assertAppMayUseSigner: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("parseNip46RpcPayload", () => {
  it("parses a valid request", () => {
    expect(
      parseNip46RpcPayload(
        JSON.stringify({
          id: "b-1",
          method: "ping",
          params: [],
        }),
      ),
    ).toEqual({ id: "b-1", method: "ping", params: [] });
  });

  it("throws on non-string params", () => {
    expect(() =>
      parseNip46RpcPayload(JSON.stringify({ id: "x", method: "m", params: [1] })),
    ).toThrow();
  });
});

describe("runNip46Method", () => {
  it("ping returns pong", async () => {
    const deps = testDeps();
    const out = await runNip46Method("a".repeat(64), { id: "1", method: "ping", params: [] }, deps);
    expect(out).toEqual({ id: "1", result: "pong" });
  });

  it("connect calls completeConnect and checks bunker pubkey", async () => {
    const sk = generateSecretKey();
    const bunkerPk = getPublicKey(sk);
    const completeConnect = vi.fn().mockResolvedValue(undefined);
    const deps = testDeps({
      bunkerSecretKey: sk,
      bunkerPubkeyHex: bunkerPk,
      completeConnect,
    });
    const secret = "testsecret";
    const out = await runNip46Method(
      "b".repeat(64),
      { id: "2", method: "connect", params: [bunkerPk, secret] },
      deps,
    );
    expect(out.result).toBe(bunkerPk);
    expect(completeConnect).toHaveBeenCalledWith("b".repeat(64), secret);
  });

  it("connect fails on bunker mismatch", async () => {
    const deps = testDeps();
    const out = await runNip46Method(
      "c".repeat(64),
      { id: "3", method: "connect", params: ["00".repeat(32), "x"] },
      deps,
    );
    expect(out.error).toMatch(/mismatch/);
  });

  it("get_public_key returns hex pubkey", async () => {
    const deps = testDeps();
    const out = await runNip46Method(
      "d".repeat(64),
      { id: "4", method: "get_public_key", params: [] },
      deps,
    );
    expect(out.result).toBe(getPublicKey(deps.bunkerSecretKey));
    expect(deps.assertAppMayUseSigner).toHaveBeenCalled();
  });

  it("sign_event returns a verified event", async () => {
    const deps = testDeps();
    const tmpl = {
      kind: 1,
      content: "hello",
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    };
    const out = await runNip46Method(
      "e".repeat(64),
      { id: "5", method: "sign_event", params: [JSON.stringify(tmpl)] },
      deps,
    );
    expect(out.result).toBeDefined();
    expect(out.error).toBeUndefined();
    const ev = JSON.parse(out.result!);
    expect(verifyEvent(ev)).toBe(true);
    expect(ev.pubkey).toBe(getPublicKey(deps.bunkerSecretKey));
  });

  it("nip04_encrypt / nip44_encrypt round-trip with peer key", async () => {
    const peerSk = generateSecretKey();
    const peerPk = getPublicKey(peerSk);
    const deps = testDeps();

    const enc04 = await runNip46Method(
      "f".repeat(64),
      {
        id: "6",
        method: "nip04_encrypt",
        params: [peerPk, "hello-nip04"],
      },
      deps,
    );
    expect(enc04.error).toBeUndefined();
    const dec04 = await runNip46Method(
      "f".repeat(64),
      {
        id: "7",
        method: "nip04_decrypt",
        params: [peerPk, enc04.result!],
      },
      deps,
    );
    expect(dec04.result).toBe("hello-nip04");

    const enc44 = await runNip46Method(
      "f".repeat(64),
      {
        id: "8",
        method: "nip44_encrypt",
        params: [peerPk, "hello-nip44"],
      },
      deps,
    );
    expect(enc44.error).toBeUndefined();
    const ck = nip44.getConversationKey(peerSk, getPublicKey(deps.bunkerSecretKey));
    expect(nip44.decrypt(enc44.result!, ck)).toBe("hello-nip44");

    const dec44 = await runNip46Method(
      "f".repeat(64),
      {
        id: "9",
        method: "nip44_decrypt",
        params: [peerPk, enc44.result!],
      },
      deps,
    );
    expect(dec44.result).toBe("hello-nip44");
  });

  it("switch_relays returns empty JSON array", async () => {
    const deps = testDeps();
    const out = await runNip46Method(
      "g".repeat(64),
      { id: "10", method: "switch_relays", params: [] },
      deps,
    );
    expect(out.result).toBe("[]");
  });

  it("unknown method returns error in result object", async () => {
    const deps = testDeps();
    const out = await runNip46Method(
      "h".repeat(64),
      { id: "11", method: "unknown_method_xyz", params: [] },
      deps,
    );
    expect(out.error).toMatch(/unsupported/);
  });
});

describe("NIP-44 RPC envelope (same as nostr-tools BunkerSigner)", () => {
  it("encrypt/decrypt JSON-RPC with shared conversation key", () => {
    const a = generateSecretKey();
    const b = generateSecretKey();
    const aPk = getPublicKey(a);
    const bPk = getPublicKey(b);
    const convA = nip44.getConversationKey(a, bPk);
    const convB = nip44.getConversationKey(b, aPk);
    const msg = JSON.stringify({ id: "x-1", method: "ping", params: [] });
    const enc = nip44.encrypt(msg, convA);
    expect(nip44.decrypt(enc, convB)).toBe(msg);
  });

  it("nsec round-trip for decode used in startBunker", () => {
    const sk = generateSecretKey();
    const nsec = nip19.nsecEncode(sk);
    const d = nip19.decode(nsec);
    expect(d.type).toBe("nsec");
    expect(Buffer.from(d.data).equals(Buffer.from(sk))).toBe(true);
  });
});
