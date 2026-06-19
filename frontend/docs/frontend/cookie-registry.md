# Frontend Cookie Registry

**Owner:** Frontend Architecture · **Introduced:** Sprint 0 · S0-T01
**Status:** authoritative — all browser cookies used by the frontend are listed here.

This registry is the single source of truth for cookie names, ownership, and SSR
readers. **Do not introduce a cookie or a cookie-name string literal outside the
module that owns it.** Each frontend-owned cookie exposes a name constant and a
server reader; consumers import those instead of hardcoding strings.

## Cookies

| Cookie | Set by | httpOnly | SameSite | Max-age | Values | Default | Name constant | SSR reader |
|---|---|---|---|---|---|---|---|---|
| `access_token` | Backend (Django) | ✅ | Lax | session/JWT | opaque JWT | — | _(BE-owned)_ | `getCurrentUser()` reads it ([features/auth/serverAuth.ts](../../features/auth/serverAuth.ts)) |
| `refresh_token` | Backend (Django) | ✅ | Lax | JWT refresh | opaque JWT | — | _(BE-owned)_ | sent with profile fetch |
| `locale` | Client | ❌ | Lax | 1 year | `as` \| `en` \| `hi` | `as` | _(literal in `lib/i18n/request.ts`)_ | `getRequestConfig` ([lib/i18n/request.ts](../../lib/i18n/request.ts)) |
| `workspace` | Client | ❌ | Lax | 1 year | `student` \| `review` \| `admin` | _none — consumer applies Student_ | `WORKSPACE_COOKIE` ([lib/workspace/cookies.ts](../../lib/workspace/cookies.ts)) | `getWorkspaceServer()` |
| `theme` | Client | ❌ | Lax | 1 year | `light` \| `dark` | `light` | `THEME_COOKIE` ([lib/theme/cookies.ts](../../lib/theme/cookies.ts)) | `getThemeServer()` |

## Notes

- **`access_token` / `refresh_token`** are httpOnly and `Secure` (set by the
  backend); the frontend never reads them in client code, only server-side via
  `next/headers` `cookies()`.
- **`locale`** is owned by the i18n layer; its name literal predates this
  registry and is intentionally left in `lib/i18n/request.ts` (out of S0-T01
  scope to refactor).
- **`workspace`** is **presentation-only**. It records the last-used workspace
  ("last-used wins"). The reader returns the persisted value or `null`; the
  Student default and the access re-check are applied by `WorkspaceProvider`
  (S0-T07). Selecting a workspace **never** grants authorization — route access
  is enforced server-side by `RoleGuard` (S0-T12).
- **`theme`** defaults to **Light** (approved Sprint 0 theme decision). The
  `<html>` class is resolved from this cookie during SSR (S0-T05) to avoid a
  flash of the wrong theme.

## Conventions for new cookies

1. Add a row to the table above.
2. Export a `*_COOKIE` name constant from the owning module.
3. Provide a pure resolver + an SSR reader (mirror `lib/theme/cookies.ts`).
4. Client-set cookies use `SameSite=Lax`, 1-year max-age, and are **never** used
   for authorization or business logic (that stays server-side).
