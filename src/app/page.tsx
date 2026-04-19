"use client";

import {
  ArrowRight,
  Check,
  Github,
  KeyRound,
  Lock,
  Plug,
  QrCode,
  Server,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignerBuildStamp } from "@/components/signer-build-stamp";
import {
  type CompareCellDef,
  type CompareRowDef,
  COMPARISON_ROW_DEFS,
} from "@/lib/compare-table-data";

const GITHUB_REPO = "https://github.com/bitmacro/bitmacro-signer";
const BITMACRO_HOME = "https://bitmacro.io";

const DOCKER_SNIPPET = `cp .env.example .env
# Edit required variables (Supabase, NEXT_PUBLIC_APP_URL, relay)
docker compose up --build`;

const COMPARE_PILL =
  "inline-flex max-w-full items-center rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-xs font-medium leading-tight text-muted-foreground";

function CompareCellContent({
  cell,
  t,
}: {
  cell: CompareCellDef;
  t: (key: string) => string;
}) {
  switch (cell.kind) {
    case "yes":
      return <Check className="size-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />;
    case "no":
      return <X className="size-4 shrink-0 text-red-400" strokeWidth={2.5} aria-hidden />;
    case "partial":
      return <span className={COMPARE_PILL}>{t("partial")}</span>;
    case "pill":
      return (
        <span className={COMPARE_PILL} title={t(`pills.${cell.id}`)}>
          {t(`pills.${cell.id}`)}
        </span>
      );
    case "yesPhase2":
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <Check className="size-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />
          <span className={COMPARE_PILL}>{t("phase2")}</span>
        </span>
      );
    case "yesPill":
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <Check className="size-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />
          <span className={`${COMPARE_PILL} font-mono text-[11px] sm:text-xs`}>{cell.pill}</span>
        </span>
      );
    default:
      return null;
  }
}

