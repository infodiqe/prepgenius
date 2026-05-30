# Integration Architecture (extract)

> **Source of truth:** `system_architecture.md` §9–10 (AI), §13 (Credits), §14–15 (Messaging). Edit there.

**AI:** all calls via `ai_gateway`, fallback Groq → OpenAI → DeepSeek (config-driven), metered by the credit ledger (reserve→commit/release), cached where possible.
**Payments:** Razorpay checkout + signature-verified webhook → credit grant (idempotent).
**Telegram (primary):** bot + n8n orchestration for reminders, daily links, summaries.
**WhatsApp (Twilio):** transactional; approved templates, 24-h session window, explicit opt-in; ship after Telegram.
**Automation:** self-hosted n8n owns reminder workflows (exported to VCS).
