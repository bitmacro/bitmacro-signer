# BitMacro Signer — design tokens (referência ecossistema)

Este documento descreve os tokens visuais e padrões **mobile-first** usados no `bitmacro-signer`. Serve de referência alinhada para **relay-panel**, **bitmacro-app**, **bitmacro-id** e futuras apps BitMacro.

**Princípios:** fundo `#080808`, texto principal branco, acento `#0066FF`; alvo de toque mínimo **44×44px**; **16px** mínimo em campos de formulário (evita zoom em iOS); corpo com **line-height ≥ 1.5** em mobile.

---

## 1. Tipografia responsiva

### Hierarquia

| Papel        | Mobile (≈390px) | Tablet / desktop | Peso        | Line-height (corpo) |
|-------------|-----------------|------------------|------------|---------------------|
| Display / H1 | `clamp(1.75rem, 5.2vw + 0.85rem, 2.75rem)` (~28–44px) | `md:` ~40px, `lg:` ~44px | 700 (bold) | 1.15–1.2 |
| H2 / secção | `clamp(1.375rem, 3vw + 0.75rem, 1.75rem)` (~22–28px) | `md:text-[28px]` | 700 | 1.2–1.25 |
| H3 / cartão | `text-lg` (18px) | `text-lg`–`xl` | 600 | 1.3 |
| Body        | `text-base` (16px) | `md:text-[17px]` opcional | 400–500 | **≥ 1.5** |
| Label / UI  | `text-sm` (14px) | idem | 500–600 | 1.4–1.5 |
| Eyebrow / mono | `text-xs` (12px) | `sm:text-sm` opcional | 500–600 | 1.4 |

### Regras

- **Inputs e textareas editáveis:** sempre `text-base` (16px) ou superior.
- **Texto corrido em mobile:** `text-base leading-[1.5]` (ou `leading-normal` se o design system fixar 1.5 no `body`).
- Títulos podem usar `tracking-tight`; corpo mantém tracking normal.

### Exemplos Tailwind

```html
<h1 class="text-[clamp(1.75rem,5.2vw+0.85rem,2.75rem)] font-bold leading-[1.15] tracking-tight text-foreground md:text-[2.5rem] lg:text-[2.75rem]">
<p class="text-base leading-[1.5] text-muted-foreground md:text-[17px] md:leading-[1.55]">
<p class="font-mono text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
```

---

## 2. Paleta e contraste (WCAG 2.2)

Valores abaixo assumem **fundo `#080808`** (ou equivalente `--background`). Razões **aproximadas** (AA: texto normal ≥ **4.5:1**, texto grande ≥ **3:1**; UI não textual ≥ **3:1** onde aplicável).

| Token / uso | Hex | Notas de contraste vs `#080808` |
|-------------|-----|----------------------------------|
| **Background** | `#080808` | Base |
| **Foreground** | `#FFFFFF` | Texto principal — ~**19:1** |
| **Foreground suave** | `#F4F4F5` | Cartões / títulos secundários — muito alto |
| **Muted (secundário)** | `#A8B4C8` (`--muted-foreground`) | Corpo secundário — ~**8:1** (AA normal) |
| **Primary / acento** | `#0066FF` | Links e marca; sobre fundo escuro cumpre melhor como **grande** ou com **sublinhado** + peso 600; botões preenchidos usam **texto branco sobre `#0066FF`** (~**4.7:1**) |
| **Primary foreground** | `#FFFFFF` | Sobre botão primário |
| **Border** | `#2A2E38` | Separadores — contraste de **UI** |
| **Card** | `#101012` | Superfície elevada |
| **Muted surface** | `#1C1C20` | Listas / secções |

### Boas práticas

- Evitar cinzentos tipo `zinc-500` em texto longo sobre `#080808`; preferir **`zinc-300`–`zinc-400`** ou o token `muted-foreground`.
- **Links** em linha: `text-primary` + `underline-offset-2` + `font-semibold` quando o azul isolado não for suficiente para leitura contínua.
- Estados de foco: `focus:ring-2 focus:ring-ring` com `ring-offset-background`.

### CSS (referência)

