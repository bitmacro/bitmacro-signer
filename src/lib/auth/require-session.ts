import { NextResponse } from "next/server";

import { getSessionCookie } from "@/lib/auth/session-cookie";

/** Null when a panel session exists. Otherwise the response to return. */
export async function rejectUnlessSession(): Promise<NextResponse | null> {
  let identityId: string | null;
  try {
    identityId = await getSessionCookie();
  } catch {
    return NextResponse.json(
      { error: "Server misconfigured: session support unavailable" },
      { status: 503 },
    );
  }
  if (!identityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
