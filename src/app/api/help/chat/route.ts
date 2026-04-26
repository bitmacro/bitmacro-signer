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
import {
  createServiceRoleClient,
  resolveServiceRoleSupabaseUrl,
} from "@/lib/supabase/service-role";
import { withDeadline } from "@/lib/with-deadline";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { apiPOST } from "@/lib/observability/api-route-wrapper";

export const runtime = "nodejs";

const EMBED_MODEL = "text-embedding-3-small";
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const MAX_QUESTION_LEN = 4000;
const DEFAULT_CONTEXT_CHUNKS = 8;
const DEFAULT_RETRIEVAL_MATCH_COUNT = 16;
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

/**
 * When the widget product (e.g. signer) returns L1 hits above RAG_MIN_SIMILARITY but with low
 * confidence, also search all products and pick global if it scores higher (Identity NIP-05 from Signer UI).
 * Set RAG_CROSS_PRODUCT_FALLBACK_MIN=0 to disable. Default 0.38.
 */
function ragCrossProductFallbackMin(): number {
  const raw = process.env.RAG_CROSS_PRODUCT_FALLBACK_MIN?.trim();
  if (raw == null || raw === "") return 0.38;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return 0.38;
  if (n === 0) return 0;
  return Math.min(1, Math.max(0.01, n));
}

/** Chunks sent to the model / returned as sources (default 8). */
function ragContextChunkLimit(): number {
  const raw = process.env.RAG_CONTEXT_CHUNKS?.trim();
  if (raw == null || raw === "") return DEFAULT_CONTEXT_CHUNKS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_CONTEXT_CHUNKS;
  return Math.min(16, Math.max(4, n));
}

/** RPC `match_count` — retrieve a wider pool so cross-product slots can surface Identity (default 16). */
function ragRetrievalMatchCount(): number {
  const raw = process.env.RAG_RETRIEVAL_MATCH_COUNT?.trim();
  if (raw == null || raw === "") return DEFAULT_RETRIEVAL_MATCH_COUNT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_RETRIEVAL_MATCH_COUNT;
  const ctx = ragContextChunkLimit();
  return Math.min(32, Math.max(ctx, n));
}

/**
 * When merging L1+L2, reserve this many slots for chunks whose produto ≠ widget (default 3).
 * Set RAG_CROSS_PRODUCT_RESERVED=0 to disable (pure similarity only).
 */
function ragCrossProductReservedSlots(): number {
  const raw = process.env.RAG_CROSS_PRODUCT_RESERVED?.trim();
  if (raw == null || raw === "") return 3;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 3;
  if (n === 0) return 0;
  return Math.min(ragContextChunkLimit(), n);
}

