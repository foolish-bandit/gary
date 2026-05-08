# GaryOSS Handoff

This is the source-of-truth handoff for GaryOSS as of PR #20.

GaryOSS is a fork of MikeOSS in:

https://github.com/foolish-bandit/gary

The current project direction is a private, hosted legal AI workspace for Gary, a lawyer. It is not a commercial SaaS yet. It is not a full contract lifecycle management platform yet. The near-term goal is a simple legal document workspace that lets Gary log in, upload a document, ask Gary questions, and get an answer that can be checked against cited source documents.

Core product principle:

> Gary needs a toaster, not the cockpit of a Boeing 777.

Intended V1 journey:

```text
Log in / dev auth bypass -> Upload document -> Ask Gary -> Get cited answer
```

## Project Overview

### Origin

- Original project/fork: MikeOSS.
- Current project: GaryOSS.
- Repository: https://github.com/foolish-bandit/gary.
- License: AGPL-3.0-only. The repo-level `LICENSE` file must be preserved.

### What GaryOSS Is

GaryOSS is intended to be a private hosted legal AI workspace for Gary. Gary should not need to manage API keys, developer consoles, environment variables, provider settings, or deployment details. Those should be configured by the administrator and hidden from normal product use.

The product should feel like:

```text
Open GaryOSS -> Ask Gary -> Upload or choose a document -> Get a cited answer
```

GaryOSS should prioritize:

- simplicity;
- private or single-user access eventually;
- document Q&A with citations;
- contract review;
- drafting;
- explanation of legal text;
- minimal admin/config complexity.

### What GaryOSS Is Not Yet

- Not a commercial SaaS.
- Not a full CLM.
- Not a billing/team/role management product.
- Not a guarantee of legal correctness, confidentiality, or privilege safety.
- Not ready for real client-sensitive documents until deployment, security, and data handling are verified end to end.

## Product Scope

Current core actions:

- Ask Gary
- Upload Document
- Review Contract
- Draft Something
- Explain This

Preferred user-facing terminology:

- Use "Matter" when the UI means a legal case, matter, or legal project.
- Use "Document" for uploaded legal files.
- Use "Ask Gary" for the assistant/chat entry point.
- Use "Citations" or "Sources" when answers are tied to documents.

Avoid generic "project" or "workspace" language in user-facing UI where the actual concept is a legal matter. Internal/API/database names may still use `project` for compatibility and should not be renamed casually.

## Current Architecture

GaryOSS is split into a frontend and backend.

```text
Browser
  -> Cloudflare Worker frontend
  -> Railway backend
  -> Supabase / Cloudflare R2 / Gemini / Anthropic
```

### Frontend

Verified repo facts:

- Directory: `frontend/`.
- Framework: Next.js.
- Deployed to Cloudflare Workers using OpenNext.
- OpenNext package: `@opennextjs/cloudflare`.
- Worker config: `frontend/wrangler.jsonc`.
- OpenNext config: `frontend/open-next.config.ts`.
- Build output for Worker deployment: `frontend/.open-next/`.
- Do not use Cloudflare Pages.
- Do not use `@cloudflare/next-on-pages`.

Important environment behavior:

- `NEXT_PUBLIC_*` variables are public and build-time values.
- OpenNext/Next.js bakes `NEXT_PUBLIC_*` variables into the frontend bundle at build time.
- If `NEXT_PUBLIC_API_BASE_URL` or Supabase public env vars change, rebuild and redeploy the Cloudflare Worker.
- Some generic Supabase deployment notes call the public key `NEXT_PUBLIC_SUPABASE_ANON_KEY`, but current GaryOSS frontend code reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

Relevant frontend scripts from `frontend/package.json`:

```bash
npm run dev
npm run build
npm run lint
npm run cf:build
npm run cf:deploy
npm run cf:preview
npm run preview
npm run deploy
npm run upload
npm run cf-typegen
```

### Backend

Verified repo facts:

