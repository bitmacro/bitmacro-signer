/**
 * Intenção: layout raíz — metadata do produto, `next-themes` / ThemeProvider, fontes e fundo coerente com o ecossistema.
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BitMacro Signer",
  description: "Managed NIP-46 bunker — remote signing without exposing nsec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
