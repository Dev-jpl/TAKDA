# TAKDA v2

> _Takdang aralin_ — capture your day, design your tools. A notebook you can program.

Module-creator-first rebuild. The v1 implementation is preserved on the
[`v1` branch](https://github.com/Dev-jpl/TAKDA/tree/v1) for reference.

## Vision

TAKDA is a toolbox + dynamic renderer for personal data:

- **Schema first** — define what you want to capture.
- **Design freely** — compose capture forms and visualizations from a small
  set of powerful tools (fields, charts, computed properties, triggers).
- **One renderer, many modules** — every module is a JSON-shaped definition
  the renderer knows how to display.

Aesthetic: black-and-white notebook (pencil on paper). Light + dark mode.

## Project layout

```
takda/
├── web/        Next.js 16 + React 19 + Tailwind v4 + Supabase Auth
└── backend/    FastAPI + Postgres
```

## Database setup

After creating your Supabase project, run the migration once in the SQL
editor:

```
db/migrations/v2_001_initial.sql
```

It creates `modules` and `entries` tables with Row Level Security so users
only see their own data, plus triggers to maintain `updated_at`.

## Quick start

### Web

```bash
cd web
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm install
npm run dev
```

Open http://localhost:3000.

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                # fill in Supabase + database values
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/health.

## Tech stack

| Layer    | Choice                                       |
| -------- | -------------------------------------------- |
| Web      | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Auth     | Supabase Auth (email + password)             |
| Backend  | FastAPI, Pydantic v2                         |
| Database | Postgres (Supabase-hosted)                   |
| Hosting  | Vercel (web) + Supabase (db/auth)            |

## Roadmap

- [x] **M0** — Scaffold: landing, login/signup, home, theme toggle, FastAPI health
- [x] **M1** — Module creator: schema, interface, profile, publish, drag/drop, group/ungroup, undo/redo
- [x] **M1.5** — Runtime (use what you designed), list/stat elements, sync to Supabase
- [ ] **M2** — Local-first sync queue (proper offline writes + replay)
- [ ] **M3** — Service Worker / PWA (installable, offline shell)
- [ ] **M4** — Visualization: charts (bar/line/pie), calendar heatmap
- [ ] **M5** — Behavior mode: wires, computed properties (named), Run mode
- [ ] **M6** — Composition (embed modules, cross-module relations, marketplace)
