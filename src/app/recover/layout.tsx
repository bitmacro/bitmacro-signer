import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar nsec",
  description:
    "Desencripta localmente o JSON do backup BitMacro Signer. A decifragem acontece só no seu browser.",
  robots: { index: true, follow: true },
};

export default function RecoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
