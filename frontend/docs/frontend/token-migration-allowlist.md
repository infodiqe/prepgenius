# Token-Migration Lint Guard & Allow-list

**Introduced:** Sprint 0 · S0-T13 · **Owner:** Frontend Architecture

## What the guard does

`.eslintrc.json` configures `no-restricted-syntax` to **forbid hardcoded Tailwind
color utilities** in JS/TS/TSX (string literals and template literals):

```
slate-NNN  gray-NNN  zinc-NNN  neutral-NNN  stone-NNN  blue-NNN  indigo-NNN
```

(`NNN` = the 50–950 numeric scale; matched as `-\d{2,3}` with a leading word
boundary so lookalikes such as `translate-x-2` are **not** flagged.)

Use **semantic theme tokens** instead (defined in `app/globals.css`, S0-T04):

| Instead of | Use |
|---|---|
| `bg-slate-950` / `bg-slate-900` | `bg-background` / `bg-card` |
| `text-slate-100` / `text-slate-400` | `text-foreground` / `text-muted-foreground` |
| `border-slate-800` | `border-border` |
| `bg-blue-600 text-white` | `bg-primary text-primary-foreground` |
| `text-blue-400` | `text-primary` |
| `focus:ring-blue-500` | `focus-visible:ring-ring` |
| neutral hover surface | `hover:bg-muted` |

Token classes (`bg-primary`, `text-foreground`, `border-border`, `ring-ring`, …)
are allowed — they carry no raw palette name, so the rule never flags them.

## Enforcement model

- **New / already-migrated code → `error`.** Introducing a forbidden utility in any
  file outside the allow-list **fails lint** (prevents new debt).
- **Legacy allow-listed files → `warn`.** Existing violations are **reported**
  (185 warnings today) but do **not** fail the build, so `npm run lint` stays
  green while migration happens incrementally. Violations are **not** auto-fixed.

## Allow-list (shrinking)

These directories/files still contain pre-token-system colors. **Remove an entry
from `.eslintrc.json` `overrides[0].files` once a file/dir is migrated**, so the
rule upgrades it to `error` and prevents regressions.

```
components/ui/**                 # shared primitives (avatar, dropdown-menu, select, separator, tabs)
features/mock-player/**          # exam player (large, low-churn)
features/practice/**
features/results/**
features/analytics/**
features/dashboard/**
app/(student)/**                 # student screens (dashboard, practice, results, analytics, profile, tutor)
app/login/**
app/register/**
app/reset-password/**
app/forgot-password/**
app/verify-email/**
```

~59 files / 185 occurrences at introduction. Target order (per the Sprint
roadmap): `components/ui/**` + the Sprint-1 student screens first, then the mock
player.

## Already migrated (guarded at `error`)

`app/layout.tsx`, `app/page.tsx`, `features/nav/**` (Sidebar, TopBar,
BottomTabBar, AppShell, navIcons), `features/theme/**`, `features/workspace/**`,
`lib/**`, `app/globals.css` (token source). New color literals here fail lint.
