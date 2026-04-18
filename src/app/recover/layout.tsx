import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar nsec",
  description:
    "Desencripta localmente o JSON do backup BitMacro Signer (zero-knowledge). A passphrase não sai do teu browser.",
  robots: { index: true, follow: true },
};

export default function RecoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
