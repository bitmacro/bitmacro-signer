# BitMacro Signer — Base de Conhecimento para Suporte

> **Uso:** Documento de referência para o assistente de IA do BitMacro Signer (signer.bitmacro.io).
> **Audiência:** Utilizadores reais com dúvidas sobre o bunker NIP-46 e a gestão segura de chaves Nostr.
> **Tom:** Directo, simples, sem jargão técnico excessivo. Explica os conceitos à medida que surgem.
> **Última actualização:** Abril 2026

---

## 1. O que é o BitMacro Signer e para que serve?

**Pergunta típica:** *"O que é isto? Preciso disto?"*

O BitMacro Signer é um cofre digital para a tua chave Nostr — e uma forma de usares essa chave 24 horas por dia, 7 dias por semana, sem teres o telemóvel ligado ou uma extensão de browser instalada.

### O problema que resolve

No Nostr, a tua identidade é uma chave criptográfica privada chamada `nsec`. É como a senha-mestra da tua vida digital nesse protocolo: quem a tiver pode publicar em teu nome, seguir e deixar de seguir contactos, enviar mensagens directas, receber Zaps. Se a perderes, perdes a tua identidade. Se alguém a roubar, pode fazer-se passar por ti.

O problema é que as aplicações Nostr (Nostrudel, Primal, Coracle, etc.) precisam da tua `nsec` para assinar eventos — cada publicação, cada mensagem, cada reacção. As opções tradicionais são:

- **Guardar a `nsec` na aplicação**: arriscado, a app tem acesso total permanente.
- **Usar uma extensão de browser** (tipo Alby): só funciona no computador e só quando o browser está aberto.
- **Usar Amber no Android**: só funciona nesse dispositivo Android específico.

O BitMacro Signer resolve isto com um **bunker remoto**: a tua chave fica cifrada nos nossos servidores, e um processo permanente responde aos pedidos de assinatura em teu nome, seguindo o protocolo NIP-46. Nunca tens de partilhar a `nsec` com nenhuma aplicação.

### O que ganhas

- **Assinatura 24/7** sem precisar de ter o telemóvel ou o browser ligados.
- **Zero-knowledge**: a tua `nsec` é cifrada no browser antes de chegar ao servidor — nunca a vemos em texto simples.
- **Funciona em qualquer dispositivo**: iOS, Android, browser, desktop — sem instalar nada.
- **Controlo por sessão**: autorizas cada aplicação individualmente e podes revogar esse acesso quando quiseres.
- **Backup offline**: em caso de perda total do acesso, um PDF guardado localmente permite recuperar a chave.

**Frase resumo:** O BitMacro Signer é o teu guarda-costas criptográfico — assina em teu nome, nunca sai de casa, e só tu tens a chave do cofre.

---

## 2. O que é NIP-46 e o que é um bunker?

**Pergunta típica:** *"Ouço falar em NIP-46 e bunker mas não percebo o que é. Podes explicar?"*

### O Nostr em duas linhas

O Nostr é uma rede social descentralizada. A tua identidade é uma chave criptográfica. Quando publicas algo, o teu cliente assina esse conteúdo com a tua chave privada (`nsec`), provando que és tu.

### O problema com a assinatura directa

Se deres a tua `nsec` a uma aplicação, essa aplicação pode assinar qualquer coisa em teu nome — mesmo que não quisesses. E se a aplicação for comprometida, a tua chave vai com ela.

### O que é NIP-46

NIP-46 é uma especificação do protocolo Nostr que define como separar a assinatura da aplicação. Em vez de a aplicação ter a tua `nsec`, ela envia os pedidos de assinatura para um **bunker** — um processo seguro que tem a chave — e o bunker responde com o evento já assinado.

```
Aplicação (Nostrudel)                   Bunker (BitMacro Signer)
    │                                         │
    │── "Assina este evento" ────────────────►│
    │   (encriptado com NIP-44)               │
    │                                         │── Decifra pedido
    │                                         │── Assina com nsec
    │◄── "Evento assinado" ───────────────────│
    │   (encriptado com NIP-44)               │
```

