import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
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

export const metadata: Metadata = {
  title: {
    default: "BitMacro Signer",
    template: "%s · BitMacro Signer",
  },
  description:
    "BitMacro-managed NIP-46 bunker — remote Nostr signing without exposing nsec to the server.",
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
      "Managed NIP-46 bunker — encrypted vault, remote signing via BitMacro relay.",
    url: "https://signer.bitmacro.io",
    siteName: "BitMacro Signer",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BitMacro Signer",
    description:
      "Managed NIP-46 bunker — encrypted vault, remote signing via BitMacro relay.",
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
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
