import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  description:
    "Activar o bunker NIP-46 BitMacro: desbloquear cofre, gerar QR Nostr Connect e ligar apps (Nostrudel, Coracle). Assinatura remota sem expor nsec.",
  openGraph: {
    title: "Onboarding · BitMacro Signer",
    description:
      "Passos para activar o bunker NIP-46 e sessão com as tuas apps Nostr.",
    url: "https://signer.bitmacro.io/onboarding",
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
