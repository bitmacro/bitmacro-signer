/**
 * NIP-46 bunker loop: WebSocket to relay, kind 24133 in/out with NIP-44 payload (matches `nostr-tools` BunkerSigner).
 */

import { relayConnectLog } from "@bitmacro/relay-connect";
import type { Event } from "nostr-tools";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";
import * as nip44 from "nostr-tools/nip44";
import { Relay } from "nostr-tools/relay";
import { NostrConnect } from "nostr-tools/kinds";

import {
  assertAppMayUseSigner,
  completeConnect,
} from "@/lib/session/app-keys";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  NOSTR_CONNECT_KIND,
  parseNip46RpcPayload,
  runNip46Method,
  type Nip46RpcResult,
} from "./nip46-methods";

function log(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>,
): void {
  relayConnectLog(level, message, { component: "nip46-loop", ...context });
}

function defaultRamTtlMs(): number {
  const raw = process.env.BUNKER_SESSION_RAM_TTL_MS;
  if (raw && /^\d+$/.test(raw.trim())) {
    return Number.parseInt(raw.trim(), 10);
  }
  return 24 * 60 * 60 * 1000;
}

function decodeNsec(nsec: string): Uint8Array {
  const d = nip19.decode(nsec.trim());
  if (d.type !== "nsec") {
    throw new Error("nip46-loop: expected nsec bech32");
  }
  return new Uint8Array(d.data);
}

function requireRelayUrl(): string {
  const u = process.env.NEXT_PUBLIC_RELAY_URL?.trim();
  if (!u) {
    throw new Error("NEXT_PUBLIC_RELAY_URL is not set");
  }
  return u;
}

type BunkerRuntime = {
  secretKey: Uint8Array;
  bunkerPubkeyHex: string;
  relay: Relay;
  sub: { close: (reason?: string) => void };
  ttlTimer: ReturnType<typeof setTimeout>;
};

const active = new Map<string, BunkerRuntime>();

export function isRunning(identityId: string): boolean {
  return active.has(identityId);
}

function clearSecretKeyBytes(sk: Uint8Array): void {
  sk.fill(0);
}

export async function stopBunker(identityId: string): Promise<void> {
  const rt = active.get(identityId);
  if (!rt) return;

  clearTimeout(rt.ttlTimer);
  try {
    rt.sub.close();
  } catch {
    /* ignore */
  }
  try {
    rt.relay.close();
  } catch {
    /* ignore */
  }
  clearSecretKeyBytes(rt.secretKey);
  active.delete(identityId);
  log("info", "bunker stopped", { identityId });
}

async function verifyVaultMatchesNsec(
  identityId: string,
  secretKey: Uint8Array,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("signer_vaults")
    .select("bunker_pubkey")
    .eq("identity_id", identityId)
    .maybeSingle();

  if (error) {
    throw new Error(`vault lookup: ${error.message}`);
  }
  const expectedNpub = nip19.npubEncode(getPublicKey(secretKey));
  const stored = data?.bunker_pubkey?.trim();
  if (!stored) {
    throw new Error("no vault / bunker_pubkey for this identity");
  }
  if (stored !== expectedNpub) {
    throw new Error("nsec does not match vault bunker_pubkey");
  }
}

/**
 * Starts the NIP-46 listener for this identity: decrypts requests, enforces `signer_sessions`, publishes responses.
 * @param nsec — bech32 `nsec1…` exported from the client vault flow
 */
export async function startBunker(
  identityId: string,
  nsec: string,
): Promise<void> {
  if (active.has(identityId)) {
    await stopBunker(identityId);
  }

  const relayUrl = requireRelayUrl();
  const secretKey = decodeNsec(nsec);
  const bunkerPubkeyHex = getPublicKey(secretKey);

  await verifyVaultMatchesNsec(identityId, secretKey);

  const relay = await Relay.connect(relayUrl, { enableReconnect: true });

  const filters = [
    {
      kinds: [NOSTR_CONNECT_KIND],
      "#p": [bunkerPubkeyHex],
    },
  ];

  const sub = relay.subscribe(filters, {
    onevent: async (event: Event) => {
      if (event.kind !== NostrConnect) return;
      try {
        const convKey = nip44.getConversationKey(secretKey, event.pubkey);
        let plaintext: string;
        try {
          plaintext = nip44.decrypt(event.content, convKey);
        } catch (e) {
          log("warn", "NIP-44 decrypt failed (ignored)", {
            identityId,
            from: event.pubkey.slice(0, 12),
            err: e instanceof Error ? e.message : String(e),
          });
          return;
        }

        const req = parseNip46RpcPayload(plaintext);
        const res = await runNip46Method(event.pubkey, req, {
          bunkerSecretKey: secretKey,
          bunkerPubkeyHex,
          completeConnect: (appPubkey, secret) =>
            completeConnect(identityId, appPubkey, secret),
          assertAppMayUseSigner: (appPubkey) =>
            assertAppMayUseSigner(identityId, appPubkey),
        });

        await publishResponse(relay, relayUrl, secretKey, event.pubkey, res);
      } catch (e) {
        log("error", "onevent handler failed", {
          identityId,
          err: e instanceof Error ? e.message : String(e),
        });
      }
    },
    onclose: (reason) => {
      log("debug", "subscription closed", { identityId, reason });
    },
  });

  const ttlTimer = setTimeout(() => {
    log("info", "RAM TTL expired; clearing nsec", { identityId });
    void stopBunker(identityId);
  }, defaultRamTtlMs());

  active.set(identityId, {
    secretKey,
    bunkerPubkeyHex,
    relay,
    sub,
    ttlTimer,
  });

  log("info", "bunker started", {
    identityId,
    relay: relayUrl,
    bunkerPk: bunkerPubkeyHex.slice(0, 12),
  });
}

async function publishResponse(
  relay: Relay,
  relayUrl: string,
  bunkerSecretKey: Uint8Array,
  appPubkey: string,
  res: Nip46RpcResult,
): Promise<void> {
  const convKey = nip44.getConversationKey(bunkerSecretKey, appPubkey);
  const content = nip44.encrypt(JSON.stringify(res), convKey);
  const ev = finalizeEvent(
    {
      kind: NOSTR_CONNECT_KIND,
      tags: [["p", appPubkey]],
      content,
      created_at: Math.floor(Date.now() / 1000),
    },
    bunkerSecretKey,
  );

  try {
    await relay.publish(ev);
  } catch (e) {
    log("error", "publish response failed", {
      err: e instanceof Error ? e.message : String(e),
      relay: relayUrl,
    });
  }
}
