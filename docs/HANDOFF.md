# GaryOSS Handoff

## Project Overview

- **Original fork:** MikeOSS.
- **Current direction:** GaryOSS — a private, hosted legal AI workspace for one lawyer/small firm.
- **Not yet:** commercial SaaS, team billing product, or full CLM.
- **Product principle:** **"Gary needs a toaster, not the cockpit of a Boeing 777."**
- **V1 journey:** Log in (or dev bypass) → Upload document → Ask Gary → Get cited answer.

## What GaryOSS Is (Today)

GaryOSS currently combines:
- A **Next.js frontend** (`frontend/`) for document/chat workflows.
- A **Node/Express backend** (`backend/`) for auth-aware API requests, document processing, and model-provider calls.
- **Supabase** for auth/data access.
- **S3-compatible storage** (R2 expected) for document objects.

## Architecture Decisions (Current)

1. **Frontend deploy target: Cloudflare Workers via OpenNext**
   - Use `@opennextjs/cloudflare` build/deploy flow.
   - `frontend/wrangler.jsonc` is the Worker deployment config.

2. **Do not use Cloudflare Pages for this app**
   - Do **not** switch back to Pages.
   - Do **not** use `@cloudflare/next-on-pages`.

3. **Backend deploy target: Node host (Railway/Render/Fly/VPS), not Workers**
   - Backend depends on Node APIs and LibreOffice-based document conversion.
   - Forcing backend into Workers is intentionally out-of-scope.

4. **Secrets policy**
   - Provider keys and storage credentials belong on backend host only.
   - `NEXT_PUBLIC_*` values are build-time/public in frontend bundle.

## Deployment Status (As-of this handoff)

- Frontend deployment path to Cloudflare Workers/OpenNext exists and is documented.
- Backend deployment docs exist (`backend/DEPLOY.md`), but **backend is intentionally not fully deployed yet**.
- Dev auth bypass exists via `NEXT_PUBLIC_GARY_SKIP_AUTH=true`.
- Frontend API base URL comes from `NEXT_PUBLIC_API_BASE_URL`.
- Backend CORS origin comes from `FRONTEND_URL`.
- OpenNext/Next.js build behavior: `NEXT_PUBLIC_*` values are baked at build time.

## PR / Commit History Snapshot

PR numbers are partially discoverable from merge commits; where missing, entries are based on commit history.

1. **PR #2 – Cloudflare/OpenNext compatibility**
   - Added Cloudflare Worker deploy scripts/docs and worker config.
   - Area: `frontend/package.json`, `frontend/wrangler.jsonc`, README/docs.
   - Limitation: backend still separate deployment.

2. **PR #3 – frontend bun lock removal**
   - Removed `frontend/bun.lock` to standardize npm-based host builds.

3. **PR #4 – backend deployment docs**
   - Added `backend/DEPLOY.md` with Railway/Render guidance.

4. **PR #5 – backend bun lock removal**
   - Removed `backend/bun.lock` to standardize npm hosts.

5. **PR #6 – Gary mode home/dashboard shell**
   - Added main action-card home direction in assistant flow.

6. **PR #7 – empty/loading/error copy polish**
   - Lawyer-friendly copy improvements and onboarding/empty-state cleanup.

7. **PR #8 – Contract Review workflow shell**
   - Added `/review` page flow and shell behavior.

8. **PR #9 – Draft Something workflow shell**
   - Added `/draft` page flow and shell behavior.

9. **PR #10 – walkthrough polish + bugfix pass**
   - Navigation wording refinements (`Ask Gary`), backend-unavailable messaging, misc UX fixes.

10. **PR #11 – Explain This workflow shell**
    - Added `/explain` route/page and integrated with existing chat initiation path.

11. **Post-PR font/build reliability changes**
    - Remote Google font loader removed from `next/font/google` path.
    - Current strategy references `@fontsource/inter` in frontend CSS.
    - Note: install/build can fail in locked-down envs if npm access to `@fontsource/inter` is blocked.

12. **shadcn/ui foundation pass (narrow)**
    - Existing shadcn config confirmed (`components.json`) and `src/components/ui` foundation expanded with initial primitives.

## Current Frontend State

### Main dashboard actions

Current intended set:
- Ask Gary
- Upload Document
- Review Contract
- Draft Something
- Explain This

### Route behavior

