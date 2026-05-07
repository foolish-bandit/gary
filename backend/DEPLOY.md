# Backend Deployment

The backend is an Express + TypeScript service that talks to Supabase, S3-compatible storage (Cloudflare R2 by default), and one or more model providers (Gemini, Anthropic). It also shells out to LibreOffice for DOC/DOCX → PDF conversion, so it needs a host that can install native packages.

## Recommended hosts

Railway or Render. Both can run a long-lived Node service and install LibreOffice as a system dependency — Railway picks up `backend/nixpacks.toml` automatically.

**Not** Cloudflare Workers: the backend uses Node-only APIs (filesystem, child processes for LibreOffice, large in-memory buffers, the AWS SDK, Multer) and is not Workers-compatible.

## Build settings

| Setting           | Value                                    |
| ----------------- | ---------------------------------------- |
| Root directory    | `backend`                                |
| Package manager   | npm (uses `backend/package-lock.json`)   |
| Install command   | `npm install`                            |
| Build command     | `npm run build`  (runs `tsc` → `dist/`)  |
| Start command     | `npm start`  (runs `node dist/index.js`) |
| Node version      | 22.x (matches `@types/node` ^22.14.1)    |
| Health check path | `GET /health` → `{ "ok": true }`         |
| Port              | reads `PORT`; defaults to `3001`         |

System packages: **LibreOffice** is required for DOC/DOCX → PDF conversion.

- Railway: already declared in `backend/nixpacks.toml` (`nixPkgs = ["libreoffice"]`). No extra config.
- Render: use a Docker-based service or add `apt-get install -y libreoffice` in a build step.

## Environment variables

Source of truth: `backend/.env.example`. Set every variable below in the host's environment / secrets UI — do **not** commit a `.env` file.

### Required

| Variable                | Purpose                                                                             | Secret |
| ----------------------- | ----------------------------------------------------------------------------------- | ------ |
| `FRONTEND_URL`          | Allowed CORS origin. Set to the deployed frontend Worker URL (e.g. `https://gary.<account>.workers.dev` or the custom domain). | no |
| `SUPABASE_URL`          | Supabase project URL.                                                                | no     |
| `NEXT_PUBLIC_SUPABASE_URL` | Same value as `SUPABASE_URL`. `routes/workflows.ts` reads this name; set both until that is unified. | no |
| `SUPABASE_SECRET_KEY`   | Supabase **service-role** key. Server-only.                                          | **yes** |
| `R2_ENDPOINT_URL`       | S3-compatible endpoint, e.g. `https://<account>.r2.cloudflarestorage.com`.           | no     |
| `R2_ACCESS_KEY_ID`      | R2 access key.                                                                       | **yes** |
| `R2_SECRET_ACCESS_KEY`  | R2 secret.                                                                           | **yes** |
| `R2_BUCKET_NAME`        | Bucket name (defaults to `gary` if unset).                                           | no     |

### Provider keys (set the ones you use)

| Variable             | Purpose                                                  | Secret  |
| -------------------- | -------------------------------------------------------- | ------- |
| `GEMINI_API_KEY`     | Google Gemini.                                           | **yes** |
| `ANTHROPIC_API_KEY`  | Anthropic Claude.                                        | **yes** |
| `OPENROUTER_API_KEY` | Listed in `.env.example`; not yet referenced in code.    | **yes** |
| `RESEND_API_KEY`     | Listed in `.env.example`; not yet referenced in code.    | **yes** |

### Optional

| Variable                   | Purpose                                                                              | Secret  |
| -------------------------- | ------------------------------------------------------------------------------------ | ------- |
| `PORT`                     | Listening port. Most hosts inject this automatically.                                | no      |
| `DOWNLOAD_SIGNING_SECRET`  | HMAC secret for signed download tokens. Falls back to `SUPABASE_SECRET_KEY` if unset. | **yes** |

### Never ship these to the frontend Worker

The following must stay on the backend host only. None of them belong in `frontend/.env.local`, `frontend/.dev.vars`, or any `wrangler secret put` for the frontend Worker:

- `SUPABASE_SECRET_KEY` (service-role; bypasses RLS)
- `DOWNLOAD_SIGNING_SECRET`
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`

The frontend Worker only needs `NEXT_PUBLIC_*` values plus its own anon/publishable Supabase key. Anything `NEXT_PUBLIC_*` is baked into the client bundle, so never put a secret there.

## Deployment steps

### Railway

1. New project → Deploy from GitHub repo, set **root directory** to `backend`.
2. Confirm Nixpacks builder (auto-detected) so `nixpacks.toml` installs LibreOffice.
3. Service settings:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Start command: `npm start`
   - Health check path: `/health`
4. Variables → add every required env var from the table above. Mark the ones flagged **Secret** as secret.
5. Deploy. After it boots, hit `https://<service>.up.railway.app/health` — it must return `{"ok":true}`.
6. Copy that public URL into the frontend Worker as `NEXT_PUBLIC_API_BASE_URL` (see "Wire up the frontend" below).
7. Set `FRONTEND_URL` on the backend to the frontend Worker URL and redeploy so CORS allows it.

### Render

1. New → Web Service → connect repo, set **root directory** to `backend`.
2. Runtime: Node. If LibreOffice is not present in the base image, switch to a Docker service or add `apt-get update && apt-get install -y libreoffice` in the build command.
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Health check path: `/health`
6. Add every env var from the table above; mark secrets accordingly.
7. Deploy, then verify `https://<service>.onrender.com/health` returns `{"ok":true}`.
8. Wire `NEXT_PUBLIC_API_BASE_URL` and `FRONTEND_URL` as in the Railway flow.

## Wire up the frontend

The frontend reads the backend URL from `NEXT_PUBLIC_API_BASE_URL`. Because `NEXT_PUBLIC_*` is read at build time by Next.js, it must be present **when `npm run cf:build` runs**, not just at request time.

For Cloudflare Workers via OpenNext:

- Local builds: put `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-url>` in `frontend/.env.local` before `npm run cf:build && npm run cf:deploy`.
- CI builds: export `NEXT_PUBLIC_API_BASE_URL` in the build environment.

After deploy, set the backend's `FRONTEND_URL` to the frontend Worker origin so CORS allows browser requests.

## Post-deploy smoke test

Run through this on the live frontend Worker URL once both services are deployed:

1. Open the frontend Worker URL in a browser. Page renders without console errors.
2. Hit the backend `/health` endpoint directly in the browser or via `curl https://<backend>/health` → `{"ok":true}`.
3. Sign up or log in. Supabase session is created; no CORS errors in DevTools → Network.
4. Upload a small legal document (a short PDF or DOCX). Upload completes, the file appears in the UI.
5. Ask one question against the uploaded document. The assistant streams a response.
6. In DevTools → Network, confirm the question request goes to `https://<backend>/...` (not `localhost:3001`) and returns `200`.
7. In the host's logs (Railway / Render), confirm the request was received and processed.
8. If citations / answer grounding are wired up, confirm the answer references the uploaded document (citation chips, source highlights, etc.).

If any step fails, check, in order: backend `/health`, `FRONTEND_URL` matches the actual frontend origin, `NEXT_PUBLIC_API_BASE_URL` was set at frontend **build** time, and provider/Supabase/R2 keys are populated on the backend.
