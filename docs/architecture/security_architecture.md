# Security Architecture (extract)

> **Source of truth:** `system_architecture.md` §18 (Security), §5 (Auth). Edit there.

TLS everywhere; Argon2 passwords; httpOnly-cookie JWT (no localStorage). RBAC at view + object level; institution data auto-filtered by `institution_id`. Rate-limit auth/OTP/AI endpoints (Redis). Verify Razorpay/Twilio/Telegram webhook signatures. DPDP: minimize PII, field-encrypt sensitive fields, consent records, export/delete; `audience_is_minor` gates parental consent and bans profiling of minors. AI keys live only in `ai_gateway`; treat user/AI text as data (prompt-injection hygiene). Never log secrets/keys.
