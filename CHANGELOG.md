# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.4.1]: https://github.com/bitmacro/bitmacro-signer/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/bitmacro/bitmacro-signer/compare/v0.3.6...v0.4.0
[0.3.6]: https://github.com/bitmacro/bitmacro-signer/compare/v0.3.5...v0.3.6
[0.3.0]: https://github.com/bitmacro/bitmacro-signer/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/bitmacro/bitmacro-signer/releases/tag/v0.2.4
