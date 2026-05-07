# BitMacro Signer — support knowledge base

> **Use:** Reference for the BitMacro Signer AI assistant (signer.bitmacro.io).
> **Audience:** End users with questions about NIP-46 bunkers and safe Nostr key management.
> **Tone:** Direct, simple, minimal jargon. Concepts are explained as they appear.
> **Last updated:** April 2026

---

## 1. What is BitMacro Signer and what is it for?

**Typical question:** *"What is this? Do I need it?"*

BitMacro Signer is a digital vault for your Nostr private key — and a way to use that key 24/7 without leaving your phone unlocked or installing a browser extension.

### The problem it solves

On Nostr your identity is a private key called `nsec`. Like a master credential for that ecosystem: whoever has it can publish as you, change follows, send direct messages, receive Zaps. If you lose it, you lose your identity. If someone steals it, they can impersonate you.

Nostr clients (Nostrudel, Primal, Coracle, etc.) traditionally need your `nsec` to sign events — every post, message, reaction. Common options are:

- **Store `nsec` in the app:** risky; the app keeps full access.
- **Use a browser extension** (e.g. Alby): only on desktop and only when the browser is open.
- **Use Amber on Android:** only on that device.

BitMacro Signer solves this with a **remote bunker**: your key is encrypted on our servers; a long-running process answers signing requests on your behalf via NIP-46. You never hand your `nsec` to an app.

### What you get

- **24/7 signing** without keeping the phone or browser on.
- **Zero-knowledge style design:** your `nsec` is encrypted in the browser before it reaches our servers — we never see it in plaintext at rest.
- **Works on any device:** iOS, Android, browser, desktop — nothing to install for basic use.
- **Per-session control:** you authorize each app and can revoke access.
- **Offline backup:** a PDF you keep locally can recover the key if you lose everything else.

**One-liner:** BitMacro Signer is your cryptographic bodyguard — signs for you, stays on the server in encrypted form, and only you hold the vault passphrase.

---

## 2. What is NIP-46 and what is a bunker?

**Typical question:** *"People mention NIP-46 and bunkers — what does that mean?"*

### Nostr in two lines

Nostr is a decentralized social network. Your identity is cryptographic. When you post, your client signs content with your private key (`nsec`) to prove it is you.

### The problem with handing `nsec` to apps

If you give an app your `nsec`, it can sign anything as you — including things you would not want. If the app is compromised, your key goes with it.

### What NIP-46 is

NIP-46 is a Nostr spec for **separating signing from the client**. Instead of the client holding your `nsec`, it sends signing requests to a **bunker** — a process that holds the key — and gets back a signed event.

```
Client (e.g. Nostrudel)                    Bunker (BitMacro Signer)
    │                                             │
    │── "Sign this event" ───────────────────────►│
    │   (encrypted with NIP-44)                   │
    │                                             │── decrypt request
    │                                             │── sign with nsec
    │◄── "Signed event" ──────────────────────────│
    │   (encrypted with NIP-44)                   │
```

Traffic goes through a Nostr relay (e.g. `wss://relay.bitmacro.io`) end-to-end encrypted (NIP-44) — relays cannot read payloads.

### What a bunker is here

The bunker is the server process that listens 24/7 and answers signing requests. In BitMacro Signer:

1. Your `nsec` is stored encrypted (AES-GCM; encryption happens in the browser).
2. When you unlock the vault, decrypted `nsec` lives in RAM only (not on disk or in the DB in plaintext).
3. The bunker subscribes on the relay(s).
4. When an authorized client sends a signing request, the bunker responds.
5. After the configured TTL (default 24 hours), `nsec` is cleared from RAM and you must unlock again.

**Plain summary:** the bunker is like a trusted clerk with an encrypted copy of your keys — uses them only when you allow, and forgets them after the session window.

---

## 3. How do I create and set up my vault? (step by step)

**Typical question:** *"Where do I start? How do I register my key?"*

### What the vault is

The vault holds your `nsec` encrypted. It is created once in your browser and the ciphertext is stored on BitMacro servers. Only you can decrypt it — with your password.

### Steps

