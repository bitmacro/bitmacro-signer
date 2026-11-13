import { describe, expect, it } from "vitest";

import {
  getSessionStatus,
  sortSessions,
  type SessionRow,
} from "./session-utils";

const NOW = Date.parse("2026-11-13T12:00:00Z");
const H = 3600_000;

function row(id: string, used: boolean, expiresInH: number): SessionRow {
  return {
    id,
    vault_id: "v",
    app_pubkey: "a".repeat(64),
    app_name: id,
    used,
    expires_at: new Date(NOW + expiresInH * H).toISOString(),
    created_at: new Date(NOW - 48 * H).toISOString(),
  };
}

describe("getSessionStatus", () => {
  it("connected and still valid is active (used)", () => {
    expect(getSessionStatus(row("a", true, 5), NOW)).toBe("used");
  });

  it("connected but past expiry is expired, not used", () => {
    expect(getSessionStatus(row("b", true, -1), NOW)).toBe("expired");
  });

  it("never connected and valid is pending", () => {
    expect(getSessionStatus(row("c", false, 5), NOW)).toBe("pending");
  });

  it("never connected and past expiry is expired", () => {
    expect(getSessionStatus(row("d", false, -1), NOW)).toBe("expired");
  });
});

describe("sortSessions (expires)", () => {
  it("orders active, then pending, then expired (most recent first)", () => {
    const rows = [
      row("expired-old", true, -48),
      row("pending", false, 2),
      row("active-late", true, 20),
      row("expired-recent", true, -1),
      row("active-soon", true, 3),
    ];
    const ids = sortSessions(rows, "expires", NOW).map((r) => r.id);
    expect(ids).toEqual([
      "active-soon",
      "active-late",
      "pending",
      "expired-recent",
      "expired-old",
    ]);
  });
});
