import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  finalizeEvent,
  getPublicKey,
  verifyEvent,
  type Event,
  type EventTemplate,
} from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";

import { nostrPubkeyInputToHex } from "@/lib/session/ttl";

/** NIP-98-style event. It proves the caller holds the nsec for this request only. */
export const POSSESSION_KIND = 27235;
export const POSSESSION_MAX_SKEW_SEC = 300;

export function bootstrapCommitment(npub: string): string {
  return npub.trim();
}

export function vaultCommitment(input: {
  identityId: string;
  blob: string;
  salt: string;
  iv: string;
  bunkerPubkey: string;
}): string {
  const text = [
    input.identityId,
    input.blob,
    input.salt,
    input.iv,
    input.bunkerPubkey,
  ].join("\n");
  return bytesToHex(sha256(new TextEncoder().encode(text)));
}

export function possessionTemplate(input: {
  npub: string;
  purpose: "bootstrap" | "vault";
  commitment: string;
  createdAt?: number;
}): EventTemplate {
  return {
    kind: POSSESSION_KIND,
    created_at: input.createdAt ?? Math.floor(Date.now() / 1000),
    tags: [
      ["purpose", input.purpose],
      ["npub", input.npub.trim()],
      ["commitment", input.commitment],
    ],
    content: "",
  };
}

/** Signs a possession event. The secret key bytes are wiped before return. */
export function signPossession(
  nsec: string,
  purpose: "bootstrap" | "vault",
  commitment: string,
): Event {
  const decoded = nip19.decode(nsec.trim());
  if (decoded.type !== "nsec") {
    throw new Error("possession: expected nsec");
  }
  const sk = new Uint8Array(decoded.data as Uint8Array);
  try {
    const npub = nip19.npubEncode(getPublicKey(sk));
    return finalizeEvent(
      possessionTemplate({ npub, purpose, commitment }),
      sk,
    );
  } finally {
    sk.fill(0);
  }
}

export function parsePossessionEvent(value: unknown): Event | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || typeof rec.pubkey !== "string") return null;
  if (typeof rec.sig !== "string" || typeof rec.content !== "string") return null;
  if (typeof rec.kind !== "number" || typeof rec.created_at !== "number") {
    return null;
  }
  if (!Array.isArray(rec.tags)) return null;
  const tags: string[][] = [];
  for (const row of rec.tags) {
    if (!Array.isArray(row) || !row.every((cell) => typeof cell === "string")) {
      return null;
    }
    tags.push(row);
  }
  return {
    id: rec.id,
    pubkey: rec.pubkey,
    sig: rec.sig,
    kind: rec.kind,
    created_at: rec.created_at,
    content: rec.content,
    tags,
  };
}

export function possessionIsValid(
  event: Event,
  expected: {
    purpose: "bootstrap" | "vault";
    npub: string;
    commitment: string;
    nowSec?: number;
  },
): boolean {
  try {
    if (!verifyEvent(event)) return false;
  } catch {
    return false;
  }
  if (event.kind !== POSSESSION_KIND) return false;
  const now = expected.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - event.created_at) > POSSESSION_MAX_SKEW_SEC) return false;

  const purpose = tagValue(event.tags, "purpose");
  const npub = tagValue(event.tags, "npub");
  const commitment = tagValue(event.tags, "commitment");
  if (purpose !== expected.purpose) return false;
  if (npub !== expected.npub.trim()) return false;
  if (commitment !== expected.commitment) return false;

  let expectedHex: string;
  try {
    expectedHex = nostrPubkeyInputToHex(expected.npub);
  } catch {
    return false;
  }
  return event.pubkey.toLowerCase() === expectedHex;
}

function tagValue(tags: string[][], name: string): string | null {
  const row = tags.find((item) => item[0] === name);
  return row && typeof row[1] === "string" ? row[1] : null;
}
