# GaryOSS Deployment Guide

This guide explains the intended deployment architecture and the exact connection between the Cloudflare frontend and Railway backend.

## Deployment Mental Model

```text
Browser
  -> Cloudflare Worker frontend
  -> Railway backend
  -> Supabase / R2 / Gemini / Anthropic
```

The frontend and backend are deployed separately.

- Frontend: Next.js on Cloudflare Workers using OpenNext.
- Backend: Node/Express on Railway.
- Supabase: auth and database.
- R2: document storage.
- Gemini/Anthropic: model providers through backend-only secrets.

## Why This Split Exists

The frontend is the UI. It can run well as a Cloudflare Worker through OpenNext.

The backend is a normal server. It handles uploads, document processing, storage, auth-aware API routes, model calls, signed downloads, and LibreOffice conversion. It needs a host like Railway that can run Node and install native/system packages.

Do not deploy the backend to Cloudflare Workers right now.

## Frontend Deployment

Verified frontend deployment path:

- Cloudflare Workers.
- OpenNext Cloudflare.
- `frontend/wrangler.jsonc`.
- `frontend/open-next.config.ts`.

Do not use:

- Cloudflare Pages.
- `@cloudflare/next-on-pages`.

### Frontend Commands

```bash
cd frontend
npm ci
npm run cf:build
npm run cf:deploy
```

Preview:

```bash
cd frontend
npm run cf:preview
```

Upload-only script:

```bash
cd frontend
npm run upload
```

### Frontend Variables

Set these for the Cloudflare/OpenNext frontend build:

| Variable | Example | Secret | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend.up.railway.app` | no | Must be the Railway backend URL. Not `NEXT_PUBLIC_API_URL`. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | no | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | `ey...` | no | Public anon/publishable key only. |
| `NEXT_PUBLIC_GARY_SKIP_AUTH` | `true` | no | Temporary dev/demo bypass only. Do not treat as production security. |

Supabase public key naming note:

- Some generic Supabase deployment notes call this `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Current GaryOSS frontend code reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- In Cloudflare, set the current repo variable unless a future PR renames the code.

Important:

- `NEXT_PUBLIC_*` values are baked at build time.
- Changing them requires rebuilding and redeploying the Worker.
- Do not put backend secrets in frontend variables.

## Backend Deployment

Backend target:

- Railway first.
- Root directory: `backend`.
- Package manager: npm.
- Install command: `npm install`.
- Build command: `npm run build`.
- Start command: `npm start`.
- Health check path: `/health`.
- Node: 22.x.
- Nixpacks: yes.
- LibreOffice: declared in `backend/nixpacks.toml`.

See the detailed Railway guide:

- [RAILWAY_BACKEND_SETUP.md](RAILWAY_BACKEND_SETUP.md)

Backend documentation also exists at:

- [../backend/DEPLOY.md](../backend/DEPLOY.md)

## Backend Variables

Railway backend required variables:

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

Optional:

- `PORT`
- `DOWNLOAD_SIGNING_SECRET`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

Important:

- `NEXT_PUBLIC_SUPABASE_URL` is required on the backend for now because `backend/src/routes/workflows.ts` still reads it.
- Set it to the same value as `SUPABASE_URL`.
- This should be cleaned in a future PR.

## Connecting Frontend To Backend

After Railway backend is live:

1. Copy the Railway public backend URL, for example:

```text
https://gary-backend-production.up.railway.app
```

2. Set the frontend build variable:

```bash
NEXT_PUBLIC_API_BASE_URL=https://gary-backend-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-anon-or-publishable-key
NEXT_PUBLIC_GARY_SKIP_AUTH=true
```

Do not use `NEXT_PUBLIC_API_URL`; the code reads `NEXT_PUBLIC_API_BASE_URL`.

3. Rebuild and redeploy the Cloudflare Worker.

4. Copy the Cloudflare Worker frontend URL, for example:

```text
https://gary.<account>.workers.dev
```

5. Set Railway backend variable:

```bash
FRONTEND_URL=https://gary.<account>.workers.dev
```

6. Redeploy/restart the Railway backend if Railway does not do it automatically.

## Smoke Test

Use a harmless fake document. Do not use real client files yet.

1. Visit:

```text
https://your-railway-backend-url/health
```

Expected:

```json
{"ok":true}
```

2. Open the Cloudflare Worker frontend URL.

3. Confirm dev auth bypass works if `NEXT_PUBLIC_GARY_SKIP_AUTH=true` is still being used.

4. Upload a tiny harmless PDF or DOCX.

5. Ask Gary:

```text
What is this document about?
```

6. Confirm an answer returns.

7. Confirm citations/source chips appear if backend metadata exists.

8. Try Review Contract.

9. Try Draft Something.

10. Try Explain This.

11. If anything fails, check Railway logs and browser DevTools Network tab.

## Common Problems

### CORS Error

Likely cause:

- Railway `FRONTEND_URL` does not exactly match the Cloudflare frontend origin.

Fix:

- Set `FRONTEND_URL=https://your-cloudflare-worker-url`.
- Redeploy/restart backend.

### Frontend Still Calls Localhost

Likely cause:

- `NEXT_PUBLIC_API_BASE_URL` was not changed before frontend build.
- Cloudflare Worker was not redeployed after env change.

Fix:

- Set `NEXT_PUBLIC_API_BASE_URL=https://your-railway-backend-url`.
- Rebuild and redeploy frontend Worker.

### Upload Fails

Likely causes:

- Missing R2 env var.
- Wrong R2 endpoint.
- Wrong bucket name.
- Backend auth/Supabase issue.

Check:

- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- Railway logs

### Auth Fails

Likely causes:

- Missing Supabase frontend anon/publishable key.
- Missing backend service key.
- Dev auth bypass expectations misunderstood.

Check:

- Frontend `NEXT_PUBLIC_SUPABASE_URL`
- Frontend `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- Backend `SUPABASE_URL`
- Backend `SUPABASE_SECRET_KEY`

### Workflow Fails

Likely cause:

- Backend still reads `NEXT_PUBLIC_SUPABASE_URL`.

Fix:

- Set Railway `NEXT_PUBLIC_SUPABASE_URL` equal to `SUPABASE_URL`.

### Model Answer Fails

Likely causes:

- Missing `GEMINI_API_KEY`.
- Missing `ANTHROPIC_API_KEY`.
- Provider quota/config issue.

Check:

- Railway env vars.
- Railway logs.

### File Conversion Fails

Likely cause:

- LibreOffice was not installed by Nixpacks.

Check:

- Railway build logs.
- `backend/nixpacks.toml`.

## Deployment Guardrails

- Do not put backend secrets in frontend Worker variables.
- Do not manually set `PORT` unless necessary. Railway normally provides it.
- Do not use Cloudflare Pages.
- Do not use `@cloudflare/next-on-pages`.
- Do not upload real client documents during first smoke tests.
- If deploy fails, copy Railway logs before changing code.
