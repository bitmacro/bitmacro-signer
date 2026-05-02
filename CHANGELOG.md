# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.18] - 2026-05-02

### Changed

- **Locale switcher:** segmented control **PT / EN / ES** with orange highlight on the active locale (aligned with id.bitmacro.io), replacing the single cycling button on landing, panel, and sessions headers; session menu shows the same control under **Language**.

## [0.4.17] - 2026-05-02

### Added

- Comparison table rows **encrypted offline backup (PDF)** and **nostrconnect:// support** (Signer “coming soon” where marked phase 2); new compare **pills** (`localOnly`, `viaIdentity`, `signerPlusIdentity`).
- **`src/lib/register-node-instrumentation.ts`**: Node-only bootstrap (DNS IPv4-first + boot log), loaded dynamically from `instrumentation.ts`.

### Changed

- **i18n (pt-BR, en, es):** FAQ Signer wording; punctuation pass replacing em dashes with colons, semicolons, commas, or middots where it reads more naturally; compare **phase 2** pill copy (“Coming soon” / “Em breve” / “Próximamente”); `unifiedOnboarding` detail reflects Signer + Identity; SEO strings (root layout, Open Graph, sessions metadata, package description).
- **Comparison matrix** (`COMPARISON_ROW_DEFS`): dropped `lightningPayments` and `fullStack`; adjusted cells for `clientDecrypt`, `sessionTtl`, `auditLog`, `nip05Plan`, `lightningAddress`, `unifiedOnboarding`, `zeroKnowledgeHosted`, `devSdk`; `yesPill` cells can resolve pill text from messages (package name still monospace).
- **Help chat** context lines: source/title separator and system-prompt wording (no em dash in those strings).
- **`scripts/i18n-emit.mjs`:** feature list and labels aligned with the live message files.
- **Ingest script:** document title uses `:` between heading and subtitle instead of an em dash.

### Fixed

- **Turbopack / Edge:** `instrumentation.ts` no longer imports `node:dns` at module scope, avoiding repeated “Node.js module … not supported in the Edge Runtime” warnings during `next dev` / build analysis.
- **NIP-46 `app-keys` errors:** wording without em dashes.

## [0.4.16] - 2026-04-26

### Added

- Session user menu (panel / sessions): link to **Offline recovery** (`/recover`) in the account dropdown.

### Changed

- ESLint: silence unused `Request` parameters in route handlers (`void request`) and clean unused destructuring in Loki / route HTTP logger helpers.

## [0.4.15] - 2026-04-22

### Fixed

- RAG: **Identity sidecar** also runs when L1 is “strong” (`tryGlobal` false). Previously the extra `match_documents(..., identity)` only ran inside the global branch, so high-scoring Signer hits (e.g. NIP-46) blocked NIP-05 retrieval entirely.

## [0.4.14] - 2026-04-22

### Fixed

- RAG: when the help widget is **signer**, run an extra **`match_documents` with `filter_produto: identity`** (on by default; disable with `RAG_IDENTITY_SIDECAR=0`) and merge into the global pool so Identity-only topics (e.g. NIP-05) are not excluded when they rank below the global top-K.
- Help chat **system prompt** (pt/en/es): excerpts may include other BitMacro products (e.g. Identity / NIP-05) — instructs the model to use them when present so it does not dismiss cross-product context.

## [0.4.13] - 2026-04-22

### Fixed

- RAG: eight Signer-only excerpts could still crowd out Identity for questions like NIP-05 (NIP-46 embeds closer). **`match_documents` now requests a wider pool** (`RAG_RETRIEVAL_MATCH_COUNT`, default **16**), trims to **`RAG_CONTEXT_CHUNKS`** (default **8**), and **reserves** **`RAG_CROSS_PRODUCT_RESERVED`** slots (default **3**) for `produto ≠` widget **before** filling the rest by similarity. Reserved chunks stay **first** in the prompt order (no global re-sort).

## [0.4.12] - 2026-04-22

### Fixed

- RAG cross-product: when L1 was marginal and L2 ran, we only replaced context if `l2Best > l1Best`. Identity chunks could score just below the best signer hit and never surface. Now we **merge** L1+L2, **dedupe**, sort by similarity, and take the top **K** so the strongest chunk wins (e.g. NIP-05 from Identity).

## [0.4.11] - 2026-04-22

### Fixed

- RAG: when the widget product (e.g. signer) returned marginally relevant chunks above `RAG_MIN_SIMILARITY`, global search (other products) never ran. Now if L1 **best** similarity is below **`RAG_CROSS_PRODUCT_FALLBACK_MIN`** (default **0.38**), we also run `match_documents` with `filter_produto: null` and **keep global rows when their best score is higher** (e.g. NIP-05 in Identity corpus from the Signer assistant). Set `RAG_CROSS_PRODUCT_FALLBACK_MIN=0` to restore previous behaviour.

## [0.4.10] - 2026-04-22

### Added

- **`SUPABASE_SERVICE_ROLE_URL`** — optional base URL for `createServiceRoleClient()` (and daemon) when self-hosted hosts cannot reach `*.supabase.co`; browser/session still uses `NEXT_PUBLIC_SUPABASE_URL`. Precedence: `SUPABASE_SERVICE_ROLE_URL` → `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`.
- `GET /api/help/supabase-check` — probes `…/rest/v1/` from the service-role base (no key).

### Changed

- Ingest script prefers `SUPABASE_SERVICE_ROLE_URL` when set.

## [0.4.9] - 2026-04-22

### Changed

