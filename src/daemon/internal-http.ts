/**
 * Internal HTTP (Docker network): signer-web → signer-daemon.
 * Do not expose to the internet; Bearer auth required.
 */

import http from "node:http";
import { URL } from "node:url";

import { isRunning, startBunker, stopBunker } from "@/lib/bunker";

function json(
  res: http.ServerResponse,
  status: number,
  body: Record<string, unknown>,
): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      chunks.push(c);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function bearerToken(req: http.IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return null;
  }
  return auth.slice(7).trim() || null;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

function looksLikeNsec(s: string): boolean {
  const t = s.trim();
  return t.startsWith("nsec1") && t.length >= 58;
}

export function startInternalHttpServer(opts: {
  port: number;
  token: string;
  log: (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => void;
}): http.Server {
  const { port, token, log } = opts;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://127.0.0.1`);

      if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("ok");
        return;
      }

      const provided = bearerToken(req);
      if (!provided || provided !== token) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/internal/status") {
        const identityId = url.searchParams.get("identity_id")?.trim() ?? "";
        if (!identityId || !isUuid(identityId)) {
          json(res, 400, { error: "identity_id query required (uuid)" });
          return;
        }
        json(res, 200, { running: isRunning(identityId) });
        return;
      }

      if (req.method === "POST" && url.pathname === "/internal/lock") {
        const raw = await readBody(req);
        let body: { identity_id?: string };
        try {
          body = JSON.parse(raw) as { identity_id?: string };
        } catch {
          json(res, 400, { error: "Invalid JSON" });
          return;
        }
        const identityId = body.identity_id?.trim() ?? "";
        if (!identityId || !isUuid(identityId)) {
          json(res, 400, { error: "identity_id required (uuid)" });
          return;
        }
        await stopBunker(identityId).catch(() => {});
        log("info", "internal lock", { identityId });
        json(res, 200, { ok: true });
        return;
      }

      if (req.method === "POST" && url.pathname === "/internal/unlock") {
        const raw = await readBody(req);
        let body: { identity_id?: string; nsec?: string };
        try {
          body = JSON.parse(raw) as { identity_id?: string; nsec?: string };
        } catch {
          json(res, 400, { error: "Invalid JSON" });
          return;
        }
        const identityId = body.identity_id?.trim() ?? "";
        const nsec = body.nsec?.trim() ?? "";
        if (!identityId || !isUuid(identityId)) {
          json(res, 400, { error: "identity_id required (uuid)" });
          return;
        }
        if (!looksLikeNsec(nsec)) {
          json(res, 400, { error: "nsec invalid" });
          return;
        }
        let nsecMaterial = nsec;
        try {
          await startBunker(identityId, nsecMaterial);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "startBunker failed";
          log("error", "internal unlock startBunker failed", {
            identityId,
            err: msg,
          });
          json(res, 502, { error: msg });
          return;
        } finally {
          nsecMaterial = "";
        }
        log("info", "internal unlock — bunker started", { identityId });
        json(res, 200, { ok: true });
        return;
      }

      json(res, 404, { error: "Not found" });
    } catch (e) {
      log("error", "internal http handler", {
        err: e instanceof Error ? e.message : String(e),
      });
      json(res, 500, { error: "Internal error" });
    }
  });

  server.listen(port, "0.0.0.0", () => {
    log("info", `internal HTTP listening on 0.0.0.0:${port}`);
  });

  return server;
}
