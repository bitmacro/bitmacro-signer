import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  description:
    "Activar o bunker NIP-46 BitMacro: desbloquear cofre, gerar QR Nostr Connect e ligar apps (Primal, Coracle, Nostrudel). Assinatura remota sem expor nsec.",
  openGraph: {
    title: "Onboarding · BitMacro Signer",
    description:
      "Desbloquear o cofre e gerar ligação NIP-46 para as tuas apps Nostr.",
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
