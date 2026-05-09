# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.15] - 2026-05-09

### Fixed

- **`nostrconnect-initiate` + DB race:** call **`completeConnect` immediately after the first successful relay publish** (not after every relay). The client can send **`switch_relays`** / **`get_public_key`** as soon as the event hits the relay; completing the session **before** that narrowed window fixes flaky **`assertAppMayUseSigner`** failures.
- **`switch_relays` (NIP-46):** return **`JSON.stringify`** of **`getActiveNip46RelayUrlsForIdentity`** instead of **`[]`** — clients expect the bunker’s relay list to reconnect after handshake ([NIP-46 §switch_relays](https://github.com/nostr-protocol/nips/blob/master/46.md)).

## [0.6.14] - 2026-05-09

### Fixed

- **`nostrconnect://` after outbound initiate:** call **`completeConnect`** once **`sendNostrConnectInitiate`** publishes to **≥1 relay**. Clients such as Primal send **`switch_relays`** / **`get_public_key`** without an inbound **`connect`** RPC; **`assertAppMayUseSigner`** therefore rejected them while the DB row stayed **`used: false`**. Optional **`completeConnect`** hook wired from **`POST /internal/nostrconnect-initiate`** and from **`POST /api/sessions`** (in-process bunker).

## [0.6.13] - 2026-05-09

### Fixed

- **`sendNostrConnectInitiate`:** encrypt the outbound kind **24133** payload with **NIP-44** (per [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md)), not **NIP-04**. Clients such as Primal that only decrypt NIP-44 never saw the `connect` **response** `{ result: secret }`, so the handshake never advanced and the bunker logged **`nip46_idle_no_inbound`** (no follow-up client→bunker RPC).

## [0.6.12] - 2026-05-09

### Fixed

- **`sendNostrConnectInitiate` (`nostrconnect://`):** publish kind **24133** content as an NIP-46 **response** `{ id, result: <secret>, error: "" }`, per [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) (*Direct connection initiated by the client*). Previously the bunker wrongly sent an RPC **request** `{ method: "connect", params: [...] }`, so clients never saw `result === secret` and never completed the handshake (idle subscription, **`pending`** sessions).
- **`nip46-loop`:** restore missing `}` / `export function isRunning` after `extendBunkerRelaySubscriptions` (merge typo broke daemon **esbuild** / GHCR Docker builds for **0.6.12**).

## [0.6.11] - 2026-05-09

### Fixed

- **NIP-46 kind 24133 responses:** encrypt the RPC result with **NIP-04** when the inbound request was decrypted with NIP-04 (previously always NIP-44), so web clients that use NIP-04 for the envelope can read the `connect` acknowledgement and complete pairing.
- **`restartBunkerSubscriptions`:** when the new relay set is a **strict superset** of the current one, **open only the new relays** (additive join) instead of `stopBunker` + `startBunker`, so existing subscriptions (e.g. `wss://nrs.primal.net`) stay up while another `nostrconnect://` session adds `relay.nsec.app` — avoids dropping kind 24133 during the relay-union race.

## [0.6.10] - 2026-05-09

### Fixed

- **NIP-46 kind 24133 inbound:** try **NIP-44** first, then **NIP-04** if the ciphertext is not a valid NIP-44 payload. Some web clients (e.g. Primal) may send **NIP-04** envelopes; previously the bunker only attempted NIP-44 and dropped the event, leaving **`nostrconnect`** sessions stuck **`pending`** (`used: false`).

## [0.6.9] - 2026-05-06

### Fixed

- **`GET /api/auth/status`:** responds **`200`** with **`identity_id: null`** when there is no session cookie (instead of **`401`**) so DevTools no longer floods with “Unauthorized” while logged out; **`503`** remains for server misconfiguration.
- **Nostr Connect register (`POST /api/sessions` + `nostrconnect_uri`):** runs **`refreshBunkerNip46Relays`** **before** `nostrconnect-initiate` so the bunker subscribes on the client relay list **before** outbound connect — avoids **`restartBunkerSubscriptions`** racing Primal’s inbound kind **24133** (stuck **`pending`**).

## [0.6.8] - 2026-05-09

### Added

- **Panel · nostrconnect tab:** **Scan QR** (camera via **`react-zxing`**) fills the Client link textarea when the code decodes to a **`nostrconnect://`** URI; focus moves to **Register link**. Hidden when **`getUserMedia`** is unavailable. i18n en / pt-BR / es.

## [0.6.7] - 2026-05-09

### Added

- **`GET /api/auth/status`:** sliding session — when the JWT cookie is still valid, re-issues **`Set-Cookie`** with a fresh 24 h token so active tabs avoid silent expiry (unlock still required if the cookie is gone/expired or **`AUTH_SESSION_SECRET`** rotated).
- **`SESSION_MAX_AGE_SEC`:** exported alongside session-cookie module documentation (TTL, `SameSite=Lax`, redeploy note).

### Changed

- **Nostr profile metadata (kind 0):** removed **`wss://relay.damus.io`** from browser fallback relays (only **`wss://nos.lol`** + **`NEXT_PUBLIC_RELAY_URL`** when set), reducing WebSocket noise when Damus relay is unreachable.

## [0.6.6] - 2026-05-09

### Added

- **`DELETE /api/sessions`:** bulk revoke by **`{ ids }`** or **`{ all: true }`** (cookie auth), for the client sessions UI.
- **Client sessions (`/sessions`):** layout with status badges, filters, sort, multi-select, bulk remove, remove-all confirmation, empty states, and i18n (en / pt-BR / es).

### Fixed

- **`sendNostrConnectInitiate`:** encrypted payload for kind **24133** outbound `connect` uses **NIP-04** (not NIP-44), matching mainstream **nostrconnect://** clients (e.g. Primal). Inbound bunker loop and RPC **responses** remain **NIP-44**.

### Changed

- **`@noble/hashes`:** direct dependency (hex encoding for NIP-04 initiate).

## [0.6.5] - 2026-05-09

### Added

- **Nostr Connect (`nostrconnect://`):** after **Register link**, the bunker **publishes an outbound** kind **24133** `connect` RPC (NIP-44) to each `relay=` URL from the URI when the bunker is **unlocked** (`POST /internal/nostrconnect-initiate` on the daemon, or in-process when no `DAEMON_INTERNAL_URL`). If the bunker is not running, registration still succeeds (**409** to signer-web is logged only).

## [0.6.4] - 2026-05-08

### Added

- **Daemon:** configurable **`BUNKER_IDLE_INBOUND_WARN_MS`** (default `120000`, `0` = off) logs **`event=nip46_idle_no_inbound`** when the bunker is subscribed but receives **no kind 24133** in that window — useful in Grafana when clients time out but the WebSocket looks healthy.

### Documentation

- **README:** troubleshooting — Relay Manager **Eventos** (**Meus eventos** filters by event `pubkey` = author of the 24133 message, often not your profile key); testing NIP-46 on **`wss://relay.bitmacro.cloud`** via compose env; note that **relay-api** does not see end-user WSS traffic.

## [0.6.3] - 2026-05-08

### Added

- **Grafana parity checks:** Loki event **`session_bunker_qr_issued`** (`signer-web-api`) logs **`bunkerRelayUsedServer`**, decoded **`relayInQr`**, **`relayMatchesConfigured`**, and bunker pk prefix — use to confirm the QR matches what the daemon listens on.
- **Daemon:** after each `relay.subscribe`, log **`subscriptionFiltersJson`** and full **`bunkerPFilterHex`** (debug “no inbound” vs wrong relay / wrong `#p`).
- **`relayUrlFromBunkerUri`** / **`bunkerPubkeyHexFromBunkerUri`** helpers (unit-tested).

## [0.6.2] - 2026-05-08

### Fixed

- **`bunker://` QR relay mismatch:** `POST /api/sessions` now builds **`bunker_uri`** with **`getBunkerRelayUrlServer()`**, which prefers **`BUNKER_RELAY_URL`** then **`RELAY_URL`** / **`NEXT_PUBLIC_*`**. When signer-web defaulted to **`relay.bitmacro.cloud`** while **`signer-daemon`** listened only on **`nip46.bitmacro.io`**, clients timed out (**unreachable-bunker**). **BitMacro compose:** **`signer-web`** receives **`BUNKER_RELAY_URL=${SIGNER_DAEMON_RELAY_URL:-wss://nip46.bitmacro.io}`**.

## [0.6.1] - 2026-05-08

### Added

- **Observability (unlock + NIP-46):** verbose **info**/error structured logs for Grafana/Loki — **`POST /api/auth/unlock`** (`auth_unlock_*` events on `subsystem=signer-web-api`), **daemon** `internal_http` (`internal_unlock_*`, **`source=internal-http`**), **daemon boot** `daemon_boot_relay_env`, **`nip46-loop`** `Relay.connect attempting` / `Relay.connect established` per URL with timing, full resolved **`relayUrls`** + fingerprint before connect, **`startBunker` failure bundle** (`failures`) when zero relays reach, richer **`restartBunkerSubscriptions` fingerprint** logging, **`sign_event`** inbound at **info** (was debug).

## [0.6.0] - 2026-05-08

### Fixed

- **POST `/api/sessions` (classic bunker QR):** call **`refreshBunkerNip46Relays`** after **`authorizeApp`**, matching the nostrconnect path. Previously, changing **`RELAY_URL`** / **`NEXT_PUBLIC_RELAY_URL`** produced a new **`bunker_uri`** while the daemon could stay subscribed to the previous relay until a full unlock; clients then failed pairing on the new relay.

### Changed

- **NIP-46:** when an RPC response contains **`error`** (e.g. `sign_event` before `connect`), the Loki log includes **`rpcErrorPreview`** (truncated) for Grafana diagnostics.
- **NIP-46 (`startBunker`):** a failed **`Relay.connect`** on one URL (e.g. `wss://relay.bitmacro.cloud` unreachable from the container) **does not** abort unlock — other relays are tried; failure only if **none** connect. **Warn** in Loki with `attempted` vs `connected` when some URLs fail.

## [0.5.8] - 2026-05-04

### Added

- **Loki/Grafana observability:** `pushLokiStructured` accepts **`streamLabels`** (e.g. `subsystem`). **signer-daemon** forwards **every** `@bitmacro/relay-connect` sink entry to Loki when `LOKI_*` is set (**`sanitizeTelemetryContext`** strips high-risk keys and truncates long strings). **`BITMACRO_LOG_DAEMON_SERVICE`** labels daemon lines separately from signer-web (`BITMACRO_LOG_SERVICE`).
- **POST `/api/sessions`** (nostrconnect): one structured Loki event on successful **`nostrconnect_registered`** (`relayCount`, relay URLs from URI, **`clientPkHexPrefix`**, **`identityIdShort`**) — **no secrets**.
- **NIP-46 loop (`nip46-loop`):** extra **info** logs: relay subscription active, **`kind`** 24133 envelope **before** decrypt (sizes + pubkey/id prefixes only), subscription **close** reason length/snippet; response **publish** at **info** with encrypted payload character count.

### Changed

- **Daemon relay-connect logs:** **`RELAY_CONNECT_LOG_MIN_LEVEL`** defaults to **`debug`** when unset (`info`/`warn`/`error` respected). Set **`RELAY_CONNECT_LOG_MIN_LEVEL=info`** when volume is too high.

## [0.5.7] - 2026-05-05

### Changed

- **Nostrconnect panel:** after successful **Register link**, a confirmation lists **`relay=`** values returned by the API (derived from the URI), plus copy to verify relays such as **nrs.primal.net** are included and steps when status stays **pending** (daemon logs). Locale strings updated for EN / pt-BR / ES.

## [0.5.6] - 2026-05-05

### Changed

- **Daemon `restartBunkerSubscriptions`:** when the relay URL set (normalized dedupe) **unchanged** vs the active subscription, **skip** bunker stop/start (`avoids nip46 flap`) — fewer failures when `refresh-nip46-relays` fires repeatedly or the URI adds no new relays.
- **Nostrconnect panel:** **`connectOrderReminder`** callout (order: register first, then finish in the app; cancel stale pairing).

### Added

- **`nip46-loop`:** **warn** log on events with **kind ≠ 24133** (previously silent) for diagnosing relays that forward noise.

## [0.5.5] - 2026-05-05

### Changed

- **Panel (`/panel`):** **Register link** (nostrconnect) uses the same primary blue style and **Radio** icon as **Generate QR**; bunker connect button labels localized (EN / pt-BR / ES), “bunker link” suffix removed from copy.

## [0.5.4] - 2026-05-05

### Changed

- **Panel (`/panel`):** first tab **nostrconnect://**, second **Bunker QR / link** (default first); optional **label** field removed from nostrconnect flow (`app_name` still from URI only). Visible warning (**`step3.bunkerNotListening`**) when **`is_running` is false**, explaining **pending** after daemon restart (unlock again). EN / pt-BR / ES.

## [0.5.3] - 2026-05-03

### Fixed

- **NIP-46 `connect`:** accepts **`npub1…`** in `params[0]` in addition to hex (like `bunker://`). Clients such as Primal (“Remote Signer”) could send **npub** while Signer only compared **hex** ⇒ `bunker pubkey mismatch` and session stuck **pending** instead of **used**.

### Changed

- **Panel (`/panel`):** **nostrconnect://** vs **QR / bunker** flows in **tabs** (`role="tablist"`): copy, main field, and button per mode; optional label in bunker flow (`labelHint`). EN / pt-BR / ES.

## [0.5.1] - 2026-05-04

### Fixed

- **Daemon `/internal/unlock`:** when `Relay.connect()` fails, nostr-tools sometimes rejects with a **string** (e.g. `"connection timed out"` / `"connection failed"`), not an `Error` — logs only showed `startBunker failed`. Messages now include the **relay URL** and the real reason; helps when the daemon has no route to `RELAY_URL` (VPN, Docker hostname, firewall).

### Changed

- **`nip46-loop`:** wraps each `Relay.connect` and propagates errors with **`(relay URL): …`** context for production diagnostics.
- **Landing (comparison table):** **nostrconnect://** row — same ✅ badge as other shipped items; removed **“Coming soon”** pill tied to `yesPhase2` (available since **v0.5.0**).

## [0.5.0] - 2026-05-04

### Added

- **NIP-46 `nostrconnect://` (client-initiated):** `POST /api/sessions` accepts `nostrconnect_uri`; parser validates relay + secret + client pubkey; `signer_sessions.nip46_relay_urls` (migration `00002_signer_sessions_nip46_relays.sql`); bunker listens on env relay **plus** each URL from open sessions; panel textarea to register a pasted URI.
- **Daemon:** `POST /internal/refresh-nip46-relays` (Bearer) re-subscribes after new client relays without a full unlock when the bunker is already running.
- **Testing:** Vitest coverage for `nostrconnect` / session hashing (`app-keys.nostrconnect.test.ts`), Zod `sessionCreateBodySchema` (`session.test.ts`); **`vitest.config.ts`**, **`@vitest/coverage-v8`**, **`npm run test:coverage`**; coverage scoped to `src/lib` crypto/session/bunker/schemas/backup; CI uploads `coverage/lcov.info` artifact; README Vitest badge and *Tests and coverage*.

### Changed

- **`connect` RPC result:** returns the plaintext `secret` when non-empty (NIP-46 client-initiated validation); empty secret still yields `ack`.
- **Session secret hashing:** short UTF-8 secrets (URI style) hash as SHA-256 of UTF-8; existing 32-byte base64url bunker secrets unchanged.

### Notes

- **Supabase:** **`nip46_relay_urls`** column on **`signer_sessions`** — migration **`00002_signer_sessions_nip46_relays.sql`**. Run before (or as part of deploying) web + daemon **≥ 0.5.0**.

## [0.4.21] - 2026-05-03

### Changed

- **CI (GH Actions):** Docker actions bumped to Node 24–compatible majors — `docker/setup-buildx-action@v4`, `docker/login-action@v4`, `docker/build-push-action@v7` (removes Node 20 deprecation warnings on runners).

## [0.4.20] - 2026-05-02

### Fixed

- **Stale frontend after deploy:** HTML/app routes now send `Cache-Control: private, no-store, …` via `next.config.mjs`, while `/_next/static` stays cache-friendly. CDN/proxy caching of an old document was loading outdated chunk hashes (footer locale/version and segmented PT/EN/ES missing) even though `curl localhost:3002/api/build-info` showed the new release.

## [0.4.19] - 2026-05-02

### Fixed

- **Build stamp footer:** semver and commit hash now come **only** from `GET /api/build-info`, never from `package.json` inlined in cached `_next/static` chunks (which could still show an older “Signer v…” while the container already served the new release). Loading shows placeholders until the API resolves.
- **`GET /api/build-info`:** response headers `Cache-Control: private, no-store, …` so reverse proxies don’t serve stale JSON; client fetch uses a cache-busting query and `credentials: same-origin`.

## [0.4.18] - 2026-05-02

### Changed

- **Locale switcher:** segmented control **PT / EN / ES** with orange highlight on the active locale (aligned with id.bitmacro.io), replacing the single cycling button on landing, panel, and sessions headers; session menu shows the same control under **Language**.

## [0.4.17] - 2026-05-02

### Added

- Comparison table rows **encrypted offline backup (PDF)** and **nostrconnect:// support** (Signer “coming soon” where marked phase 2); new compare **pills** (`localOnly`, `viaIdentity`, `signerPlusIdentity`).
- **`src/lib/register-node-instrumentation.ts`**: Node-only bootstrap (DNS IPv4-first + boot log), loaded dynamically from `instrumentation.ts`.

### Changed

- **i18n (EN, pt-BR, es):** FAQ Signer wording; punctuation pass replacing em dashes with colons, semicolons, commas, or middots where it reads more naturally; compare **phase 2** pill copy localized per locale (“coming soon” equivalents); `unifiedOnboarding` detail reflects Signer + Identity; SEO strings (root layout, Open Graph, sessions metadata, package description).
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
- Help chat **system prompt** (EN / pt-BR / ES): excerpts may include other BitMacro products (e.g. Identity / NIP-05) — instructs the model to use them when present so it does not dismiss cross-product context.

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

[0.6.5]: https://github.com/bitmacro/bitmacro-signer/compare/v0.6.4...v0.6.5
[0.6.4]: https://github.com/bitmacro/bitmacro-signer/compare/v0.6.3...v0.6.4
[0.6.3]: https://github.com/bitmacro/bitmacro-signer/compare/v0.6.2...v0.6.3
[0.6.2]: https://github.com/bitmacro/bitmacro-signer/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/bitmacro/bitmacro-signer/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/bitmacro/bitmacro-signer/compare/v0.5.8...v0.6.0
[0.5.8]: https://github.com/bitmacro/bitmacro-signer/compare/v0.5.7...v0.5.8
[0.5.7]: https://github.com/bitmacro/bitmacro-signer/compare/v0.5.6...v0.5.7
[0.5.6]: https://github.com/bitmacro/bitmacro-signer/compare/v0.5.5...v0.5.6
[0.5.5]: https://github.com/bitmacro/bitmacro-signer/compare/v0.5.4...v0.5.5
[0.5.4]: https://github.com/bitmacro/bitmacro-signer/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/bitmacro/bitmacro-signer/compare/v0.5.1...v0.5.3
[0.5.1]: https://github.com/bitmacro/bitmacro-signer/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.21...v0.5.0
[0.4.21]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.20...v0.4.21
[0.4.20]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.19...v0.4.20
[0.4.19]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.18...v0.4.19
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
