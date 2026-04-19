"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  SIGNER_PACKAGE_VERSION,
  SIGNER_REPOSITORY_URL,
} from "@/lib/signer-version";

type BuildInfoJson = {
  version?: string;
  commit?: string | null;
  commitShort?: string | null;
  verifyUrl?: string;
};

type Props = {
  /** Tighter padding for headers; default for footers. */
  variant?: "default" | "compact";
  /** Use token colours from the marketing landing theme (footer). */
  tone?: "app" | "landing";
  className?: string;
};

/**
 * Shows deployed module semver (from build) and optional git commit from `/api/build-info`
 * so users can match the running app to a public GitHub revision.
 */
export function SignerBuildStamp({
  variant = "default",
  tone = "app",
  className = "",
}: Props) {
  const t = useTranslations("buildStamp");
  const [info, setInfo] = useState<BuildInfoJson | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "done" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/build-info", { cache: "no-store" });
        const j = (await r.json()) as BuildInfoJson;
        if (!cancelled) {
          setInfo(j);
          setLoadState("done");
        }
      } catch {
        if (!cancelled) {
          setLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const version = info?.version ?? SIGNER_PACKAGE_VERSION;
  const commitShort = info?.commitShort ?? null;
  const verifyUrl =
    info?.verifyUrl ??
    (info?.commit
      ? `${SIGNER_REPOSITORY_URL}/commit/${info.commit}`
      : `${SIGNER_REPOSITORY_URL}/tree/main`);

  const pad = variant === "compact" ? "px-2 py-1" : "px-2.5 py-1.5";
  const textSize = variant === "compact" ? "text-[10px] sm:text-[11px]" : "text-[11px]";

  const badgeTone =
    tone === "landing"
      ? "border-border bg-secondary/80 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
      : "border-zinc-700/90 bg-zinc-950/80 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100";
  const prefixTone = tone === "landing" ? "text-muted-foreground" : "text-zinc-500";
  const verTone = tone === "landing" ? "text-foreground" : "text-zinc-100";
  const mutedTone = tone === "landing" ? "text-muted-foreground/80" : "text-zinc-600";
  const hashTone =
    tone === "landing" ? "text-emerald-600 dark:text-emerald-400/95" : "text-emerald-400/95";
  const linkTone =
    tone === "landing"
      ? "text-muted-foreground hover:text-foreground"
      : "text-zinc-500 hover:text-zinc-300";

  const title = t("title");

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}
    >
      <a
        href={verifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-mono ${textSize} rounded-md border ${pad} transition-colors ${badgeTone}`}
        title={title}
      >
        <span className={prefixTone}>{t("prefix")}</span>{" "}
        <span className={verTone}>v{version}</span>
        {commitShort ? (
          <>
            <span className={mutedTone} aria-hidden>
              {" "}
              ·{" "}
            </span>
            <span className={hashTone} translate="no">
              {commitShort}
            </span>
          </>
        ) : loadState === "loading" ? (
          <span className={mutedTone}> · …</span>
        ) : null}
      </a>
      <a
        href={SIGNER_REPOSITORY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${textSize} font-medium underline-offset-2 hover:underline ${linkTone}`}
      >
        {t("sourceLink")}
      </a>
      {loadState === "error" ? (
        <span className={`${textSize} text-amber-600 dark:text-amber-500/90`} role="status">
          {t("metaUnavailable")}
        </span>
      ) : null}
    </div>
  );
}
