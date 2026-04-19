import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel",
  description:
    "Painel BitMacro Signer: sessão do bunker NIP-46, cofre, QR Nostr Connect e ligação a apps. Remote signing sem expor nsec.",
  openGraph: {
    title: "Panel · BitMacro Signer",
    description:
      "Desbloquear o cofre e gerar ligação NIP-46 para as tuas apps Nostr.",
    url: "https://signer.bitmacro.io/panel",
  },
};

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
