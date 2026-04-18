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

const GITHUB_REPO = "https://github.com/bitmacro/bitmacro-signer";
const BITMACRO_HOME = "https://bitmacro.io";

const DOCKER_SNIPPET = `cp .env.example .env
# Edit required variables (Supabase, NEXT_PUBLIC_APP_URL, relay)
docker compose up --build`;

function Header() {
  return (
    <header className="landing-content border-b border-border/80 bg-background/55 backdrop-blur-sm">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 items-center gap-2.5 py-2 text-base font-semibold tracking-tight text-foreground sm:text-[15px]"
        >
          <Image
            src="/bitmacro-logo.png"
            alt="BitMacro"
            width={36}
            height={36}
            className="size-9 shrink-0 object-contain"
            priority
          />
          <span className="truncate">BitMacro Signer</span>
        </Link>
        <nav className="flex max-w-[min(100%,20rem)] flex-wrap items-center justify-end gap-x-1 gap-y-2 text-sm sm:max-w-none sm:gap-x-2 sm:text-sm">
          <a
            href="#como-funciona"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            Como funciona
          </a>
          <a
            href="#comparacao"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            Comparação
          </a>
          <a
            href="#self-host"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            Self-host
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <Github className="size-4 shrink-0" aria-hidden />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="landing-content px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 md:pb-28 md:pt-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
            NIP-46 · Nostr Connect
          </p>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
            Bunker gerido · relay BitMacro
          </p>
        </div>
        <h1 className="mb-5 max-w-3xl text-[clamp(1.75rem,5.2vw+0.85rem,2.75rem)] font-bold leading-[1.15] tracking-tight text-foreground md:text-[2.5rem] lg:text-[2.75rem]">
          O teu bunker NIP-46, sempre disponível.
        </h1>
        <p className="mb-10 max-w-2xl text-base leading-[1.5] text-muted-foreground md:text-[17px] md:leading-[1.55]">
          Assina eventos Nostr à distância. A <span className="text-foreground/95">nsec</span>{" "}
          permanece encriptada no cofre; o servidor nunca a armazena em texto claro — apenas um
          blob cifrado, com sessão activa opcional em memória (TTL configurável).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/onboarding"
            className="glow-primary hover:glow-primary-strong bm-btn-primary hover:scale-[1.01] active:scale-[0.99]"
          >
            Começar grátis
            <ArrowRight className="size-5 shrink-0" aria-hidden />
          </Link>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="bm-btn-secondary font-semibold"
          >
            <Github className="size-5 shrink-0" aria-hidden />
            Ver no GitHub
          </a>
        </div>
        <p className="mt-8 max-w-xl text-sm leading-[1.5] text-muted-foreground">
          Para quem prefere controlar a infraestrutura:{" "}
          <a
            href="#self-host"
            className="font-medium text-primary underline-offset-2 transition-colors hover:underline"
          >
            Docker e repositório open source (MIT)
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: KeyRound,
      title: "Gera o keypair",
      body: "No browser, o cofre cria o par de chaves e prepara o URI Nostr Connect (NIP-46).",
    },
    {
      icon: QrCode,
      title: "Copia o QR",
      body: "Mostra o QR ou o bunker URI ao teu cliente Nostr (telefone ou desktop).",
    },
    {
      icon: Plug,
      title: "Cola no app Nostr",
      body: "Liga ao relay BitMacro para pedidos de assinatura estáveis, 24/7, sem expor a nsec.",
    },
  ];

  return (
    <section
      id="como-funciona"
      className="section-glow-divider relative border-t border-border/60 px-5 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-24"
    >
      <div className="landing-content mx-auto max-w-6xl">
        <h2 className="mb-3 text-[clamp(1.375rem,3vw+0.75rem,1.75rem)] font-bold tracking-tight text-foreground md:text-[28px]">
          Como funciona
        </h2>
        <p className="mb-10 max-w-2xl text-base leading-[1.5] text-muted-foreground md:mb-12">
          Três passos — do keypair à assinatura remota no ecossistema BitMacro.
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

type CompareCell =
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "pill"; text: string }
  | { kind: "partial" }
  | { kind: "yesPhase2" }
  | { kind: "yesPill"; pill: string };

type CompareCategoryRow = { type: "category"; title: string };

type CompareDataRow = {
  type: "row";
  feature: string;
  detail?: string;
  amber: CompareCell;
  alby: CompareCell;
  signer: CompareCell;
};

