/**
 * Intenção: política robots para produção (permitir indexação da landing pública; restringir rotas privadas se necessário).
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
  };
}
