# Deployment Status

## Current status

- **Frontend:** Worker/OpenNext deployment path configured and previously proven.
- **Backend:** Not fully deployed yet by project choice (documented target: Railway/Render/Fly/VPS).

## Critical env relationships

- Frontend API base: `NEXT_PUBLIC_API_BASE_URL`
- Backend allowed origin: `FRONTEND_URL`
- Supabase URLs/keys per backend + frontend env files.

## Build-time behavior note

OpenNext/Next.js bakes `NEXT_PUBLIC_*` variables at build time.
If `NEXT_PUBLIC_API_BASE_URL` changes, rebuild and redeploy frontend.

## Auth mode status

- Standard auth path exists.
- Temporary dev bypass exists with `NEXT_PUBLIC_GARY_SKIP_AUTH=true`.
- Dev bypass is for development/demo only.

## Current blockers

1. Backend deployment/connectivity pending.
2. In restricted environments, `npm install` may fail fetching `@fontsource/inter`.
3. Frontend lint baseline still has pre-existing repo-wide issues.
