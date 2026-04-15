import { ImageResponse } from "next/og";

export const alt = "BitMacro Signer — bunker NIP-46 gerido";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#0d0f14",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0, 102, 255, 0.14) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(0, 102, 255, 0.08) 0%, transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            paddingLeft: 72,
            paddingRight: 72,
            alignItems: "center",
            gap: 36,
          }}
        >
          <div
            style={{
              width: 8,
              alignSelf: "stretch",
              minHeight: 200,
              borderRadius: 4,
              background: "linear-gradient(180deg, #0066ff 0%, #0047b3 100%)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(136, 146, 164, 0.95)",
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              }}
            >
              BitMacro
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 64,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: "#e2e6f0",
                fontFamily:
                  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
              }}
            >
              BitMacro Signer
            </p>
            <p
              style={{
                margin: 0,
                maxWidth: 720,
                fontSize: 26,
                lineHeight: 1.45,
                color: "rgba(136, 146, 164, 0.98)",
                fontFamily:
                  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
              }}
            >
              Bunker NIP-46 gerido · assinatura remota sem expor a nsec
            </p>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
