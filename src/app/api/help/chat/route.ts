import {
  getHelpLocaleFromCookieHeader,
  normalizeHelpLocale,
  type HelpLocale,
} from "@/lib/help-locale";
import {
  contextChunkLineWithProduct,
  crossProductSourceNote,
  msgBadJson,
  msgNoAnswer,
  msgNotInDocumentation,
  msgOpenAiUnreachable,
  msgQuestionInvalid,
  msgTryLater,
  systemPrompt,
  userContextBlock,
} from "@/lib/help-chat-messages";
import {
  helpProductDocsUrl,
  helpProductPublicLabel,
  normalizeHelpProdutoFromBody,
} from "@/lib/help-product";
import { isLikelyOpenAiConnectivityError } from "@/lib/openai-connectivity";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { withDeadline } from "@/lib/with-deadline";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const EMBED_MODEL = "text-embedding-3-small";
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const MAX_QUESTION_LEN = 4000;
const MATCH_COUNT = 8;
const WIDGET_DEFAULT_PRODUTO = "signer";

/** Per OpenAI HTTP call. Override with OPENAI_HTTP_TIMEOUT_MS (ms), min 15s max 300s. */
function openaiHttpTimeoutMs(): number {
  const raw = process.env.OPENAI_HTTP_TIMEOUT_MS?.trim();
  if (raw == null || raw === "") return 90_000;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 90_000;
  return Math.min(300_000, Math.max(15_000, n));
}

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

function bestSimilarity(rows: MatchRow[]): number {
  return rows.length > 0 ? rows[0]!.similarity : 0;
}

function isWeakRetrieval(rows: MatchRow[], threshold: number): boolean {
  return rows.length === 0 || bestSimilarity(rows) < threshold;
}

function logHelp(stage: string, data: Record<string, unknown>) {
  console.info("[signer/help/chat]", { stage, ...data });
}

