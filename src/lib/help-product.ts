/** Shared by Signer + Identity assistants (locale keys align). */
export type HelpProductLocale = "en" | "es" | "pt-BR";

const DEFAULT_URL: Record<string, string> = {
  signer: "https://signer.bitmacro.io",
  identity: "https://id.bitmacro.io",
};

/** Human-readable product name for prompts and UI. */
const LABEL: Record<string, Record<HelpProductLocale, string>> = {
  signer: {
    en: "BitMacro Signer",
    es: "BitMacro Signer",
    "pt-BR": "BitMacro Signer",
  },
  identity: {
    en: "BitMacro Identity",
    es: "BitMacro Identity",
    "pt-BR": "BitMacro Identity",
  },
};

export function sanitizeHelpProdutoSlug(raw: string): string {
  const t = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_-]/g, "");
  return t.slice(0, 64);
}

/** `siteDefault` = widget host product when body omits `produto` (e.g. signer | identity). */
export function normalizeHelpProdutoFromBody(
  body: unknown,
  siteDefault: string,
): string {
  const raw =
    typeof body === "object" &&
    body !== null &&
    "produto" in body &&
    typeof (body as { produto: unknown }).produto === "string"
      ? (body as { produto: string }).produto
      : "";
  const s = sanitizeHelpProdutoSlug(raw);
  if (s.length > 0) return s;
  const d = sanitizeHelpProdutoSlug(siteDefault);
  return d.length > 0 ? d : siteDefault.trim().toLowerCase().slice(0, 64);
}

export function helpProductPublicLabel(
  slug: string,
  locale: HelpProductLocale,
): string {
  const row = LABEL[slug];
  if (row) return row[locale];
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Public docs / product URL; override with HELP_PRODUCT_URL_<SLUG> (slug uppercased, non-alnum → _). */
export function helpProductDocsUrl(slug: string): string {
  const envKey = `HELP_PRODUCT_URL_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_URL[slug] ?? "https://bitmacro.io";
}
