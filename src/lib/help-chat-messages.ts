import type { HelpLocale } from "@/lib/help-locale";

export function msgTryLater(locale: HelpLocale): string {
  switch (locale) {
    case "en":
      return "We couldn't respond right now. Please try again in a moment.";
    case "es":
      return "No pudimos responder ahora. Vuelve a intentarlo en un momento.";
    default:
      return "Não conseguimos responder neste momento. Volta a tentar daqui a pouco.";
  }
}

/** Self-hosted: outbound HTTPS to OpenAI blocked or timing out (firewall, routing, ISP). */
export function msgOpenAiUnreachable(locale: HelpLocale): string {
  switch (locale) {
    case "en":
      return (
        "The app server could not reach the AI provider (network timeout). " +
        "From the host or container, check outbound HTTPS to api.openai.com, " +
        "or set OPENAI_BASE_URL to a reachable gateway (e.g. on your VPS). " +
        "Diagnostic: GET /api/help/network-check on the Signer host. See .env.example."
      );
    case "es":
      return (
        "El servidor de la aplicación no pudo conectar con el proveedor de IA (tiempo de espera). " +
        "Comprueba el HTTPS saliente hacia api.openai.com desde el host o el contenedor, " +
        "o define OPENAI_BASE_URL hacia una pasarela alcanzable. " +
        "Diagnóstico: GET /api/help/network-check en el Signer. Ver .env.example."
      );
    default:
      return (
        "O servidor da aplicação não conseguiu ligar ao fornecedor de IA (timeout de rede). " +
        "No host ou no contentor, verifica HTTPS de saída para api.openai.com, " +
        "ou define OPENAI_BASE_URL para um gateway acessível (ex.: na VPS). " +
        "Diagnóstico: GET /api/help/network-check no Signer. Vê .env.example."
      );
  }
}

export function msgBadJson(locale: HelpLocale): string {
  switch (locale) {
    case "en":
      return "We couldn't read your request. Refresh the page and try again.";
    case "es":
      return "No pudimos leer tu solicitud. Actualiza la página e inténtalo de nuevo.";
    default:
      return "Não conseguimos ler o teu pedido. Atualiza a página e tenta outra vez.";
  }
}

export function msgQuestionInvalid(locale: HelpLocale): string {
  switch (locale) {
    case "en":
      return "Enter a question (up to 4000 characters) and tap Send.";
    case "es":
      return "Escribe una pregunta (hasta 4000 caracteres) y pulsa Enviar.";
    default:
      return "Escreve uma pergunta (até 4000 caracteres) e carrega em Enviar.";
  }
}

export function msgNotInDocumentation(locale: HelpLocale): string {
  switch (locale) {
    case "en":
      return "I couldn't find an answer in the documentation.";
    case "es":
      return "No encontré respuesta en la documentación.";
    default:
      return "Não encontrei resposta na documentação.";
  }
}

export function msgNotifyInvalidEmail(locale: HelpLocale): string {
  switch (locale) {
    case "en":
      return "Enter a valid email address or leave the field empty.";
    case "es":
      return "Introduce un correo válido o deja el campo vacío.";
    default:
      return "Indica um email válido ou deixa o campo vazio.";
  }
}

export function msgNoAnswer(locale: HelpLocale): string {
  switch (locale) {
    case "en":
      return "Could not generate an answer.";
    case "es":
      return "No fue posible generar una respuesta.";
    default:
      return "Não foi possível gerar uma resposta.";
  }
}

/** When answering from global RAG (another product’s docs). */
export function crossProductSourceNote(
  locale: HelpLocale,
  productLabel: string,
  productUrl: string,
): string {
  switch (locale) {
    case "en":
      return (
        `This information comes from ${productLabel} documentation. ` +
        `Learn more at ${productUrl}. ` +
        `Answer from the excerpts below; mention this source if helpful.`
      );
    case "es":
      return (
        `Esta información procede de la documentación de ${productLabel}. ` +
        `Más información en ${productUrl}. ` +
        `Responde con los fragmentos siguientes; menciona la fuente si ayuda.`
      );
    default:
      return (
        `Esta informação é da documentação do produto ${productLabel}. ` +
        `Podes saber mais em ${productUrl}. ` +
        `Responde com base nos trechos abaixo; menciona a fonte se for útil.`
      );
  }
}

