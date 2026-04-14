import {
  ArrowRight,
  Check,
  Github,
  KeyRound,
  Lock,
  Minus,
  Plug,
  QrCode,
  Server,
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
    <header className="landing-content border-b border-border/80 bg-background/40 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[14px] font-semibold tracking-tight text-foreground"
        >
          <Image
            src="/icons/bitmacro.svg"
            alt="BitMacro"
            width={28}
            height={28}
            className="size-7 shrink-0"
            priority
          />
          BitMacro Signer
        </Link>
        <nav className="flex max-w-[min(100%,18rem)] flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] sm:max-w-none sm:gap-4 sm:text-[13px]">
          <a
            href="#como-funciona"
            className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
          >
            Como funciona
          </a>
          <a
            href="#comparacao"
            className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
          >
            Comparação
          </a>
          <a
            href="#self-host"
            className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
          >
            Self-host
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
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
    <section className="landing-content px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 md:pb-28 md:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 space-y-1.5">
          <p className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
            NIP-46 · Nostr Connect
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80 sm:text-[11px]">
            Bunker gerido · relay BitMacro
          </p>
        </div>
        <h1 className="mb-5 max-w-3xl text-[28px] font-bold leading-tight tracking-tight text-foreground md:text-[40px] lg:text-[44px]">
          O teu bunker NIP-46, sempre disponível.
        </h1>
        <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
          Assina eventos Nostr à distância. A <span className="text-foreground/90">nsec</span>{" "}
          permanece encriptada no cofre; o servidor nunca a armazena em texto claro — apenas um
          blob cifrado, com sessão activa opcional em memória (TTL configurável).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/onboarding"
            className="glow-orange hover:glow-orange-strong inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-[14px] font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] sm:min-h-0 sm:py-2.5"
          >
            Começar grátis
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-6 text-[14px] font-medium text-foreground transition-colors hover:bg-secondary/60 sm:min-h-0 sm:py-2.5"
          >
            <Github className="size-4" aria-hidden />
            Ver no GitHub
          </a>
        </div>
        <p className="mt-6 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
          Para quem prefere controlar a infraestrutura:{" "}
          <a
            href="#self-host"
            className="text-primary underline-offset-2 transition-colors hover:underline"
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
      className="section-glow-divider relative border-t border-border/60 px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="landing-content mx-auto max-w-6xl">
        <h2 className="mb-3 text-[22px] font-bold tracking-tight text-foreground md:text-[28px]">
          Como funciona
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] text-muted-foreground">
          Três passos — do keypair à assinatura remota no ecossistema BitMacro.
        </p>
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <div className="glass-card elevation-1 hover:border-primary/25 group rounded-2xl border border-border/80 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary transition-transform duration-300 group-hover:scale-105">
                  <Icon className="size-5" aria-hidden />
                </div>
                <p className="mb-1 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mb-2 text-[16px] font-semibold text-foreground">{title}</h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ComparisonTable() {
  type Cell = "yes" | "partial" | "no" | "text";
  const rows: {
    label: string;
    signer: { kind: Cell; label?: string };
    amber: { kind: Cell; label?: string };
    alby: { kind: Cell; label?: string };
  }[] = [
    {
      label: "Plataforma",
      signer: { kind: "text", label: "Web (bunker gerido + self-host)" },
      amber: { kind: "text", label: "Android (app)" },
      alby: { kind: "text", label: "Extensão de browser" },
    },
    {
      label: "Bunker NIP-46 / Nostr Connect",
      signer: { kind: "yes" },
      amber: { kind: "partial", label: "Foco em signer local no dispositivo" },
      alby: { kind: "yes" },
    },
    {
      label: "nsec em repouso no serviço",
      signer: {
        kind: "text",
        label: "Blob AES-GCM (WebCrypto); servidor sem plaintext em disco",
      },
      amber: { kind: "text", label: "Armazenamento local no telemóvel" },
      alby: { kind: "text", label: "Armazenamento da extensão" },
    },
    {
      label: "Assinatura remota sem o device sempre online",
      signer: { kind: "yes" },
      amber: { kind: "no" },
      alby: { kind: "partial", label: "Depende da extensão / NWC" },
    },
    {
      label: "Self-host & licença",
      signer: { kind: "text", label: "MIT · Docker" },
      amber: { kind: "text", label: "Open source" },
      alby: { kind: "text", label: "Open source" },
    },
    {
      label: "Integração relay BitMacro",
      signer: { kind: "yes" },
      amber: { kind: "no" },
      alby: { kind: "no" },
    },
  ];

  function CellIcon({
    cell,
  }: {
    cell: { kind: Cell; label?: string };
  }) {
    if (cell.kind === "yes") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Check className="check size-4 shrink-0" aria-hidden />
          <span className="sr-only">Sim</span>
        </span>
      );
    }
    if (cell.kind === "no") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Minus className="dash size-4 shrink-0" aria-hidden />
          <span className="sr-only">Não</span>
        </span>
      );
    }
    if (cell.kind === "partial") {
      return (
        <span className="text-[12px] leading-snug text-muted-foreground">
          Parcial
          {cell.label ? ` — ${cell.label}` : ""}
        </span>
      );
    }
    return <span className="text-[12px] leading-snug text-muted-foreground">{cell.label}</span>;
  }

  return (
    <section
      id="comparacao"
      className="section-glow-divider relative border-t border-border/60 px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="landing-content mx-auto max-w-6xl">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <h2 className="text-[22px] font-bold tracking-tight text-foreground md:text-[28px]">
            Comparação
          </h2>
          <span className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            referência
          </span>
        </div>
        <p className="mb-10 max-w-2xl text-[15px] text-muted-foreground">
          BitMacro Signer frente a soluções conhecidas no ecossistema Nostr — critérios orientados
          para bunker gerido e relay BitMacro.
        </p>
        <div className="compare-table-wrap glass-card elevation-1">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col" className="col-product pl-4">
                  Característica
                </th>
                <th scope="col" className="text-primary">
                  BitMacro Signer
                </th>
                <th scope="col">Amber</th>
                <th scope="col" className="pr-4">
                  Alby
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="col-product bg-muted/20 pl-4 font-medium">
                    {row.label}
                  </th>
                  <td>
                    <CellIcon cell={row.signer} />
                  </td>
                  <td>
                    <CellIcon cell={row.amber} />
                  </td>
                  <td className="pr-4">
                    <CellIcon cell={row.alby} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Amber e Alby são projectos independentes; esta tabela resume diferenços típicos de modelo,
          não um ranking absoluto.
        </p>
      </div>
    </section>
  );
}

