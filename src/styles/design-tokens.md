# BitMacro Signer — design tokens (ecosystem reference)

This document describes the visual tokens and **mobile-first** patterns used in `bitmacro-signer`. It is the aligned reference for **relay-panel**, **bitmacro-app**, **bitmacro-id**, and future BitMacro apps.

**Principles:** background `#080808`, primary text white, accent `#0066FF`; minimum touch target **44×44px**; **16px** minimum on form fields (avoids iOS zoom); body **line-height ≥ 1.5** on mobile.

---

## 1. Responsive typography

### Hierarchy

| Role        | Mobile (≈390px) | Tablet / desktop | Weight     | Line-height (body) |
|-------------|-----------------|------------------|------------|--------------------|
| Display / H1 | `clamp(1.75rem, 5.2vw + 0.85rem, 2.75rem)` (~28–44px) | `md:` ~40px, `lg:` ~44px | 700 (bold) | 1.15–1.2 |
| H2 / section | `clamp(1.375rem, 3vw + 0.75rem, 1.75rem)` (~22–28px) | `md:text-[28px]` | 700 | 1.2–1.25 |
| H3 / card   | `text-lg` (18px) | `text-lg`–`xl` | 600 | 1.3 |
| Body        | `text-base` (16px) | optional `md:text-[17px]` | 400–500 | **≥ 1.5** |
| Label / UI  | `text-sm` (14px) | same | 500–600 | 1.4–1.5 |
| Eyebrow / mono | `text-xs` (12px) | optional `sm:text-sm` | 500–600 | 1.4 |

### Rules

- **Editable inputs and textareas:** always `text-base` (16px) or larger.
- **Body copy on mobile:** `text-base leading-[1.5]` (or `leading-normal` if the design system fixes 1.5 on `body`).
- Headings may use `tracking-tight`; body keeps default tracking.

### Tailwind examples

```html
<h1 class="text-[clamp(1.75rem,5.2vw+0.85rem,2.75rem)] font-bold leading-[1.15] tracking-tight text-foreground md:text-[2.5rem] lg:text-[2.75rem]">
<p class="text-base leading-[1.5] text-muted-foreground md:text-[17px] md:leading-[1.55]">
<p class="font-mono text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
```

---

## 2. Color palette and contrast (WCAG 2.2)

Values below assume **background `#080808`** (or `--background`). Ratios are **approximate** (AA: normal text ≥ **4.5:1**, large text ≥ **3:1**; non-text UI ≥ **3:1** where applicable).

| Token / use | Hex | Contrast notes vs `#080808` |
|-------------|-----|------------------------------|
| **Background** | `#080808` | Base |
| **Foreground** | `#FFFFFF` | Primary text — ~**19:1** |
| **Soft foreground** | `#F4F4F5` | Cards / secondary headings — very high |
| **Muted (secondary)** | `#A8B4C8` (`--muted-foreground`) | Secondary body — ~**8:1** (AA normal) |
| **Primary / accent** | `#0066FF` | Brand / links; on dark backgrounds works best as **large** text or with **underline** + weight 600; filled buttons use **white on `#0066FF`** (~**4.7:1**) |
| **Primary foreground** | `#FFFFFF` | On primary button |
| **Border** | `#2A2E38` | Dividers — UI contrast |
| **Card** | `#101012` | Elevated surface |
| **Muted surface** | `#1C1C20` | Lists / sections |

### Practices

- Avoid `zinc-500`-style grays for long text on `#080808`; prefer **`zinc-300`–`zinc-400`** or `muted-foreground`.
- **Inline links:** `text-primary` + `underline-offset-2` + `font-semibold` when blue alone is not enough for continuous reading.
- Focus: `focus:ring-2 focus:ring-ring` with `ring-offset-background`.

### CSS reference

Defined in `src/app/globals.css` (`:root` + `@theme inline`). Prefer `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`.

---

## 3. Spacing

| Token / rule | Value | Use |
|--------------|-------|-----|
| **Mobile horizontal gutter** | **20px** | `px-5` on main containers |
| **sm+ gutter** | 24px | `sm:px-6` |
| **lg+ gutter** | 32px | `lg:px-8` (landing) |
| **Mobile section vertical** | **48px+** | at least `py-12` between sections |
| **Desktop section** | 80–96px | `md:py-20`, `lg:py-24` |
| **Inner stack (form / card)** | 16–20px | `gap-3`–`gap-5`, `space-y-4`–`space-y-5` |
| **Mobile card padding** | **20px** | `p-5` |
| **Base radius** | 8px (`0.5rem`) | `--radius`; cards `rounded-xl` / `rounded-2xl` by context |

### Tailwind examples

```html
<section class="px-5 py-12 sm:px-6 md:py-20 lg:px-8 lg:py-24">
<div class="mx-auto max-w-6xl">
<div class="rounded-2xl border border-border p-5 md:p-6">
```

---

## 4. Interactive components (minimums)

| Component | Min height | Text | Weight | Width |
|-----------|------------|------|--------|-------|
| **Primary button** | **52px** | `text-base` (16px) | **600** | `w-full` mobile, `sm:w-auto` + `sm:max-w-md` or intrinsic |
| **Secondary / outline** | **52px** | `text-base` | **600** | Same |
| **Input / select** | **48px** | `text-base` | — | `w-full` |
| **Secondary touch** (nav links) | **44px** | `text-sm`+ | — | `inline-flex min-h-11 items-center px-2.5` |
| **Step / circular chip** | **44px** | `text-base` | 600 | `size-11` |

### Utility classes (globals)

- **`bm-btn-primary`** — primary CTA (full width until `sm`).
- **`bm-btn-secondary`** — outline / secondary.
- **`bm-input`** — field with mobile-friendly height and type size.
- **`bm-label`** — form label.

```html
<a class="bm-btn-primary glow-primary">Get started</a>
<button type="button" class="bm-btn-secondary">Cancel</button>
<label class="bm-label" for="email">Email</label>
<input id="email" class="bm-input" autocomplete="email" />
```

---

## 5. Responsive layout (mobile → tablet → desktop)

| Breakpoint | Typical width | Pattern |
|------------|---------------|---------|
| **Base** | 0–639px | Single column; full-width buttons; `px-5`; sections `py-12` |
| **sm** | ≥640px | Same content; gutters `px-6`; CTAs `sm:flex-row` |
| **md** | ≥768px | 2–3 column grids; larger section type; `md:py-20` |
| **lg** | ≥1024px | Centered `max-w-6xl`; wide tables with horizontal scroll if needed |

### Landing

- Content in `landing-content` + `max-w-6xl` + progressive gutters.
- Wide tables: `overflow-x-auto` + `min-w-[720px]` on `<table>`.

### App (onboarding / sessions)

- Single column `max-w-lg` / `max-w-3xl`; same `px-5` gutter.
- Session cards: `p-5`, `rounded-xl`, stacks `gap-3`–`gap-4`.

---

## 6. Tailwind 4 alignment

- Color tokens come from `@theme inline` mapped to `:root` variables.
- Prefer **semantic classes** (`bg-background`, `text-muted-foreground`) on the landing; pages using raw `zinc` should migrate toward these tokens for consistent contrast.
- For fluid type, combine `clamp()` in `text-[…]` with `md:` / `lg:` where needed.

---

## 7. References

- [WCAG 2.2 Contrast (1.4.3)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 Target Size (2.5.5)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) — recommended minimum **44×44px**.
- Apple HIG — similar touch target guidance.

---

*Last updated: BitMacro Signer mobile-first audit (landing, onboarding, sessions).*
