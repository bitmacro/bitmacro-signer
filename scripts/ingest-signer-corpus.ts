/**
 * Ingestão do corpus Signer → Supabase `documents` (pgvector), produto=signer.
 *
 * Variáveis: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *   SUPABASE_SERVICE_ROLE_URL (opcional, relay), NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL,
 *   opcional SIGNER_KB_PATH (default ./signer-knowledge-base.md).
 *
 * Apagar linhas produto=signer antes de inserir:
 *   npm run ingest:signer:replace
 *   ou flag: tsx scripts/ingest-signer-corpus.ts --replace
 *   ou env INGEST_REPLACE=1 (bash) / $env:INGEST_REPLACE="1" (PowerShell)
 *
 * npm run ingest:signer
 */

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const REPO_ROOT = process.cwd();

/** Same stack as Next: later files override earlier ones. */
function loadSignerIngestEnv(): void {
  const files = [
    ".env",
    ".env.local",
    ".env.development.local",
    ".env.development",
  ];
  for (const f of files) {
    loadEnv({ path: path.join(REPO_ROOT, f), override: true });
  }
}

loadSignerIngestEnv();

const PRODUTO = "signer" as const;
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small" as const;
const OPENAI_EMBEDDING_DIM = 1536;
const DEFAULT_KB_FILE = "signer-knowledge-base.md";

type Chunk = { titulo: string; conteudo: string; fonte: string };