function logOpenAiFailure(e: unknown) {
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    console.error("[signer/help/chat] openai_error", {
      status: o.status,
      code: o.code,
      message: o.message,
      type: o.type,
    });
    return;
  }
  console.error("[signer/help/chat] openai_error", e);
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

  const produtoWidget = normalizeHelpProdutoFromBody(body, WIDGET_DEFAULT_PRODUTO);

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

  const sbUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";

  try {
    logHelp("request", {
      produtoWidget,
      locale,
      qLen: question.length,
    });

    const baseURL = openaiBaseUrl();
    const timeoutMs = openaiHttpTimeoutMs();
    const openai = new OpenAI({
      apiKey: openaiKey,
      timeout: timeoutMs,
      maxRetries: 0,
      ...(baseURL ? { baseURL } : {}),
    });
    logHelp("openai_client", { timeoutMs });
    /** Hard cap if SDK/socket never returns (often IPv6 blackhole on Docker). */
    const embedDeadlineMs = timeoutMs + 20_000;

    let queryEmbedding: number[];
    try {
      logHelp("embed_start", { model: EMBED_MODEL, embedDeadlineMs });
      const embedRes = await withDeadline(
        openai.embeddings.create({
          model: EMBED_MODEL,
          input: question,
        }),
        embedDeadlineMs,
        "embed",
      );
      queryEmbedding = embedRes.data[0]?.embedding ?? [];
      logHelp("embed_vectors", { ok: queryEmbedding.length > 0 });
    } catch (e) {
      if (isLikelyOpenAiConnectivityError(e)) {
        console.error("[signer/help/chat] OpenAI connectivity (embed):", e);
        return NextResponse.json(
          { error: msgOpenAiUnreachable(locale), code: "openai_connectivity" },
          { status: 502 },
        );
      }
      logOpenAiFailure(e);
      return NextResponse.json({ error: msgTryLater(locale) }, { status: 502 });
    }

    if (!queryEmbedding.length) {
      console.error("[signer/help/chat] empty embedding from OpenAI");
      return NextResponse.json({ error: msgTryLater(locale) }, { status: 502 });
    }

    logHelp("embed_ok", { dim: queryEmbedding.length });

    const supabase = createServiceRoleClient();
    const threshold = ragMinSimilarity();

    async function rpcMatch(filterProduto: string | null): Promise<{
      rows: MatchRow[];
      err: { message: string; code?: string; details?: string; hint?: string } | null;
    }> {
      const baseArgs = {
        match_count: MATCH_COUNT,
        filter_produto: filterProduto,
        query_embedding: embeddingToVectorLiteral(queryEmbedding),
      };
      let { data, error } = await supabase.rpc("match_documents", baseArgs);
      if (error) {
        const retry = await supabase.rpc("match_documents", {
          ...baseArgs,
          query_embedding: queryEmbedding,
        });
        data = retry.data;
        error = retry.error;
      }
      if (error) {
        let host = "";
        try {
          host = new URL(sbUrl).hostname;
        } catch {
          host = "(invalid SUPABASE URL)";
        }
        console.error("[signer/help/chat] match_documents failed:", {
          host,
          filterProduto,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return { rows: [], err: error };
      }
      return { rows: (data ?? []) as MatchRow[], err: null };
    }

    const l1 = await rpcMatch(produtoWidget);
    if (l1.err) {
      return NextResponse.json({ error: msgTryLater(locale) }, { status: 500 });
    }

    let rows = l1.rows;
    let searchLevel: 1 | 2 = 1;
    let tagProductInChunks = false;

    logHelp("match_l1", {
      count: rows.length,
      best: bestSimilarity(rows),
      threshold,
      weak: isWeakRetrieval(rows, threshold),
    });

    if (isWeakRetrieval(rows, threshold)) {
      const l2 = await rpcMatch(null);
      if (l2.err) {
        return NextResponse.json({ error: msgTryLater(locale) }, { status: 500 });
      }
      rows = l2.rows;
      searchLevel = 2;
      tagProductInChunks = true;
      logHelp("match_l2", {
        count: rows.length,
        best: bestSimilarity(rows),
        threshold,
        weak: isWeakRetrieval(rows, threshold),
      });
    }

    if (isWeakRetrieval(rows, threshold)) {
      logHelp("retrieval_weak", { searchLevel });
      return NextResponse.json({
        answer: msgNotInDocumentation(locale),
        sources: [],
        unanswered: true,
      });
    }

    const primarySlug = rows[0]!.produto;
    const useCrossProductNote = searchLevel === 2;
    const systemParts = [systemPrompt(locale)];
    if (useCrossProductNote) {
      const label = helpProductPublicLabel(primarySlug, locale);
      const url = helpProductDocsUrl(primarySlug);
      systemParts.push(crossProductSourceNote(locale, label, url));
      logHelp("prompt_cross_product", {
        primarySlug,
        label,
        url,
      });
    }

    const context = rows
      .map((r, i) =>
        contextChunkLineWithProduct(locale, i, r, tagProductInChunks),
      )
      .join("\n\n");

    const chatModel = openaiChatModel();
    const chatDeadlineMs = timeoutMs + 20_000;
    let completion;
    try {
      logHelp("chat_start", { model: chatModel, chatDeadlineMs });
      completion = await withDeadline(
        openai.chat.completions.create({
          model: chatModel,
          messages: [
            { role: "system", content: systemParts.join("\n\n") },
            {
              role: "user",
              content: userContextBlock(locale, context, question),
            },
          ],
          max_tokens: 900,
          temperature: 0.25,
        }),
        chatDeadlineMs,
        "chat",
      );
      logHelp("chat_done", { choices: completion.choices?.length ?? 0 });
    } catch (e) {
      if (isLikelyOpenAiConnectivityError(e)) {
        console.error("[signer/help/chat] OpenAI connectivity (chat):", e);
        return NextResponse.json(
          { error: msgOpenAiUnreachable(locale), code: "openai_connectivity" },
          { status: 502 },
        );
      }
      logOpenAiFailure(e);
      return NextResponse.json({ error: msgTryLater(locale) }, { status: 502 });
    }

    const answer =
      completion.choices[0]?.message?.content?.trim() ?? msgNoAnswer(locale);

    logHelp("done", {
      searchLevel,
      sourceCount: rows.length,
    });

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
    const errMsg = e instanceof Error ? e.message : String(e);
    const errName = e instanceof Error ? e.name : typeof e;
    console.error("[signer/help/chat] unhandled:", { name: errName, message: errMsg, e });
    return NextResponse.json({ error: msgTryLater(locale) }, { status: 500 });
  }
}
