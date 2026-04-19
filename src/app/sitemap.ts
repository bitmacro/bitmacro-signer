import type { MetadataRoute } from "next";



import { getPublicSiteUrl } from "@/lib/public-site-url";



/**

 * URLs públicas indexáveis (landing, painel bunker, recuperar, sessões).

 */

export default function sitemap(): MetadataRoute.Sitemap {

  const base = getPublicSiteUrl();

  const now = new Date();

  return [

    {

      url: base,

      lastModified: now,

      changeFrequency: "weekly",

      priority: 1,

    },

    {

      url: `${base}/panel`,

      lastModified: now,

      changeFrequency: "monthly",

      priority: 0.9,

    },

    {

      url: `${base}/recover`,

      lastModified: now,

      changeFrequency: "monthly",

      priority: 0.7,

    },

    {

      url: `${base}/sessions`,

      lastModified: now,

      changeFrequency: "monthly",

      priority: 0.75,

    },

  ];

}