function SelfHost() {
  return (
    <section
      id="self-host"
      className="section-glow-divider relative border-t border-border/60 px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="landing-content mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              <Server className="size-3.5 text-primary" aria-hidden />
              Self-host
            </div>
            <h2 className="mb-3 text-[22px] font-bold tracking-tight text-foreground md:text-[28px]">
              Corre na tua infraestrutura
            </h2>
            <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">
              Imagem Docker com Next.js em modo <code className="font-mono text-[13px] text-primary">standalone</code>.
              Copia as variáveis de ambiente, constrói e sobe — sem passos extra além do{" "}
              <code className="font-mono text-[13px] text-foreground/90">.env</code>.
            </p>
            <ul className="mb-8 space-y-3 text-[14px] text-muted-foreground">
              <li className="flex gap-2">
                <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>Secrets só no host — nunca commits de chaves.</span>
              </li>
              <li className="flex gap-2">
                <Server className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  Healthcheck em <code className="font-mono text-[12px]">/api/health</code> para
                  orquestração.
                </span>
              </li>
            </ul>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-primary underline-offset-2 transition-colors hover:underline"
            >
              Dockerfile, compose e README no GitHub
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 elevation-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-mono text-[11px] text-muted-foreground">terminal</span>
              <span className="font-mono text-[10px] text-muted-foreground/70">bash</span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-foreground/90 md:text-[13px]">
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
    <footer className="landing-content border-t border-border/80 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-center text-[12px] text-muted-foreground sm:text-left">
          © {new Date().getFullYear()}{" "}
          <a href={BITMACRO_HOME} className="footer-link font-medium text-foreground/90">
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
        <p className="text-[11px] text-muted-foreground/80">
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
