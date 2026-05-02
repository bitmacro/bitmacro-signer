/** @type {import('next').NextConfig} */
// `output: "standalone"` for minimal Docker image; tune headers/CSP when auth hardens.
//
// Prevent CDN/reverse-proxy caching of HTML/RSC payloads: stale documents keep pointing at old
// `/_next/static/*` chunk hashes, so users see ancient UI while `/api/build-info` on origin is new.
const nextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/((?!api/|_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value:
              "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