- Directory: `backend/`.
- Runtime: Node/Express.
- Language/build: TypeScript compiled to `backend/dist/`.
- Deploy target: Railway first.
- Package manager: npm.
- Lockfile: `backend/package-lock.json` exists.
- No `backend/bun.lock`, `backend/bun.lockb`, `backend/pnpm-lock.yaml`, or `backend/yarn.lock` was present during PR #19/PR #20 inspection.
- Install command: `npm install`.
- Build command: `npm run build`.
- Start command: `npm start`.
- Start script runs `node dist/index.js`.
- Health check: `GET /health` returns `{"ok":true}`.
- Port: `backend/src/index.ts` uses `process.env.PORT ?? 3001`.
- CORS: `backend/src/index.ts` uses `FRONTEND_URL` with localhost fallback.
- Node version: 22.x is the documented target.
- LibreOffice is required for document conversion and is declared in `backend/nixpacks.toml`.

The backend is not suited for Cloudflare Workers right now because it uses normal Node/server behavior, document processing, filesystem/buffer expectations, AWS SDK style storage access, Multer uploads, and LibreOffice conversion.

### Storage, Auth, Providers

- Supabase: auth and database.
- Cloudflare R2: uploaded documents and generated/converted file storage.
- Gemini and Anthropic: AI providers configured with backend environment variables.
- Provider secrets must stay backend-only.
- The frontend must never receive provider secrets, R2 secrets, or the Supabase service-role/secret key.

## Why Railway

Plain-English mental model:

- Cloudflare Worker frontend is the storefront/UI.
- Railway backend is the always-on server/kitchen.
- The browser loads the UI from Cloudflare.
- The UI calls the Railway backend through `NEXT_PUBLIC_API_BASE_URL`.
- The Railway backend talks to Supabase, R2, Gemini, and Anthropic.

Railway is the right first backend target because:

- it runs ordinary Node services;
- it supports `npm install`, `npm run build`, and `npm start`;
- it stores backend secrets as environment variables;
- it provides a public backend URL;
- it can use Nixpacks;
- `backend/nixpacks.toml` declares LibreOffice;
- it is simpler for a non-engineer than Cloud Run, Fly.io, or a VPS;
- it fits the existing backend without an architecture rewrite.

## Current Frontend State

### Main Dashboard

The assistant landing experience centers on five actions:

- Ask Gary
- Upload Document
- Review Contract
- Draft Something
- Explain This

The sidebar wording uses "Ask Gary" for the assistant/chat area.

### Matters and Documents

Recent UI polish changed user-facing language so legal matters are called "Matters" and uploaded legal files are called "Documents." Internal names such as `project_id`, `/projects`, and `MikeProject` still exist and should not be renamed without a planned migration.

### Review Contract

Route: `/review`

Current behavior:

- Frontend workflow shell.
- Lets the user choose or upload a contract.
- Builds a prepared review prompt.
- Reuses the assistant chat creation path if backend connectivity is available.
- If chat creation fails or backend is unavailable, shows:

```text
This will be available once GaryOSS is connected to the backend.
```

Current emphasis:

- Contract findings should cite the source document.
- The UI is not claiming legal verification.

### Draft Something

Route: `/draft`

Current behavior:

- Frontend workflow shell.
- Lets the user choose a drafting type and provide details.
- Can attach a document.
- Reuses the assistant chat creation path if backend connectivity is available.
- If chat creation fails or backend is unavailable, shows the backend-unavailable message.

Current caution:

- Drafts must be reviewed before use.
- If a document is attached, any cited source should be checked before relying on the draft.

### Explain This

Route: `/explain`

Current behavior:

- Lets the user paste legal text.
- Structured around:
  - What it says
  - Why it matters
  - What could go wrong
  - Possible revision
- Reuses the assistant chat creation path if backend connectivity is available.
- If chat creation fails or backend is unavailable, shows the backend-unavailable message.

Current caution:

- Pasted text explanations may not have document citations unless tied to an uploaded document.

### Citation UI Expectations

Recent PR #18 added user-facing citation expectations without inventing backend citation logic.

Current behavior:

- Ask Gary input reminds the user that Gary should cite the document so the answer can be checked.
- Start state says answers are most useful when tied to uploaded documents.
- Assistant answers show a "Citations" block when existing source metadata is present.
- Tabular review chat also shows citation cues when existing tabular citation metadata is present.
- If an answer has no source metadata, the UI warns:

```text
No source citation shown. Treat this answer as unverified.
```

Important guardrail:

- Do not fake citations.
- Do not invent page numbers.
- Only display citation/source metadata that backend responses already provide.