**1. Go to [signer.bitmacro.io](https://signer.bitmacro.io)**

**2. Sign up or log in**
- Email + password or Google sign-in.
- The same BitMacro account is used across BitMacro App, Identity, and related products.

**3. In the panel, generate or import a keypair**

*Option A — Generate a new keypair (good default):*
- Choose “Generate new keypair”
- The browser creates a random keypair
- You see your `npub` — your public Nostr identity

*Option B — Import an existing `nsec`:*
- Paste your private key (`nsec1…` bech32)
- The client validates and encrypts before leaving the browser

**4. Set a strong password**
- This password is how you unlock the vault
- **BitMacro never sees or stores it** — if you lose it, the backup PDF is your only recovery path
- Use a long, unique passphrase you do not reuse elsewhere

**5. Download the backup PDF**
- Required before you can continue
- The PDF contains an offline encrypted bundle and recovery instructions
- Store it somewhere safe (offline device, safe, encrypted USB)
- The app asks for a 6-character code from the PDF to confirm you downloaded it

**6. Enter the 6-character confirmation code**
- Type the code shown in the PDF
- The vault only becomes active after this

**7. Unlock the bunker**
- Enter your password to unlock
- The bunker starts and listens on the relay
- `nsec` stays in RAM for 24h (or your configured TTL)

**8. Generate a QR code to connect an app**
- Go to **Sessions** → **New session**
- Optionally name the session (e.g. “Nostrudel”, “Primal”, “Coracle”)
- A QR with a `bunker://` URI appears
- In the client app, choose bunker / Nostr Connect and scan the QR

---

## 4. What is the vault and how does encryption work?

**Typical question:** *"Is my key safe on your servers? How does it work technically?"*

### Zero-knowledge premise

“Zero-knowledge” here means BitMacro never sees your `nsec` in plaintext. Encryption and decryption happen only in your browser.

### Encryption flow (detail)

When saving `nsec` to the vault:

1. **In your browser**, your password is run through PBKDF2-SHA256 with 600,000 iterations and a random 32-byte salt — producing a 256-bit key.
2. That key encrypts `nsec` with AES-GCM and a random 12-byte IV.
3. The result — ciphertext + salt + IV encoded as base64 — is sent to BitMacro and stored.
4. **Your password never leaves the browser.** The server only receives the ciphertext blob.

### What BitMacro stores

| Field | Meaning | Safe without password? |
|-------|---------|-------------------------|
| `blob` | AES-GCM ciphertext of your nsec | ✅ yes — useless alone |
| `salt` | PBKDF2 salt | ✅ yes — does not reveal password |
| `iv` | AES-GCM initialization vector | ✅ yes — does not reveal nsec |
| `bunker_pubkey` | Your npub | ✅ public by nature |

### What BitMacro does **not** store

- Your password — ever.
- Plaintext `nsec` — ever.
- Signing request content logs — ever.

### During an active vault session

After you unlock:

1. The browser decrypts `nsec` locally.
2. Decrypted `nsec` is passed securely (HTTPS + internal token) to the daemon.
3. The daemon keeps `nsec` **only in RAM**, never on disk.
4. After TTL (default 24h), RAM is cleared.
5. To sign again, unlock again.

### Analogy

Like a safe deposit box where only you know the combination. The bank (BitMacro) stores the box but not the combination. When you need access, you open it yourself, use what you need, and the box “locks” automatically when the TTL ends.

---

## 5. How do I generate a QR and connect an app?

**Typical question:** *"How do I connect Nostrudel / Primal / Coracle to Signer?"*

### Prerequisites

- Vault created and unlocked (bunker running).
- Client app ready (e.g. Nostrudel, Coracle, Primal).

### Steps

**1. In BitMacro Signer, open Sessions**

**2. Click New session**

**3. Optional session name**
- e.g. “Nostrudel desktop”, “Primal iOS”
- The label is **for your reference only** — it is not sent to the client as identity metadata

**4. QR appears (`bunker://` URI)**
- Typical shape: `bunker://npub1...?relay=wss://relay.bitmacro.io&secret=<token>`
- `secret` is one-time for the handshake

**5. In the client:**
- Look for “Connect bunker NIP-46” or “Nostr Connect” in account settings
- Scan the QR or paste the URI
- The client sends `connect` on the relay
- The bunker verifies the secret, completes the handshake, session becomes active

**6. After that:**
- The client sends signing requests via relay
- The bunker returns signed events
- Your `nsec` never leaves the server to the client

### Notes

- **Each QR is one-time:** the secret binds one connection — use a new QR for another device/instance.
- **Multiple sessions OK:** independent sessions per client.
- **You can revoke any session:** Sessions list → **Revoke** — signing stops immediately for that session.
- **If the bunker is not running** (vault locked), requests may queue on relay or time out depending on the client.

---

## 6. What is the backup PDF and why does it matter?

**Typical question:** *"I have to download a PDF — why? Can I skip it?"*

### You cannot skip it

The PDF is the **only** recovery path for your `nsec` if you lose vault access — server outage, lost account access, forgotten password scenarios. **Without the PDF**, losing vault access typically means permanent loss of that Nostr identity.

### What the PDF contains

- Your `npub` for verification
- Offline encrypted JSON bundle (ciphertext, salt, IV)
- QR carrying that bundle (camera recovery path)
- 6-character confirmation code
- Vendor-independent recovery notes (algorithm described for offline use)

### Offline bundle (technical JSON)

```json
{
  "v": 1,
  "kind": "bitmacro-signer-offline-vault",
  "identity_id": "<uuid>",
  "npub": "<bech32>",
  "blob": "<base64url_ciphertext>",
  "salt": "<base64url>",
  "iv": "<base64url>"
}
```

With that JSON + your vault password you can decrypt `nsec`.

### Keeping the PDF safe

- **Print** and lock in a physical safe when practical
- **Encrypted USB** you do not expose online
- **Encrypted folder** on a machine you control
- Do **not** leave it raw in commodity cloud (Drive / iCloud / Dropbox) unless you encrypt the file separately
- **Never share** — PDF + password = full key

### The 6-character code

It appears **only** in the PDF (not on the signup screen alone). Entering it proves you downloaded and opened the file; the vault activates only after a correct entry.

---

## 7. How do I recover if I lose my password or account access?

**Typical question:** *"I forgot my password — is everything gone?"*

### Scenario 1 — Forgot password but you have the PDF

Use [signer.bitmacro.io/recover](https://signer.bitmacro.io/recover):

1. Open the PDF, copy the bundle JSON **or** scan the QR
2. Paste JSON into `/recover`
3. Enter the vault password you used **when creating** the vault
4. Browser decrypts locally — `nsec` appears on screen
5. **Copy `nsec` immediately** into a reputable password manager
6. Optionally create a new vault with a new password and generate a fresh PDF

**Important:** `/recover` is public; no login. Decryption is local — nothing sensitive is uploaded for recovery.

### Scenario 2 — Lost BitMacro account but you have the PDF

Same flow. `/recover` needs no authenticated account — JSON + original vault password restores `nsec`.

### Scenario 3 — Forgot password **and** no PDF

Recovery is **not possible.** `nsec` is ciphertext under a password BitMacro never had. No backdoor. That Nostr keypair identity is permanently lost unless you exported `nsec` elsewhere.

Hence the mandatory onboarding PDF step.

### Scenario 4 — Bunker stopped (daemon restart, TTL expiry)

Not the same as losing identity — unlock again:

1. Go to [signer.bitmacro.io](https://signer.bitmacro.io)
2. Sign in
3. Enter vault password to unlock — bunker restarts
4. Existing client sessions typically keep working (`app_pubkey` sessions)

### Bunker activity indicator

The panel shows **running** vs **locked**. If locked, signing requests will not be answered until you unlock again.

---

## 8. How do sessions work and how do I manage them?

**Typical question:** *"What is a session? How do I see which apps can sign?"*

### Session definition

A session links **your bunker** to **one client app/device** instance (Nostrudel, Primal, …). Fields include:

- **Label** (your choice)
- **Session pubkey** (`app_pubkey`) — from the client, not your identity `npub`
- **Expiry** (default ~24 hours; roadmap may widen)
- **State** active vs revoked

### During a session

1. Client sends encrypted signing requests to relay
2. Bunker verifies NIP-44 and authorized `app_pubkey`
3. Signs with your `nsec`
4. Returns ciphertext to the client’s `app_pubkey`
5. Client publishes on Nostr

**The client never sees your `nsec`** — only signed events.

### New session

1. Panel → **Sessions** → **New session**
2. Optionally name + show QR — scan in client

### Revoke

1. Sessions list → **Revoke** on the row
2. Subsequent requests from that `app_pubkey` are rejected

### Good habits

- **Descriptive labels** (“Coracle laptop”, “Primal phone”)
- **Revoke** old devices and uninstalled clients
- **New QR per device** — do not forward URIs casually
- **Sessions expire** — if a client “stops working”, check expiry

### `app_pubkey` is not your `npub`

Common confusion: the session detail `app_pubkey` is the **client app’s ephemeral key for that session**. It is **not** your profile `npub`.

---

## 9. Privacy and security — what does BitMacro retain?

**Typical question:** *"What data do you hold? How safe is my key?"*

### What we retain

| Data | Why |
|------|-----|
| `npub` | Vault routing — inherently public |
| Encrypted vault blob | Ciphertext meaningless without password |
| Salt / IV | Decryption metadata — meaningless without password |
| Active sessions (app_pubkey, label, expiry) | Authorization management |
| Account email etc. | Platform login |

### What we **do not** retain as policy

- Plaintext `nsec`
- Vault password from the browser path
- **Detailed audit trail of signed event content** — not stored today
- **Full signing-request history** of your social graph actions on Nostr

### Threat sketch

| Threat | Impact | Mitigation |
|--------|--------|------------|
| DB breach | ciphertext only | worthless without passphrase (PBKDF2 + AES-GCM, 600k iter) |
| Server compromise mid-session | RAM might hold key | Short TTL + revoke + RAM-only |
| Relay in the middle | sees encrypted frames | NIP-44 payloads |
| Malicious client session | unwanted signing requests | per-session revocation; roadmap method scopes |
| Lost PDF without other backup | loses key | onboarding requires PDF acknowledgment |

### Can the bunker sign “anything?”

Currently **within NIP-46**, authorized sessions receive responses for eligible RPCs. Phase-2 roadmap: optional per-session **method scopes** (e.g. narrow `sign_event`, block `nip04_encrypt` patterns, etc.).

### Trusting BitMacro?

The cryptography is designed so the platform never needs your plaintext `nsec`. Source code: [github.com/bitmacro/bitmacro-signer](https://github.com/bitmacro/bitmacro-signer).

`/recover` can be used fully offline once assets load — inspect DevTools Network to confirm decryption does not call home.

---

## 10. Can I self-host BitMacro Signer?

**Typical question:** *"Can I run my own?"*

### Yes — MIT OSS

Repository: [github.com/bitmacro/bitmacro-signer](https://github.com/bitmacro/bitmacro-signer).

### Self-host topology

Two moving parts:

```
┌─────────────────────────────────────────┐
│  signer-web (Next.js)                   │
│  UI + API routes                        │
│  Port: 3000                             │
└────────────────┬────────────────────────┘
                 │ Internal HTTP + token
┌────────────────▼────────────────────────┐
│  signer-daemon (Node.js)                │
│  Long-lived NIP-46 loop                  │
│  Holds nsec in RAM with TTL             │
│  Port 47777 (internal)                   │
└─────────────────────────────────────────┘
```

### Example Docker Compose (minimal)

```yaml
services:
  web:
    image: ghcr.io/bitmacro/bitmacro-signer-web:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
      - NEXT_PUBLIC_APP_URL=https://signer.example.com
      - NEXT_PUBLIC_RELAY_URL=wss://relay.example.com
      - SUPABASE_SERVICE_ROLE_KEY=eyJ...
      - AUTH_SESSION_SECRET=replace-with-long-random-string
      - DAEMON_INTERNAL_URL=http://daemon:47777
      - DAEMON_INTERNAL_TOKEN=replace-with-strong-token

  daemon:
    image: ghcr.io/bitmacro/bitmacro-signer-daemon:latest
    environment:
      - DAEMON_INTERNAL_TOKEN=replace-with-strong-token
      - SUPABASE_SERVICE_ROLE_KEY=eyJ...
      - RELAY_URL=wss://relay.example.com
```

### Requirements

1. **PostgreSQL / Supabase** — managed cloud or self-hosted
2. **Nostr relay** with NIP-46 (`wss://relay.bitmacro.cloud` OK for sandbox; prod should use relays you operate)
3. **Docker Compose** — run both containers
4. **TLS domain** — Web Crypto expects a secure origin

### Images

Published to GHCR on relevant pushes:

- `ghcr.io/bitmacro/bitmacro-signer-web:latest`
- `ghcr.io/bitmacro/bitmacro-signer-daemon:latest`

Semver (`v0.3.6`, …) and short commit tags also exist.

### Self-host caveats today

- After daemon restart RAM is cold — operators log in/unlock manually (per MVP semantics)
- No multi-user “admin tenant” pane — typical install is effectively one-operator stack
- BitMacro Identity (NIP-05, Lightning Address) integrations are SaaS-hosted; third-party installs would wire their own equivalents

---

## 11. FAQ

---

**What is the difference between BitMacro Signer and BitMacro Identity?**

They complement:

- **Identity** (`id.bitmacro.io`): verified username (NIP-05), Lightning address, curated relay access themes.
- **Signer** (`signer.bitmacro.io`): holds your Nostr key encrypted and signs 24/7 without handing `nsec` to arbitrary clients.

You can adopt either alone; paired they give hosted identity plus remote signing convenience. Unified onboarding is on the roadmap.

---

**Which Nostr apps work with Signer?**

Anything supporting NIP-46 / “Nostr Connect”. Common examples:

- Nostrudel (web)
- Coracle (web)
- Primal (iOS, Android, web)
- Snort (web)
- Iris (web)

If your client lacks NIP-46, Signer pairing is unavailable until upstream adds it.

---

**What is a `bunker://` URI? Can I share it?**

It encodes bunker reachability plus a short-lived handshake secret. **Do not share casually** — anyone with a pending URI can complete NIP-46 pairing. URIs invalidate after successful use but are sensitive until then.

---

**If BitMacro’s servers go offline?**

- You cannot unlock or create sessions through that deployment.
- Active bunkers stop responding.
- Existing Nostr history still exists on relays — relays are decentralized.
- With the backup PDF + password you retain `nsec` and may import elsewhere.

Self-host eliminates dependency on BitMacro infra as operator.

---

**Must the bunker be always-on to “use” Nostr?**

Reading timelines does not depend on bunker uptime. Publishing, reacts, messaging, Zap flows need signing — bunker must run (vault unlocked/TTL alive) while you expect automatic signing behavior.

---

**Multiple vaults / keypairs in one BitMacro account?**

Today — one vault identity per BitMacro login. Multiple keypairs roadmap item.

---

**What does bunker TTL mean?**

TTL is how long decrypted `nsec` lives in daemon RAM post-unlock. Default ~24 hours, then erased and bunker loop stops until re-unlock — limits exposure windows.

---

**Change vault password?**

Dedicated flow is planned (April 2026). Manual workaround: recover `nsec` via PDF + old password → create vault with new password → new backup PDF.

---

**Shamir / secret-splitting roadmap blurb**

Shamir secret sharing shards `nsec` across *N* pieces with threshold *k* reconstruction (classic `k-of-N`). Planned phase-2 enhancement vs sole PDF reliance — split recovery custody across devices/trusted peers without granting any single shard full usability.

---

**Zaps?**

Zap flows are normal Nostr events that need a signature. When a compatible client handles a Zap, it sends the signing request through the bunker like any other event.

---

**Does BitMacro read encrypted DMs?**

No. Classical NIPs keep DM ciphertext between participants’ keys — bunker signs transports but lacks meaningful plaintext introspection obligations beyond cryptographic necessity.

---

**Audit logs of signatures?**

Signer does **not** today persist immutable history of payloads it signed — respond-and-forget posture. Operational logging improvements are backlog.

---

**How do I confirm running version?**

`GET https://signer.bitmacro.io/api/build-info` (or your hostname) exposes semver/Git metadata for reproducibility audits.

---

**Support contacts**

Reach **contact@bitmacro.io** or Nostr `thiago@bitmacro.io`.

---

*BitMacro Signer knowledge base — April 2026*
