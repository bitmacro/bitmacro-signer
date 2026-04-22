import {
  getHelpLocaleFromCookieHeader,
  normalizeHelpLocale,
  type HelpLocale,
} from "@/lib/help-locale";
import {
  contextChunkLine,
  msgBadJson,
  msgNoAnswer,
  msgNotInDocumentation,
  msgOpenAiUnreachable,
  msgQuestionInvalid,
  msgTryLater,
  systemPrompt,
  userContextBlock,
} from "@/lib/help-chat-messages";
import { isLikelyOpenAiConnectivityError } from "@/lib/openai-connectivity";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const EMBED_MODEL = "text-embedding-3-small";
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const MAX_QUESTION_LEN = 4000;
const MATCH_COUNT = 8;
const ASSISTANT_PRODUTO = "signer";

/** Docker/Vercel may set env to ""; empty string must not fall through to default. */
function openaiChatModel(): string {
  const v = process.env.OPENAI_CHAT_MODEL?.trim();
  return v && v.length > 0 ? v : DEFAULT_CHAT_MODEL;
}

function ragMinSimilarity(): number {
  const raw = process.env.RAG_MIN_SIMILARITY?.trim();
  if (raw == null || raw === "") return 0.32;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.32;
  return n;
}

/** Optional: https://api.openai.com/v1 or a reachable proxy (e.g. Cloudflare AI Gateway, VPS relay). */
function openaiBaseUrl(): string | undefined {
  const v = process.env.OPENAI_BASE_URL?.trim();
  return v && v.length > 0 ? v : undefined;
}

type MatchRow = {
  id: string;
  produto: string;
  titulo: string;
  conteudo: string;
  fonte: string;
  similarity: number;
};

function embeddingToVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function supabaseConfigured(): boolean {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.error("[signer/help/chat] invalid JSON body");
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

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("[signer/help/chat] OPENAI_API_KEY missing");
    return NextResponse.json({ error: msgTryLater(locale) }, { status: 500 });
  }

  if (!supabaseConfigured()) {
    console.error(
      "[signer/help/chat] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
    );
    return NextResponse.json({ error: msgTryLater(locale) }, { status: 500 });
  }

  try {
    const baseURL = openaiBaseUrl();
    const openai = new OpenAI({
      apiKey: openaiKey,
      ...(baseURL ? { baseURL } : {}),
    });

    const embedRes = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: question,
    });
    const queryEmbedding = embedRes.data[0]?.embedding;
    if (!queryEmbedding?.length) {
      console.error("[signer/help/chat] empty embedding from OpenAI");
      return NextResponse.json(
        { error: msgTryLater(locale) },
        { status: 502 },
      );
    }

    const supabase = createServiceRoleClient();
    const rpcBase = {
      match_count: MATCH_COUNT,
      filter_produto: ASSISTANT_PRODUTO,
    };

    let { data: matches, error: rpcError } = await supabase.rpc(
      "match_documents",
      {
        ...rpcBase,
        query_embedding: embeddingToVectorLiteral(queryEmbedding),
      },
    );

    if (rpcError) {
      const retry = await supabase.rpc("match_documents", {
        ...rpcBase,
        query_embedding: queryEmbedding,
      });
      if (!retry.error) {
        matches = retry.data;
        rpcError = null;
      }
    }

    if (rpcError) {
      console.error("[signer/help/chat] match_documents failed:", rpcError);
      return NextResponse.json(
        { error: msgTryLater(locale) },
        { status: 500 },
      );
    }

    const rows = (matches ?? []) as MatchRow[];

    const threshold = ragMinSimilarity();
    const bestSimilarity = rows.length > 0 ? rows[0]!.similarity : 0;
    const weakRetrieval = rows.length === 0 || bestSimilarity < threshold;

    if (weakRetrieval) {
      return NextResponse.json({
        answer: msgNotInDocumentation(locale),
        sources: [],
        unanswered: true,
      });
    }

    const context = rows
      .map((r, i) => contextChunkLine(locale, i, r.fonte, r.titulo, r.conteudo))
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: openaiChatModel(),
      messages: [
        { role: "system", content: systemPrompt(locale) },
        {
          role: "user",
          content: userContextBlock(locale, context, question),
        },
      ],
      max_tokens: 900,
      temperature: 0.25,
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ?? msgNoAnswer(locale);

    return NextResponse.json({
      answer,
      sources: rows.map((r) => ({
        titulo: r.titulo,
        fonte: r.fonte,
        similarity: r.similarity,
      })),
      unanswered: false,
    });
  } catch (e) {
    if (isLikelyOpenAiConnectivityError(e)) {
      console.error("[signer/help/chat] OpenAI connectivity:", e);
      return NextResponse.json(
        { error: msgOpenAiUnreachable(locale), code: "openai_connectivity" },
        { status: 502 },
      );
    }
    console.error("[signer/help/chat] unhandled:", e);
    return NextResponse.json({ error: msgTryLater(locale) }, { status: 500 });
  }
}