function stripCarriageReturn(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

function chunkByHeadings(markdown: string, fonte: string): Chunk[] {
  const text = stripCarriageReturn(markdown);
  const lines = text.split("\n");
  const chunks: Chunk[] = [];

  let i = 0;
  let h2: string | null = null;
  let h1Title: string | null = null;

  const flush = (titulo: string, bodyLines: string[]) => {
    const conteudo = bodyLines.join("\n").trim();
    if (!conteudo) return;
    chunks.push({ titulo: titulo.trim(), conteudo, fonte });
  };

  const preamble: string[] = [];
  while (i < lines.length) {
    const line = lines[i]!;
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !h1Title) {
      h1Title = h1[1]!.trim();
      i += 1;
      continue;
    }
    if (/^##\s/.test(line) || /^###\s/.test(line)) break;
    preamble.push(line);
    i += 1;
  }

  if (preamble.some((l) => l.trim().length > 0)) {
    const introTitulo = h1Title ?? "Introdução";
    flush(introTitulo, preamble);
  }

  let currentTitulo = "";
  let currentBody: string[] = [];

  const startNew = (titulo: string) => {
    if (currentTitulo || currentBody.length > 0) {
      flush(currentTitulo, currentBody);
    }
    currentTitulo = titulo;
    currentBody = [];
  };

  for (; i < lines.length; i += 1) {
    const line = lines[i]!;
    const m2 = line.match(/^##\s+(.+)$/);
    const m3 = line.match(/^###\s+(.+)$/);

    if (m2) {
      h2 = m2[1]!.trim();
      startNew(h2);
      continue;
    }
    if (m3) {
      const sub = m3[1]!.trim();
      const titulo = h2 ? `${h2} — ${sub}` : sub;
      startNew(titulo);
      continue;
    }
    currentBody.push(line);
  }

  if (currentTitulo || currentBody.length > 0) {
    flush(currentTitulo || (h1Title ?? "Introdução"), currentBody);
  }

  return chunks;
}

function env(name: string, required = true): string {
  const v = process.env[name];
  if (!v && required) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v ?? "";
}

function truthy(name: string): boolean {
  const v = (process.env[name] ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function wantReplace(): boolean {
  return truthy("INGEST_REPLACE") || process.argv.includes("--replace");
}

function supabaseUrl(): string {
  const order = [
    process.env.SUPABASE_SERVICE_ROLE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  ];
  for (const raw of order) {
    const u = raw?.trim();
    if (u) return u;
  }
  return "";
}

function exitMissingSupabaseUrl(): never {
  console.error(
    [
      "Missing Supabase URL (SUPABASE_SERVICE_ROLE_URL, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_URL).",
      "",
      "1. In this folder, create or edit .env.local (see .env.example).",
      "   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co",
      "   # Optional self-host relay: SUPABASE_SERVICE_ROLE_URL=http://10.0.0.1:8091",
      "   SUPABASE_SERVICE_ROLE_KEY=eyJ...",
      "   OPENAI_API_KEY=sk-...",
      "",
      "2. Use the same Supabase project as bitmacro-id if you share the RAG `documents` table.",
      "",
      `cwd: ${REPO_ROOT}`,
    ].join("\n"),
  );
  process.exit(1);
}

async function embedBatchOpenAI(
  client: OpenAI,
  inputs: string[],
): Promise<number[][]> {
  const res = await client.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: inputs,
  });
  const out = res.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
  if (out.some((e) => e.length !== OPENAI_EMBEDDING_DIM)) {
    throw new Error(
      `Embedding dimension mismatch (expected ${OPENAI_EMBEDDING_DIM})`,
    );
  }
  return out;
}

function resolveKbPath(): { abs: string; fonte: string } {
  const raw = (process.env.SIGNER_KB_PATH ?? "").trim();
  const rel = raw || DEFAULT_KB_FILE;
  const abs = path.isAbsolute(rel)
    ? path.normalize(rel)
    : path.resolve(process.cwd(), rel);
  const fonte = path.basename(abs);
  return { abs, fonte };
}

const OPENAI_BATCH = 64;

async function main() {
  const { abs: kbAbs, fonte: kbFonte } = resolveKbPath();
  const url = supabaseUrl();
  if (!url) {
    exitMissingSupabaseUrl();
  }
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey);
  const openai = new OpenAI({ apiKey: env("OPENAI_API_KEY") });

  console.log(`Knowledge base: ${kbAbs}`);

  let raw: string;
  try {
    raw = await readFile(kbAbs, "utf8");
  } catch (e) {
    console.error(`Cannot read ${kbAbs}:`, e);
    process.exit(1);
  }

  const allChunks = chunkByHeadings(raw, kbFonte);

  if (allChunks.length === 0) {
    console.error("No chunks produced; check ## / ### headings in KB");
    process.exit(1);
  }

  console.log(`Chunks: ${allChunks.length} (produto=${PRODUTO})`);

  if (wantReplace()) {
    const { error: delErr } = await supabase
      .from("documents")
      .delete()
      .eq("produto", PRODUTO);
    if (delErr) {
      console.error("Delete failed:", delErr);
      process.exit(1);
    }
    console.log(`Removed existing rows for produto=${PRODUTO}`);
  }

  const inputs = allChunks.map((c) =>
    `${c.titulo}\n\n${c.conteudo}`.slice(0, 32000),
  );

  const embeddings: number[][] = [];
  for (let i = 0; i < inputs.length; i += OPENAI_BATCH) {
    const slice = inputs.slice(i, i + OPENAI_BATCH);
    const batch = await embedBatchOpenAI(openai, slice);
    embeddings.push(...batch);
    console.log(
      `Embedded ${Math.min(i + OPENAI_BATCH, allChunks.length)}/${allChunks.length}`,
    );
  }

  const rows = allChunks.map((c, idx) => ({
    produto: PRODUTO,
    titulo: c.titulo,
    conteudo: c.conteudo,
    fonte: c.fonte,
    embedding: embeddings[idx]!,
  }));

  const INSERT_BATCH = 100;
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const slice = rows.slice(i, i + INSERT_BATCH);
    const { error: insErr } = await supabase.from("documents").insert(slice);
    if (insErr) {
      console.error("Insert failed:", insErr);
      process.exit(1);
    }
  }

  console.log(`Done. Inserted ${rows.length} rows into documents.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
