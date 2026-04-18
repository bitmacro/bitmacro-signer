import type { MetadataRoute } from "next";

const BASE = "https://signer.bitmacro.io";

/**
 * URLs públicas indexáveis (landing, onboarding, sessões).
 * APIs e rotas auth não entram — não são páginas de conteúdo para SEO.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/onboarding`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/sessions`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
  ];
}
