/**
 * Robots policy for production (allow indexing the public landing; restrict private routes if needed).
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://signer.bitmacro.io/sitemap.xml",
    host: "https://signer.bitmacro.io",
  };
}