type CompareRow = CompareCategoryRow | CompareDataRow;

const COMPARE_PILL =
  "inline-flex max-w-full items-center rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-xs font-medium leading-tight text-muted-foreground";

function CompareCellContent({ cell }: { cell: CompareCell }) {
  switch (cell.kind) {
    case "yes":
      return <Check className="size-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />;
    case "no":
      return <X className="size-4 shrink-0 text-red-400" strokeWidth={2.5} aria-hidden />;
    case "partial":
      return <span className={COMPARE_PILL}>Parcial</span>;
    case "pill":
      return (
        <span className={COMPARE_PILL} title={cell.text}>
          {cell.text}
        </span>
      );
    case "yesPhase2":
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <Check className="size-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />
          <span className={COMPARE_PILL}>fase 2</span>
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

const COMPARISON_ROWS: CompareRow[] = [
  { type: "category", title: "Plataforma" },
  {
    type: "row",
    feature: "Dispositivos suportados",
    amber: { kind: "pill", text: "Android" },
    alby: { kind: "pill", text: "Desktop" },
    signer: { kind: "pill", text: "Qualquer" },
  },
  {
    type: "row",
    feature: "Sem instalação necessária",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Funciona em iOS",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Funciona sem extensão browser",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  { type: "category", title: "Identidade" },
  {
    type: "row",
    feature: "Geração de keypair integrada",
    amber: { kind: "yes" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "NIP-05 incluído no plano",
    amber: { kind: "no" },
    alby: { kind: "pill", text: "pago extra" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Lightning Address incluída",
    amber: { kind: "no" },
    alby: { kind: "pill", text: "pago extra" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Onboarding unificado",
    detail: "(keypair + NIP-05 + relay + bunker num único flow)",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  { type: "category", title: "Segurança" },
  {
    type: "row",
    feature: "nsec nunca exposta ao app",
    amber: { kind: "yes" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Client-side decrypt",
    amber: { kind: "yes" },
    alby: { kind: "partial" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Zero-knowledge no hosted",
    amber: { kind: "pill", text: "N/A" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Recuperação via Shamir SSS",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yesPhase2" },
  },
  {
    type: "row",
    feature: "Código auditável (open source)",
    amber: { kind: "yes" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Reproducible builds + hash",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yesPhase2" },
  },
  { type: "category", title: "Bunker NIP-46" },
  {
    type: "row",
    feature: "Bunker remoto NIP-46",
    amber: { kind: "yes" },
    alby: { kind: "partial" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "24/7 sem device ligado",
    amber: { kind: "no" },
    alby: { kind: "partial" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Policy automática de assinatura",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "TTL de sessão configurável",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Revogação de sessão imediata",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Log de assinaturas auditável",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Interface web de gestão",
    amber: { kind: "no" },
    alby: { kind: "partial" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "QR code do bunker URI",
    amber: { kind: "yes" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Managed hosted (sem ops)",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Self-host disponível (Docker)",
    amber: { kind: "yes" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  { type: "category", title: "Ecossistema" },
  {
    type: "row",
    feature: "Relay Nostr incluído",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Lightning integrado",
    amber: { kind: "no" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "Pagamentos nativos Lightning",
    amber: { kind: "no" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    feature: "SDK para developers",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yesPill", pill: "@bitmacro/relay-connect" },
  },
  {
    type: "row",
    feature: "Stack completo num produto",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
];

function ComparisonTable() {
  const signerCol =
    "border-b border-border bg-[rgba(0,102,255,0.09)] px-3 py-3 align-middle transition-colors duration-150 max-md:min-w-[7.5rem] group-hover:bg-[rgba(0,102,255,0.14)]";
  const stdCol = "border-b border-border px-3 py-3 align-middle text-center max-md:min-w-[6rem]";
  const featureCol =
    "border-b border-border px-3 py-3 align-middle text-left text-sm font-medium leading-snug text-foreground max-md:min-w-[12rem] md:text-[15px]";

  return (
    <section
      id="comparacao"
      className="section-glow-divider relative border-t border-border/60 px-5 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-24"
    >
      <div className="landing-content mx-auto max-w-6xl">
        <h2 className="mb-3 text-[clamp(1.375rem,3vw+0.75rem,1.75rem)] font-bold tracking-tight text-foreground md:text-[28px]">
          Comparação
        </h2>
        <p className="mb-10 max-w-2xl text-base leading-[1.5] text-muted-foreground">
          BitMacro Signer frente a soluções conhecidas no ecossistema Nostr — funcionalidades por
          categoria.
        </p>
        <div className="glass-card elevation-1 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm md:text-[15px]">
            <thead>
              <tr className="bg-secondary/80">
                <th
                  scope="col"
                  className="border-b border-border px-3 py-4 text-left text-sm font-semibold text-muted-foreground"
                >
                  Característica
                </th>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-4 text-center text-sm font-semibold text-foreground"
                >
                  Amber
                </th>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-4 text-center text-sm font-semibold text-foreground"
                >
                  Alby
                </th>
                <th
                  scope="col"
                  className="border-b border-border bg-[rgba(0,102,255,0.09)] px-3 py-4 text-center align-bottom text-sm font-semibold text-foreground"
                >
                  <span className="mb-2 inline-flex rounded-full border border-blue-500/35 bg-blue-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blue-200 sm:text-xs">
                    recomendado
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-foreground sm:text-base">
                    BitMacro Signer
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, idx) => {
                if (row.type === "category") {
                  return (
                    <tr key={`cat-${row.title}`} className="bg-muted/25">
                      <td
                        colSpan={4}
                        className="border-b border-border px-3 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {row.title}
                      </td>
                    </tr>
                  );
                }
                const rk = `row-${row.feature}-${idx}`;
                return (
                  <tr
                    key={rk}
                    className="group transition-colors duration-150 hover:bg-muted/25"
                  >
                    <th scope="row" className={featureCol}>
                      <span className="block">{row.feature}</span>
                      {row.detail ? (
                        <span className="mt-1 block text-sm font-normal leading-[1.5] text-muted-foreground">
                          {row.detail}
                        </span>
                      ) : null}
                    </th>
                    <td className={stdCol}>
                      <div className="flex justify-center">
                        <CompareCellContent cell={row.amber} />
                      </div>
                    </td>
                    <td className={stdCol}>
                      <div className="flex justify-center">
                        <CompareCellContent cell={row.alby} />
                      </div>
                    </td>
                    <td className={signerCol}>
                      <div className="flex justify-center">
                        <CompareCellContent cell={row.signer} />
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
            <span className="font-medium text-foreground/90">fase 2</span> = roadmap previsto, não
            disponível no MVP.
          </p>
          <p>
            Amber e Alby são projectos independentes — comparação baseada em funcionalidades
            típicas do modelo, não ranking absoluto.
          </p>
        </div>
      </div>
    </section>
  );
}

function SelfHost() {
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
              Self-host
            </div>
            <h2 className="mb-3 text-[clamp(1.375rem,3vw+0.75rem,1.75rem)] font-bold tracking-tight text-foreground md:text-[28px]">
              Corre na tua infraestrutura
            </h2>
            <p className="mb-6 text-base leading-[1.5] text-muted-foreground">
              Imagem Docker com Next.js em modo <code className="font-mono text-sm text-primary">standalone</code>.
              Copia as variáveis de ambiente, constrói e sobe — sem passos extra além do{" "}
              <code className="font-mono text-sm text-foreground/95">.env</code>.
            </p>
            <ul className="mb-8 space-y-4 text-base leading-[1.5] text-muted-foreground">
              <li className="flex gap-3">
                <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>Secrets só no host — nunca commits de chaves.</span>
              </li>
              <li className="flex gap-3">
                <Server className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>
                  Healthcheck em <code className="font-mono text-sm text-foreground/90">/api/health</code> para
                  orquestração.
                </span>
              </li>
            </ul>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-md text-base font-semibold text-primary underline-offset-2 transition-colors hover:underline"
            >
              Dockerfile, compose e README no GitHub
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </a>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 elevation-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <span className="font-mono text-xs text-muted-foreground">terminal</span>
              <span className="font-mono text-xs text-muted-foreground">bash</span>
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
  return (
    <footer className="landing-content border-t border-border/80 px-5 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row sm:items-start">
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
          <span className="text-muted-foreground">Licença MIT</span>
        </p>
        <p className="text-center text-sm leading-normal text-muted-foreground sm:text-right">
          signer.bitmacro.io — bunker NIP-46 gerido
        </p>
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
