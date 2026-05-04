import { describe, expect, it } from "vitest";
import * as nip19 from "nostr-tools/nip19";

import { parseNostrConnectUri } from "./nostr-connect-uri";

const HEX_PK =
  "83f3b2ae6aa368e8275397b9c26cf550101d63ebaab900d19dd4a4429f5ad8f5";

describe("parseNostrConnectUri", () => {
  it("parses hex host, relay, secret, name (NIP-46 example shape)", () => {
    const uri = `nostrconnect://${HEX_PK}?relay=wss%3A%2F%2Frelay1.example.com&secret=0s8j2djs&name=My%20Client`;
    const p = parseNostrConnectUri(uri);
    expect(p.clientPubkeyHex).toBe(HEX_PK);
    expect(p.relayUrls).toEqual(["wss://relay1.example.com"]);
    expect(p.secret).toBe("0s8j2djs");
    expect(p.appName).toBe("My Client");
  });

  it("collects multiple relay query params", () => {
    const uri = `nostrconnect://${HEX_PK}?relay=wss%3A%2F%2Fa&relay=wss%3A%2F%2Fb&secret=x`;
    const p = parseNostrConnectUri(uri);
    expect(p.relayUrls).toEqual(["wss://a", "wss://b"]);
  });

  it("accepts npub as host", () => {
    const npub = nip19.npubEncode(HEX_PK);
    const uri = `nostrconnect://${npub}?relay=wss%3A%2F%2Fr&secret=y`;
    const p = parseNostrConnectUri(uri);
    expect(p.clientPubkeyHex).toBe(HEX_PK);
    expect(p.secret).toBe("y");
  });

  it("throws without relay", () => {
    expect(() =>
      parseNostrConnectUri(`nostrconnect://${HEX_PK}?secret=abc`),
    ).toThrow(/relay/);
  });

  it("throws without secret", () => {
    expect(() =>
      parseNostrConnectUri(`nostrconnect://${HEX_PK}?relay=wss%3A%2F%2Fr`),
    ).toThrow(/secret/);
  });
});
