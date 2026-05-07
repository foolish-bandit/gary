# Architecture

## High-level

GaryOSS is a split architecture:

- `frontend/`: Next.js app (UI, auth-aware client behavior, workflow shells).
- `backend/`: Express + TypeScript API (document processing, storage, model calls, signed download handling).

## Deployment topology (intended)

### Frontend
- Deploy to **Cloudflare Workers** using OpenNext (`@opennextjs/cloudflare`).
- Use `frontend/wrangler.jsonc` + `cf:*` scripts.
- Do **not** deploy frontend to Cloudflare Pages.

### Backend
- Deploy to Node host (Railway/Render/Fly/VPS).
- Not Workers-compatible by design:
  - child process usage (LibreOffice)
  - Node filesystem/buffer expectations
  - document conversion workloads

## Data + integrations

- **Supabase**: auth + DB access.
- **R2 / S3-compatible object storage**: document files.
- **Model providers**: Anthropic/Gemini/OpenRouter (current code/env driven).

## Security boundary

Backend-only secrets include service-role keys and provider keys.
`NEXT_PUBLIC_*` values are build-time/public and must never hold secrets.

## Frontend patterns

- Primary user flow centers on `/assistant`.
- Workflow shells (`/review`, `/draft`, `/explain`) build prepared prompts and route into chat path.
- Backend-unavailable fallback copy is standardized for unfinished connectivity.

## UI foundation

- Tailwind + shadcn-style component primitives in `frontend/src/components/ui`.
- Current foundational primitives include: `button`, `badge`, `input`, `card`, `textarea`, `label`, `alert`, `tabs`, `separator`, `skeleton`.