### Dev Auth Bypass

Env var:

```bash
NEXT_PUBLIC_GARY_SKIP_AUTH=true
```

Current behavior:

- The frontend treats the user as authenticated with a fake demo identity.
- Login/signup show a small notice.
- A dev auth banner exists.
- Backend calls are not truly authenticated by this bypass.

This is temporary and must not be treated as production security.

## Current Backend State

### Commands

From `backend/package.json`:

```bash
cd backend
npm install
npm run build
npm start
```

For clean local validation:

```bash
cd backend
npm ci
npm run build
npm start
```

Health check:

```bash
curl http://localhost:3001/health
```

Expected:

```json
{"ok":true}
```

### Backend Environment Variables

Required backend/Railway variables verified from actual code and docs:

- `FRONTEND_URL`
- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`

Optional variables documented or used:

- `PORT`
- `DOWNLOAD_SIGNING_SECRET`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

Important oddity:

- `backend/src/routes/workflows.ts` still reads `NEXT_PUBLIC_SUPABASE_URL`.
- This is a backend file reading a frontend-style variable name.
- For now, set `NEXT_PUBLIC_SUPABASE_URL` in Railway to the same value as `SUPABASE_URL`.
- Future cleanup should replace this backend usage with `SUPABASE_URL` only.

### Backend Secrets That Must Never Go In Frontend

Never put these in Cloudflare Worker public/frontend variables:

- `SUPABASE_SECRET_KEY`
- `DOWNLOAD_SIGNING_SECRET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

## Completed Work / PR History

This summary is based on first-parent git history and docs as of `main` at merge commit `6404ba3`.

### PR #1 - Rebrand MikeOSS to GaryOSS

Purpose:

- Establish GaryOSS identity from the MikeOSS fork.

Major areas touched:

- README.
- Backend package/env/storage labels.
- Frontend package/layout/logo/sidebar copy.

Behavior changed:

- Project naming shifted toward GaryOSS.

Limitations/TODOs:

- Some internal `Mike*` type and component names remain and should not be casually renamed.

### PR #2 - Cloudflare/OpenNext compatibility

Purpose:

- Make the frontend deployable to Cloudflare Workers using OpenNext.

Major areas touched:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/wrangler.jsonc`
- README deployment notes

Behavior changed:

- Added `cf:*` scripts and Worker config.

Limitations/TODOs:

- Backend remains a separate Node service.
- Do not switch to Cloudflare Pages.

### PR #3 - Remove frontend Bun lockfile

Purpose:

- Standardize frontend dependency installation on npm.

Major areas touched:

- Removed `frontend/bun.lock`.

Behavior changed:

- Avoids package-manager drift for npm-based deploys.

### PR #4 - Backend deployment documentation

Purpose:

- Add backend deploy guidance for Node hosts.

Major areas touched:

- `backend/DEPLOY.md`
- README deployment section

Behavior changed:

- Documentation only.

Limitations/TODOs:

- Railway deployment still needs to be performed manually.

### PR #5 - Remove backend Bun lockfile

Purpose:

- Standardize backend dependency installation on npm.

Major areas touched:

- Removed `backend/bun.lock`.

Behavior changed:

- Avoids package-manager drift for Railway/Render.

### PR #6 - Gary mode home/dashboard shell

Purpose:

- Make the frontend feel like GaryOSS rather than a generic chat app.

Major areas touched:

- `frontend/src/app/components/assistant/InitialView.tsx`
- `frontend/src/app/components/assistant/ChatInput.tsx`

Behavior changed:

- Added the action-card home direction around Gary workflows.

Limitations/TODOs:

- Several actions were still shells depending on backend connectivity.

### PR #7 - Lawyer-friendly empty/loading/error copy

Purpose:

- Make UI copy more approachable for a non-technical lawyer.

Major areas touched:

- Account pages.
- Projects/matters components.
- Shared document modals and file directory.
- Tabular review and workflow components.
- Error pages.

Behavior changed:

- More lawyer-friendly empty states and labels.

### PR #8 - Contract Review workflow shell

Purpose:

- Add a frontend contract review entry point.

Major areas touched:

- `frontend/src/app/(pages)/review/page.tsx`
- Assistant initial view action.

Behavior changed:

- Added `/review` flow that chooses/uploads a contract and starts chat with a prepared review prompt.

Limitations/TODOs:

- Real backend contract-review workflow remains future work.

### PR #9 - Draft Something workflow shell

Purpose:

- Add a frontend drafting entry point.

Major areas touched:

- `frontend/src/app/(pages)/draft/page.tsx`
- Assistant initial view action.

Behavior changed:

- Added `/draft` flow with drafting types, details, optional attachment, and chat handoff.

Limitations/TODOs:

- Real backend drafting workflow remains future work.

### PR #10 - Rename/copy cleanup

Purpose:

- Remove remaining generic/provider-heavy naming from visible UI.

Major areas touched:

- Account layout/model settings.
- `ModelToggle`.
- API-key missing modal.

Behavior changed:

- Copy moved closer to GaryOSS language.

### PR #11 - Dev auth bypass

Purpose:

- Allow frontend inspection without a real Supabase session.

Major areas touched:

- `frontend/.env.local.example`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/dev-auth-banner.tsx`
- Login/signup layout.