export function contextChunkLineWithProduct(
  locale: HelpLocale,
  index: number,
  row: {
    produto: string;
    fonte: string;
    titulo: string;
    conteudo: string;
  },
  showProductTag: boolean,
): string {
  const n = index + 1;
  const tag = showProductTag ? ` [${row.produto}]` : "";
  switch (locale) {
    case "en":
      return `### Excerpt ${n}${tag} (source: ${row.fonte} — ${row.titulo})\n${row.conteudo}`;
    case "es":
      return `### Fragmento ${n}${tag} (fuente: ${row.fonte} — ${row.titulo})\n${row.conteudo}`;
    default:
      return `### Trecho ${n}${tag} (fonte: ${row.fonte} — ${row.titulo})\n${row.conteudo}`;
  }
}

export function systemPrompt(locale: HelpLocale): string {
  switch (locale) {
    case "en":
      return (
        "You are the BitMacro Signer (signer.bitmacro.io) support assistant. " +
        "Answer only in English, based solely on the excerpts provided below. " +
        "Excerpts may include linked BitMacro product docs (e.g. Identity / NIP-05) when included in the list — use them if they answer the question. " +
        "If the answer is not in the excerpts, say clearly that it is not in the available documentation. " +
        "Mention the source file name when helpful. Be clear and concise. " +
        "Never ask the user to paste nsec or passwords."
      );
    case "es":
      return (
        "Eres el asistente de soporte de BitMacro Signer (signer.bitmacro.io). " +
        "Responde únicamente en español, basándote solo en los fragmentos proporcionados. " +
        "Los fragmentos pueden incluir documentación de otros productos BitMacro (p. ej. Identity / NIP-05) si aparecen en la lista — úsalos si responden a la pregunta. " +
        "Si la respuesta no está en los fragmentos, dilo claramente. " +
        "Menciona el archivo fuente cuando sea útil. Sé claro y conciso. " +
        "Nunca pidas que peguen nsec ni contraseñas."
      );
    default:
      return (
        "És o assistente de suporte BitMacro Signer (signer.bitmacro.io). " +
        "Responde unicamente em português com base nos trechos fornecidos. " +
        "Os trechos podem incluir documentação de outros produtos BitMacro (ex.: Identity / NIP-05) quando constam na lista — usa-os se responderem à pergunta. " +
        "Se a resposta não constar nos trechos, diz explicitamente que não está na documentação disponível. " +
        "Menciona a fonte (ficheiro) quando for útil. Sê claro e conciso. " +
        "Nunca peças para colar nsec nem passwords."
      );
  }
}

export function contextChunkLine(
  locale: HelpLocale,
  index: number,
  fonte: string,
  titulo: string,
  conteudo: string,
): string {
  const n = index + 1;
  switch (locale) {
    case "en":
      return `### Excerpt ${n} (source: ${fonte} — ${titulo})\n${conteudo}`;
    case "es":
      return `### Fragmento ${n} (fuente: ${fonte} — ${titulo})\n${conteudo}`;
    default:
      return `### Trecho ${n} (fonte: ${fonte} — ${titulo})\n${conteudo}`;
  }
}

export function userContextBlock(
  locale: HelpLocale,
  context: string,
  question: string,
): string {
  const labels = {
    "pt-BR": { excerpts: "Trechos", none: "(nenhum trecho recuperado)", q: "Pergunta" },
    en: { excerpts: "Excerpts", none: "(no excerpts retrieved)", q: "Question" },
    es: { excerpts: "Fragmentos", none: "(ningún fragmento recuperado)", q: "Pregunta" },
  }[locale];

  return `${labels.excerpts}:\n${context || labels.none}\n\n---\n${labels.q}: ${question}`;
}
