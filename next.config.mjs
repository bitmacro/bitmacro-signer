/** @type {import('next').NextConfig} */
// `output: "standalone"` for minimal Docker image; tune headers/CSP when auth hardens.
const nextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  serverExternalPackages: [
    "pino",
    "pino-loki",
    "thread-stream",
    "pino-abstract-transport",
  ],
};

export default nextConfig;
