import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { htmlLangAttribute } from "@/lib/locale-ui";
import {
  BITMACRO_LOCALE_COOKIE,
  LEGACY_LOCALE_COOKIE_NAME,
  resolveInitialLocale,
} from "@/lib/local-preferences";
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

const SIGNER_SEO_DESCRIPTION =
  "BitMacro Signer — bunker NIP-46 gerido: Nostr Connect, assinatura remota sem expor nsec no servidor. Cofre encriptado (AES-GCM), relay BitMacro, integração BitMacro Identity. Remote Nostr signing, encrypted vault.";

export const metadata: Metadata = {
  title: {
    default: "BitMacro Signer — Bunker NIP-46 | Nostr Connect",
    template: "%s · BitMacro Signer",
  },
  description: SIGNER_SEO_DESCRIPTION,
  applicationName: "BitMacro Signer",
  metadataBase: new URL("https://signer.bitmacro.io"),
  manifest: "/site.webmanifest",
  keywords: [
    "Nostr Signer",
    "NIP-46",
    "Nostr Connect",
    "bunker Nostr",
    "remote signing",
    "BitMacro",
    "assinatura Nostr remota",
    "Nostr Identity",
    "nostr-tools",
  ],
  alternates: {
    canonical: "https://signer.bitmacro.io",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
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
    title: "BitMacro Signer — Bunker NIP-46 | Nostr Connect",
    description: SIGNER_SEO_DESCRIPTION,
    url: "https://signer.bitmacro.io",
    siteName: "BitMacro Signer",
    locale: "pt_PT",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BitMacro Signer — Bunker NIP-46",
    description: SIGNER_SEO_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const headerLocale = headerStore.get("x-bitmacro-locale");
  const initialLocale = resolveInitialLocale(
    headerLocale,
    cookieStore.get(BITMACRO_LOCALE_COOKIE)?.value,
    cookieStore.get(LEGACY_LOCALE_COOKIE_NAME)?.value,
  );
  const htmlLang = htmlLangAttribute(initialLocale);

  return (
    <html
      lang={htmlLang}
      className={`${fontSans.variable} ${fontMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <SeoJsonLd />
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