Toda esta comunicação passa por um relay Nostr (como `wss://relay.bitmacro.io`) e está encriptada de ponta a ponta (NIP-44) — nem o relay consegue ler o conteúdo.

### O que é um bunker

O bunker é o processo que corre 24/7 no servidor e responde aos pedidos de assinatura. No BitMacro Signer:

1. A tua `nsec` está cifrada no nosso servidor (AES-GCM, encriptação no browser).
2. Quando desbloqueias o vault com a tua password, a `nsec` decifrada fica temporariamente em memória RAM (nunca em disco nem em base de dados em texto claro).
3. O bunker entra em loop de escuta no relay.
4. Quando uma aplicação autorizada envia um pedido de assinatura, o bunker responde.
5. Após o tempo configurado (por defeito, 24 horas), a `nsec` é apagada da RAM e tens de desbloquear novamente.

**Resumo simples:** O bunker é como um funcionário de confiança que tem uma cópia encriptada das tuas chaves, só as usa quando tu o autorizas, e esquece-as ao fim do dia.

---

## 3. Como criar e configurar o meu vault? (passo a passo)

**Pergunta típica:** *"Por onde começo? Como registo a minha chave?"*

### O que é o vault

O vault (cofre) é onde a tua `nsec` fica guardada de forma cifrada. É criado uma vez, no teu browser, e depois guardado nos servidores BitMacro. Só tu consegues decifrar o conteúdo — com a tua password.

### Passo a passo

