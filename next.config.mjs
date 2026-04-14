/** @type {import('next').NextConfig} */
// Intenção: `output: "standalone"` para imagem Docker mínima; ajustar headers/CSP quando houver auth e APIs.
const nextConfig = {
  output: "standalone",
  images: { unoptimized: true },
};

export default nextConfig;
