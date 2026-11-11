import { describe, expect, it } from "vitest";

import { createKeyedSerializer } from "./serialize-per-key";

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("createKeyedSerializer", () => {
  it("runs tasks with the same key in order (connect before get_public_key)", async () => {
    const run = createKeyedSerializer();
    const order: string[] = [];
    let sessionBound = false;

    const connect = run("client-a", async () => {
      order.push("connect:start");
      await tick(20);
      sessionBound = true;
      order.push("connect:end");
    });
    const getPublicKey = run("client-a", async () => {
      order.push(`get_public_key:authorized=${sessionBound}`);
    });

    await Promise.all([connect, getPublicKey]);
    expect(order).toEqual([
      "connect:start",
      "connect:end",
      "get_public_key:authorized=true",
    ]);
  });

  it("runs tasks with different keys concurrently", async () => {
    const run = createKeyedSerializer();
    const order: string[] = [];
    const slow = run("client-a", async () => {
      await tick(20);
      order.push("a");
    });
    const fast = run("client-b", async () => {
      order.push("b");
    });
    await Promise.all([slow, fast]);
    expect(order).toEqual(["b", "a"]);
  });

  it("does not block the next task when one rejects", async () => {
    const run = createKeyedSerializer();
    const failed = run("client-a", async () => {
      throw new Error("boom");
    });
    const next = run("client-a", async () => "ok");
    await expect(failed).rejects.toThrow("boom");
    await expect(next).resolves.toBe("ok");
  });
});