Definido em `src/app/globals.css` (`:root` + `@theme inline`). Preferir `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`.

---

## 3. Espaçamento

| Token / regra | Valor | Uso |
|---------------|-------|-----|
| **Gutter horizontal mobile** | **20px** | `px-5` em contentores principais |
| **Gutter sm+** | 24px | `sm:px-6` |
| **Gutter lg+** | 32px | `lg:px-8` (landing) |
| **Secção vertical mobile** | **48px+** | `py-12` mínimo entre secções |
| **Secção desktop** | 80–96px | `md:py-20`, `lg:py-24` |
| **Stack interno (form / cartão)** | 16–20px | `gap-3`–`gap-5`, `space-y-4`–`space-y-5` |
| **Padding cartão mobile** | **20px** | `p-5` |
| **Raio base** | 8px (`0.5rem`) | `--radius`; cartões `rounded-xl` / `rounded-2xl` conforme contexto |

### Exemplos Tailwind

```html
<section class="px-5 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-24">
<div class="mx-auto max-w-6xl">
<div class="rounded-2xl border border-border p-5 md:p-6">
```

---

## 4. Componentes interactivos (mínimos)

| Componente | Altura mín. | Texto | Peso | Largura |
|------------|-------------|-------|------|---------|
| **Botão primário** | **52px** | `text-base` (16px) | **600** | `w-full` mobile, `sm:w-auto` + `sm:max-w-md` ou natural |
| **Botão secundário / outline** | **52px** | `text-base` | **600** | Idem |
| **Input / select** | **48px** | `text-base` | — | `w-full` |
| **Área de toque secundária** (links nav) | **44px** | `text-sm`+ | — | `inline-flex min-h-11 items-center px-2.5` |
| **Passo / chip circular** | **44px** | `text-base` | 600 | `size-11` |

### Classes utilitárias (globals)

- **`bm-btn-primary`** — CTA primário (full width até `sm`).
- **`bm-btn-secondary`** — outline / secundário.
- **`bm-input`** — campo com altura e tipo legível em mobile.
- **`bm-label`** — legenda de formulário.

```html
<a class="bm-btn-primary glow-primary">Começar</a>
<button type="button" class="bm-btn-secondary">Cancelar</button>
<label class="bm-label" for="email">Email</label>
<input id="email" class="bm-input" autocomplete="email" />
```

---

## 5. Layout responsivo (mobile → tablet → desktop)

| Breakpoint | Largura típica | Padrão |
|------------|----------------|--------|
| **Base** | 0–639px | Uma coluna; botões full width; `px-5`; secções `py-12` |
| **sm** | ≥640px | Mesmo conteúdo; pode manter gutters `px-6`; CTAs `sm:flex-row` |
| **md** | ≥768px | Grelhas 2–3 colunas; tipografia de secção maior; `md:py-20` |
| **lg** | ≥1024px | `max-w-6xl` centrado; comparativos em tabela com scroll horizontal se necessário |

### Landing

- Conteúdo em `landing-content` + `max-w-6xl` + gutters progressivos.
- Tabelas largas: `overflow-x-auto` + `min-w-[720px]` na `<table>`.

### App (onboarding / sessões)

- Coluna única `max-w-lg` / `max-w-3xl`; mesmo gutter `px-5`.
- Cartões de sessão: `p-5`, `rounded-xl`, stacks `gap-3`–`gap-4`.

---

## 6. Alinhamento com Tailwind 4

- Tokens de cor vêm de `@theme inline` mapeados a variáveis `:root`.
- Preferir **classes semânticas** (`bg-background`, `text-muted-foreground`) na landing; páginas com zinc explícito devem migrar gradualmente para estes tokens para contraste consistente.
- Para tipografia fluida, combinar `clamp()` em `text-[…]` com prefixos `md:` / `lg:` onde necessário.

---

## 7. Referências

- [WCAG 2.2 Contrast (1.4.3)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 Target Size (2.5.5)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) — mínimo recomendado **44×44px**.
- Apple HIG — alvos de toque semelhantes.

---

*Última revisão: auditoria mobile-first do BitMacro Signer (landing, onboarding, sessões).*
