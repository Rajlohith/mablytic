# Mablytic web (v4)

React 18 + TypeScript (strict) + Vite + Tailwind CSS 3 + React Router 6.

## Run

```bash
# 1) Backend (from repo root)
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r ../requirements.txt
cp .env.example .env            # set DATABASE_URL (Postgres) and MABLYTIC_JWT_SECRET
python -m uvicorn main:app --port 8000   # seeds demo data on first start

# 2) Frontend dev server (proxies API calls to :8000)
cd web && npm install && npm run dev      # http://localhost:5173

# 3) Or build once and let FastAPI serve it (single origin, port 8000)
cd web && npm run build                   # writes web/dist; restart the backend
```

For quick local runs without Postgres: `DATABASE_URL=sqlite:///./dev.db` works (development/tests only).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL`, `MABLYTIC_JWT_SECRET`, `GEMINI_API_KEY` | backend | as before; Gemini only for the optional AI copy helper |
| `VITE_API_BASE_URL` | web build | API origin when the app is hosted separately (Firebase). Empty = same origin |
| `VITE_DEV_API` | `npm run dev` | proxy target, default `http://127.0.0.1:8000` |

## Scripts

`npm run dev` · `npm run build` (typecheck + bundle) · `npm run typecheck` · `npm test` ·
`INTEGRATION=1 npm test` (also runs the tests that need a live backend on :8000)

## Routes

Public: `/`, `/section/:slug`, `/article/:slug`, `/search`, `/login`, `/register`.
Readers: `/account` (personalized feed), `/account/preferences`, `/account/security`.
Admin: `/console` (overview), `/console/ads[/new|/:id/edit]`, `/console/campaigns`,
`/console/articles[/new|/:id/edit]`, `/console/users`, `/console/targeting`,
`/console/analytics`, `/console/settings`.
(Admin lives under `/console`, not `/admin`, so a page refresh never collides with the `/admin/*` API.)

## Structure

```
src/api/         typed fetch client + service modules
src/context/     auth (server-verified role) and toasts
src/components/  ui/ (primitives) layout/ ads/ news/ admin/ + route guards
src/pages/       public pages, account/, admin/
src/hooks/       useAsync, useAdPool, useSections ...
src/lib/         formatting, validation, session storage
```

## Advertising

All placements render through `AdSlot` (label: "Advertisement"; layouts: feed, sidebar, inline, banner).
`useAdPool` fetches each page's ads in one batch per placement from the backend, which applies
status, schedule, campaign and placement rules, then preference matching + Thompson Sampling for signed-in readers.
Views (≥50% visible) and clicks are logged for signed-in readers only.

## Demo content

`cd backend && python generate_art.py` regenerates the original SVG artwork in `web/public/art`.
Seeding (`seed_content`) is idempotent and runs on start-up. Articles come from real RSS feeds / free news APIs (`backend/news_ingest.py`); ad creatives remain generated demo art.