**1. Vai a [signer.bitmacro.io](https://signer.bitmacro.io)**

**2. Cria conta ou inicia sessão**
- Podes usar email + password ou entrar com Google.
- A conta BitMacro é a mesma usada no BitMacro App, Identity e outros produtos.

**3. No painel, gera ou importa o teu keypair**

*Opção A — Gerar novo keypair (recomendado para começar):*
- Clica em "Gerar novo keypair"
- O browser gera um par de chaves completamente aleatório
- Vês a tua `npub` (chave pública) — esta é a tua identidade Nostr

*Opção B — Importar `nsec` existente:*
- Cola a tua chave privada (`nsec1...` em formato bech32)
- O sistema valida e encripta-a antes de sair do browser

**4. Define uma password forte**
- Esta password é a única forma de desbloquear o vault
- **O BitMacro nunca a vê nem a guarda** — se a perderes, a única recuperação é o PDF de backup
- Usa uma password longa e única, que não uses noutros serviços

**5. Descarrega o PDF de backup**
- Este passo é obrigatório antes de continuares
- O PDF contém um bundle offline cifrado e instruções de recuperação
- Guarda-o num local seguro (dispositivo offline, cofre físico, USB encriptada)
- O sistema pede-te o código de 6 caracteres que aparece no PDF, para confirmar que o descarregaste

**6. Confirma o código de 6 caracteres**
- Introduz o código que aparece no PDF
- Só após isto o vault fica activo

**7. Desbloqueia o bunker**
- Introduz a tua password para desbloquear o vault
- O bunker arranca e fica em escuta no relay
- A `nsec` fica em RAM durante 24h (ou o tempo configurado)

**8. Gera um QR code para ligar uma aplicação**
- Vai a "Sessões" → "Nova sessão"
- Dá um nome à sessão (ex: "Nostrudel", "Primal", "Coracle")
- Aparece um QR code com uma `bunker://` URI
- Na aplicação cliente, escolhe "Ligar com bunker" e faz scan do QR

---

## 4. O que é o vault e como funciona a encriptação?

**Pergunta típica:** *"A minha chave está segura nos vossos servidores? Como funciona tecnicamente?"*

### A premissa: zero-knowledge

"Zero-knowledge" significa que o BitMacro nunca tem acesso à tua `nsec` em texto claro. Toda a encriptação e desencriptação acontece exclusivamente no teu browser.

### O processo de encriptação (detalhado)

Quando guardas a tua `nsec` no vault:

1. **No teu browser**, a tua password é processada pelo algoritmo PBKDF2-SHA256 com 600.000 iterações e um salt aleatório de 32 bytes. Isto gera uma chave de 256 bits.
2. Essa chave é usada para cifrar a `nsec` com AES-GCM (padrão militar, 256-bit) e um IV aleatório de 12 bytes.
3. O resultado — um blob de ciphertext + salt + IV, todos em base64 — é enviado para os servidores BitMacro e guardado na base de dados.
4. **A tua password nunca sai do browser.** O servidor recebe apenas o blob cifrado.

### O que o BitMacro guarda

| Campo | O que é | Seguro sem password? |
|-------|---------|----------------------|
| `blob` | Ciphertext AES-GCM da tua nsec | ✅ Sim — inútil sem password |
| `salt` | Salt aleatório do PBKDF2 | ✅ Sim — não revela a password |
| `iv` | Vector de inicialização do AES-GCM | ✅ Sim — não revela a nsec |
| `bunker_pubkey` | A tua npub (chave pública) | ✅ É pública por natureza |

### O que o BitMacro NÃO guarda

- A tua password — nunca.
- A tua `nsec` em texto claro — nunca.
- Logs de pedidos de assinatura — nunca.

### E durante uma sessão activa?

Quando desbloqueias o vault com a tua password:
1. O browser decifra a `nsec` localmente.
2. A `nsec` decifrada é enviada de forma segura (HTTPS + token interno) para o processo daemon no servidor.
3. O daemon guarda a `nsec` **apenas em RAM**, nunca em disco.
4. Após o TTL (por defeito 24 horas), a `nsec` é apagada da RAM automaticamente.
5. Para voltar a assinar, tens de desbloquear novamente.

### Analogia

É como um cofre físico em que só tu tens a combinação. O banco (BitMacro) guarda o cofre, mas não conhece a combinação e nunca abre o cofre. Quando precisas de acesso, abre-o tu mesmo, usas o que precisas, e o cofre fecha-se sozinho ao fim do dia.

---

## 5. Como gerar um QR code e ligar uma aplicação?

**Pergunta típica:** *"Como conecto o Nostrudel / Primal / Coracle ao Signer?"*

### Pré-requisitos

- Ter o vault criado e desbloqueado (bunker activo).
- Ter a aplicação cliente aberta (ex: Nostrudel, Coracle, Primal).

### Passo a passo

**1. No painel do BitMacro Signer, vai a "Sessões"**

**2. Clica em "Nova Sessão"**

**3. Dá um nome à sessão**
- Exemplos: "Nostrudel desktop", "Primal iOS", "Coracle trabalho"
- O nome é só para tua referência — não é transmitido à aplicação

**4. Aparece o QR code (bunker:// URI)**
- A URI tem este formato: `bunker://npub1...?relay=wss://relay.bitmacro.io&secret=<token>`
- O `secret` é um código de uso único — só serve para o handshake inicial

**5. Na aplicação cliente:**
- Procura "Ligar com bunker NIP-46" ou "Nostr Connect" nas definições de conta
- Faz scan do QR code ou cola a URI manualmente
- A aplicação envia o pedido de `connect` ao relay
- O bunker valida o secret, confirma a ligação, e a sessão fica activa

**6. A partir deste momento:**
- A aplicação envia pedidos de assinatura ao relay
- O bunker responde com os eventos assinados
- A tua `nsec` nunca saiu do servidor

### Notas importantes

- **Cada QR code é de uso único**: o secret só é válido para uma ligação. Se precisares de ligar outra instância da mesma app, gera um QR novo.
- **Podes ter múltiplas sessões activas**: uma para Nostrudel, outra para Primal, outra para Coracle — cada uma independente.
- **Podes revogar qualquer sessão**: vai à lista de sessões e clica em "Revogar". A aplicação deixa de conseguir assinar imediatamente.
- **Se o bunker não estiver activo** (vault bloqueado), os pedidos de assinatura ficam em fila no relay até o bunker arrancar — ou falham com timeout, dependendo do cliente.

---

## 6. O que é o PDF de backup e por que é tão importante?

**Pergunta típica:** *"Tenho de descarregar um PDF. Para que é isso? Posso saltar este passo?"*

### Não podes saltar este passo

O PDF de backup é o único mecanismo de recuperação da tua `nsec` caso percas o acesso ao vault. Se o servidor for inacessível, se perderes a conta, ou se esqueceres a password, **o PDF é a única forma de recuperar a tua chave privada**. Sem ele, a perda da conta significa perda permanente da identidade Nostr.

### O que contém o PDF

- A tua `npub` (chave pública, para verificação)
- Um bundle offline cifrado em JSON, contendo o ciphertext, salt e IV do vault
- Um QR code com esse bundle (para recuperação via câmara)
- Um código de confirmação de 6 caracteres (para confirmar que descarregaste o PDF)
- Instruções de recuperação independentes do BitMacro (o algoritmo de desencriptação descrito em detalhe)

### O bundle offline (formato técnico)

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

Este bundle contém tudo o que é necessário para recuperar a `nsec` — desde que tenhas a password.

### Como guardar o PDF em segurança

- **Imprime e guarda num cofre físico** (recomendado para máxima segurança)
- **Guarda numa pen USB encriptada** que não liges à internet
- **Guarda numa pasta encriptada** no computador (ex: com VeraCrypt)
- **Não guardes em serviços cloud** (Google Drive, iCloud, Dropbox) sem encriptação adicional
- **Não partilhes com ninguém** — quem tiver o PDF e a tua password tem a tua chave

### O código de 6 caracteres

Este código aparece apenas no PDF (nunca no ecrã do browser). Ao pedi-lo, o sistema confirma que descarregaste e abriste o ficheiro. Só após inserires o código correcto o vault fica activo.

---

## 7. Como recuperar o acesso se perder a password ou o acesso à conta?

**Pergunta típica:** *"Esqueci a password. O que faço? Perdi tudo?"*

### Cenário 1 — Esqueceste a password mas tens o PDF de backup

Esta é a situação em que o PDF serve. Vai a [signer.bitmacro.io/recover](https://signer.bitmacro.io/recover):

1. **Abre o PDF** e localiza o bundle JSON (ou usa a câmara para ler o QR code)
2. **Cola o JSON** no campo de recuperação na página `/recover`
3. **Introduz a password** que usaste quando criaste o vault
4. O browser executa a desencriptação localmente — a `nsec` aparece no ecrã
5. **Copia a `nsec` imediatamente** e guarda-a num gestor de passwords seguro
6. Com a `nsec` recuperada, podes criar um novo vault com uma nova password

**Importante:** A página `/recover` é pública e não requer login. Toda a desencriptação acontece no teu browser — nada é enviado para o servidor.

### Cenário 2 — Perdeste o acesso à conta BitMacro mas tens o PDF

O processo é o mesmo. A página `/recover` funciona sem autenticação. Com o JSON do PDF e a tua password, recuperas a `nsec` independentemente da conta BitMacro.

### Cenário 3 — Esqueceste a password E não tens o PDF

Neste caso, **a recuperação é impossível**. A `nsec` está cifrada com a tua password, que nunca foi enviada ao servidor. Não existe backdoor. É uma perda permanente da identidade Nostr associada a esse keypair.

Esta é a razão pela qual o backup em PDF é obrigatório durante o onboarding.

### Cenário 4 — O bunker parou (servidor reiniciou, TTL expirou)

Este não é uma perda — apenas precisas de desbloquear novamente:

1. Vai a [signer.bitmacro.io](https://signer.bitmacro.io)
2. Faz login com a tua conta
3. Introduz a tua password no painel
4. O vault é desbloqueado e o bunker arranca novamente
5. As sessões existentes (aplicações ligadas) continuam a funcionar

### Como saber se o bunker está activo

No painel, o estado do bunker aparece claramente: activo (verde) ou bloqueado (cinzento). Se bloqueado, os pedidos de assinatura das aplicações não serão respondidos.

---

## 8. Como funcionam as sessões e como as gerir?

**Pergunta típica:** *"O que é uma sessão? Como sei quais as aplicações que têm acesso à minha chave?"*

### O que é uma sessão

Uma sessão representa a ligação entre o teu bunker e uma aplicação cliente específica (Nostrudel, Primal, Coracle, etc.). Cada sessão tem:

- Um **nome** (que tu defines, ex: "Nostrudel desktop")
- Uma **chave de sessão** (`app_pubkey`) — gerada pela aplicação cliente, não pela tua identidade
- Uma **data de expiração** (por defeito, 24 horas; configurável no futuro)
- Um estado: activa ou revogada

### O que acontece durante uma sessão

1. A aplicação envia pedidos de assinatura encriptados ao relay
2. O bunker recebe, desencripta (NIP-44), verifica que vem desta `app_pubkey` autorizada
3. Assina o evento com a tua `nsec`
4. Devolve o evento assinado, encriptado para a `app_pubkey` da aplicação
5. A aplicação publica o evento no Nostr

**A aplicação nunca vê a tua `nsec`**. Vê apenas os eventos já assinados.

### Criar uma nova sessão

1. Painel → "Sessões" → "Nova Sessão"
2. Define o nome
3. Faz scan do QR code na aplicação

### Revogar uma sessão

1. Painel → "Sessões"
2. Encontra a sessão que queres terminar
3. Clica em "Revogar"
4. A partir desse momento, pedidos daquela `app_pubkey` são rejeitados

### Boas práticas

- **Dá nomes descritivos** a cada sessão (dispositivo + app, ex: "Coracle MacBook", "Primal iPhone")
- **Revoga sessões de dispositivos que já não uses** ou de aplicações que desinstalaste
- **Gera QR novo** se mudares de dispositivo — não partilhes URIs entre dispositivos
- **Sessões expiram automaticamente** — se uma aplicação parar de funcionar, verifica se a sessão expirou

### A app_pubkey não é a tua identidade

É um erro comum de confusão: a `app_pubkey` mostrada nos detalhes da sessão é a chave da **aplicação cliente** (Nostrudel, Coracle), gerada por ela para esta sessão específica. Não é a tua `npub` de identidade.

---

## 9. Privacidade e segurança — o que o BitMacro guarda?

**Pergunta típica:** *"Que dados tendes sobre mim? A minha chave está segura?"*

### O que guardamos

| Dado | Para quê |
|------|---------|
| `npub` (chave pública) | Identificação do vault — é pública por natureza |
| Blob cifrado (ciphertext) | O vault encriptado — inútil sem a tua password |
| Salt e IV | Parâmetros de desencriptação — inúteis sem a tua password |
| Sessões activas (app_pubkey, nome, expiração) | Gestão das aplicações autorizadas |
| Email e dados de conta | Autenticação na plataforma |

### O que NÃO guardamos

- **A tua `nsec` em texto claro** — nunca, em nenhum momento
- **A tua password** — nunca sai do browser
- **O conteúdo dos eventos assinados** — não registamos o que assinas
- **Logs de pedidos de assinatura** — não guardamos histórico das tuas acções no Nostr

### Ameaças e mitigação

| Ameaça | Impacto | Mitigação |
|--------|---------|-----------|
| **Base de dados comprometida** | Acesso ao blob cifrado | Inútil sem a password — PBKDF2 + AES-GCM com 600k iterações |
| **Servidor comprometido durante sessão activa** | Acesso à nsec em RAM | TTL curto (24h); revogação imediata possível; sem persistência em disco |
| **Relay intercepts** | Acesso aos pedidos NIP-46 | Encriptação NIP-44 — o relay não consegue ler o conteúdo |
| **Aplicação cliente maliciosa** | Pode pedir assinaturas não desejadas | Cada sessão é individual e revogável; âmbito de métodos (Fase 2) |
| **Perda do PDF sem backup** | Perda permanente da nsec | Obrigatoriedade do PDF no onboarding |

### O bunker pode assinar qualquer coisa?

Por agora, sim — durante uma sessão activa, o bunker responde a qualquer pedido NIP-46 válido da `app_pubkey` autorizada. Nas versões futuras (Fase 2), será possível limitar os métodos por sessão (ex: permitir apenas `sign_event` de kind 1, bloquear `follow`, etc.).

### Posso confiar no servidor BitMacro?

O design zero-knowledge significa que, mesmo que não confies no servidor, a tua `nsec` está segura enquanto a tua password não for comprometida. O código-fonte está disponível em [github.com/bitmacro/bitmacro-signer](https://github.com/bitmacro/bitmacro-signer) para auditoria.

Adicionalmente, a página `/recover` funciona completamente offline — podes verificar que a desencriptação não envia dados ao servidor (abre o DevTools e monitoriza os pedidos de rede).

---

## 10. Posso correr o BitMacro Signer na minha própria infra-estrutura?

**Pergunta típica:** *"Posso fazer self-host? Como?"*

### Sim — o BitMacro Signer é open-source e auto-hospedável

O código está disponível em [github.com/bitmacro/bitmacro-signer](https://github.com/bitmacro/bitmacro-signer) com licença MIT. Podes correr a tua própria instância.

### Arquitectura para self-host

O Signer tem dois componentes separados:

```
┌─────────────────────────────────────────┐
│  signer-web (Next.js)                   │
│  Serve a UI e as API routes             │
│  Porta: 3000                            │
└────────────────┬────────────────────────┘
                 │ HTTP interno + token
┌────────────────▼────────────────────────┐
│  signer-daemon (Node.js)                │
│  Loop NIP-46 permanente                 │
│  Guarda nsec em RAM com TTL             │
│  Porta: 47777 (interna)                 │
└─────────────────────────────────────────┘
```

### Docker Compose (exemplo simplificado)

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
      - AUTH_SESSION_SECRET=uma-string-aleatoria-longa
      - DAEMON_INTERNAL_URL=http://daemon:47777
      - DAEMON_INTERNAL_TOKEN=outro-token-secreto

  daemon:
    image: ghcr.io/bitmacro/bitmacro-signer-daemon:latest
    environment:
      - DAEMON_INTERNAL_TOKEN=outro-token-secreto
      - SUPABASE_SERVICE_ROLE_KEY=eyJ...
      - RELAY_URL=wss://relay.example.com
```

### Pré-requisitos para self-host

1. **Supabase** — base de dados PostgreSQL (podes usar o plano gratuito Supabase Cloud ou self-host)
2. **Relay Nostr** — qualquer relay que suporte NIP-46 (`wss://relay.bitmacro.cloud` funciona para testes; recomendamos relay próprio para produção)
3. **Docker + Docker Compose** — para correr os dois contentores
4. **Domínio com SSL** — o web precisa de HTTPS para a Web Crypto API funcionar

### Imagens disponíveis

As imagens são publicadas no GitHub Container Registry após cada commit:
- `ghcr.io/bitmacro/bitmacro-signer-web:latest`
- `ghcr.io/bitmacro/bitmacro-signer-daemon:latest`

Também existem tags com versão semântica (ex: `v0.3.6`) e SHA curto do commit.

### Limitações do self-host

- O daemon reinicia sem a `nsec` em RAM — terás de desbloquear manualmente após cada reinício
- Não há painel de administração multi-utilizador (cada instância serve uma identidade)
- A integração com BitMacro Identity (NIP-05, Lightning Address) não está disponível em instâncias externas

---

## 11. Perguntas Frequentes (FAQ)

---

**Qual é a diferença entre o BitMacro Signer e o BitMacro Identity?**

São produtos complementares:
- O **Identity** (`id.bitmacro.io`) dá-te um username Nostr verificado (NIP-05), um Lightning Address para receber Bitcoin, e acesso a relays curados.
- O **Signer** (`signer.bitmacro.io`) guarda a tua chave Nostr de forma segura e assina eventos 24/7 sem expor a `nsec` às aplicações.

Podes usar cada um de forma independente, mas juntos formam uma identidade Nostr completa e soberana. No futuro, o onboarding será unificado.

---

**Posso usar o Signer com qualquer aplicação Nostr?**

Sim, desde que a aplicação suporte NIP-46 (Nostr Connect). As mais populares que suportam:
- Nostrudel (web)
- Coracle (web)
- Primal (iOS, Android, web)
- Snort (web)
- Iris (web)

Se a tua aplicação preferida não suportar NIP-46, ainda não consegues ligá-la ao Signer. Consulta a documentação da aplicação.

---

**O que é a `bunker://` URI e posso partilhá-la?**

A `bunker://` URI é o endereço do teu bunker, incluindo um secret de uso único. **Não a partilhes** — quem a tiver pode completar o handshake NIP-46 e obter uma sessão de assinatura. Cada URI expira após uma ligação bem-sucedida, mas enquanto estiver pendente é sensível.

---

**O que acontece se o servidor BitMacro ficar offline?**

Se o servidor estiver offline:
- Não consegues desbloquear o vault nem criar novas sessões.
- As sessões activas param de funcionar (o bunker não responde).
- A tua identidade Nostr não é afectada — os teus eventos anteriores continuam visíveis.
- Com o PDF de backup, podes recuperar a `nsec` e importá-la noutro cliente ou bunker.

Para self-hosters, esta dependência é eliminada.

---

**O bunker tem de estar sempre activo para o Nostr funcionar?**

Não para leres conteúdo, mas sim para publicares, reagires, enviares mensagens ou receberes Zaps (que requerem assinatura). Se o bunker estiver bloqueado, as aplicações não conseguem assinar eventos em teu nome.

---

**Posso ter mais do que um keypair / vault?**

Por agora, cada conta BitMacro suporta um vault. Suporte para múltiplos keypairs por conta está no roadmap.

---

**O que é o TTL do bunker e como funciona?**

TTL (Time To Live) é o tempo que a `nsec` fica em memória RAM no servidor após desbloqueares o vault. Por defeito são 24 horas. Após esse período, a `nsec` é automaticamente apagada da RAM e o bunker pára. Para voltar a assinar, tens de desbloquear com a tua password.

O TTL é uma medida de segurança: limita o tempo de exposição da chave em memória, mesmo em caso de compromisso do servidor.

---

**Posso alterar a password do vault?**

Sim — a funcionalidade de alteração de password está prevista. No momento (Abril 2026), podes fazer manualmente: recupera a `nsec` com o PDF + password antiga, cria um novo vault com a nova password, e descarrega um novo PDF.

---

**O que é o Shamir Secret Sharing que vejo mencionado?**

É uma técnica criptográfica que divide a `nsec` em N fragmentos, dos quais precisas de K para reconstruir a chave original (ex: 3 de 5). Está planeada para a Fase 2 do roadmap como alternativa ao backup em PDF, permitindo dividir a recuperação entre múltiplos dispositivos ou pessoas de confiança sem que nenhum individualmente tenha a chave completa.

---

**Posso usar o BitMacro Signer para assinar com Zaps?**

Sim. Os Zaps são eventos Nostr (kind:9734) que requerem assinatura. Quando uma aplicação Nostr compatível processa um Zap, envia o pedido de assinatura ao bunker como qualquer outro evento. O processo é transparente para o utilizador.

---

**O BitMacro tem acesso às minhas mensagens directas?**

Não. As mensagens directas no Nostr (NIP-04 ou NIP-44) são encriptadas entre as chaves dos participantes. O bunker assina os eventos de mensagem mas não tem capacidade de ler o conteúdo das mensagens destinadas a outros — apenas assina o envelope.

---

**Posso ver o histórico de eventos que o bunker assinou?**

Por agora não. O bunker não guarda registo dos eventos assinados — assina e responde sem persistir histórico. Logs de auditoria estão planeados para versões futuras.

---

**Como sei a versão do Signer que está a correr?**

Podes consultar a API pública `/api/build-info` na instância (ex: `https://signer.bitmacro.io/api/build-info`). Retorna o commit Git e a versão do build para transparência e auditabilidade.

---

**Qual é o email de suporte?**

Podes contactar a equipa em **contact@bitmacro.io** ou via Nostr em `thiago@bitmacro.io`.

---

*Base de conhecimento BitMacro Signer — versão Abril 2026*
