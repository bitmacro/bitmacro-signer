import type { AppLocale } from "@/lib/local-preferences";

export type SignerAssistantUiStrings = {
  title: string;
  subtitle: string;
  placeholder: string;
  send: string;
  thinking: string;
  learnMore: string;
  openAssistant: string;
  close: string;
  dialogLabel: string;
  srToggle: string;
  errorNetwork: string;
  errorBadResponse: string;
  errorTimeout: string;
  notifyEmailPlaceholder: string;
  notifyMe: string;
  notifySending: string;
  notifyThanks: string;
};

const UI: Record<AppLocale, SignerAssistantUiStrings> = {
  "pt-BR": {
    title: "Assistente BitMacro Signer",
    subtitle:
      "Pergunta sobre o bunker NIP-46, cofre, backup e sessões. Respostas com base na documentação.",
    placeholder: "Em que posso ajudar?",
    send: "Enviar",
    thinking: "A pensar…",
    learnMore: "Fontes",
    openAssistant: "Abrir assistente Signer",
    close: "Fechar",
    dialogLabel: "Assistente BitMacro Signer",
    srToggle: "Assistente BitMacro Signer",
    errorNetwork: "Não foi possível contactar o servidor.",
    errorBadResponse:
      "Resposta inválida do servidor. Tenta atualizar a página ou verifica o proxy (504).",
    errorTimeout: "O pedido demorou demasiado. Verifica rede/OpenAI ou OPENAI_BASE_URL.",
    notifyEmailPlaceholder: "Email (opcional)",
    notifyMe: "Notifica-me",
    notifySending: "A enviar…",
    notifyThanks: "Obrigado. Entraremos em contacto se for possível.",
  },
  en: {
    title: "BitMacro Signer assistant",
    subtitle:
      "Ask about the NIP-46 bunker, vault, backup PDF, and sessions. Answers are documentation-based.",
    placeholder: "How can I help?",
    send: "Send",
    thinking: "Thinking…",
    learnMore: "Sources",
    openAssistant: "Open Signer assistant",
    close: "Close",
    dialogLabel: "BitMacro Signer assistant",
    srToggle: "BitMacro Signer assistant",
    errorNetwork: "Could not reach the server.",
    errorBadResponse:
      "Invalid server response. Try refreshing or check the proxy (504).",
    errorTimeout: "Request timed out. Check network/OpenAI or OPENAI_BASE_URL.",
    notifyEmailPlaceholder: "Email (optional)",
    notifyMe: "Notify me",
    notifySending: "Sending…",
    notifyThanks: "Thank you. We'll reach out if we can.",
  },
  es: {
    title: "Asistente BitMacro Signer",
    subtitle:
      "Pregunta por el bunker NIP-46, cofre, PDF de backup y sesiones. Respuestas basadas en la documentación.",
    placeholder: "¿En qué puedo ayudarte?",
    send: "Enviar",
    thinking: "Pensando…",
    learnMore: "Fuentes",
    openAssistant: "Abrir asistente Signer",
    close: "Cerrar",
    dialogLabel: "Asistente BitMacro Signer",
    srToggle: "Asistente BitMacro Signer",
    errorNetwork: "No fue posible contactar con el servidor.",
    errorBadResponse:
      "Respuesta inválida del servidor. Actualiza la página o revisa el proxy (504).",
    errorTimeout: "Tiempo de espera agotado. Revisa red/OpenAI u OPENAI_BASE_URL.",
    notifyEmailPlaceholder: "Correo (opcional)",
    notifyMe: "Notificarme",
    notifySending: "Enviando…",
    notifyThanks: "Gracias. Te contactaremos si podemos.",
  },
};

export function getSignerAssistantUi(locale: AppLocale): SignerAssistantUiStrings {
  return UI[locale];
}
