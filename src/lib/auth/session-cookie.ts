/**
 * HttpOnly session cookie — JWT HS256 with `sub` = identity UUID.
 *
 * - **TTL:** `SESSION_MAX_AGE_SEC` (IssuedAt + exp + `Set-Cookie` maxAge).
 * - **Attributes:** `SameSite=Lax`, `Secure` in production — correct for first-party
 *   `signer.bitmacro.io` → `/api/*` (no `SameSite=None` unless embedding cross-site).
 * - **Redeploy:** rotating `AUTH_SESSION_SECRET` invalidates all existing JWTs until unlock (no `identity_id` on `/api/auth/status`).
 * - **Sliding:** `GET /api/auth/status` re-issues the cookie when the JWT is still valid so active
 *   tabs keep a full window without reposting passphrase.
 */

import { SignJWT, jwtVerify } from "jose";

/** HttpOnly session cookie — JWT HS256 with `sub` = identity UUID */
export const SESSION_COOKIE_NAME = "bm_signer_session";

/** Cookie + JWT lifetime (seconds). Exported for docs / tooling. */
export const SESSION_MAX_AGE_SEC = 24 * 60 * 60;

function requireSessionSecret(): Uint8Array {
  const s = process.env.AUTH_SESSION_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SESSION_SECRET is missing or too short (use at least 16 characters)",
    );
  }
  return new TextEncoder().encode(s);
}

/**
 * Signs a JWT for tests or custom callers (same algorithm/options as production cookie).
 */
export async function signSessionCookieValue(
  identityId: string,
  secret: Uint8Array,
  bootId?: string | null,
): Promise<string> {
  return await new SignJWT(bootId ? { boot: bootId } : {})
    .setSubject(identityId)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secret);
}

/**
 * Verifies JWT and returns `sub` (identity_id), or `null` if invalid/expired.
 */
export async function verifySessionCookieValue(
  token: string,
  secret: Uint8Array,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const sub = payload.sub;
    if (typeof sub !== "string" || sub.length === 0) {
      return null;
    }
    return sub;
  } catch {
    return null;
  }
}

/** Like `verifySessionCookieValue`, plus the daemon boot id the session was unlocked with. */
export async function verifySessionCookieClaims(
  token: string,
  secret: Uint8Array,
): Promise<{ identityId: string; bootId: string | null } | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const sub = payload.sub;
    if (typeof sub !== "string" || sub.length === 0) {
      return null;
    }
    const boot = (payload as { boot?: unknown }).boot;
    return { identityId: sub, bootId: typeof boot === "string" ? boot : null };
  } catch {
    return null;
  }
}

/** Session cookie claims (`identity_id` + boot id), or `null`. */
export async function getSessionCookieClaims(): Promise<{
  identityId: string;
  bootId: string | null;
} | null> {
  let secret: Uint8Array;
  try {
    secret = requireSessionSecret();
  } catch {
    throw new Error("session cookie: AUTH_SESSION_SECRET not configured");
  }
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  return verifySessionCookieClaims(raw, secret);
}

/**
 * Reads the session cookie and returns the active `identity_id`, or `null`.
 * Returns `null` if secret is misconfigured (caller should treat as server error).
 */
export async function getSessionCookie(): Promise<string | null> {
  let secret: Uint8Array;
  try {
    secret = requireSessionSecret();
  } catch {
    throw new Error("session cookie: AUTH_SESSION_SECRET not configured");
  }

  const { cookies } = await import("next/headers");
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  return verifySessionCookieValue(raw, secret);
}

export async function setSessionCookie(
  identityId: string,
  bootId?: string | null,
): Promise<void> {
  const secret = requireSessionSecret();
  const token = await signSessionCookieValue(identityId, secret, bootId);
  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
