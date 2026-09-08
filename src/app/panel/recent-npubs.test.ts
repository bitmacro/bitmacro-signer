import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  forgetNpub,
  identityLabel,
  listRecentIdentities,
  listRecentNpubs,
  patchRecentProfiles,
  rememberNpub,
} from "./recent-npubs";

const A = "npub1ah54flnawx2ak3nrx03023szzk9p38am4qf9tmfjn33ylhmz2wtqjrfm0z";
const B = "npub1at83n2trk5kxcyag400crtgps7n0mwcjtfezcappntu083k7fqrqrga4ty";

const memory = new Map<string, string>();

const localStorageStub = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memory.set(k, v);
  },
  clear: () => memory.clear(),
};

beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: localStorageStub },
  });
});

afterEach(() => {
  memory.clear();
  Reflect.deleteProperty(globalThis, "window");
});

describe("recent-npubs", () => {
  it("ignores invalid strings and never stores a passphrase-like value", () => {
    expect(rememberNpub("nsec1notanpub")).toEqual([]);
    expect(rememberNpub("hunter2")).toEqual([]);
    expect(listRecentNpubs()).toEqual([]);
  });

  it("dedupes and keeps the latest npub first", () => {
    rememberNpub(A);
    rememberNpub(B);
    rememberNpub(A);
    expect(listRecentNpubs()[0]).toBe(A);
    expect(listRecentNpubs()).toEqual([A, B]);
  });

  it("forget removes only that npub", () => {
    rememberNpub(A);
    rememberNpub(B);
    expect(forgetNpub(A).map((x) => x.npub)).toEqual([B]);
  });

  it("migrates a legacy string array and keeps name/photo patches without reordering", () => {
    memory.set(
      "bm_signer_recent_npubs",
      JSON.stringify([A, B]),
    );
    expect(listRecentIdentities().map((x) => x.npub)).toEqual([A, B]);
    patchRecentProfiles([
      {
        npub: B,
        name: "BitMacro",
        nip05: "oficial@bitmacro.io",
        picture: "https://example.com/b.png",
      },
    ]);
    const list = listRecentIdentities();
    expect(list.map((x) => x.npub)).toEqual([A, B]);
    expect(list[1]?.name).toBe("BitMacro");
    expect(list[1]?.nip05).toBe("oficial@bitmacro.io");
    expect(identityLabel(list[1]!, "x")).toBe("BitMacro");
  });

  it("rejects javascript: picture URLs", () => {
    rememberNpub(A, {
      name: "Thiago",
      picture: "javascript:alert(1)",
    });
    expect(listRecentIdentities()[0]?.picture).toBeUndefined();
    expect(listRecentIdentities()[0]?.name).toBe("Thiago");
  });
});
