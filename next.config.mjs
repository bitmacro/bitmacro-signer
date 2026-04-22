/** @type {import('next').NextConfig} */
// `output: "standalone"` for minimal Docker image; tune headers/CSP when auth hardens.
const nextConfig = {
  output: "standalone",
  images: { unoptimized: true },
};

export default nextConfig;
