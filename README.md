# @bitmacro/bitmacro-signer

[![CI](https://github.com/bitmacro/bitmacro-signer/actions/workflows/ci.yml/badge.svg)](https://github.com/bitmacro/bitmacro-signer/actions/workflows/ci.yml)
[![npm](https://img.shields.io/badge/npm-not%20on%20registry%20yet-CBD5E1?logo=npm)](https://github.com/bitmacro/bitmacro-signer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

**[→ BitMacro Signer (site)](https://signer.bitmacro.io)**  
**[→ BitMacro: bitmacro.io](https://bitmacro.io)**

**BitMacro Signer** is the product name; the npm package is **`@bitmacro/bitmacro-signer`**. Next.js app for a **managed NIP-46 bunker**: store `nsec` as an encrypted blob (AES-GCM via Web Crypto on the client), run a **NIP-46** signing loop over **`wss://relay.bitmacro.io`**, and keep decrypted material in server RAM only during an active session with a configurable TTL — the server never sees `nsec` in plaintext at rest.

**SDK (shared client logic):** [@bitmacro/relay-connect](https://www.npmjs.com/package/@bitmacro/relay-connect) · [relay-connect](https://github.com/bitmacro/relay-connect)

| Package | Role |
| ------- | ---- |
| `@bitmacro/bitmacro-signer` | This repo — bunker UI + server (Next.js App Router) |
| `@bitmacro/relay-connect` | NIP-46 / NIP-07 TypeScript SDK (BitMacro Connect) |

## Status

The repository currently contains **project scaffolding** (layout and intention comments). Application logic will land after review.

## Install

```bash
npm install @bitmacro/bitmacro-signer
```

*(Publishing and version cadence will follow the same approach as other `@bitmacro/*` packages.)*

## Usage

Implementation is not finalized. The app will combine **`nostr-tools`**, **`@bitmacro/relay-connect`**, Supabase, and Zod; self-host via Docker is supported (see below).

```bash
cp .env.example .env
# Set at minimum NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL
# For the NIP-46 daemon (self-host): DAEMON_IDENTITY_IDS, DAEMON_VAULT_PASSPHRASE, NEXT_PUBLIC_RELAY_URL, SUPABASE_SERVICE_ROLE_KEY
docker compose up --build
```

Compose defines **`web`** (Next on port **3000**, health check `GET /api/health`) and **`daemon`** (bunker loop — see `Dockerfile.daemon` and `src/daemon/index.ts`).

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

`npm run dev` uses **Turbopack** (`next dev --turbopack`).

## Contributing

Issues and pull requests are welcome — NIP-46 flows, security hardening, and operator UX.

This project is maintained by [BitMacro](https://bitmacro.io).

## Contributors

<a align="center" href="https://github.com/bitmacro/bitmacro-signer/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=bitmacro/bitmacro-signer" />
</a>

---

## License

MIT. See [LICENSE](LICENSE).
