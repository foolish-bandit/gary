## FORKED FROM [WILL CHEN](github.com/willchen96)'S [MIKE](github.com/willchen96/mike)

# GaryOSS

Forked from [Mike](github.com/willchen96/mike). Like Mike, this is a private, hosted legal AI workspace. However, Gary is aimed at attorneys who are less tech savvy. You can do the usual upload of legal documents, ask questions, and get cited answers --- but you won't be managing API keys.

Open-source release containing the GaryOSS frontend and backend.

## Contents

- `frontend/` - Next.js application
- `backend/` - Express API, Supabase access, document processing, and migrations
- `backend/migrations/000_one_shot_schema.sql` - one-shot Supabase schema for fresh databases


## Handoff Docs

- [docs/HANDOFF.md](docs/HANDOFF.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/DEPLOYMENT_STATUS.md](docs/DEPLOYMENT_STATUS.md)
- [docs/RAILWAY_BACKEND_SETUP.md](docs/RAILWAY_BACKEND_SETUP.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## Setup

Install dependencies:

```bash
npm install --prefix backend
npm install --prefix frontend
```

Create local env files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Run `backend/migrations/000_one_shot_schema.sql` in the Supabase SQL editor for a fresh database.

Start the backend:

```bash
npm run dev --prefix backend
```

Start the frontend:

```bash
npm run dev --prefix frontend
```

Open `http://localhost:3000`.

## Required Services

- Supabase Auth and Postgres
- S3-compatible object storage, such as Cloudflare R2
- At least one supported model provider key, depending on which models you enable
- LibreOffice for DOC/DOCX to PDF conversion

## Checks

```bash
npm run build --prefix backend
npm run build --prefix frontend
npm run lint --prefix frontend
```

## Deployment

The Next.js frontend deploys to **Cloudflare Workers** (via the
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapter), not
Cloudflare Pages. The Workers configuration lives in
`frontend/wrangler.jsonc`.

```bash
cd frontend
npm install
npm run cf:build
npm run cf:deploy
```

`cf:build` produces the OpenNext bundle in `frontend/.open-next/`; `cf:deploy`
publishes it to Cloudflare Workers. Use `npm run cf:preview` to preview the
built worker locally.

The Express backend is **not** Workers-compatible (it uses Node-only APIs and
shells out to LibreOffice). Deploy it to Railway or Render — see
[`backend/DEPLOY.md`](backend/DEPLOY.md) for install/build/start commands,
required environment variables, and a post-deploy smoke test.

## License

AGPL-3.0-only. See `LICENSE`.
