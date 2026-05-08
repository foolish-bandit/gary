# Railway Backend Setup

This is a layperson-friendly Railway setup guide for GaryOSS.

The backend is the server side of GaryOSS. It receives requests from the frontend, checks auth, processes documents, talks to Supabase/R2, and calls Gemini/Anthropic.

## What You Are Deploying

Repository:

```text
https://github.com/foolish-bandit/gary
```

Railway service root directory:

```text
backend
```

Commands:

```text
Install: npm install
Build:   npm run build
Start:   npm start
```

Health check:

```text
/health
```

Expected health response:

```json
{"ok":true}
```

## Step-By-Step Setup

### 1. Go To Railway

Open Railway in a browser.

Sign in with GitHub so Railway can access the GaryOSS repository.

### 2. Create A New Project

Choose:

```text
New Project
```

Then choose:

```text
Deploy from GitHub repo
```

Select:

```text
foolish-bandit/gary
```

### 3. Set The Root Directory

Set root directory to:

```text
backend
```

This is important. The repo contains both frontend and backend. Railway must run the backend service, not the repo root and not the frontend.

### 4. Confirm Build Settings

Use:

```text
Install command: npm install
Build command: npm run build
Start command: npm start
```

If Railway asks for Node version, use:

```text
22.x
```

### 5. Confirm Nixpacks

Railway should use Nixpacks automatically.

The backend includes:

```text
backend/nixpacks.toml
```

Current content:

```toml
[phases.setup]
nixPkgs = ["libreoffice"]
```

LibreOffice is needed for DOC/DOCX document conversion. Do not remove this.

### 6. Set Health Check

Set health check path:

```text
/health
```

The backend route is unauthenticated and should return:

```json
{"ok":true}
```

### 7. Add Railway Environment Variables

Add the variables in the table below.

Do not put these secrets in the Cloudflare frontend. Railway is the backend secret store.

| Variable | Required | Example value | Belongs in | Secret | Notes |
| --- | --- | --- | --- | --- | --- |
| `FRONTEND_URL` | required | `https://gary.your-account.workers.dev` | Railway backend | no | Must exactly match the deployed frontend origin for CORS. Use localhost only for local dev. |
| `SUPABASE_URL` | required | `https://your-project.supabase.co` | Railway backend | no | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_URL` | required for now | `https://your-project.supabase.co` | Railway backend | no | Set same as `SUPABASE_URL`; backend workflow route still reads this name. |
| `SUPABASE_SECRET_KEY` | required | `ey...` | Railway backend | yes | Supabase service-role/secret key. Never put in frontend. |
| `R2_ENDPOINT_URL` | required | `https://<account-id>.r2.cloudflarestorage.com` | Railway backend | no | Cloudflare R2 S3 endpoint. |
| `R2_ACCESS_KEY_ID` | required | `abc123` | Railway backend | yes | R2 access key ID. Never put in frontend. |
| `R2_SECRET_ACCESS_KEY` | required | `secret123` | Railway backend | yes | R2 secret access key. Never put in frontend. |
| `R2_BUCKET_NAME` | required | `gary` | Railway backend | no | Bucket name. Code defaults to `gary`, but set it explicitly. |
| `GEMINI_API_KEY` | required | `AIza...` | Railway backend | yes | Gemini provider key. Never put in frontend. |
| `ANTHROPIC_API_KEY` | required | `sk-ant-...` | Railway backend | yes | Anthropic provider key. Never put in frontend. |
| `PORT` | optional | Railway-provided | Railway backend | no | Railway normally injects this. Do not set unless needed. |
| `DOWNLOAD_SIGNING_SECRET` | optional | random long secret | Railway backend | yes | Used for signed downloads; falls back to `SUPABASE_SECRET_KEY` if unset. |
| `OPENROUTER_API_KEY` | optional | `sk-or-...` | Railway backend | yes | Listed in env docs/example; not required for the current Gemini/Anthropic path. |
| `RESEND_API_KEY` | optional | `re_...` | Railway backend | yes | Listed in env docs/example. |

### 8. Deploy

Trigger deploy or redeploy in Railway.

Watch the deploy logs.

Success should show that the backend starts with something like:

```text
Gary backend running on port <port>
```

### 9. Generate Public Railway Domain

In Railway, generate or copy the public service domain.

It will look something like:

```text
https://your-service-name.up.railway.app
```

### 10. Test Health

Open this in a browser:

```text
https://your-service-name.up.railway.app/health
```

Expected:

```json
{"ok":true}
```

If this does not work, do not change product code first. Copy Railway logs and check env vars.

## Connect The Frontend

After `/health` works:

1. Copy the Railway URL.

2. Set the Cloudflare/OpenNext frontend build variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-service-name.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-anon-or-publishable-key
NEXT_PUBLIC_GARY_SKIP_AUTH=true
```

Some Supabase docs call the public key `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Current GaryOSS code reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, so set that current repo variable.

3. Rebuild and redeploy the Cloudflare Worker.

4. Copy the Cloudflare Worker frontend URL.

5. Set Railway backend variable:

```text
FRONTEND_URL=https://your-cloudflare-worker-url
```

6. Redeploy/restart Railway backend if needed.

## First Smoke Test

Use a harmless fake document. Do not use real client files.

1. Visit `/health`.
2. Open the frontend Worker URL.
3. Confirm dev auth bypass works if enabled.
4. Upload a tiny fake PDF or DOCX.
5. Ask Gary:

```text
What is this document about?
```

6. Confirm an answer returns.
7. Confirm citation/source chips appear if metadata exists.
8. Try Review Contract.
9. Try Draft Something.
10. Try Explain This.
11. If anything fails, check Railway logs and browser DevTools Network.

## Common Failure Checklist

### CORS

Symptom:

- Browser request blocked by CORS.

Likely cause:

- Railway `FRONTEND_URL` does not exactly match the frontend origin.

Fix:

- Set `FRONTEND_URL` to the deployed Cloudflare Worker URL.

### Frontend Calls Localhost

Symptom:

- Browser Network tab shows requests to `localhost:3001`.

Likely cause:

- `NEXT_PUBLIC_API_BASE_URL` was not set before frontend build.

Fix:

- Set it to Railway URL.
- Rebuild/redeploy Cloudflare Worker.

### Missing Supabase Backend Env

Symptom:

- Auth-aware backend routes fail.

Check:

- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

### Missing R2 Env

Symptom:

- Upload or download fails.

Check:

- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Missing Provider Key

Symptom:

- Chat/model calls fail.

Check:

- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`

### LibreOffice Issue

Symptom:

- DOC/DOCX conversion fails.

Check:

- Railway build logs.
- Nixpacks picked up `backend/nixpacks.toml`.

## Warnings

- Do not put backend secrets into Cloudflare frontend variables.
- Do not manually set `PORT` unless Railway requires it.
- Use harmless fake documents for first tests.
- Copy Railway logs before making broad code changes.
- Do not claim privilege safety, confidentiality guarantees, or legal verification.
