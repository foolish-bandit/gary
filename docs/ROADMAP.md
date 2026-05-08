# GaryOSS Roadmap

This roadmap is ordered for the current project state after PR #19 and PR #20.

The main principle is still:

> Gary needs a toaster, not the cockpit of a Boeing 777.

Do deployment and reliability before expanding product scope.

## 1. Deploy Backend On Railway

Goal:

- Get the Express backend live.
- Verify `GET /health` returns `{"ok":true}`.

Scope:

- Railway project setup.
- Root directory: `backend`.
- Install/build/start settings.
- Railway environment variables.
- Public Railway domain.
- Health check.

Avoid:

- Product features.
- Schema changes.
- Provider UI changes.
- Frontend redesign.

## 2. Connect Cloudflare Frontend To Railway Backend

Goal:

- Make the deployed frontend call the deployed backend.

Scope:

- Set frontend `NEXT_PUBLIC_API_BASE_URL=https://your-railway-backend-url`.
- Rebuild/redeploy Cloudflare Worker.
- Set Railway `FRONTEND_URL=https://your-cloudflare-worker-url`.
- Verify no CORS errors.

Avoid:

- Switching to Cloudflare Pages.
- Using `@cloudflare/next-on-pages`.
- Putting backend secrets in frontend vars.

## 3. Smoke-Test Upload And Chat

Goal:

- Validate the V1 path with harmless test data.

Scope:

- Visit backend `/health`.
- Open frontend Worker URL.
- Use dev auth bypass if still needed.
- Upload a tiny fake PDF or DOCX.
- Ask: "What is this document about?"
- Confirm an answer returns.
- Confirm citation/source UI appears when metadata exists.

Avoid:

- Real client documents.
- Broad app refactors while debugging deployment.

## 4. Fix Deployment Issues Found During Smoke Test

Goal:

- Resolve only concrete deployment blockers.

Likely scope:

- CORS `FRONTEND_URL`.
- Wrong `NEXT_PUBLIC_API_BASE_URL`.
- Missing Supabase env.
- Missing R2 env.
- Missing Gemini/Anthropic key.
- LibreOffice/Nixpacks issue.
- Backend still needing `NEXT_PUBLIC_SUPABASE_URL`.

Avoid:

- New product features.
- Database migrations unless the deploy cannot work without one.

## 5. Managed Provider Mode

Goal:

- Gary should not manage API keys.
- Provider keys should be configured server-side by the administrator.

Scope:

- Hide BYOK/API-key UI from normal user.
- Use backend provider keys.
- Friendly unavailable state:

```text
GaryOSS is not configured yet. Contact the administrator.
```

Avoid:

- Exposing provider keys to frontend.
- Provider marketplace complexity.
- Billing/team/admin dashboards.

## 6. Private Single-User Allowlist

Goal:

- Lock access to Gary and any administrator/maintainer account.

Suggested env:

```bash
GARY_ALLOWED_EMAILS=gary@example.com,zack@example.com
```

Scope:

- Server-side email allowlist enforcement.
- Frontend-friendly unauthorized message.
- Keep Supabase auth.

Avoid:

- Deleting auth.
- Treating dev auth bypass as security.
- Multi-tenant role/team systems.

## 7. Real Contract Review Backend Workflow

Goal:

- Make Review Contract more than a shell.

Scope:

- Backend-backed contract review prompt/workflow.
- Cited findings.
- Simple review output.
- Follow-up questions.

Avoid:

- Full CLM.
- Clause library/admin platform.
- Complex review configuration.

## 8. Real Draft Something Backend Workflow

Goal:

- Make Draft Something reliably backend-backed.

Scope:

- Draft prompt pipeline.
- Optional document grounding.
- Clear missing-facts handling.
- Review-before-use caution.

Avoid:

- Full document editor rewrite.
- Template marketplace.
- Claims of legal correctness.

## 9. Real Explain This Backend Workflow

Goal:

- Make Explain This reliably backend-backed.

Scope:

- Structured output:
  - What it says
  - Why it matters
  - What could go wrong
  - Possible revision
- Caution that pasted text may not have document citations unless tied to uploaded documents.

Avoid:

- New unrelated tools.
- Overly technical UI.

## 10. Repo-Wide Lint Triage

Goal:

- Make lint useful again.

Scope:

- Small PRs by area.
- Fix existing React/compiler lint issues.
- Fix `any` usage where straightforward.
- Remove unused variables/imports.

Avoid:

- Behavior changes hidden inside lint PRs.
- Large rewrites.

## 11. Clean Backend Env Naming

Goal:

- Stop backend code from reading `NEXT_PUBLIC_SUPABASE_URL`.

Scope:

- Replace backend workflow route usage with `SUPABASE_URL`.
- Update `backend/.env.example`.
- Update docs.

Avoid:

- Breaking frontend Supabase env usage.
- Renaming unrelated env vars.

## Later, Not Now

These may matter eventually but should not be next:

- Billing.
- Teams.
- Roles.
- Commercial SaaS onboarding.
- Full CLM features.
- Provider marketplace.
- Complex admin consoles.
- Broad internal `project` -> `matter` API/database migrations.
