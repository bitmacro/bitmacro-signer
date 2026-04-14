import Link from "next/link";

/**
 * Placeholder estático — onboarding completo (auth, cofre) virá mais tarde.
 */
export default function OnboardingPlaceholderPage() {
  return (
    <div className="bg-landing-premium min-h-screen">
      <div className="landing-content mx-auto flex max-w-lg flex-col gap-6 px-4 py-24">
        <p className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
          BitMacro Signer
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Onboarding em breve
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Aqui vai o fluxo de criação do bunker e ligação NIP-46. Por agora, volta à
          página inicial para conhecer o produto.
        </p>
        <Link
          href="/"
          className="inline-flex w-fit items-center justify-center rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          ← Página inicial
        </Link>
      </div>
    </div>
  );
}
