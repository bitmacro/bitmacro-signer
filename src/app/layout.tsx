import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const fontSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080808" },
    { media: "(prefers-color-scheme: light)", color: "#080808" },
  ],
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: "BitMacro Signer",
    template: "%s · BitMacro Signer",
  },
  description:
    "Bunker NIP-46 gerido pela BitMacro — assinatura remota Nostr sem expor a nsec ao servidor.",
  applicationName: "BitMacro Signer",
  metadataBase: new URL("https://signer.bitmacro.io"),
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/favicon_io/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/favicon_io/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/icons/favicon_io/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/favicon_io/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: "/icons/favicon_io/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    title: "BitMacro Signer",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "BitMacro Signer",
    description:
      "Bunker NIP-46 gerido — cofre encriptado, assinatura remota via relay BitMacro.",
    url: "https://signer.bitmacro.io",
    siteName: "BitMacro Signer",
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BitMacro Signer",
    description:
      "Bunker NIP-46 gerido — cofre encriptado, assinatura remota via relay BitMacro.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${fontSans.variable} ${fontMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
