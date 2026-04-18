# @bitmacro/bitmacro-signer

[![CI](https://github.com/bitmacro/bitmacro-signer/actions/workflows/ci.yml/badge.svg)](https://github.com/bitmacro/bitmacro-signer/actions/workflows/ci.yml)
[![Web GHCR](https://github.com/bitmacro/bitmacro-signer/actions/workflows/web.yml/badge.svg)](https://github.com/bitmacro/bitmacro-signer/actions/workflows/web.yml)
[![Daemon GHCR](https://github.com/bitmacro/bitmacro-signer/actions/workflows/daemon.yml/badge.svg)](https://github.com/bitmacro/bitmacro-signer/actions/workflows/daemon.yml)
[![npm](https://img.shields.io/badge/npm-not%20on%20registry%20yet-CBD5E1?logo=npm)](https://github.com/bitmacro/bitmacro-signer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

**[→ BitMacro Signer (site)](https://signer.bitmacro.io)**  
**[→ BitMacro: bitmacro.io](https://bitmacro.io)**

**BitMacro Signer** is the product name; the npm package is **`@bitmacro/bitmacro-signer`**. Next.js app for a **managed NIP-46 bunker**: store `nsec` as an encrypted blob (AES-GCM via Web Crypto on the client), run a **NIP-46** signing loop over the configured relay (e.g. **`wss://relay.bitmacro.cloud`** for open testing, **`wss://relay.bitmacro.io`** for the private relay with whitelist), and keep decrypted material in server RAM only during an active session with a configurable TTL — the server never sees `nsec` in plaintext at rest.

**SDK (shared client logic):** [@bitmacro/relay-connect](https://www.npmjs.com/package/@bitmacro/relay-connect) · [relay-connect](https://github.com/bitmacro/relay-connect)

| Package | Role |
| ------- | ---- |
| `@bitmacro/bitmacro-signer` | This repo — bunker UI + server (Next.js App Router) |
| `@bitmacro/relay-connect` | NIP-46 / NIP-07 TypeScript SDK (BitMacro Connect) |

## Status

**MVP in progress:** vault client-side (AES-GCM), API vault/sessions, auth cookies, onboarding, NIP-46 bunker loop in a **daemon** process, GHCR images for `signer-web` and `signer-daemon`. Product semantics (NIP-46 session keys vs profile `npub`, one-time bunker secrets, optional session labels) are documented in [bitmacro-docs `03-produtos/signer.md`](https://github.com/bitmacro/bitmacro-docs/blob/main/03-produtos/signer.md).

## Install

```bash
npm install @bitmacro/bitmacro-signer
```

*(Publishing and version cadence will follow the same approach as other `@bitmacro/*` packages.)*

## Usage

The app combines **`nostr-tools`**, **`@bitmacro/relay-connect`**, Supabase, and Zod; self-host via Docker is supported (see below). For **operator-facing** behaviour (bunker URI, sessions, relay), prefer the [Signer product doc](https://github.com/bitmacro/bitmacro-docs/blob/main/03-produtos/signer.md) in `bitmacro-docs`.

```bash
cp .env.example .env
# Set at minimum NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL
# For the NIP-46 daemon (self-host): DAEMON_INTERNAL_TOKEN, RELAY_URL (or NEXT_PUBLIC_RELAY_URL), SUPABASE_SERVICE_ROLE_KEY; signer-web adds DAEMON_INTERNAL_URL when calling the daemon over Docker
docker compose up --build
```

Compose defines **`web`** (Next on port **3000**, health check `GET /api/health`) and **`daemon`** (bunker loop — see `Dockerfile.daemon` and `src/daemon/index.ts`).

**MVP (self-host):** the daemon holds NIP-46 signing state **in RAM** only. After a **daemon container restart** (recreate, deploy, crash), users must **unlock again** in the Signer UI — there is no automatic bunker restore on cold start. Product docs: [bitmacro-docs `03-produtos/signer.md`](https://github.com/bitmacro/bitmacro-docs/blob/main/03-produtos/signer.md) (*Comportamento esperado (MVP)*).

### Web image on GHCR (Next.js standalone)

[`.github/workflows/web.yml`](.github/workflows/web.yml) builds **`linux/amd64`** from [`Dockerfile`](Dockerfile) and pushes (version = [`package.json`](package.json) `version`):

- `ghcr.io/bitmacro/bitmacro-signer-web:latest`
- `ghcr.io/bitmacro/bitmacro-signer-web:<semver>` (e.g. `0.2.0`)
- `ghcr.io/bitmacro/bitmacro-signer-web:<short-sha>`

Runs on `push` to `main` when listed paths change (incl. `src/**`). Alterações só em `src/daemon/` também casam `src/**`, por isso o build web pode correr em paralelo com o workflow do daemon — é redundante mas válido. GitHub não permite `paths` e `paths-ignore` no mesmo gatilho.

### Daemon image on GHCR (self-host)

On every push to `main` that touches `src/daemon/**`, `src/lib/**`, `Dockerfile.daemon`, or `package.json`, [`.github/workflows/daemon.yml`](.github/workflows/daemon.yml) builds **`linux/amd64`** and pushes to:

- `ghcr.io/bitmacro/bitmacro-signer-daemon:latest`
- `ghcr.io/bitmacro/bitmacro-signer-daemon:<semver>` (matches `package.json`)
- `ghcr.io/bitmacro/bitmacro-signer-daemon:<short-sha>` (7-character Git commit SHA)

Image labels include `org.opencontainers.image.version` (inspect with `docker inspect`).

The workflow run logs include the **image digest (SHA-256)** after a successful push.

**Pulling the image:** If the GHCR package visibility is **public** (default for many public repos), `docker pull ghcr.io/bitmacro/bitmacro-signer-daemon:latest` often works **without** logging in. If the package is **private** or pull fails with “denied”, authenticate once:

```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

- PAT needs **`read:packages`** (and **`write:packages`** only if this machine also pushes images).

**Previously private repos:** After making the GitHub repo public, open **Packages → bitmacro-signer-daemon → Package settings** and set visibility to **public** if you want anonymous pulls on the server.

**Pull and run** (example):

```bash
docker pull ghcr.io/bitmacro/bitmacro-signer-daemon:latest
# Configure env (see .env.example): DAEMON_INTERNAL_TOKEN, Supabase, RELAY_URL / NEXT_PUBLIC_RELAY_URL, etc.
docker run --env-file .env ghcr.io/bitmacro/bitmacro-signer-daemon:latest
```

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

`npm run dev` uses **Turbopack** (`next dev --turbopack`).

### i18n emit (`npm run i18n:emit`)

Do **not** run `npm run i18n:emit` until the `recover.*` and `onboarding.backup.*` namespaces are wired into `buildMessages()` in [`scripts/i18n-emit.mjs`](scripts/i18n-emit.mjs). The script overwrites `src/messages/{en,pt-BR,es}.json` and would remove those translations. Prefer editing the JSON files directly until that work is done. See the comment at the top of `i18n-emit.mjs`.

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
