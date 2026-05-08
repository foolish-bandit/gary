# GaryOSS Deployment Status

This file captures current deployment state as of PR #20.

## Summary

- Frontend deployment path: Cloudflare Workers using OpenNext.
- Backend deployment target: Railway.
- Storage: Cloudflare R2.
- Auth/database: Supabase.
- AI providers: Gemini and Anthropic through backend env vars.
- Backend provider/storage/service secrets must stay backend-only.

## Current State

### Frontend

Status:

- Cloudflare Workers/OpenNext deployment path is configured.
- `frontend/wrangler.jsonc` exists.
- `frontend/open-next.config.ts` exists.
- `frontend/package.json` includes OpenNext/Cloudflare scripts.
- Previous project notes say the Worker deployment path was proven.
- Old Cloudflare Pages direction should not be used.

Important:

- `NEXT_PUBLIC_*` values are baked at build time.
- After changing `NEXT_PUBLIC_API_BASE_URL`, rebuild and redeploy the frontend Worker.

### Backend

Status:

- Backend deployment prep is merged.
- Railway is the intended first deployment host.
- `backend/DEPLOY.md` exists.
- `backend/nixpacks.toml` declares LibreOffice.
- `backend/package-lock.json` exists.
- PR #19 validated:
  - `cd backend && npm ci`
  - `cd backend && npm run build`
  - `npm start` with placeholder env on a local port
  - `GET /health` returning `{"ok":true}`

Unknown:

- This repo does not prove that the backend has already been deployed to Railway.
- Treat backend deployment as the next operational step unless the user confirms it was already done manually.

## Env Relationship

Frontend Cloudflare Worker needs:

- `NEXT_PUBLIC_API_BASE_URL=https://your-railway-backend-url`
- `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-public-anon-or-publishable-key`
- `NEXT_PUBLIC_GARY_SKIP_AUTH=true` only for temporary dev/demo inspection

Some generic Supabase deployment notes call the public key `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Current GaryOSS frontend code reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, so use that variable name unless the code changes.

Railway backend needs:

- `FRONTEND_URL=https://your-cloudflare-worker-url`
- Supabase backend variables
- R2 variables
- provider keys

CORS depends on exact origins:

- Browser origin must match Railway `FRONTEND_URL`.
- Frontend API calls must point at Railway through `NEXT_PUBLIC_API_BASE_URL`.

## Current Blockers

- Backend may not yet be live.
- Frontend may still point to localhost or an old backend until `NEXT_PUBLIC_API_BASE_URL` is changed and redeployed.
- CORS will fail if Railway `FRONTEND_URL` does not exactly match the deployed frontend origin.
- Upload/chat flows will fail if Supabase, R2, or provider env vars are missing.
- LibreOffice conversion can fail if Nixpacks does not install LibreOffice correctly.
- Frontend lint has repo-wide debt.
- Dev auth bypass is not production security.
- Do not use real client documents until smoke tests and data handling have been reviewed.

## Last Known Validation

PR #19 backend validation:

```text
cd backend && npm ci        passed
cd backend && npm run build passed
npm start                  passed with placeholder env on PORT=43019
GET /health                returned {"ok":true}
```

PR #18 frontend validation:

```text
cd frontend && npm ci       passed
npm run build               passed with placeholder env vars
npm run lint                failed on pre-existing repo-wide lint issues
```

The exact frontend lint count should be re-run before quoting in future work. The known recent count was about 106 problems: 38 errors and 68 warnings.

## Next Deployment Step

1. Deploy `backend/` on Railway.
2. Verify `https://your-railway-url/health`.
3. Set Cloudflare Worker `NEXT_PUBLIC_API_BASE_URL` to the Railway URL.
4. Rebuild/redeploy the frontend Worker.
5. Set Railway `FRONTEND_URL` to the Cloudflare Worker URL.
6. Smoke-test with a harmless fake document.
