/**
 * Pure NIP-46 RPC handling (nostr-tools wire format: kind 24133 — inbound envelope may be NIP-44 or NIP-04).
 * The nip46-loop publishes responses with the **same cipher** as used to decrypt the inbound event.
 * Outbound `sendNostrConnectInitiate` uses **NIP-04** to match mainstream `nostrconnect://` clients.
 */

import type { Event, EventTemplate } from "nostr-tools";
import { finalizeEvent, getPublicKey, verifyEvent } from "nostr-tools";
import * as nip04 from "nostr-tools/nip04";
import * as nip44 from "nostr-tools/nip44";

import { nostrPubkeyInputToHex } from "@/lib/session/ttl";

/** Same as `nostr-tools/kinds` NostrConnect */
export const NOSTR_CONNECT_KIND = 24133;

export type Nip46RpcRequest = {
  id: string;
  method: string;
  params: string[];
};

export type Nip46RpcResult = {
  id: string;
  result?: string;
  error?: string;
};

/** Optional tracing for `completeConnect` logs (no secrets). */
export type Nip46ConnectTrace = {
  rpcId: string;
};

export type Nip46MethodDeps = {
  bunkerSecretKey: Uint8Array;
  /** Hex-encoded secp256k1 pubkey of the bunker (user signing key). */
  bunkerPubkeyHex: string;
  completeConnect: (
    appPubkey: string,
    secret: string,
    trace?: Nip46ConnectTrace,
  ) => Promise<void>;
  assertAppMayUseSigner: (appPubkey: string) => Promise<void>;
};

export function parseNip46RpcPayload(plaintext: string): Nip46RpcRequest {
  const o = JSON.parse(plaintext) as unknown;
  if (!o || typeof o !== "object") throw new Error("invalid RPC payload");
  const rec = o as Record<string, unknown>;
  if (typeof rec.id !== "string" || typeof rec.method !== "string") {
    throw new Error("invalid RPC id/method");
  }
  if (!Array.isArray(rec.params)) {
    throw new Error("invalid RPC params");
  }
  const params = rec.params as unknown[];
  if (!params.every((p) => typeof p === "string")) {
    throw new Error("RPC params must be strings");
  }
  return { id: rec.id, method: rec.method, params: params as string[] };
}

export function formatNip46RpcResponse(r: Nip46RpcResult): string {
  return JSON.stringify(r);
}

export type DecryptNip46InboundResult = {
  plaintext: string;
  envelope: "nip44" | "nip04";
};

/**
 * Decrypt NIP-46 kind 24133 `content`: try **NIP-44** first, then **NIP-04** (e.g. Primal / older clients).
 * Throws if neither works.
 */
export function decryptNip46InboundEventContent(
  bunkerSecretKey: Uint8Array,
  clientPubkeyHex: string,
  content: string,
): DecryptNip46InboundResult {
  const convKey = nip44.getConversationKey(bunkerSecretKey, clientPubkeyHex);
  try {
    return {
      plaintext: nip44.decrypt(content, convKey),
      envelope: "nip44",
    };
  } catch {
    return {
      plaintext: nip04.decrypt(bunkerSecretKey, clientPubkeyHex, content),
      envelope: "nip04",
    };
  }
}

/**
 * Runs one NIP-46 method; returns the `result` string (may be JSON) or throws with message for `error` field.
 */
export async function runNip46Method(
  appPubkey: string,
  req: Nip46RpcRequest,
  deps: Nip46MethodDeps,
): Promise<Nip46RpcResult> {
  const { id, method, params } = req;
  const sk = deps.bunkerSecretKey;

  try {
    switch (method) {
      case "ping": {
        return { id, result: "pong" };
      }
      case "connect": {
        const claimedBunker = params[0] ?? "";
        const secret = params[1] ?? "";
        // params[2] may be requested perms (Welshman / Coracle send 3 strings).
        // bunker:// URIs carry hex; some web clients (e.g. Primal) send npub1… in `connect`.
        let claimedHex: string;
        try {
          claimedHex = nostrPubkeyInputToHex(claimedBunker);
        } catch {
          throw new Error("connect: invalid bunker pubkey (params[0])");
        }
        if (claimedHex !== deps.bunkerPubkeyHex.toLowerCase()) {
          throw new Error("connect: bunker pubkey mismatch");
        }
        await deps.completeConnect(appPubkey, secret, { rpcId: id });
        // NIP-46 (client-initiated): client MUST validate `result` equals the URI `secret`.
        // Welshman/Coracle also accept `ack` for bunker-initiated flows; echoing `secret`
        // satisfies both when the client sent a non-empty secret.
        return { id, result: secret.length > 0 ? secret : "ack" };
      }
      case "get_public_key": {
        await deps.assertAppMayUseSigner(appPubkey);
        return { id, result: getPublicKey(sk) };
      }
      case "sign_event": {
        await deps.assertAppMayUseSigner(appPubkey);
        const raw = params[0] ?? "";
        const tmpl = JSON.parse(raw) as EventTemplate;
        const signed = finalizeEvent(tmpl, sk);
        if (!verifyEvent(signed as Event)) {
          throw new Error("sign_event: internal finalize failed verification");
        }
        return { id, result: JSON.stringify(signed) };
      }
      case "nip04_encrypt": {
        await deps.assertAppMayUseSigner(appPubkey);
        const peer = params[0] ?? "";
        const plaintext = params[1] ?? "";
        const out = await nip04.encrypt(sk, peer, plaintext);
        return { id, result: out };
      }
      case "nip04_decrypt": {
        await deps.assertAppMayUseSigner(appPubkey);
        const peer = params[0] ?? "";
        const ciphertext = params[1] ?? "";
        const out = await nip04.decrypt(sk, peer, ciphertext);
        return { id, result: out };
      }
      case "nip44_encrypt": {
        await deps.assertAppMayUseSigner(appPubkey);
        const peer = params[0] ?? "";
        const plaintext = params[1] ?? "";
        const ck = nip44.getConversationKey(sk, peer);
        return { id, result: nip44.encrypt(plaintext, ck) };
      }
      case "nip44_decrypt": {
        await deps.assertAppMayUseSigner(appPubkey);
        const peer = params[0] ?? "";
        const payload = params[1] ?? "";
        const ck = nip44.getConversationKey(sk, peer);
        return { id, result: nip44.decrypt(payload, ck) };
      }
      case "switch_relays": {
        await deps.assertAppMayUseSigner(appPubkey);
        return { id, result: "[]" };
      }
      default:
        throw new Error(`unsupported method: ${method}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id, error: msg };
  }
}
