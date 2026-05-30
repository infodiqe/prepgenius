# Design System (extract)

> **Source of truth:** `ui_design_document.md` §2 (Foundations), §3 (Responsive), §6 (Accessibility).

Tokens as shadcn CSS variables (indigo primary, emerald success, amber warning, rose destructive). Typography: Inter (Latin) + Noto Sans Devanagari (Hindi) + Noto Sans Bengali (Assamese). 4px spacing base, 10px radius, minimal elevation, 150–200ms motion (reduced-motion aware). Mobile-first breakpoints (360→640→768→1024→1280). **Question-state system is colorblind-safe** (color + icon + number). Ship tokens so per-institution white-label is a token swap. Custom components: QuestionTile, Timer, SaveStatus, CreditMeter, ReadinessGauge, WeakTopicCard, StateLegend.
