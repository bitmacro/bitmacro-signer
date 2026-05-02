import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sessões activas",
  description:
    "Sessões NIP-46 autorizadas no BitMacro Signer: chaves de cliente, etiquetas e estado das ligações Nostr Connect.",
  openGraph: {
    title: "Sessões activas · BitMacro Signer",
    description:
      "Lista de sessões Nostr Connect (NIP-46) ligadas ao teu cofre.",
    url: "https://signer.bitmacro.io/sessions",
  },
};

export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
