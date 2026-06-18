# Helios — Total Cost & Turnaround Management Platform

An MVP-grade platform for estimating, planning, controlling, and executing large
capital projects (CAPEX) and industrial turnarounds/shutdowns (STO). Original
implementation of the cost-engineering / project-controls product category.

> **Build status:** Phase 1 (Scaffold & infra) complete. The monorepo, database,
> NestJS API (with Swagger), and React frontend are wired and runnable. Subsequent
> phases (auth/RBAC, modules, seed data) build on this foundation.

## Stack

| Layer | Tech |
|-------|------|
| Monorepo | pnpm workspaces |
| Backend | NestJS + TypeScript, Prisma ORM, PostgreSQL, JWT/RBAC (Phase 2), Swagger/OpenAPI |
| Frontend | React 18 + Vite + TypeScript, Tailwind CSS, TanStack Query, Axios, React Router, Recharts, lucide-react |
| Shared | `@helios/types` (DTOs / API envelope / RBAC types) |
| Infra | Docker Compose (PostgreSQL, optional pgAdmin) |

## Layout

```
helios/
├── apps/
│   ├── api/      # NestJS backend (module-per-domain)
│   └── web/      # React + Vite frontend
├── packages/
│   └── types/    # shared TypeScript contracts
├── docker-compose.yml
└── package.json  # workspace scripts
```

## Prerequisites

- Node ≥ 20, pnpm ≥ 9 (`corepack enable pnpm`)
- Docker (for PostgreSQL)

## Quick start

```bash
# 0. from the helios/ directory

# 1. Start PostgreSQL (host port 5434)
pnpm db:up                 # = docker-compose up -d

# 2. Install all workspace deps
pnpm install

# 3. Configure env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Create the database schema + Prisma client
pnpm migrate               # = prisma migrate dev
pnpm seed                  # idempotent demo data (Phase 1: org only)

# 5. Run API + web together
pnpm dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:5175 |
| API | http://localhost:3001/api |
| API health | http://localhost:3001/api/health |
| Swagger / OpenAPI | http://localhost:3001/api/docs |
| pgAdmin (optional) | `docker-compose --profile tools up -d` → http://localhost:5050 |

Open the web app — the landing page shows a **live API + DB health check**,
confirming the full request path works end-to-end.

## Ports

Helios uses **3001 (API)**, **5175 (web)**, and **5434 (Postgres)** so it can run
alongside other local apps without collisions.

## Demo credentials

All demo accounts use password **`Helios@Demo123`** (change for production). The
login page also has a **"Quick login as…"** switcher for one-click role sign-in.

| Role | Email |
|------|-------|
| System Administrator | `admin@helios.demo` |
| Cost Estimator | `estimator@helios.demo` |
| Planner / Scheduler | `planner@helios.demo` |
| Procurement & Contracts | `procurement@helios.demo` |
| Cost Controller | `controller@helios.demo` |
| Risk Analyst | `risk@helios.demo` |
| Turnaround / STO Manager | `sto@helios.demo` |
| Work-Pack Engineer | `workpack@helios.demo` |
| QA/QC & Welding Engineer | `qaqc@helios.demo` |
| Contractor (external) | `contractor@helios.demo` |
| Project / Portfolio Manager | `pm@helios.demo` |
| Executive Sponsor | `executive@helios.demo` |
| Data Steward | `datasteward@helios.demo` |

RBAC is enforced both ways: the sidebar shows only modules a role can access, and
the API rejects unauthorized calls (403). Admins can manage users and view the full
permission matrix at **Administration → Users / Permission Matrix**.

## Deployment

The app is packaged to deploy as a **single Heroku dyno**: the NestJS API serves
the built React SPA (same origin, so no CORS/proxy needed in production). Heroku
Postgres provides `DATABASE_URL`; the release phase runs migrations + seed.

> **Security:** never commit secrets or share passwords. Use a GitHub **Personal
> Access Token** (not your password — GitHub disabled git password auth) and your
> Heroku login. `JWT_SECRET` is generated on Heroku, not stored in the repo.

### 1. Push to GitHub
Create an empty repo named `helios` at https://github.com/new (do **not** add a
README/license), then:
```bash
cd helios
git branch -M main
git remote add origin https://github.com/syedikrar/helios.git
git push -u origin main
# When prompted: username = your GitHub username,
#                password = a Personal Access Token (github.com → Settings →
#                Developer settings → Personal access tokens → "repo" scope)
```

### 2. Deploy to Heroku
Requires the Heroku CLI and a **verified account** (Postgres + dynos are paid;
there is no free tier). One-time:
```bash
heroku login
heroku create my-helios-app                       # → https://my-helios-app.herokuapp.com
heroku addons:create heroku-postgresql:essential-0
heroku config:set JWT_SECRET=$(openssl rand -hex 32) JWT_EXPIRES_IN=1d
heroku stack:set heroku-24                         # Node 20 buildpack
git push heroku main
```
On `git push heroku main` Heroku will: install with pnpm → run `heroku-postbuild`
(prisma generate + build types/api/web) → run the **release** phase
(`prisma migrate deploy` + idempotent seed) → start `web: node apps/api/dist/main.js`.

```bash
heroku open            # opens the app
heroku logs --tail     # watch logs
```
Log in with any demo account (e.g. `admin@helios.demo` / `Helios@Demo123`).

**Notes**
- If Prisma can't connect, append SSL to the URL:
  `heroku config:set DATABASE_URL="$(heroku config:get DATABASE_URL)?sslmode=require"`.
- To re-seed manually: `heroku run "pnpm --filter @helios/api exec tsx prisma/seed.ts"`.
- Already have a GitHub repo connected? Use Heroku Dashboard → *Deploy* → *GitHub*
  → enable automatic deploys instead of `git push heroku`.

### 3. (Optional) Auto-deploy from GitHub Actions
`.github/workflows/deploy.yml` deploys to Heroku on every push to `main` (and runs
a post-deploy health check that rolls back a bad release). **Create the Heroku app
once** (step 2: `heroku create` + addon + `JWT_SECRET`), then add three repo secrets
at **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `HEROKU_API_KEY` | `heroku auth:token` (or Heroku Account → *API Key*) |
| `HEROKU_APP_NAME` | the app name you passed to `heroku create` (e.g. `my-helios-app`) |
| `HEROKU_EMAIL` | your Heroku account email |

After that, `git push origin main` builds and deploys automatically — no manual
`git push heroku` needed. Watch progress in the repo's **Actions** tab.

## Deploy free on Render (no card for the app)

Render runs the app on a free web service (Heroku-like). A `render.yaml` blueprint
is included, so it's almost one-click.

1. Push this repo to GitHub (done above).
2. Go to **https://dashboard.render.com** → **New → Blueprint** → connect your
   GitHub and select the **`helios`** repo. Render reads `render.yaml` and proposes
   a **web service + free Postgres**. Click **Apply**.
3. Wait for the build. On start it runs `prisma migrate deploy` + seed, then serves
   the app at **`https://helios-XXXX.onrender.com`**. Log in with
   `admin@helios.demo` / `Helios@Demo123`.

