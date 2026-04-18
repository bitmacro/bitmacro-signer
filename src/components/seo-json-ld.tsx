/**
 * JSON-LD para rich results (SoftwareApplication) — Google Search.
 */
const BASE = "https://signer.bitmacro.io";

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
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
  url: BASE,
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
};

export function SeoJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