/** Extra `match_documents(..., 'identity')` when widget is signer so Identity chunks are not dropped from the global top-K. Set RAG_IDENTITY_SIDECAR=0 to disable. */
function ragIdentitySidecarEnabled(): boolean {
  const raw = process.env.RAG_IDENTITY_SIDECAR?.trim();
  if (raw === "0" || raw?.toLowerCase() === "false") return false;
  return true;
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
    process.env.SUPABASE_SERVICE_ROLE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

function bestSimilarity(rows: MatchRow[]): number {
  return rows.length > 0 ? rows[0]!.similarity : 0;
}

function isWeakRetrieval(rows: MatchRow[], threshold: number): boolean {
  return rows.length === 0 || bestSimilarity(rows) < threshold;
}

/** Dedupe by id, sort by similarity desc, cap at `limit` (cross-product retrieval). */
function mergeMatchRows(a: MatchRow[], b: MatchRow[], limit: number): MatchRow[] {
  const seen = new Set<string>();
  const out: MatchRow[] = [];
  for (const r of [...a, ...b]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  out.sort((x, y) => y.similarity - x.similarity);
  return out.slice(0, limit);
}

/** Full deduped union sorted by similarity (for reserved-slot merge). */
function mergeAllMatchRows(a: MatchRow[], b: MatchRow[]): MatchRow[] {
  return mergeMatchRows(a, b, a.length + b.length + 64);
}

/**
 * Prefer up to `reservedOther` chunks from non-widget products, then fill by global similarity
 * so Identity (e.g. NIP-05) is not displaced by eight Signer NIP-46 excerpts.
 */
function mergeWithCrossProductSlots(
  l1: MatchRow[],
  l2: MatchRow[],
  widgetProduct: string,
  contextLimit: number,
  reservedOther: number,
): MatchRow[] {
  const pool = mergeAllMatchRows(l1, l2);
  if (reservedOther <= 0) {
    return pool.slice(0, contextLimit);
  }
  const others = pool.filter((r) => r.produto !== widgetProduct);
  const picked: MatchRow[] = [];
  const seen = new Set<string>();
  for (const r of others) {
    if (picked.length >= reservedOther || picked.length >= contextLimit) break;
    picked.push(r);
    seen.add(r.id);
  }
  for (const r of pool) {
    if (picked.length >= contextLimit) break;
    if (seen.has(r.id)) continue;
    picked.push(r);
    seen.add(r.id);
  }
  /* Order matters: non-widget excerpts first (reserved), then fill by global rank — do not re-sort. */
  return picked;
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

async function handlePost(req: Request) {
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
      "[signer/help/chat] Supabase URL or SUPABASE_SERVICE_ROLE_KEY missing",
    );
    return NextResponse.json({ error: msgTryLater(locale) }, { status: 500 });
  }

  const sbUrl = resolveServiceRoleSupabaseUrl();

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
    const embedStartedAt = Date.now();
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
      logHelp("embed_vectors", {
        ok: queryEmbedding.length > 0,
        ms: Date.now() - embedStartedAt,
      });
    } catch (e) {
      logHelp("embed_failed", {
        ms: Date.now() - embedStartedAt,
        message: e instanceof Error ? e.message : String(e),
      });
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

    const retrievalK = ragRetrievalMatchCount();
    const contextK = ragContextChunkLimit();

    async function rpcMatch(filterProduto: string | null): Promise<{
      rows: MatchRow[];
      err: { message: string; code?: string; details?: string; hint?: string } | null;
    }> {
      const baseArgs = {
        match_count: retrievalK,
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

    const l1Best = bestSimilarity(l1.rows);
    const l1Weak = isWeakRetrieval(l1.rows, threshold);
    const fallbackMin = ragCrossProductFallbackMin();
    const tryGlobal =
      l1Weak ||
      (fallbackMin > 0 && l1.rows.length > 0 && l1Best < fallbackMin);

    const reservedCross = ragCrossProductReservedSlots();

    logHelp("match_l1", {
      count: l1.rows.length,
      best: l1Best,
      threshold,
      weak: l1Weak,
      fallbackMin,
      tryGlobal,
      retrievalK,
      contextK,
      reservedCross,
    });

    if (tryGlobal) {
      const l2 = await rpcMatch(null);
      if (l2.err) {
        return NextResponse.json({ error: msgTryLater(locale) }, { status: 500 });
      }
      let l2Pool = l2.rows;
      if (ragIdentitySidecarEnabled() && produtoWidget === "signer") {
        const idHit = await rpcMatch("identity");
        if (!idHit.err && idHit.rows.length > 0) {
          l2Pool = mergeAllMatchRows(l2.rows, idHit.rows);
          logHelp("match_identity_sidecar", {
            identityRows: idHit.rows.length,
            poolRows: l2Pool.length,
          });
        } else if (idHit.err) {
          logHelp("match_identity_sidecar_skip", { err: true });
        }
      }
      const l2Best = bestSimilarity(l2Pool);
      const l2Weak = isWeakRetrieval(l2Pool, threshold);

      if (l1Weak) {
        rows = mergeWithCrossProductSlots(
          [],
          l2Pool,
          produtoWidget,
          contextK,
          reservedCross,
        );
        searchLevel = 2;
        tagProductInChunks = true;
      } else {
        rows = mergeWithCrossProductSlots(
          l1.rows,
          l2Pool,
          produtoWidget,
          contextK,
          reservedCross,
        );
        searchLevel = 2;
        tagProductInChunks = rows.some((r) => r.produto !== produtoWidget);
      }

      logHelp("match_l2", {
        count: l2Pool.length,
        best: l2Best,
        threshold,
        weak: l2Weak,
        l1Weak,
        l1Best,
        l2Best,
        mergedBest: bestSimilarity(rows),
        searchLevel,
        tagProductInChunks,
        productsInContext: [...new Set(rows.map((r) => r.produto))],
      });
    } else {
      rows = l1.rows.slice(0, contextK);
      /* Strong L1 (best ≥ fallback): global RPC is skipped, but Identity-only answers (NIP-05) still need the sidecar. */
      if (ragIdentitySidecarEnabled() && produtoWidget === "signer") {
        const idHit = await rpcMatch("identity");
        if (!idHit.err && idHit.rows.length > 0) {
          rows = mergeWithCrossProductSlots(
            l1.rows,
            idHit.rows,
            produtoWidget,
            contextK,
            reservedCross,
          );
          searchLevel = 2;
          tagProductInChunks = rows.some((r) => r.produto !== produtoWidget);
          logHelp("match_identity_sidecar_strong_l1", {
            identityRows: idHit.rows.length,
            l1Best,
            mergedBest: bestSimilarity(rows),
            productsInContext: [...new Set(rows.map((r) => r.produto))],
          });
        } else if (idHit.err) {
          logHelp("match_identity_sidecar_strong_l1_skip", { err: true });
        }
      }
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
    const chatStartedAt = Date.now();
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
      logHelp("chat_done", {
        choices: completion.choices?.length ?? 0,
        ms: Date.now() - chatStartedAt,
      });
    } catch (e) {
      logHelp("chat_failed", {
        ms: Date.now() - chatStartedAt,
        message: e instanceof Error ? e.message : String(e),
      });
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

export const POST = apiPOST("POST /api/help/chat", handlePost);
