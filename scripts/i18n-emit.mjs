/**
 * Generates src/messages/{en,pt-BR,es}.json from inline catalogs.
 * Run: `npm run i18n:emit` (same as `node scripts/i18n-emit.mjs`).
 *
 * ⚠️ Do NOT run `npm run i18n:emit` until `recover.*` and `onboarding.backup.*`
 * are integrated into `buildMessages()` below. The script overwrites the JSON
 * files and will wipe those hand-maintained namespaces. Until then, edit
 * `src/messages/{en,pt-BR,es}.json` directly; if you already ran emit, restore
 * those sections from git or re-merge from a branch that has them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "src", "messages");

const featureIds = [
  "supportedDevices",
  "noInstall",
  "worksIos",
  "noExtension",
  "integratedKeypair",
  "nip05Plan",
  "lightningAddress",
  "unifiedOnboarding",
  "nsecNeverExposed",
  "clientDecrypt",
  "zeroKnowledgeHosted",
  "shamirRecovery",
  "auditableCode",
  "encryptedPdfBackup",
  "reproducibleBuilds",
  "remoteBunker",
  "twentyFourSeven",
  "autoSigningPolicy",
  "sessionTtl",
  "sessionRevoke",
  "auditLog",
  "webUi",
  "bunkerQr",
  "nostrConnect",
  "managedHosted",
  "selfHostDocker",
  "relayIncluded",
  "lightningIntegrated",
  "devSdk",
];

const featuresEn = {
  supportedDevices: "Supported devices",
  noInstall: "No installation required",
  worksIos: "Works on iOS",
  noExtension: "Works without a browser extension",
  integratedKeypair: "Integrated keypair generation",
  nip05Plan: "NIP-05 included in plan",
  lightningAddress: "Lightning Address included",
  unifiedOnboarding: "Unified onboarding",
  nsecNeverExposed: "nsec never exposed to the app",
  clientDecrypt: "Client-side decrypt",
  zeroKnowledgeHosted: "Zero-knowledge on hosted",
  shamirRecovery: "Recovery via Shamir SSS",
  auditableCode: "Auditable open source code",
  encryptedPdfBackup: "Encrypted offline backup (PDF)",
  reproducibleBuilds: "Reproducible builds + hash",
  remoteBunker: "Remote NIP-46 bunker",
  twentyFourSeven: "24/7 without a device online",
  autoSigningPolicy: "Automatic signing policy",
  sessionTtl: "Configurable session TTL",
  sessionRevoke: "Immediate session revocation",
  auditLog: "Auditable signature log",
  webUi: "Web management UI",
  bunkerQr: "Bunker URI QR code",
  nostrConnect: "nostrconnect:// support",
  managedHosted: "Managed hosted (zero ops)",
  selfHostDocker: "Self-host available (Docker)",
  relayIncluded: "Nostr relay included",
  lightningIntegrated: "Lightning integrated",
  devSdk: "Developer SDK",
};

const featuresPt = {
  supportedDevices: "Dispositivos suportados",
  noInstall: "Sem instalação necessária",
  worksIos: "Funciona em iOS",
  noExtension: "Funciona sem extensão no browser",
  integratedKeypair: "Geração de keypair integrada",
  nip05Plan: "NIP-05 incluído no plano",
  lightningAddress: "Lightning Address incluída",
  unifiedOnboarding: "Onboarding unificado",
  nsecNeverExposed: "nsec nunca exposta à app",
  clientDecrypt: "Desencriptação no cliente",
  zeroKnowledgeHosted: "Zero-knowledge no hosted",
  shamirRecovery: "Recuperação via Shamir SSS",
  auditableCode: "Código open source auditável",
  encryptedPdfBackup: "Backup físico encriptado (PDF)",
  reproducibleBuilds: "Builds reprodutíveis + hash",
  remoteBunker: "Bunker remoto NIP-46",
  twentyFourSeven: "24/7 sem dispositivo ligado",
  autoSigningPolicy: "Política automática de assinatura",
  sessionTtl: "TTL de sessão configurável",
  sessionRevoke: "Revogação imediata de sessão",
  auditLog: "Log de assinaturas auditável",
  webUi: "Interface web de gestão",
  bunkerQr: "QR code do bunker URI",
  nostrConnect: "Suporte nostrconnect://",
  managedHosted: "Hosted gerido (zero ops)",
  selfHostDocker: "Self-host disponível (Docker)",
  relayIncluded: "Relay Nostr incluído",
  lightningIntegrated: "Lightning integrado",
  devSdk: "SDK para developers",
};

const featuresEs = {
  supportedDevices: "Dispositivos compatibles",
  noInstall: "Sin instalación",
  worksIos: "Funciona en iOS",
  noExtension: "Funciona sin extensión del navegador",
  integratedKeypair: "Generación de par de claves integrada",
  nip05Plan: "NIP-05 incluido en el plan",
  lightningAddress: "Lightning Address incluida",
  unifiedOnboarding: "Onboarding unificado",
  nsecNeverExposed: "nsec nunca expuesta a la app",
  clientDecrypt: "Descifrado en el cliente",
  zeroKnowledgeHosted: "Conocimiento cero en hosted",
  shamirRecovery: "Recuperación vía Shamir SSS",
  auditableCode: "Código abierto auditable",
  encryptedPdfBackup: "Copia de seguridad cifrada (PDF)",
  reproducibleBuilds: "Builds reproducibles + hash",
  remoteBunker: "Bunker remoto NIP-46",
  twentyFourSeven: "24/7 sin dispositivo en línea",
  autoSigningPolicy: "Política automática de firma",
  sessionTtl: "TTL de sesión configurable",
  sessionRevoke: "Revocación inmediata de sesión",
  auditLog: "Registro de firmas auditable",
  webUi: "UI web de gestión",
  bunkerQr: "Código QR del bunker URI",
  nostrConnect: "Soporte nostrconnect://",
  managedHosted: "Hosted gestionado (cero ops)",
  selfHostDocker: "Self-host disponible (Docker)",
  relayIncluded: "Relay Nostr incluido",
  lightningIntegrated: "Lightning integrado",
  devSdk: "SDK para desarrolladores",
};

function buildMessages(features, lang) {
  const categories =
    lang === "en"
      ? {
          platform: "Platform",
          identity: "Identity",
          security: "Security",
          bunker: "NIP-46 bunker",
          ecosystem: "Ecosystem",
        }
      : lang === "pt"
        ? {
            platform: "Plataforma",
            identity: "Identidade",
            security: "Segurança",
            bunker: "Bunker NIP-46",
            ecosystem: "Ecossistema",
          }
        : {
            platform: "Plataforma",
            identity: "Identidad",
            security: "Seguridad",
            bunker: "Bunker NIP-46",
            ecosystem: "Ecosistema",
          };

  const pills =
    lang === "en"
      ? {
          android: "Android",
          desktop: "Desktop",
          any: "Any",
          paidAddon: "paid add-on",
          na: "N/A",
          localOnly: "local only",
          viaIdentity: "via Identity",
          signerPlusIdentity: "Signer + Identity",
        }
      : lang === "pt"
        ? {
            android: "Android",
            desktop: "Desktop",
            any: "Qualquer",
            paidAddon: "pago extra",
            na: "N/A",
            localOnly: "só local",
            viaIdentity: "via Identity",
            signerPlusIdentity: "Signer + Identity",
          }
        : {
            android: "Android",
            desktop: "Escritorio",
            any: "Cualquiera",
            paidAddon: "pago aparte",
            na: "N/A",
            localOnly: "solo local",
            viaIdentity: "via Identity",
            signerPlusIdentity: "Signer + Identity",
          };

  const detail =
    lang === "en"
      ? "(Signer vault + Identity for NIP-05 and Lightning Address)"
      : lang === "pt"
        ? "(Cofre Signer + Identity para NIP-05 e Lightning Address)"
        : "(Cofre Signer + Identity para NIP-05 y Lightning Address)";

  const landing =
    lang === "en"
      ? {
          nav: {
            howItWorks: "How it works",
            compare: "Compare",
            selfHost: "Self-host",
          },
          hero: {
            eyebrow: "NIP-46 · Nostr Connect · Managed bunker",
            title: "Your NIP-46 bunker, always on.",
            body: "Sign Nostr events remotely. Your nsec stays encrypted in the vault; the server never stores it in plaintext, only an encrypted blob, with an optional in-memory session (configurable TTL).",
            ctaPrimary: "Get started free",
            ctaSecondary: "View on GitHub",
            infraLead: "Prefer to run your own stack?",
            infraLink: "Docker and MIT-licensed open source repo",
          },
          how: {
            title: "How it works",
            subtitle:
              "Three steps: from keypair to remote signing in the BitMacro ecosystem.",
            step1Title: "Generate the keypair",
            step1Body:
              "In the browser, the vault creates the keypair and prepares the Nostr Connect URI (NIP-46).",
            step2Title: "Show the QR",
            step2Body:
              "Display the QR or bunker URI to your Nostr client (phone or desktop).",
            step3Title: "Paste in your Nostr app",
            step3Body:
              "Connect via the BitMacro relay for stable signing requests, 24/7, without exposing your nsec.",
          },
          compare: {
            title: "Comparison",
            intro:
              "BitMacro Signer compared to familiar options in the Nostr ecosystem (features by category).",
            featureCol: "Feature",
            amber: "Amber",
            alby: "Alby",
            recommended: "Recommended",
            signerProduct: "BitMacro Signer",
            partial: "Partial",
            phase2: "Coming soon",
            footnotePhase2: "= on the roadmap, not in the MVP.",
            footnoteDisclaimer:
              "Amber and Alby are independent projects (comparison by typical product capabilities, not an absolute ranking).",
            categories,
            features,
            details: { unifiedOnboardingDetail: detail },
            pills,
          },
          selfHost: {
            badge: "Self-host",
            title: "Run on your infrastructure",
            body: "Docker image with Next.js in standalone mode. Copy environment variables, build, and run, with no extra steps beyond .env.",
            bullet1: "Secrets stay on the host; never commit keys.",
            bullet2: "Healthcheck at /api/health for orchestration.",
            githubLink: "Dockerfile, Compose, and README on GitHub",
            terminal: "terminal",
            bash: "bash",
          },
          footer: {
            mit: "MIT License",
            tagline: "signer.bitmacro.io · managed NIP-46 bunker",
          },
        }
      : lang === "pt"
        ? {
            nav: {
              howItWorks: "Como funciona",
              compare: "Comparação",
              selfHost: "Self-host",
            },
            hero: {
              eyebrow: "NIP-46 · Nostr Connect · Bunker gerido",
              title: "O teu bunker NIP-46, sempre disponível.",
              body: "Assina eventos Nostr à distância. A nsec permanece encriptada no cofre; o servidor nunca a armazena em texto claro, apenas um blob cifrado, com sessão activa opcional em memória (TTL configurável).",
              ctaPrimary: "Começar grátis",
              ctaSecondary: "Ver no GitHub",
              infraLead: "Preferes controlar a infraestrutura?",
              infraLink: "Docker e repositório open source (MIT)",
            },
            how: {
              title: "Como funciona",
              subtitle:
                "Três passos: do keypair à assinatura remota no ecossistema BitMacro.",
              step1Title: "Gera o keypair",
              step1Body:
                "No browser, o cofre cria o par de chaves e prepara o URI Nostr Connect (NIP-46).",
              step2Title: "Mostra o QR",
              step2Body:
                "Mostra o QR ou o bunker URI ao teu cliente Nostr (telefone ou desktop).",
              step3Title: "Cola na app Nostr",
              step3Body:
                "Liga ao relay BitMacro para pedidos de assinatura estáveis, 24/7, sem expor a nsec.",
            },
            compare: {
              title: "Comparação",
              intro:
                "BitMacro Signer face a opções conhecidas no ecossistema Nostr (funcionalidades por categoria).",
              featureCol: "Característica",
              amber: "Amber",
              alby: "Alby",
              recommended: "Recomendado",
              signerProduct: "BitMacro Signer",
              partial: "Parcial",
              phase2: "Em breve",
              footnotePhase2: "= roadmap previsto, não disponível no MVP.",
              footnoteDisclaimer:
                "Amber e Alby são projectos independentes (comparação por funcionalidades típicas, não ranking absoluto).",
              categories,
              features,
              details: { unifiedOnboardingDetail: detail },
              pills,
            },
            selfHost: {
              badge: "Self-host",
              title: "Corre na tua infraestrutura",
              body: "Imagem Docker com Next.js em modo standalone. Copia as variáveis de ambiente, constrói e sobe, sem passos extra além do .env.",
              bullet1: "Secrets só no host; nunca commits de chaves.",
              bullet2: "Healthcheck em /api/health para orquestração.",
              githubLink: "Dockerfile, compose e README no GitHub",
              terminal: "terminal",
              bash: "bash",
            },
            footer: {
              mit: "Licença MIT",
              tagline: "signer.bitmacro.io · bunker NIP-46 gerido",
            },
          }
        : {
            nav: {
              howItWorks: "Cómo funciona",
              compare: "Comparar",
              selfHost: "Self-host",
            },
            hero: {
              eyebrow: "NIP-46 · Nostr Connect · Bunker gestionado",
              title: "Tu bunker NIP-46, siempre disponible.",
              body: "Firma eventos Nostr a distancia. Tu nsec permanece cifrado en la bóveda; el servidor nunca lo guarda en claro, solo un blob cifrado, con sesión opcional en memoria (TTL configurable).",
              ctaPrimary: "Empezar gratis",
              ctaSecondary: "Ver en GitHub",
              infraLead: "¿Prefieres tu propia infraestructura?",
              infraLink: "Docker y repo open source (MIT)",
            },
            how: {
              title: "Cómo funciona",
              subtitle:
                "Tres pasos: del keypair a la firma remota en el ecosistema BitMacro.",
              step1Title: "Genera el par de claves",
              step1Body:
                "En el navegador, la bóveda crea el par y prepara el URI Nostr Connect (NIP-46).",
              step2Title: "Muestra el QR",
              step2Body:
                "Muestra el QR o el bunker URI a tu cliente Nostr (móvil o escritorio).",
              step3Title: "Pega en la app Nostr",
              step3Body:
                "Conecta vía relay BitMacro para peticiones de firma estables, 24/7, sin exponer tu nsec.",
            },
            compare: {
              title: "Comparación",
              intro:
                "BitMacro Signer frente a opciones conocidas en el ecosistema Nostr (funciones por categoría).",
              featureCol: "Característica",
              amber: "Amber",
              alby: "Alby",
              recommended: "Recomendado",
              signerProduct: "BitMacro Signer",
              partial: "Parcial",
              phase2: "Próximamente",
              footnotePhase2: "= en el roadmap, no en el MVP.",
              footnoteDisclaimer:
                "Amber y Alby son proyectos independientes (se comparan capacidades típicas, no un ranking absoluto).",
              categories,
              features,
              details: { unifiedOnboardingDetail: detail },
              pills,
            },
            selfHost: {
              badge: "Self-host",
              title: "En tu infraestructura",
              body: "Imagen Docker con Next.js en modo standalone. Copia variables de entorno, construye y ejecuta, sin pasos extra más allá de .env.",
              bullet1: "Los secretos quedan en el host; nunca commitees claves.",
              bullet2: "Healthcheck en /api/health para orquestación.",
              githubLink: "Dockerfile, Compose y README en GitHub",
              terminal: "terminal",
              bash: "bash",
            },
            footer: {
              mit: "Licencia MIT",
              tagline: "signer.bitmacro.io · bunker NIP-46 gestionado",
            },
          };

  const onboarding =
    lang === "en"
      ? {
          errors: {
            incorrectPassphrase: "Incorrect passphrase",
            npubNotRegistered: "Npub not registered for this Identity",
            unlockFailed: "Failed to unlock",
            invalidClientPubkey: "Invalid client pubkey",
            couldNotCreateSession: "Could not create session",
            missingBunkerUri: "Response missing bunker_uri",
            couldNotCreateIdentity: "Could not create identity",
            missingIdentityId: "Response missing identity_id",
            saveVaultFailed: "Failed to save vault",
            generateOrReload:
              "Generate the keypair again from the bottom link on the identity section.",
            enterPassphrase: "Enter the vault passphrase.",
            missingIdentityStep1:
              "Missing identity_id; unlock again with your npub.",
            pasteNsec: "Paste your nsec.",
            invalidNsec: "Invalid nsec format (expected nsec1…).",
            nsecMismatch: "This nsec does not match your npub",
            lockFailed: "Failed to lock",
            generic: "Error",
          },
          header: {
            brand: "BitMacro Signer",
            title: "Activate the bunker",
            subtitle:
              "Use your BitMacro Identity npub and vault passphrase to get the NIP-46 QR code.",
            bunkerLabel: "Bunker:",
            active: "Active",
            sessionManaged:
              "Session active (bunker in managed server mode)",
            inactive: "Inactive",
            lockBunker: "Lock bunker",
            serverNote:
              "The bunker runs on the server and does not depend on this tab staying open.",
          },
          loadingAuth: "Checking session…",
          identity: {
            vaultOpen: "Vault unlocked for this npub.",
          },
          step1: {
            title: "Identity",
            npubLabel: "Nostr public key (npub)",
            passphraseLabel: "Vault passphrase",
            unlock: "Unlock",
            freshNpubLink:
              "Don’t have an npub yet? Generate a keypair in the browser",
            backToUnlock: "← Back to unlock with existing npub",
            warnSaveNpub:
              "Save this npub: it is your Nostr identity for the bunker. After the vault is set up, you can link it to BitMacro Identity if you want.",
            npubReadonly: "Generated npub (read-only)",
            createVault: "Create vault and activate bunker",
          },
          step2: {
            title: "Back up your vault",
            body: "There is no encrypted vault for this npub yet. Paste the nsec that matches your npub and choose a passphrase to encrypt the vault.",
            nsecLabel: "nsec (bech32)",
            encryptPassLabel: "Passphrase to encrypt the vault",
            saveContinue: "Save vault and continue",
          },
          sessionsPreview: {
            title: "Client sessions",
            manage: "Details & remove",
            empty: "No sessions yet; generate a bunker link below for your first app.",
          },
          step3: {
            title: "Connect an app",
            explain:
              "NIP-46 uses a temporary client key (not your profile npub). Generate the QR and paste it in the app; on first connect the client sends that key and the session is bound automatically.",
            labelOptional: "Label (optional)",
            labelPlaceholder: "e.g. Primal · Coracle · Nostrudel",
            labelHint:
              "The protocol does not send the app name (Primal, Coracle, Nostrudel, …). This label is shown in sessions so you can tell them apart.",
            generateQr: "Generate QR / bunker link",
            qrHelp1:
              "Paste this QR in the client or copy the full link. Each link is single-use: after an app connects successfully, it stops working.",
            qrHelp2:
              "Another device or app needs a new link. Remove stale bunker connections in the client if it cached an old URI.",
            copy: "Copy",
            copied: "Copied",
            newLinkInline: "Need a new link for another app?",
          },
          homeLink: "← Home",
        }
      : lang === "pt"
        ? {
            errors: {
              incorrectPassphrase: "Passphrase incorrecta",
              npubNotRegistered: "Npub não registado nesta Identity",
              unlockFailed: "Erro ao desbloquear",
              invalidClientPubkey: "Pubkey do cliente inválido",
              couldNotCreateSession: "Não foi possível criar a sessão",
              missingBunkerUri: "Resposta sem bunker_uri",
              couldNotCreateIdentity: "Não foi possível criar a identidade",
              missingIdentityId: "Resposta sem identity_id",
              saveVaultFailed: "Erro ao guardar o cofre",
              generateOrReload:
                "Gera o par outra vez a partir da ligação no fim da secção Identidade.",
              enterPassphrase: "Indica a passphrase do cofre.",
              missingIdentityStep1:
                "identity_id em falta; desbloqueia outra vez com o teu npub.",
              pasteNsec: "Cola a tua nsec.",
              invalidNsec: "Formato nsec inválido (esperado nsec1…).",
              nsecMismatch: "Esta nsec não corresponde ao teu npub",
              lockFailed: "Erro ao bloquear",
              generic: "Erro",
            },
            header: {
              brand: "BitMacro Signer",
              title: "Activar o bunker",
              subtitle:
                "Usa o npub da tua Identity BitMacro, a passphrase do cofre, e obtém o QR NIP-46.",
              bunkerLabel: "Bunker:",
              active: "Activo",
              sessionManaged:
                "Sessão activa (bunker em modo managed, servidor)",
              inactive: "Inactivo",
              lockBunker: "Bloquear bunker",
              serverNote:
                "O bunker corre no servidor e não depende desta janela estar aberta.",
            },
            loadingAuth: "A verificar sessão…",
            identity: {
              vaultOpen: "Cofre desbloqueado para este npub.",
            },
            step1: {
              title: "Identidade",
              npubLabel: "Chave pública Nostr (npub)",
              passphraseLabel: "Passphrase do cofre",
              unlock: "Desbloquear",
              freshNpubLink: "Ainda não tens npub? Gera um par no browser",
              backToUnlock: "← Voltar ao unlock com npub existente",
              warnSaveNpub:
                "Guarda este npub: é a tua identidade Nostr no bunker. Depois do cofre, podes associá-la à BitMacro Identity se quiseres.",
              npubReadonly: "npub gerado (readonly)",
              createVault: "Criar cofre e activar bunker",
            },
            step2: {
              title: "Cofre encriptado",
              body: "Ainda não há cofre encriptado para este npub. Cola a nsec que corresponde ao teu npub e define uma passphrase para encriptar o cofre.",
              nsecLabel: "nsec (bech32)",
              encryptPassLabel: "Passphrase para encriptar o cofre",
              saveContinue: "Guardar cofre e continuar",
            },
            sessionsPreview: {
              title: "Sessões de cliente",
              manage: "Detalhes e remover",
              empty:
                "Ainda não há sessões; gera um link bunker abaixo para a primeira app.",
            },
            step3: {
              title: "Ligar uma app",
              explain:
                "O NIP-46 usa uma chave temporária no cliente (não o npub do teu perfil). Gera o QR e cola-o na app; na primeira ligação o cliente envia essa chave e a sessão fica associada automaticamente.",
              labelOptional: "Etiqueta (opcional)",
              labelPlaceholder: "ex.: Primal · Coracle · Nostrudel",
              labelHint:
                "O protocolo não envia o nome da app (Primal, Coracle, Nostrudel, …). Esta etiqueta aparece nas sessões para te orientares.",
              generateQr: "Gerar QR / link bunker",
              qrHelp1:
                "Cola este QR no cliente ou copia o link completo. Cada link é de uso único: depois de uma app ligar com sucesso, deixa de servir.",
              qrHelp2:
                "Outro dispositivo ou app precisa de um link novo. Remove ligações antigas ao bunker no cliente se ainda estiver em cache.",
              copy: "Copiar",
              copied: "Copiado",
              newLinkInline: "Precisas de um link novo para outra app?",
            },
            homeLink: "← Página inicial",
          }
        : {
            errors: {
              incorrectPassphrase: "Frase de paso incorrecta",
              npubNotRegistered: "Npub no registrada para esta Identity",
              unlockFailed: "Error al desbloquear",
              invalidClientPubkey: "Pubkey de cliente inválida",
              couldNotCreateSession: "No se pudo crear la sesión",
              missingBunkerUri: "Respuesta sin bunker_uri",
              couldNotCreateIdentity: "No se pudo crear la identidad",
              missingIdentityId: "Respuesta sin identity_id",
              saveVaultFailed: "Error al guardar la bóveda",
              generateOrReload:
                "Genera el par otra vez desde el enlace al final de la sección Identidad.",
              enterPassphrase: "Introduce la frase de paso de la bóveda.",
              missingIdentityStep1:
                "Falta identity_id; desbloquea de nuevo con tu npub.",
              pasteNsec: "Pega tu nsec.",
              invalidNsec: "Formato nsec inválido (se espera nsec1…).",
              nsecMismatch: "Esta nsec no coincide con tu npub",
              lockFailed: "Error al bloquear",
              generic: "Error",
            },
            header: {
              brand: "BitMacro Signer",
              title: "Activar el bunker",
              subtitle:
                "Usa el npub de tu BitMacro Identity, la frase de paso de la bóveda y obtén el QR NIP-46.",
              bunkerLabel: "Bunker:",
              active: "Activo",
              sessionManaged:
                "Sesión activa (bunker en modo gestionado, servidor)",
              inactive: "Inactivo",
              lockBunker: "Bloquear bunker",
              serverNote:
                "El bunker corre en el servidor y no depende de que esta pestaña siga abierta.",
            },
            loadingAuth: "Comprobando sesión…",
            identity: {
              vaultOpen: "Bóveda desbloqueada para este npub.",
            },
            step1: {
              title: "Identidad",
              npubLabel: "Clave pública Nostr (npub)",
              passphraseLabel: "Frase de paso de la bóveda",
              unlock: "Desbloquear",
              freshNpubLink:
                "¿Aún no tienes npub? Genera un par en el navegador",
              backToUnlock: "← Volver al desbloqueo con npub existente",
              warnSaveNpub:
                "Guarda este npub: es tu identidad Nostr en el bunker. Tras la bóveda, puedes vincularla a BitMacro Identity si quieres.",
              npubReadonly: "npub generado (solo lectura)",
              createVault: "Crear bóveda y activar bunker",
            },
            step2: {
              title: "Respaldo del cofre",
              body: "Aún no hay bóveda cifrada para este npub. Pega la nsec que coincide con tu npub y elige una frase para cifrar la bóveda.",
              nsecLabel: "nsec (bech32)",
              encryptPassLabel: "Frase para cifrar la bóveda",
              saveContinue: "Guardar bóveda y continuar",
            },
            sessionsPreview: {
              title: "Sesiones de cliente",
              manage: "Detalles y eliminar",
              empty:
                "Aún no hay sesiones; genera un enlace bunker abajo para la primera app.",
            },
            step3: {
              title: "Conectar una app",
              explain:
                "NIP-46 usa una clave temporal en el cliente (no el npub de tu perfil). Genera el QR y pégalo en la app; en el primer enlace el cliente envía esa clave y la sesión se asocia automáticamente.",
              labelOptional: "Etiqueta (opcional)",
              labelPlaceholder: "p. ej. Primal · Coracle · Nostrudel",
              labelHint:
                "El protocolo no envía el nombre de la app (Primal, Coracle, Nostrudel, …). Esta etiqueta aparece en sesiones para orientarte.",
              generateQr: "Generar QR / enlace bunker",
              qrHelp1:
                "Pega este QR en el cliente o copia el enlace completo. Cada enlace es de un solo uso: tras conectar una app con éxito, deja de valer.",
              qrHelp2:
                "Otro dispositivo o app necesita un enlace nuevo. Elimina conexiones antiguas al bunker en el cliente si aún cachea un URI previo.",
              copy: "Copiar",
              copied: "Copiado",
              newLinkInline: "¿Necesitas un enlace nuevo para otra app?",
            },
            homeLink: "← Inicio",
          };

  const sessions =
    lang === "en"
      ? {
          brand: "BitMacro Signer",
          title: "Active sessions",
          body: "NIP-46 does not send the app name: use the session key (npub/hex below). If you set a label when generating the QR, it is shown prominently.",
          noLabel: "No label (set when generating the QR in onboarding)",
          clientKey: "Client session key (NIP-46)",
          hexTechnical: "Hex (technical)",
          copyNpub: "Copy npub",
          copyHex: "Copy hex",
          copied: "Copied",
          expires: "expires",
          used: "used",
          pending: "pending",
          loading: "Loading…",
          sessionRequired: "Session required",
          listError: "Failed to list sessions",
          genericError: "Error",
          empty: "No client sessions.",
          back: "← Back to onboarding",
          onboardingLink: "Onboarding",
          sessionIdLabel: "Session id (for logs)",
          remove: "Remove session",
          removeConfirm:
            "Remove this client session? You will need a new QR or bunker link to connect again.",
          removing: "Removing…",
          removeError: "Could not remove session",
        }
      : lang === "pt"
        ? {
            brand: "BitMacro Signer",
            title: "Sessões activas",
            body: "O NIP-46 não envia o nome da app: usa a chave de sessão (npub/hex abaixo). Se definires uma etiqueta ao gerar o QR, ela aparece em destaque.",
            noLabel: "Sem etiqueta (definida ao gerar o QR no onboarding)",
            clientKey: "Chave de sessão no cliente (NIP-46)",
            hexTechnical: "Hex (técnico)",
            copyNpub: "Copiar npub",
            copyHex: "Copiar hex",
            copied: "Copiado",
            expires: "expira",
            used: "usada",
            pending: "pendente",
            loading: "A carregar…",
            sessionRequired: "Sessão necessária",
            listError: "Erro ao listar sessões",
            genericError: "Erro",
            empty: "Nenhuma sessão de cliente.",
            back: "← Voltar ao onboarding",
            onboardingLink: "Onboarding",
            sessionIdLabel: "Id da sessão (para logs)",
            remove: "Remover sessão",
            removeConfirm:
              "Remover esta sessão de cliente? Será preciso um novo QR ou link bunker para voltar a ligar.",
            removing: "A remover…",
            removeError: "Não foi possível remover a sessão",
          }
        : {
            brand: "BitMacro Signer",
            title: "Sesiones activas",
            body: "NIP-46 no envía el nombre de la app: usa la clave de sesión (npub/hex abajo). Si pones una etiqueta al generar el QR, se muestra destacada.",
            noLabel: "Sin etiqueta (se define al generar el QR en onboarding)",
            clientKey: "Clave de sesión del cliente (NIP-46)",
            hexTechnical: "Hex (técnico)",
            copyNpub: "Copiar npub",
            copyHex: "Copiar hex",
            copied: "Copiado",
            expires: "expira",
            used: "usada",
            pending: "pendiente",
            loading: "Cargando…",
            sessionRequired: "Sesión requerida",
            listError: "Error al listar sesiones",
            genericError: "Error",
            empty: "No hay sesiones de cliente.",
            back: "← Volver al onboarding",
            onboardingLink: "Onboarding",
            sessionIdLabel: "Id de sesión (para logs)",
            remove: "Eliminar sesión",
            removeConfirm:
              "¿Eliminar esta sesión de cliente? Necesitarás un nuevo QR o enlace bunker para conectar de nuevo.",
            removing: "Eliminando…",
            removeError: "No se pudo eliminar la sesión",
          };

  const common =
    lang === "en"
      ? { locale: "Language", brand: "BitMacro Signer" }
      : lang === "pt"
        ? { locale: "Idioma", brand: "BitMacro Signer" }
        : { locale: "Idioma", brand: "BitMacro Signer" };

  return { common, landing, onboarding, sessions };
}

const en = buildMessages(
  Object.fromEntries(featureIds.map((id) => [id, featuresEn[id]])),
  "en",
);
const ptBR = buildMessages(
  Object.fromEntries(featureIds.map((id) => [id, featuresPt[id]])),
  "pt",
);
const es = buildMessages(
  Object.fromEntries(featureIds.map((id) => [id, featuresEs[id]])),
  "es",
);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "en.json"), JSON.stringify(en, null, 2));
fs.writeFileSync(path.join(outDir, "pt-BR.json"), JSON.stringify(ptBR, null, 2));
fs.writeFileSync(path.join(outDir, "es.json"), JSON.stringify(es, null, 2));
console.log("Wrote src/messages/{en,pt-BR,es}.json");