Behavior changed:

- `NEXT_PUBLIC_GARY_SKIP_AUTH=true` creates a fake demo user in the frontend.

Limitations/TODOs:

- Not production security.
- Backend calls are not authenticated by this bypass.

### PR #12 - Frontend walkthrough polish and bugfix pass

Purpose:

- Improve the first-run walkthrough and shell UX after early Gary-mode work.

Major areas touched:

- Draft/review shell pages.
- Login/signup.
- Sidebar.
- Assistant initial view.

Behavior changed:

- Backend-unavailable messaging and navigation polish.

### PR #13 - Explain This workflow shell

Purpose:

- Add legal-language explanation entry point.

Major areas touched:

- `frontend/src/app/(pages)/explain/page.tsx`
- Assistant initial view action.

Behavior changed:

- Added `/explain` flow with structured explanation expectations.

Limitations/TODOs:

- Real backend explanation workflow remains future work.

### PR #14

No PR #14 merge commit was found in first-parent `main` history during PR #20 inspection. Numbering appears to have shifted because later minor fixes changed the sequence.

### PR #15 - shadcn/ui foundation and font/build reliability

Purpose:

- Add initial shadcn-style primitives and reduce remote font build fragility.

Major areas touched:

- `frontend/package.json`
- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/ui/*`

Behavior changed:

- Added UI primitives such as alert, card, label, separator, skeleton, tabs, and textarea.
- Moved font strategy toward `@fontsource/inter`.

Limitations/TODOs:

- `@fontsource/inter` must remain present in `frontend/package-lock.json` for `npm ci`.

### PR #16 - Detailed handoff documentation

Purpose:

- Add initial architecture/handoff/status/roadmap documentation.

Major areas touched:

- `docs/HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT_STATUS.md`
- `docs/ROADMAP.md`
- README docs links.

Behavior changed:

- Documentation only.

### PR #17 - Matter/client structure polish

Purpose:

- Make the frontend feel organized around legal matters, clients, and documents instead of generic projects/workspaces/files.

Major areas touched:

- Matter/project UI components.
- File/directory/document modals.
- Assistant matter selectors.
- Tabular review matter labels.
- `frontend/package-lock.json`

Behavior changed:

- User-facing project/workspace language shifted to matter language where appropriate.
- User-facing file language shifted to document language where appropriate.
- Lockfile was updated to include `@fontsource/inter`.

Limitations/TODOs:

- Internal/API/database names still use project concepts.

### PR #18 - Cited-answer UI expectations

Purpose:

- Make clear that legal answers should be checked against cited source documents.

Major areas touched:

- `AssistantMessage`
- `ChatInput`
- `InitialView`
- `TRChatPanel`
- `TRTable`
- Review/Draft/Explain pages

Behavior changed:

- Added citation expectation copy near Ask Gary.
- Added citation/source cards when existing metadata exists.
- Added unverified warning when no source metadata is shown.

Limitations/TODOs:

- No new backend citation logic was added.
- Citations must not be faked.

### PR #19 - Railway backend deployment prep

Purpose:

- Prepare backend env documentation for Railway deployment.

Major areas touched:

- `backend/.env.example`

Behavior changed:

- Added `NEXT_PUBLIC_SUPABASE_URL` because backend workflow route still reads it.

Validation from PR #19:

- `cd backend && npm ci` passed.
- `cd backend && npm run build` passed.
- `npm start` with placeholder env on `PORT=43019` passed.
- `GET /health` returned `{"ok":true}`.

Limitations/TODOs:

- Backend still needs to be deployed manually to Railway.

## Current Deployment State

As of this handoff:

- Frontend deployment path to Cloudflare Workers/OpenNext is configured and was previously proven.
- Old Cloudflare Pages direction should not be used. No Cloudflare Pages deployment config is part of the current intended architecture; project context says the old Pages version was deleted.
- Backend deployment prep is merged.
- Backend is intended for Railway.
- This documentation does not confirm that the backend has already been deployed to Railway.
- The Cloudflare frontend still needs `NEXT_PUBLIC_API_BASE_URL` pointed at the Railway backend URL after deployment.
- The Cloudflare frontend Supabase public key should be set as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, which is the current code's name for the anon/publishable key.
- Railway backend still needs `FRONTEND_URL` pointed at the deployed frontend Worker URL for CORS.

## Known Issues / Blockers

- Backend may not yet be deployed unless the user has done it manually after PR #19.
- Upload/chat/review/draft/explain may not fully work until the backend is deployed and connected.
- Repo-wide lint debt remains. After PR #18, frontend lint reported about 106 problems: 38 errors and 68 warnings. Verify the current number before treating it as exact.
- Raw frontend build can fail without Supabase public env vars because routes such as `/account/models` need them during prerender/build.
- Placeholder Supabase env vars may be needed for local frontend builds.
- Dev auth bypass is temporary and must not be shipped as real security.
- Managed Provider Mode is not fully implemented.
- Private single-user allowlist is not implemented.
- Backend still reads `NEXT_PUBLIC_SUPABASE_URL` in `backend/src/routes/workflows.ts`.
- Do not upload real client documents until end-to-end deployment, data handling, provider behavior, and deletion behavior are verified.

## Security, Legal, and Privacy Cautions

Acceptable claims:

- Private hosted workspace.
- Admin-configured AI provider.
- No user-facing API keys in the intended product direction.
- Cited answers for lawyer verification.
- Documents can be deleted only if the current app/backend flow actually supports that action.

Avoid claims unless literally true and verified:

- privilege-safe;
- no third party sees data;
- fully local;
- confidentiality guaranteed;
- no risk;
- legally verified;
- guaranteed accurate.

Warnings:

- Provider APIs may process document text.
- Supabase, R2, and provider configuration matters.
- Backend secrets must stay backend-only.
- Do not use real client-sensitive files until data handling is reviewed.
- Cited answers still require lawyer review.

## Guardrails

- Do not switch back to Cloudflare Pages.
- Do not use `@cloudflare/next-on-pages`.
- Do not put provider secrets in the frontend Worker.
- Do not remove the AGPL license.
- Do not make broad backend changes during frontend polish PRs.
- Do not delete auth permanently.
- Do not ship dev auth bypass as production security.
- Do not claim privilege safety or confidentiality guarantees unless technically true.
- Do not add SaaS, billing, team, or role complexity yet.
- Do not build a full CLM yet.
- Do not rename internal/API `project` identifiers unless a planned migration supports it.
- Do not fake citations.
- Do not upload real client documents during early smoke tests.

## Next Recommended PRs

The immediate next step after this documentation is deployment, not new features.

### 1. Deploy Backend on Railway

Goal:

- Get the Express backend live and verify `/health`.

Scope:

- Railway setup, env vars, deploy logs, health check.

Avoid:

- Product behavior changes.
- Schema changes.

### 2. Connect Cloudflare Frontend to Railway Backend

Goal:

- Set `NEXT_PUBLIC_API_BASE_URL` to the Railway backend URL and redeploy the frontend Worker.

Scope:

- Cloudflare/OpenNext env and deploy wiring.
- Railway `FRONTEND_URL` CORS update.

Avoid:

- Rebuilding frontend architecture.
- Moving frontend to Pages.

### 3. Smoke-Test Upload and Chat With Harmless Document

Goal:

- Confirm the V1 path works with fake/test content.

Scope:

- Upload a tiny harmless PDF/DOCX.
- Ask "What is this document about?"
- Check answer and citation UI.

Avoid:

- Real client documents.

### 4. Fix Deployment/CORS/Env/R2/Supabase/Provider Issues

Goal:

- Resolve concrete issues discovered during smoke testing.

Scope:

- Narrow deployment and configuration fixes.

Avoid:

- New product features.

### 5. Managed Provider Mode

Goal:

- Hide BYOK/API-key UI from normal user and use server-side provider keys only.

Scope:

- Friendly "GaryOSS is not configured yet. Contact the administrator." messaging.
- Backend-managed Gemini/Anthropic configuration.

Avoid:

- Exposing keys to frontend.
- Building a full provider marketplace.

### 6. Private Single-User Allowlist

Goal:

- Restrict access to Gary and admin/maintainer accounts.

Suggested env:

```bash
GARY_ALLOWED_EMAILS=gary@example.com,zack@example.com
```

Scope:

- Server-side enforcement.
- Frontend-friendly unauthorized message.

Avoid:

- Multi-tenant team/role systems.

### 7. Real Contract Review Backend Workflow

Goal:

- Replace the current shell with a real backend-backed review workflow.

Scope:

- Contract review prompt pipeline.
- Cited findings.
- Result UX that stays simple.

Avoid:

- Full CLM expansion.

### 8. Real Drafting Backend Workflow

Goal:

- Make Draft Something reliably backend-backed.

Scope:

- Draft prompt flow.
- Optional document grounding.
- Clear review-before-use caution.

Avoid:

- Full document editor/platform rewrite.

### 9. Real Explain This Backend Workflow

Goal:

- Make Explain This reliably backend-backed and consistent.

Scope:

- Structured output:
  - What it says
  - Why it matters
  - What could go wrong
  - Possible revision

Avoid:

- New product areas.

### 10. Repo-Wide Lint Triage

Goal:

- Reduce lint debt so CI failures become meaningful.

Scope:

- Small, staged cleanup by directory.

Avoid:

- Hiding behavior changes inside lint cleanup.

### 11. Clean Backend Env Naming

Goal:

- Replace backend usage of `NEXT_PUBLIC_SUPABASE_URL` with `SUPABASE_URL`.

Scope:

- `backend/src/routes/workflows.ts`.
- Update docs and env examples afterward.

Avoid:

- Frontend Supabase env changes in the same PR unless necessary.

## Commands

### Frontend

```bash
cd frontend
npm ci
npm run build
npm run lint
```

Cloudflare/OpenNext:

```bash
cd frontend
npm run cf:build
npm run cf:deploy
npm run cf:preview
npm run upload
```

Build note:

- Frontend builds may require placeholder public Supabase env vars if real values are not available.
- `NEXT_PUBLIC_*` values are baked at build time.

Example local placeholder build:

```bash
cd frontend
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=anon-key \
SUPABASE_SECRET_KEY=service-key \
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 \
npm run build
```

PowerShell equivalent:

```powershell
cd frontend
$env:NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY='anon-key'
$env:SUPABASE_SECRET_KEY='service-key'
$env:NEXT_PUBLIC_API_BASE_URL='http://localhost:3001'
npm run build
```

### Backend

```bash
cd backend
npm ci
npm run build
npm start
```

Health check:

```bash
curl http://localhost:3001/health
```

Expected:

```json
{"ok":true}
```

## New Conversation Handoff

Copy/paste this section into a future ChatGPT or Claude Code conversation:

```text
We are working on GaryOSS, a fork of MikeOSS in https://github.com/foolish-bandit/gary. GaryOSS is a private hosted legal AI workspace for Gary, a lawyer. It is not a commercial SaaS yet and not a full CLM yet. Core principle: Gary needs a toaster, not the cockpit of a Boeing 777. Intended V1 journey: log in / dev auth bypass -> upload document -> Ask Gary -> get a cited answer.

Architecture: frontend is Next.js deployed to Cloudflare Workers using OpenNext (`@opennextjs/cloudflare`). Do not use Cloudflare Pages and do not use `@cloudflare/next-on-pages`. Frontend Worker config is `frontend/wrangler.jsonc`; OpenNext config is `frontend/open-next.config.ts`. `NEXT_PUBLIC_*` env vars are baked at build time, so changing `NEXT_PUBLIC_API_BASE_URL` requires rebuilding/redeploying the frontend Worker.

Backend is Node/Express/TypeScript in `backend/`, intended to deploy on Railway. Backend package manager is npm. Commands: root directory `backend`, install `npm install`, build `npm run build`, start `npm start`, health check `GET /health` returns `{"ok":true}`. Backend uses `process.env.PORT ?? 3001` and CORS uses `FRONTEND_URL` with localhost fallback. Node target is 22.x. `backend/nixpacks.toml` declares LibreOffice for document conversion. Backend is not suited for Cloudflare Workers because it needs normal Node/server behavior, uploads, storage SDKs, and LibreOffice.

Storage/auth/providers: Supabase for auth/db, Cloudflare R2 for files, Gemini and Anthropic via backend environment variables. Provider secrets, R2 secrets, and Supabase service-role key must stay backend-only. Never put them in frontend Worker variables.

Completed work through PR #19: GaryOSS rebrand (#1), Cloudflare/OpenNext frontend path (#2), removed frontend Bun lock (#3), backend deployment docs (#4), removed backend Bun lock (#5), Gary-mode dashboard (#6), lawyer-friendly empty/copy polish (#7), Review Contract shell (#8), Draft Something shell (#9), rename/copy cleanup (#10), dev auth bypass (#11), frontend walkthrough polish (#12), Explain This shell (#13), shadcn/ui and font/build foundation (#15), initial docs (#16), matter/client/document terminology polish and font lockfile fix (#17), cited-answer UI expectations (#18), Railway backend deployment prep (#19). PR #14 was not found in first-parent main history.

Current frontend state: main actions are Ask Gary, Upload Document, Review Contract, Draft Something, Explain This. Sidebar uses Ask Gary. Matter terminology is used where user-facing UI means legal matter; document terminology is used for uploaded legal files. `/review`, `/draft`, and `/explain` are frontend shells that reuse assistant chat if backend is available; otherwise they show "This will be available once GaryOSS is connected to the backend." Explain This is structured around What it says, Why it matters, What could go wrong, Possible revision. Citation UI shows existing citation metadata as cards/chips and warns "No source citation shown. Treat this answer as unverified." when metadata is missing. Do not fake citations.

Dev auth bypass exists with `NEXT_PUBLIC_GARY_SKIP_AUTH=true`. It lets the frontend inspect the app with a fake demo user and shows a small notice/banner. It is temporary and is not production security.

Current backend env vars required on Railway: FRONTEND_URL, SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, GEMINI_API_KEY, ANTHROPIC_API_KEY. Optional: PORT, DOWNLOAD_SIGNING_SECRET, OPENROUTER_API_KEY, RESEND_API_KEY. Oddity: backend/src/routes/workflows.ts still reads NEXT_PUBLIC_SUPABASE_URL, so set it equal to SUPABASE_URL until a cleanup PR replaces it.

Current deployment state: frontend Worker/OpenNext path is configured and previously proven. Backend deployment prep is merged, but backend may not yet be deployed unless the user did it manually. Next step is deploy backend on Railway, verify `/health`, set Cloudflare frontend `NEXT_PUBLIC_API_BASE_URL=https://your-railway-backend-url`, ensure the frontend Supabase public key is set as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (the current code's name for the anon/publishable key), redeploy frontend Worker, set Railway `FRONTEND_URL=https://your-cloudflare-worker-url`, and smoke test with a harmless fake PDF/DOCX. Do not upload real client documents yet.

Known blockers/issues: backend may not be live; upload/chat/review/draft/explain depend on backend connectivity; frontend lint has repo-wide debt (after PR #18 about 106 problems, verify current number); frontend build can require Supabase env vars; dev auth bypass is temporary; Managed Provider Mode and private email allowlist are not implemented; backend still reads NEXT_PUBLIC_SUPABASE_URL.

Guardrails: docs-only or narrow deployment fixes unless explicitly asked; do not switch back to Cloudflare Pages; do not use next-on-pages; do not put provider/R2/Supabase service secrets in frontend; do not remove AGPL license; do not remove auth; do not ship dev auth bypass as security; do not add SaaS/billing/team complexity; do not build full CLM; do not rename internal/API project identifiers casually; do not fake citations.
```
