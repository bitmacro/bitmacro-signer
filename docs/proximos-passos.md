# Próximos passos do BitMacro Signer

A 1.0.0 fecha as melhorias de segurança da auditoria de 21 de novembro de 2026. Shamir e 2FA ficam para a linha 1.0.x. Este ficheiro diz a ordem do que falta e porque esses dois existem.

## Porque Shamir

O cofre e o PDF de backup são o mesmo blob cifrado. A passphrase é a única coisa que o abre. Se a esqueceres, ou se o único PDF se perder, a nsec não se recupera. Não há segundo exemplar da chave no servidor: o daemon só a tem em RAM depois do desbloqueio.

Shamir Secret Sharing parte um segredo em várias partes. Com um esquema de 2 em 3, por exemplo, duas partes chegam para reconstruir a passphrase ou a nsec, e uma parte sozinha não chega. Podes deixar uma em casa, outra fora de casa e outra com uma pessoa de confiança. O backup deixa de depender de um único papel e de uma única memória.

Isto não protege o desbloqueio do site. Protege o dia em que a passphrase ou o PDF deixam de existir.

## Porque 2FA

O painel está na internet. Quem souber o npub e a passphrase pode pedir o desbloqueio e o servidor decifra o cofre. O limite de tentativas atrasa uma adivinhação. Não impede quem já conhece a passphrase, por ter visto o ecrã ou por uma página falsa.

O 2FA é um segundo fator no desbloqueio, por exemplo um código que muda, exigido pela API antes de decifrar. A passphrase sozinha deixa de abrir o bunker.

Também tem um limite: se alguém levar a base de dados e a passphrase, o 2FA não entra nessa cópia. O blob continua a abrir com a passphrase. O 2FA protege a porta do site. O Shamir protege a recuperação quando a passphrase se perde. São problemas diferentes.

## Na linha 1.0.x

Por esta ordem, depois da 1.0.0 estar no ar:

1. O painel deixa de dizer que a sessão está activa quando o bunker está parado, e deixa de dizer que o servidor reiniciou quando foi o temporizador da RAM.
2. Alerta no Grafana para «bunker parado» e «RAM TTL expired». Com o Grafana actual, o aviso aparece dentro do Grafana. Não há email nem push configurados.
3. Shamir, como recuperação do segredo.
4. 2FA no desbloqueio.
5. O resto do hardening já previsto: PBKDF2 num Web Worker para o telemóvel não bloquear, segunda região dos relays, ping NIP-46 no healthcheck, políticas RLS e builds reproduzíveis com página `/verify`.