- `/assistant`: core Ask Gary flow with action cards.
- `/review`: contract review shell; starts a prepared prompt via chat path when backend responds.
- `/draft`: drafting shell; starts prepared drafting prompt via chat path when backend responds.
- `/explain`: legal-language explanation shell with structured sections.

### Backend-unavailable fallback copy

Standard fallback used in workflow shells:

> "This will be available once GaryOSS is connected to the backend."

### Auth mode

- Normal auth path uses Supabase session handling.
- Dev bypass path exists via `NEXT_PUBLIC_GARY_SKIP_AUTH=true`.
- Dev bypass is intentionally temporary and not production security.

### Navigation/copy

- Primary assistant nav wording is `Ask Gary`.

### UI foundation

- `src/components/ui` contains shadcn-style primitives (existing + added):
  - Existing: `button`, `input`, `badge`, etc.
  - Added foundation: `card`, `textarea`, `label`, `alert`, `tabs`, `separator`, `skeleton`.

### Font strategy

- Current frontend global CSS imports `@fontsource/inter` weights 400/500/600/700.
- Remote `next/font/google` imports were removed.

## Current Backend State

- Package manager: **npm** (`backend/package-lock.json` present).
- Runtime/build commands:
  - `npm install`
  - `npm run build`
  - `npm start`
- Health endpoint: `GET /health`.
- Node target: **22.x** (documented in `backend/DEPLOY.md`).
- System dependency: **LibreOffice** (via `backend/nixpacks.toml`).

### Backend env vars (from `.env.example` + code)

Required/used:
- `FRONTEND_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY` (present in example)
- `RESEND_API_KEY` (present in example)
- `PORT` (optional/defaulted)
- `DOWNLOAD_SIGNING_SECRET` (optional fallback behavior)
- `NEXT_PUBLIC_SUPABASE_URL` is still referenced in backend route code and should match `SUPABASE_URL` until unified.

### Never put in frontend Worker

- `SUPABASE_SECRET_KEY`
- `DOWNLOAD_SIGNING_SECRET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

## Known Issues / Blockers

1. Backend not fully deployed yet by project choice.
2. Upload/review/draft/explain/chat success paths depend on backend connectivity.
3. Repo-wide frontend lint currently has pre-existing failures.
4. Prior build issue: remote Google font fetch failures in locked-down environments; migration away from `next/font/google` happened, but current `@fontsource/inter` still requires npm registry access during install.
5. Dev auth bypass is temporary and must not ship as real security.
6. Managed provider mode/BYOK simplification remains future work.
7. Private single-user allowlist/lockdown is not yet implemented.

## Guardrails (Do-Not-Touch)

- Do not switch back to Cloudflare Pages.
- Do not add `@cloudflare/next-on-pages` flow.
- Do not put secrets into frontend Worker env.
- Do not remove AGPL license artifacts.
- Do not make broad backend changes during frontend polish PRs.
- Do not permanently remove auth.
- Do not claim confidentiality/privilege guarantees unless technically validated.
- Do not add SaaS billing/team complexity yet.
- Do not build full CLM scope yet.

## New Conversation Handoff (Copy/Paste)

GaryOSS is a MikeOSS fork now focused on a private single-lawyer legal AI workspace (not SaaS, not full CLM). V1 journey is login/dev bypass → upload document → ask Gary → cited answer. Frontend is Next.js deployed to Cloudflare Workers via OpenNext; do not use Cloudflare Pages or next-on-pages. Backend is Node/Express and must stay on Railway/Render/Fly/VPS-style hosts because of Node APIs + LibreOffice conversion needs. Current key frontend workflows exist as shells: Ask Gary, Upload, Review Contract (`/review`), Draft Something (`/draft`), Explain This (`/explain`). Dev auth bypass exists with `NEXT_PUBLIC_GARY_SKIP_AUTH=true` and is temporary only. Backend not fully deployed yet; workflow actions should gracefully show: "This will be available once GaryOSS is connected to the backend." Secrets must remain backend-only (Supabase service role, R2 keys, model keys). Frontend reads backend URL from `NEXT_PUBLIC_API_BASE_URL` at build time (OpenNext/Next.js bakes `NEXT_PUBLIC_*`). Recent work includes Gary-mode dashboard, copy polish, review/draft/explain shells, navigation cleanup (`Ask Gary`), shadcn/ui foundation primitives, and font strategy migration away from remote Google font fetching. Next recommended sequence: matter/client structure polish, cited-answer UX polish, lint triage, backend deploy, managed provider mode, single-user allowlist, then real backend workflows for review/draft/explain.
