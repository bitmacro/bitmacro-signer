/**
 * JSON-LD para rich results (SoftwareApplication + WebSite) — Google Search.
 */
import { getPublicSiteUrl } from "@/lib/public-site-url";

export function SeoJsonLd() {
  const base = getPublicSiteUrl();

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${base}/#software`,
        name: "BitMacro Signer",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
        description:
          "Bunker NIP-46 gerido pela BitMacro: assinatura remota Nostr (Nostr Connect) sem expor nsec no servidor. Cofre encriptado no browser, integração com BitMacro Identity.",
        url: base,
        author: {
          "@type": "Organization",
          name: "BitMacro",
          url: "https://bitmacro.io",
        },
        featureList: [
          "NIP-46 remote signing (Nostr Connect)",
          "Encrypted vault (AES-GCM, client-side)",
          "BitMacro Identity integration",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: "BitMacro Signer",
        url: base,
        publisher: {
          "@type": "Organization",
          name: "BitMacro",
          url: "https://bitmacro.io",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
