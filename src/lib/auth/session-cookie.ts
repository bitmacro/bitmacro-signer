import { SignJWT, jwtVerify } from "jose";

/** HttpOnly session cookie — JWT HS256 with `sub` = identity UUID */
export const SESSION_COOKIE_NAME = "bm_signer_session";

const SESSION_MAX_AGE_SEC = 24 * 60 * 60;

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
): Promise<string> {
  return await new SignJWT({})
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

export async function setSessionCookie(identityId: string): Promise<void> {
  const secret = requireSessionSecret();
  const token = await signSessionCookieValue(identityId, secret);
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
