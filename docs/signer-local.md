# Signer no computador

O BitMacro Signer que está em produção fica como está: bunker hospedado, painel em `signer.bitmacro.io`, chave em RAM no servidor depois do desbloqueio. Este ficheiro descreve o estado desse produto e um segundo produto, para quem quer a chave no próprio computador e mesmo assim usar o telemóvel e uma IA.

O nome abaixo, Signer Local, é de trabalho.

## Estado actual

Há dois processos.

O `signer-web` é o site. A pessoa desbloqueia no browser com a passphrase. O cofre está na Supabase, cifrado com AES-GCM. A passphrase não sai do browser. No desbloqueio o browser decifra o cofre e envia a nsec ao daemon, por HTTP interno, com um token.

O `signer-daemon` assina. Guarda a chave só em RAM. Fala NIP-46 com as apps (Primal, noStrudel e outras) através de relays, em eventos kind 24133 cifrados. Reiniciar o contentor apaga a chave. A pessoa desbloqueia outra vez.

As sessões limitam o que a app pode pedir. Por omissão: ler a chave pública e assinar kinds 1, 6 e 7. Cifrar e decifrar só se a pessoa marcou as caixas ao criar a sessão. Um `sign_event` de outro kind é recusado.

O telemóvel já entra hoje, sem instalar nada da BitMacro no telefone. O painel mostra um QR `bunker://` (chave pública, relay, secret de uso único). A app no telemóvel lê o QR. Também existe o caminho inverso: colar um `nostrconnect://` que a app mostra. Os dois lados encontram-se no relay. O telemóvel não precisa de estar na mesma rede que o servidor.

Docker, neste produto, é a forma de o correr no EQ14: imagens `signer-web` e `signer-daemon`. Serve o operador. Pede Supabase, token interno, relays e um desbloqueio no browser. A nsec atravessa do browser para o daemon.

Não há MCP. Nenhuma IA pede assinaturas por um canal próprio.

## O que um leigo precisaria

A chave fica no computador dele. A nsec não vai para um servidor da BitMacro e não entra numa ferramenta de IA. O telemóvel continua a publicar, a ler e a pedir assinaturas. Uma IA na mesma máquina, ou noutro sítio, pede operações Nostr e recebe o resultado assinado, com a mesma lista de permissões de uma app.

Correr as imagens actuais no Docker Desktop do Windows cumpre a frase «está no computador dele» e falha o resto. A pessoa teria de instalar Docker e WSL, preencher Supabase e tokens, e a nsec continuaria a sair do browser para um contentor. Quando o PC dorme ou o contentor reinicia, o bunker pára, como no servidor. Isso é ferramenta de operador.

## Sugestão

Um segundo produto: uma app de secretária, um processo, cofre num ficheiro local.

A app decifra o cofre no mesmo processo que assina. A nsec não atravessa HTTP, nem para `localhost`. A chave vive na RAM desse processo até a pessoa bloquear, até o processo sair, ou até o tempo da sessão. O ficheiro no disco é o blob cifrado, com a mesma ideia do cofre actual (AES-GCM, passphrase, salt). Não há Supabase nem service role.

A app não abre portas para a rede de casa. Só faz ligações de saída.

### Windows e as outras plataformas

A instalação é um programa: no Windows um instalador `.msi` ou `.exe`, no macOS um `.dmg`, no Linux um pacote. A pessoa abre, cria ou importa o cofre, escolhe uma passphrase, desbloqueia. Não instala Docker.

A casca multiplataforma recomendada é Tauri. Um projecto gera os três instaladores. O miolo de assinatura que já existe em TypeScript (o loop NIP-46, os scopes, a cifra do cofre) corre ao lado da janela, no mesmo programa. Reescrever esse miolo em Rust fica para o dia em que houver uma razão medida para isso.

O instalador de Windows precisa de assinatura de código, senão o SmartScreen assusta quem está a instalar. Isso faz parte do produto, não de um extra.

O telemóvel não guarda a chave nesta versão. iOS e Android matam processos em fundo e os backups da loja levam ficheiros para a nuvem do fabricante. O telefone é cliente. O computador é o bunker.

### Telemóvel

O QR é o mesmo `bunker://` que o painel já gera. A app local mostra o QR. A Primal ou o noStrudel no telemóvel lêem. O encontro é num relay que os dois alcançam, como hoje. Funciona em dados móveis, fora de casa, sem a pessoa abrir portas no router.

O computador tem de estar ligado e desbloqueado. É o custo de a chave não estar num servidor sempre aceso. O ecrã diz isso por extenso: bunker a correr neste computador, telemóvel ligado, ou bunker parado porque o programa fechou.

Um QR com o IP da rede local fica de fora. Só funciona no mesmo Wi-Fi e quebra quando o telefone muda de rede.

### IA

Duas portas, a mesma regra de scopes. Nenhuma das duas recebe a nsec.

Na mesma máquina, a app expõe um servidor MCP em `127.0.0.1`, com um token que só ela conhece. O Cursor, o Claude ou outro cliente MCP fala com esse endereço. As ferramentas são as operações Nostr já permitidas àquela sessão: ler a chave pública, assinar um evento de um kind autorizado, cifrar ou decifrar se a pessoa marcou. O modelo pede «assina este evento». O MCP entrega o pedido ao processo que tem a chave. A resposta é o evento assinado ou a recusa com o método e o kind. O conteúdo secreto da chave não é um argumento de ferramenta.

Fora da máquina, a IA é mais uma app NIP-46. Entra por QR ou por `nostrconnect://`, com uma sessão curta e kinds explícitos. O relay transporta o pedido cifrado, como a Primal. A pessoa vê essa sessão na lista e revoga-a como as outras.

A sessão da IA começa fechada nos kinds 1, 6 e 7, igual às apps. Kind 0, lista de relays, zaps, DMs e uploads pedem uma caixa marcada por essa sessão. O mesmo filtro que já existe no Signer hospedado.

## O que se reaproveita

Do Signer actual: o loop NIP-46, a cifra do cofre, a construção do `bunker://`, o `nostrconnect://`, e a lista de scopes. Mudam o sítio do ficheiro (disco local em vez de Supabase) e o sítio da chave (o processo da app, sem o POST interno do browser).

## O que não muda no produto hospedado

`signer.bitmacro.io` continua para quem quer o bunker aceso sem o computador ligado. O Signer Local não o substitui. Quem usar os dois tem dois cofres, ou importa o mesmo backup para os dois, e trata cada um como um sítio onde a chave pode estar em RAM. Não há sincronização de passphrase entre eles neste desenho.
