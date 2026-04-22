import {
  getHelpLocaleFromCookieHeader,
  normalizeHelpLocale,
  type HelpLocale,
} from "@/lib/help-locale";
import {
  msgBadJson,
  msgNotifyInvalidEmail,
  msgQuestionInvalid,
  msgTryLater,
} from "@/lib/help-chat-messages";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PRODUTO = "signer";
const MAX_QUESTION_LEN = 4000;
const MAX_EMAIL_LEN = 254;

function isValidEmail(s: string): boolean {
  if (s.length > MAX_EMAIL_LEN) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function supabaseConfigured(): boolean {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

export async function POST(req: Request) {
  if (!supabaseConfigured()) {
    console.error(
      "[signer/unanswered-notify] Supabase URL or service role key missing",
    );
    return NextResponse.json(
      { error: msgTryLater("pt-BR") },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const loc = getHelpLocaleFromCookieHeader(req.headers.get("cookie"));
    return NextResponse.json({ error: msgBadJson(loc) }, { status: 400 });
  }

  const locale: HelpLocale = normalizeHelpLocale(
    typeof body === "object" &&
      body !== null &&
      "locale" in body &&
      (body as { locale: unknown }).locale,
  );

  const question =
    typeof body === "object" &&
    body !== null &&
    "question" in body &&
    typeof (body as { question: unknown }).question === "string"
      ? (body as { question: string }).question.trim()
      : "";

  if (!question || question.length > MAX_QUESTION_LEN) {
    return NextResponse.json(
      { error: msgQuestionInvalid(locale) },
      { status: 400 },
    );
  }

  const rawEmail =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";

  const email = rawEmail === "" ? null : rawEmail;
  if (email !== null && !isValidEmail(email)) {
    return NextResponse.json(
      { error: msgNotifyInvalidEmail(locale) },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("unanswered_questions").insert({
      produto: PRODUTO,
      pergunta: question,
      email,
    });
    if (error) {
      console.error("[signer/unanswered-notify] insert:", error);
      return NextResponse.json(
        { error: msgTryLater(locale) },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[signer/unanswered-notify]", e);
    return NextResponse.json(
      { error: msgTryLater(locale) },
      { status: 500 },
    );
  }
}