- `GET /api/help/network-check`: IPv4 literal hosts show that address under `dns.A` (no empty DNS noise); probe response adds `https.scheme` and `https.code` (e.g. `ECONNREFUSED`) when available; `hint` distinguishes **direct OpenAI** vs **relay configured but unreachable**.

## [0.4.8] - 2026-04-22

### Fixed

- `GET /api/help/network-check`: when `OPENAI_BASE_URL` already ends with `/v1` (SDK-style), probe uses `/v1/models` instead of `/v1/v1/models`.

## [0.4.7] - 2026-04-22

### Fixed

- GHCR **Web Docker** workflow now passes `SIGNER_GIT_COMMIT` into the image; Dockerfile sets `ENV BITMACRO_SIGNER_VERSION` for runtime.
- Startup log: `[bitmacro-signer] boot semver=… commit=…` so ops can confirm the running image without guessing.
- `GET /api/build-info` includes `imageVersion` from the container env.

## [0.4.6] - 2026-04-22

### Added

- `instrumentation.ts`: `dns.setDefaultResultOrder("ipv4first")` on the Node server (in addition to `NODE_OPTIONS`).
- `GET /api/help/network-check` — JSON DNS (A/AAAA) + HTTPS probe to OpenAI (or `OPENAI_BASE_URL`) for ops; no API key sent.

## [0.4.5] - 2026-04-22

### Fixed

- Help chat: wrap OpenAI embed/chat in a hard `withDeadline` (SDK timeout + 20s) so hung TCP (e.g. IPv6 blackhole) eventually returns `openai_connectivity` instead of stalling forever.
- Logs: `embed_start`, `embed_vectors`, `chat_start`, `chat_done`.

### Ops

- Self-host: prefer IPv4 for Node (`NODE_OPTIONS=--dns-result-order=ipv4first`); set in `bitmacro-server` compose for `signer-web`.

## [0.4.4] - 2026-04-22

### Fixed

- Treat OpenAI SDK `Request timed out` and similar messages as connectivity (return `openai_connectivity` / `msgOpenAiUnreachable` instead of generic 500).
- Default per-request OpenAI timeout 90s; optional `OPENAI_HTTP_TIMEOUT_MS` (15s–300s). Client assistant fetch window 200s.

## [0.4.3] - 2026-04-22

### Added

- Help chat: two-stage RAG — scoped `produto` match first, then whole `documents` if below `RAG_MIN_SIMILARITY`; level-2 adds cross-product system note + product link.
- Widget sends `produto` (`signer`); optional `HELP_PRODUCT_URL_*` env overrides for links.
- Structured logs: `request`, `embed_ok`, `match_l1`, `match_l2`, `retrieval_weak`, `prompt_cross_product`, `done`, plus `openai_error` details on API failures.

### Changed

- Requires Supabase `match_documents` update: `filter_produto` nullable = search all rows (see `bitmacro-id/scripts/sql/match_documents.sql`).

## [0.4.2] - 2026-04-22

### Fixed

- Help assistant: client abort after 130s and OpenAI SDK timeout (55s, no retries) so “thinking” cannot hang indefinitely.

## [0.4.1] - 2026-04-22

### Added

- Optional `OPENAI_BASE_URL` for self-hosted hosts that cannot reach `api.openai.com` directly (use a reachable HTTPS gateway).

### Fixed

- Assistant: detect OpenAI connectivity failures (`ETIMEDOUT`, etc.) and return a clear 502 message instead of a generic error.
- Assistant UI: parse JSON safely so HTML proxy error pages (e.g. 504) show a dedicated message.

## [0.4.0] - 2026-04-21

### Added

- Documentation assistant (RAG) at `/api/help/*` with corpus ingest script and landing FAQ.

## [0.3.6] - 2026-04-19

### Fixed

- Backup PDF: manual JSON section is pretty-printed (indented); long values wrap within the text column; overflow continues on a second page when needed. QR image placement uses explicit horizontal centering on the page.

## [0.3.0] - 2026-04-18

### Added

- Internationalization for **pt-BR**, **en**, and **es** using `next-intl`.
- Unified locale cookie `bitmacro-locale`, middleware header `x-bitmacro-locale`, and one-time migration from legacy `relay-panel:locale`.
- Localized landing, onboarding, and sessions pages with a locale switcher (PT → EN → ES).
- `npm run i18n:emit` to regenerate message JSON from the i18n source script.

### Changed

- English copy across the OSS UI, metadata, comments, and design token notes.
- README aligned with the MVP and linked to bitmacro-docs signer material.
- Mobile-first responsive layout and design system tokens.

### Fixed

- PWA `site.webmanifest`: icon purpose and theme background color (`#080808`).

## [0.2.4] - 2026-04-16

Prior release; see [git tags](https://github.com/bitmacro/bitmacro-signer/tags) for earlier history.

[0.4.18]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.17...v0.4.18
[0.4.17]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.16...v0.4.17
[0.4.16]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.15...v0.4.16
[0.4.15]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.14...v0.4.15
[0.4.14]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.13...v0.4.14
[0.4.13]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.12...v0.4.13
[0.4.12]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.11...v0.4.12
[0.4.11]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.10...v0.4.11
[0.4.10]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.9...v0.4.10
[0.4.9]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.8...v0.4.9
[0.4.8]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.7...v0.4.8
[0.4.7]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.6...v0.4.7
[0.4.6]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/bitmacro/bitmacro-signer/compare/v0.3.6...v0.4.0
[0.3.6]: https://github.com/bitmacro/bitmacro-signer/compare/v0.3.5...v0.3.6
[0.3.0]: https://github.com/bitmacro/bitmacro-signer/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/bitmacro/bitmacro-signer/releases/tag/v0.2.4
