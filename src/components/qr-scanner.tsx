"use client";

import type { Result } from "react-zxing";
import { Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useZxing } from "react-zxing";

type QrScannerProps = {
  onScan: (uri: string) => void;
  onClose: () => void;
};

const ACCENT = "#0066FF";

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const t = useTranslations("onboarding.step3");
  const [warmingUp, setWarmingUp] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleDecode = useCallback(
    (result: Result) => {
      const text = result.getText().trim();
      if (!text.toLowerCase().startsWith("nostrconnect://")) return;
      onScan(text);
      onClose();
    },
    [onScan, onClose],
  );

  const handleStreamError = useCallback((err: unknown) => {
    setWarmingUp(false);
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      setPermissionDenied(true);
      return;
    }
    if (err instanceof Error && /permission|denied|not allowed/i.test(err.message)) {
      setPermissionDenied(true);
    }
  }, []);

  const { ref } = useZxing({
    onDecodeResult: handleDecode,
    onError: handleStreamError,
    constraints: {
      audio: false,
      video: { facingMode: "environment" },
    },
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <h2 id="qr-scanner-title" className="text-base font-semibold text-white">
          {t("scanQrTitle")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-600 text-zinc-200 hover:bg-zinc-800"
          aria-label={t("scanQrClose")}
        >
          <X className="size-6" aria-hidden />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6">
        {permissionDenied ? (
          <p className="max-w-md text-center text-base leading-relaxed text-amber-100">
            {t("scanQrCameraDenied")}
          </p>
        ) : (
          <>
            <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-zinc-700 bg-black">
              <video
                ref={ref}
                className="aspect-square w-full object-cover"
                muted
                playsInline
                onLoadedData={() => setWarmingUp(false)}
                onPlaying={() => setWarmingUp(false)}
              />
              {warmingUp ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
                  <Loader2 className="size-10 animate-spin text-white" aria-hidden />
                  <span className="text-sm font-medium text-zinc-200">
                    {t("scanQrLoading")}
                  </span>
                </div>
              ) : null}
            </div>
            <p className="mt-4 max-w-md text-center text-sm text-zinc-400">
              {t("scanQrHint")}
            </p>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          {t("scanQrClose")}
        </button>
      </div>
    </div>
  );
}

/** True when the browser can request a camera stream (hide scan UI otherwise). */
export function hasGetUserMedia(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}