**Free-tier notes**
- The web service **sleeps after ~15 min idle**; the next request wakes it (~50s).
- Render's **free Postgres expires after 30 days**. For a permanent free database,
  create one at **https://neon.tech** (free) and set `DATABASE_URL` on the Render
  service to the Neon connection string (Neon URLs already include `?sslmode=require`),
  then remove the `databases:` block from `render.yaml`.

## Demo script

A 5-minute walkthrough covering both worlds on seeded data.

### A. CAPEX → live EVM (the cost-control story)
1. **Quick login as Cost Estimator** → **Cost Estimating** → open *GC Refinery Crude Unit Expansion*.
   The **Estimate** tab shows ~32 line items pulled from the Cost Library, with direct/indirect/contingency
   totals (~$285M) and embodied carbon. Use **Add from Cost Library** to search and append an item.
2. **Quick login as Cost Controller** → **Project Controls / EVM** → open *North Sea Platform Topsides Revamp*.
   This is the **trouble project**: a red S-curve (PV area, EV/AC lines), **CPI 0.86 / SPI 0.90**, an
   **overrun anomaly banner**, and a forecast EAC ~$331M (VAC −$46M). Open the **Change** and **Risk** tabs
   for the change register and P50/P80 contingency.
3. **Quick login as Project Manager** → **Portfolio** → see the RAG heatmap; the North Sea project is the only
   one flagged "at risk".
4. **Quick login as Cost Estimator** → **AI Copilot** → "Generate estimate" produces a discipline-weighted
   skeleton from a natural-language brief; the anomaly panel re-flags the trouble project.

### B. STO → weld & QA (the turnaround story)
1. **Quick login as QA/QC & Welding Engineer** → **Weld** → open *Refinery Unit 4 Major Turnaround 2026*.
   See the weld register (60 welds w/ welder/WPS/heat-no traceability), the **LISL** rollup by line/ISO,
   and the **welder qualification table with two expired certs flagged red**. Repair rate ~8%.
2. Same project, **QA/QC** tab → inspection checks + the NCR register; raise an NCR.
3. **Safeguarding** tab → permits; open ones warn that they block execution sign-off.
4. **Quick login as Contractor** → **Execution** → the kanban board of work packs; use **+10%** to submit
   field progress (the only thing a contractor can do — every other module is hidden by RBAC).
5. **Quick login as Data Steward** → **Lessons Learned** → **Push to library** closes the learning loop.

Throughout, **Quick login as System Administrator** → **Audit Trail** shows every mutation captured
automatically, and **Permission Matrix** shows the full 110×13 RBAC grid.

## Roadmap (build phases)

1. ✅ Scaffold & infra
2. ✅ Auth & RBAC (13 roles, JWT, role-aware nav, "Quick login as…")
3. ✅ Foundation modules (Cost Library, Audit, Notifications/Comments, Workflow, Connectors)
4. ✅ CAPEX core (Estimating → Baseline → EVM/S-curve → Change → Risk → Schedule → Tendering → Portfolio → Dashboards → Benchmarking → BIM)
5. ✅ STO core (Scoping → Work Packs → Materials → Weld/WPS/PQR/LISL/certs → QA/QC + NCR → Safeguarding → Execution board → Lessons Learned)
6. ✅ Differentiators (AI Copilot + anomaly detection, ESG/Carbon, Pricing, Developer portal)
7. ✅ Full realistic seed dataset (3 full CAPEX + 2 full STO projects, tenders/contracts/schedules)
8. ✅ Polish & QA + demo script (401 handling, error boundary, per-role verification)
