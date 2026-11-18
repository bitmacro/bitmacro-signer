# COPY — signer.bitmacro.io

Não havia inventário. Data da leitura: 18 nov 2026 (actualizado na rodada de compliance).

## Labels

next-intl. Locale de referência pt-BR:

- `src/messages/pt-BR.json`
- `src/messages/en.json`
- `src/messages/es.json`

A landing usa o namespace `landing`. Recuperação de nsec: `recover`. Painel e sessões: as restantes chaves do mesmo JSON. A página `src/app/page.tsx` não tem frases soltas de marketing; lê estas chaves.

## Landing (pt-BR)

| Key | Texto |
|-----|-------|
| landing.hero.title | O teu bunker NIP-46. |
| landing.hero.body | O servidor guarda a nsec cifrada. Ao desbloquear com a sua passphrase, ela é decifrada em memória no servidor para assinar, e some quando o serviço reinicia. |
| landing.hero.ctaPrimary | Começar |
| landing.how.step3Body | Liga ao relay BitMacro para pedidos de assinatura. A assinatura pára quando o serviço reinicia, até novo desbloqueio. |
| landing.compare.features.twentyFourSeven | Assinatura enquanto o bunker está desbloqueado |
| landing.compare.features.zeroKnowledgeHosted | Cofre cifrado no servidor *(só o id interno; o rótulo UI não diz “zero-knowledge”)* |
| recover.subtitle | Precisas do JSON/QR do PDF e da passphrase com que encriptaste o cofre. O PDF sozinho não chega. Nada é enviado aos servidores BitMacro. |
| recover.warningBody | Qualquer pessoa com esta nsec pode assinar em teu nome. Não a partilhes nem a guardes na cloud em claro. |
| recover layout meta | Desencripta localmente o JSON do backup BitMacro Signer. A decifragem acontece só no seu browser. |

## JSON-LD (`src/components/seo-json-ld.tsx`)

Descrição: bunker NIP-46; nsec cifrada no servidor, decifrada em memória para assinar. Cofre encriptado no browser, integração com BitMacro Identity.

Não há preço nesta landing. A promessa central é factual: a nsec fica cifrada no servidor e é decifrada em memória para assinar; a recuperação offline não envia o segredo aos servidores BitMacro.
