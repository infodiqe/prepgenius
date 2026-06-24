# E2E — Authentication Flow Validation (SPRINT-5A-01)

Real-browser validation of the login-flow fix: a successful login must work on
the **first attempt** (no bounce back to `/login`, no manual refresh).

These Playwright specs are intentionally **not** wired into the app's
`package.json` or `tsconfig` (the `e2e/` dir is excluded from the project
typecheck) so they don't pull Playwright into the Next.js build. They run
against a **running stack**, not a dev server.

## 1. Prerequisites

- The full stack running (Docker Compose). In local dev it is served by nginx on
  `http://localhost` (port 80). Confirm with:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost/login   # → 200
  ```
- The frontend must be the **post-fix build** (rebuild the `next` image if unsure):
  ```bash
  docker compose build --no-cache next && docker compose up -d next
  ```
- Node + Playwright (run from `frontend/`):
  ```bash
  npm i -D @playwright/test
  npx playwright install chromium
  ```

## 2. Create the test accounts

Login requires `status="active"` and `is_email_verified=True`. Routing to the
Operations Platform (`/ops`) requires an operational role recognised by
`hasOpsAccess` (`platform_admin`, `content_manager`, `content_reviewer`, `sme`,
or `institution_admin` — see `features/ops/opsAccess.ts`). Run once via the
Django container:

```bash
docker compose exec django python manage.py shell <<'PY'
from accounts.models import User, Role, UserRole
from exams.models import Exam

def ensure_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={"is_system": True})
    UserRole.objects.get_or_create(user=user, role=role, institution_id=None)

# Student — active, verified, and onboarded (target_exam set) so they land on
# /dashboard rather than /onboarding.
student, _ = User.objects.get_or_create(
    email="student@example.com",
    defaults={"full_name": "E2E Student", "status": "active", "is_email_verified": True},
)
student.status = "active"; student.is_email_verified = True
student.set_password("Password123!")
exam = Exam.objects.first()
if exam:
    student.target_exam = exam
student.save()
ensure_role(student, "student")

# Admin — platform_admin role (so the Next login routes to /ops). is_staff/
# superuser is also set so Django Admin (/admin/) stays usable as a maintenance
# escape-hatch, but it is NOT the login destination.
admin = User.objects.filter(email="admin@example.com").first()
if admin is None:
    admin = User.objects.create_superuser(email="admin@example.com", password="Password123!", full_name="E2E Admin")
else:
    admin.set_password("Password123!"); admin.is_staff = True; admin.is_superuser = True
    admin.status = "active"; admin.is_email_verified = True; admin.save()
ensure_role(admin, "platform_admin")

print("OK:", student.email, "exam=", student.target_exam_id, "|", admin.email, "staff=", admin.is_staff)
PY
```

> If `Exam.objects.first()` is `None`, the student has no target exam and will be
> redirected to `/onboarding` after login. That is still a valid "logged-in"
> destination — the specs accept either `/dashboard` or `/onboarding`.

## 3. Configure credentials (env)

Defaults match the accounts created above; override as needed:

| Variable | Default |
|---|---|
| `E2E_BASE_URL` | `http://localhost` |
| `E2E_STUDENT_EMAIL` | `student@example.com` |
| `E2E_STUDENT_PASSWORD` | `Password123!` |
| `E2E_ADMIN_EMAIL` | `admin@example.com` |
| `E2E_ADMIN_PASSWORD` | `Password123!` |

## 4. Run

```bash
# from frontend/
npx playwright test --config e2e/playwright.config.ts

# headed / debugging:
npx playwright test --config e2e/playwright.config.ts --headed
npx playwright show-report e2e/playwright-report
```

Playwright captures **screenshots and video on failure** automatically (see
`playwright.config.ts`), and a full HTML report is written to
`e2e/playwright-report/`.

## 5. What each spec asserts (expected post-fix behavior)

| # | Scenario | Expected |
|---|---|---|
| 1 | Student login | First submit → lands on `/dashboard` (or `/onboarding`), `access_token` cookie set, **never bounces back to `/login`** |
| 2 | Admin login | First submit → lands in `/ops` (JWT, no second login); never `/admin/`, never `/onboarding` |
| 3 | Logout | User menu → Logout → back on `/login`, `access_token` cleared |
| 4 | Re-login | Login → logout → login again, second login also first-attempt |
| 5 | Refresh | Hard refresh on the protected route keeps the session (no redirect to `/login`) |
| 6 | Direct nav | New tab → `/profile` directly while authenticated → allowed (not `/login`) |

## Notes / known caveats

- **Operational users land in `/ops`, not Django Admin.** `/ops` is a JWT-
  authenticated Next route, so the session carries over with no second login
  (SPRINT-5A-01B). Django Admin (`/admin/`) uses Django session auth and remains
  reachable directly as a maintenance escape-hatch, but it is intentionally not
  a login destination.
- Tests run serially (`workers: 1`) and share one set of backend accounts.
- Locale is pinned to English via the `locale` cookie so UI text is stable
  despite Assamese being the app default.
