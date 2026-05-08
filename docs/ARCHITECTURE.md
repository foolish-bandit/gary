# GaryOSS Architecture

GaryOSS is a split application:

```text
Browser
  -> Cloudflare Worker frontend
  -> Railway backend
  -> Supabase / Cloudflare R2 / Gemini / Anthropic
```

The split is intentional. The frontend is a fast public UI surface. The backend is a normal Node server that handles document processing, storage, model-provider calls, and secrets.

## Product Context

GaryOSS is a private hosted legal AI workspace for Gary. It is not a SaaS yet and not a full CLM yet.

Core V1 journey:

```text
Log in / dev auth bypass -> Upload document -> Ask Gary -> Get cited answer
```

The architecture should support that journey with the least operational and product complexity possible.

## Frontend

Verified facts:

- Directory: `frontend/`.
- Framework: Next.js.
- Runtime/deploy target: Cloudflare Workers.
- Adapter: OpenNext Cloudflare via `@opennextjs/cloudflare`.
- Worker config: `frontend/wrangler.jsonc`.
- OpenNext config: `frontend/open-next.config.ts`.
- Worker entry after build: `.open-next/worker.js`.
- Assets after build: `.open-next/assets`.

Important:

- Do not use Cloudflare Pages.
- Do not use `@cloudflare/next-on-pages`.
- Use the scripts already in `frontend/package.json`.

Relevant scripts:

```bash
cd frontend
npm run build
npm run lint
npm run cf:build
npm run cf:deploy
npm run cf:preview
npm run upload
```

### Frontend Environment Variables

The frontend uses public build-time variables:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXT_PUBLIC_GARY_SKIP_AUTH`

`NEXT_PUBLIC_*` values are public. They are baked into the bundle when the frontend is built. If `NEXT_PUBLIC_API_BASE_URL` changes, rebuild and redeploy the Cloudflare Worker.

Supabase public key naming note:

- Some generic Supabase deployment notes call this `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Current GaryOSS frontend code reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- Use the repo's current variable name unless a future PR renames the code.

The frontend example currently also includes `SUPABASE_SECRET_KEY`. Treat that with care: service-role/secret values must not be placed in frontend Worker public runtime variables or committed anywhere. Backend secrets belong only on the backend host.

## Backend

Verified facts:

- Directory: `backend/`.
- Runtime: Node/Express.
- Language: TypeScript.
- Build output: `backend/dist/`.
- Package manager: npm.
- Lockfile: `backend/package-lock.json`.
- Install: `npm install`.
- Build: `npm run build`.
- Start: `npm start`.
- Health check: `GET /health` returns `{"ok":true}`.
- Port: `process.env.PORT ?? 3001`.
- CORS: `FRONTEND_URL` with `http://localhost:3000` fallback.
- Node target: 22.x.
- LibreOffice: `backend/nixpacks.toml` contains `nixPkgs = ["libreoffice"]`.

Relevant scripts:

```bash
cd backend
npm ci
npm run build
npm start
```

### Backend Routes

Mounted in `backend/src/index.ts`:

- `/chat`
- `/projects`
- `/projects/:projectId/chat`
- `/single-documents`
- `/tabular-review`
- `/workflows`
- `/user`
- `/users`
- `/download`
- `/health`

`/health` is intentionally unauthenticated and should remain safe for host health checks.

## Why Backend Is Not A Worker

The backend is not Cloudflare Workers-compatible right now because it needs:

- normal Node/Express server behavior;
- file upload handling;
- filesystem/buffer behavior;
- S3-compatible storage SDK behavior;
- document conversion;
- LibreOffice;
- long-running document/model tasks.

Forcing this backend into Workers would be a rewrite and is out of scope.

## Data And Integrations

### Supabase

Supabase is used for auth and database access. Backend code reads:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` in `backend/src/routes/workflows.ts`

The `NEXT_PUBLIC_SUPABASE_URL` backend read is a naming mismatch. For now it must be set in Railway to the same value as `SUPABASE_URL`. A later cleanup PR should remove the backend's dependency on the frontend-style env name.

### Cloudflare R2

R2 is the expected S3-compatible storage backend. Backend code reads:

- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

`R2_BUCKET_NAME` defaults to `gary` in code if unset, but it should still be set explicitly in Railway.

### AI Providers

Backend provider keys:

- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`

Optional/provider-adjacent variables documented:

- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

Provider keys are backend-only secrets. Normal GaryOSS users should not manage them.

## Security Boundary

Backend-only secrets:

- `SUPABASE_SECRET_KEY`
- `DOWNLOAD_SIGNING_SECRET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

Public/frontend build-time values:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXT_PUBLIC_GARY_SKIP_AUTH`

Do not blur this line. Anything `NEXT_PUBLIC_*` can be exposed to the browser.

## Current UI/Product Architecture

Main user-facing actions:

- Ask Gary
- Upload Document
- Review Contract
- Draft Something
- Explain This

Current frontend workflow shells:

- `/review`: choose/upload contract, create review prompt, route into chat when backend is available.
- `/draft`: choose draft type, collect facts/tone/audience, optionally attach document, route into chat when backend is available.
- `/explain`: paste legal text, produce structured explanation prompt, route into chat when backend is available.

Current legal workspace language:

- "Matters" for legal matters/cases/projects.
- "Documents" for uploaded legal files.
- "Ask Gary" for the assistant.
- "Citations" or "Sources" for answer grounding.

Internal/API identifiers still use `project` in many places. Do not rename them without a migration plan.

## Deployment Topology

Frontend:

- Cloudflare Workers.
- OpenNext build/deploy.
- Public env vars baked at build time.

Backend:

- Railway first.
- Nixpacks.
- Node 22.x.
- LibreOffice from `backend/nixpacks.toml`.
- Runtime secrets in Railway variables.

Storage/auth/providers:

- Supabase.
- Cloudflare R2.
- Gemini.
- Anthropic.

## Guardrails

- Do not switch to Cloudflare Pages.
- Do not use `@cloudflare/next-on-pages`.
- Do not put backend secrets in frontend variables.
- Do not move provider selection/API key entry to the normal user unless Managed Provider Mode is explicitly being built.
- Do not fake citations.
- Do not claim confidentiality/privilege guarantees unless technically verified.