function Header() {
  const t = useTranslations("landing.nav");
  const tc = useTranslations("common");

  return (
    <header className="landing-content border-b border-border/80 bg-background/55 backdrop-blur-sm">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 items-center gap-2.5 py-2 text-base font-semibold tracking-tight text-foreground sm:text-[15px]"
        >
          <Image
            src="/bitmacro-logo.png"
            alt={tc("brand")}
            width={36}
            height={36}
            className="size-9 shrink-0 object-contain"
            priority
          />
          <span className="truncate">{tc("brand")}</span>
        </Link>
        <nav className="flex max-w-[min(100%,24rem)] flex-wrap items-center justify-end gap-x-1 gap-y-2 text-sm sm:max-w-none sm:gap-x-2 sm:text-sm">
          <a
            href="#how-it-works"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            {t("howItWorks")}
          </a>
          <a
            href="#compare"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            {t("compare")}
          </a>
          <a
            href="#self-host"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            {t("selfHost")}
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <Github className="size-4 shrink-0" aria-hidden />
            {t("github")}
          </a>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  const t = useTranslations("landing.hero");

  return (
    <section className="landing-content px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 md:pb-28 md:pt-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
            {t("eyebrow1")}
          </p>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
            {t("eyebrow2")}
          </p>
        </div>
        <h1 className="mb-5 max-w-3xl text-[clamp(1.75rem,5.2vw+0.85rem,2.75rem)] font-bold leading-[1.15] tracking-tight text-foreground md:text-[2.5rem] lg:text-[2.75rem]">
          {t("title")}
        </h1>
        <p className="mb-10 max-w-2xl text-base leading-[1.5] text-muted-foreground md:text-[17px] md:leading-[1.55]">
          {t("body")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/panel"
            className="glow-primary hover:glow-primary-strong bm-btn-primary hover:scale-[1.01] active:scale-[0.99]"
          >
            {t("ctaPrimary")}
            <ArrowRight className="size-5 shrink-0" aria-hidden />
          </Link>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="bm-btn-secondary font-semibold"
          >
            <Github className="size-5 shrink-0" aria-hidden />
            {t("ctaSecondary")}
          </a>
        </div>
        <p className="mt-8 max-w-xl text-sm leading-[1.5] text-muted-foreground">
          {t("infraLead")}{" "}
          <a
            href="#self-host"
            className="font-medium text-primary underline-offset-2 transition-colors hover:underline"
          >
            {t("infraLink")}
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("landing.how");

  const steps = [
    { icon: KeyRound, title: t("step1Title"), body: t("step1Body") },
    { icon: QrCode, title: t("step2Title"), body: t("step2Body") },
    { icon: Plug, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <section
      id="how-it-works"
      className="section-glow-divider relative border-t border-border/60 px-5 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-24"
    >
      <div className="landing-content mx-auto max-w-6xl">
        <h2 className="mb-3 text-[clamp(1.375rem,3vw+0.75rem,1.75rem)] font-bold tracking-tight text-foreground md:text-[28px]">
          {t("title")}
        </h2>
        <p className="mb-10 max-w-2xl text-base leading-[1.5] text-muted-foreground md:mb-12">
          {t("subtitle")}
        </p>
        <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <div className="glass-card elevation-1 hover:border-primary/25 group rounded-2xl border border-border/80 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg md:p-6">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary transition-transform duration-300 group-hover:scale-105">
                  <Icon className="size-5" aria-hidden />
                </div>
                <p className="mb-1 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mb-2 text-lg font-semibold leading-snug text-foreground">{title}</h3>
                <p className="text-base leading-[1.5] text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ComparisonTable() {
  const t = useTranslations("landing.compare");
  const signerCol =
    "border-b border-border bg-[rgba(0,102,255,0.09)] px-3 py-3 align-middle transition-colors duration-150 max-md:min-w-[7.5rem] group-hover:bg-[rgba(0,102,255,0.14)]";
  const stdCol = "border-b border-border px-3 py-3 align-middle text-center max-md:min-w-[6rem]";
  const featureCol =
    "border-b border-border px-3 py-3 align-middle text-left text-sm font-medium leading-snug text-foreground max-md:min-w-[12rem] md:text-[15px]";

  return (
    <section
      id="compare"
      className="section-glow-divider relative border-t border-border/60 px-5 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-24"
    >
      <div className="landing-content mx-auto max-w-6xl">
        <h2 className="mb-3 text-[clamp(1.375rem,3vw+0.75rem,1.75rem)] font-bold tracking-tight text-foreground md:text-[28px]">
          {t("title")}
        </h2>
        <p className="mb-10 max-w-2xl text-base leading-[1.5] text-muted-foreground">{t("intro")}</p>
        <div className="glass-card elevation-1 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm md:text-[15px]">
            <thead>
              <tr className="bg-secondary/80">
                <th
                  scope="col"
                  className="border-b border-border px-3 py-4 text-left text-sm font-semibold text-muted-foreground"
                >
                  {t("featureCol")}
                </th>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-4 text-center text-sm font-semibold text-foreground"
                >
                  {t("amber")}
                </th>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-4 text-center text-sm font-semibold text-foreground"
                >
                  {t("alby")}
                </th>
                <th
                  scope="col"
                  className="border-b border-border bg-[rgba(0,102,255,0.09)] px-3 py-4 text-center align-bottom text-sm font-semibold text-foreground"
                >
                  <span className="mb-2 inline-flex rounded-full border border-blue-500/35 bg-blue-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blue-200 sm:text-xs">
                    {t("recommended")}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-foreground sm:text-base">
                    {t("signerProduct")}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROW_DEFS.map((row, idx) => {
                if (row.type === "category") {
                  const cat = row.id;
                  return (
                    <tr key={`cat-${cat}`} className="bg-muted/25">
                      <td
                        colSpan={4}
                        className="border-b border-border px-3 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {t(`categories.${cat}`)}
                      </td>
                    </tr>
                  );
                }
                const r = row as Extract<CompareRowDef, { type: "row" }>;
                const rk = `row-${r.featureId}-${idx}`;
                return (
                  <tr
                    key={rk}
                    className="group transition-colors duration-150 hover:bg-muted/25"
                  >
                    <th scope="row" className={featureCol}>
                      <span className="block">{t(`features.${r.featureId}`)}</span>
                      {r.detailId ? (
                        <span className="mt-1 block text-sm font-normal leading-[1.5] text-muted-foreground">
                          {t(`details.${r.detailId}`)}
                        </span>
                      ) : null}
                    </th>
                    <td className={stdCol}>
                      <div className="flex justify-center">
                        <CompareCellContent cell={r.amber} t={t} />
                      </div>
                    </td>
                    <td className={stdCol}>
                      <div className="flex justify-center">
                        <CompareCellContent cell={r.alby} t={t} />
                      </div>
                    </td>
                    <td className={signerCol}>
                      <div className="flex justify-center">
                        <CompareCellContent cell={r.signer} t={t} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 space-y-3 text-sm leading-[1.5] text-muted-foreground">
          <p>
            <span className="font-medium text-foreground/90">{t("phase2")}</span> {t("footnotePhase2")}
          </p>
          <p>{t("footnoteDisclaimer")}</p>
        </div>
      </div>
    </section>
  );
}

function SelfHost() {
  const t = useTranslations("landing.selfHost");

  return (
    <section
      id="self-host"
      className="section-glow-divider relative border-t border-border/60 px-5 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-24"
    >
      <div className="landing-content mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
          <div>
            <div className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
              <Server className="size-4 shrink-0 text-primary" aria-hidden />
              {t("badge")}
            </div>
            <h2 className="mb-3 text-[clamp(1.375rem,3vw+0.75rem,1.75rem)] font-bold tracking-tight text-foreground md:text-[28px]">
              {t("title")}
            </h2>
            <p className="mb-6 text-base leading-[1.5] text-muted-foreground">
              {t("body")}
            </p>
            <ul className="mb-8 space-y-4 text-base leading-[1.5] text-muted-foreground">
              <li className="flex gap-3">
                <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>{t("bullet1")}</span>
              </li>
              <li className="flex gap-3">
                <Server className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>{t("bullet2")}</span>
              </li>
            </ul>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-md text-base font-semibold text-primary underline-offset-2 transition-colors hover:underline"
            >
              {t("githubLink")}
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </a>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 elevation-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <span className="font-mono text-xs text-muted-foreground">{t("terminal")}</span>
              <span className="font-mono text-xs text-muted-foreground">{t("bash")}</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-[1.55] text-foreground/95 md:text-[15px]">
              <code>{DOCKER_SNIPPET}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const t = useTranslations("landing.footer");

  return (
    <footer className="landing-content border-t border-border/80 px-5 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col items-center justify-center gap-3 border-b border-border/60 pb-6">
          <SignerBuildStamp tone="landing" className="justify-center" />
        </div>
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row sm:items-start">
          <p className="text-center text-sm leading-[1.5] text-muted-foreground sm:text-left">
            © {new Date().getFullYear()}{" "}
            <a href={BITMACRO_HOME} className="footer-link font-semibold text-foreground/95">
              BitMacro
            </a>
            {" · "}
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              GitHub
            </a>
            {" · "}
            <span className="text-muted-foreground">{t("mit")}</span>
          </p>
          <p className="text-center text-sm leading-normal text-muted-foreground sm:text-right">
            {t("tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="bg-landing-premium min-h-screen">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <ComparisonTable />
        <SelfHost />
      </main>
      <Footer />
    </div>
  );
}
