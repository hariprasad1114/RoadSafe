# RoadSafe AI

RoadSafe AI turns 105,982 real UK Department for Transport 2022 collisions into
severity predictions, hotspot intelligence, analytics and evidence-led road
safety recommendations. It is a full-stack decision-support tool: a React/Vite
frontend, a FastAPI Python ML backend and an InsForge (Postgres + auth + storage)
backend.

## Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router, Recharts, Leaflet
- **Backend**: FastAPI, scikit-learn, pandas, httpx, joblib
- **Data**: UK DfT 2022 collision dataset (OGL v3.0)
- **Model**: hierarchical two-stage Random Forest (`v1.2.0`, ~44 MB)
- **Backend platform**: InsForge (auth, Postgres, storage, RLS)

## Repository layout

```
RoadSafe/
├── backend/            # FastAPI app, ML training, model artifacts
│   ├── app/            # API, services, schemas, ML features
│   ├── training/       # Dataset prep + model + hotspot training
│   ├── data/           # Processed datasets + recommendations.json
│   ├── models/         # Trained artifacts (model gitignored? large)
│   ├── tests/          # (to be expanded)
│   ├── .env.example
│   ├── Dockerfile
│   └── render.yaml
├── frontend/           # React/Vite app
│   ├── src/
│   ├── vercel.json
│   └── .env.local      # (gitignored) InsForge URL + anon key
├── migrations/         # InsForge SQL migrations
├── scripts/            # DB seeding
├── insforge.toml       # InsForge project config
└── AGENTS.md           # Agent guidance
```

## Quick start

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # fill in InsForge URL/keys
uvicorn app.main:app --reload --port 8000
```

Health check: `http://localhost:8000/health`

### Frontend

```powershell
cd frontend
npm install
# create frontend/.env.local (see .env.example)
npm run dev
```

App: `http://localhost:5173`

## Environment variables

Backend (`backend/.env`):

- `INSFORGE_URL`
- `INSFORGE_ANON_KEY`
- `INSFORGE_API_KEY`
- `CORS_ORIGINS`
- `DATA_CACHE_TTL_SECONDS`, `MAX_DBSCAN_POINTS`, `MAX_EXPORT_ROWS`, `RATE_LIMIT_PER_MINUTE`, `MAX_UPLOAD_MB`

Frontend (`frontend/.env.local`):

- `VITE_INSFORGE_URL`
- `VITE_INSFORGE_ANON_KEY`
- `VITE_API_URL`

## InsForge setup

```powershell
npx -y @insforge/cli link --project-id <id>
npx -y @insforge/cli db migrations up --all
npx -y @insforge/cli config apply --file insforge.toml
python scripts/seed_insforge.py --all
```

Demo accounts (both use `RoadSafeDemo2026!`):

- `admin@roadsafe.app` (admin)
- `analyst@roadsafe.app` (analyst)

## Training

```powershell
cd backend
python -m training.prepare_dataset
python -m training.train_severity
python -m training.train_hotspots
```

## Tests

Frontend:

```powershell
cd frontend
npm run typecheck
npm run test
npm run build
```

Backend (smoke):

```powershell
cd backend
$env:PYTHONPATH='.'
.\.venv\Scripts\python -c "import app.main; print('ok')"
```

## Deployment

- Frontend: Vercel (`vercel.json` for repo-root deployments, `frontend/vercel.json` when the root directory is `frontend`)
- Backend: InsForge compute (`npx -y @insforge/cli compute deploy backend --name roadsafe-api --port 8000 --memory 512 --env-file <prod.env>`) or Render (`backend/render.yaml`) / Docker (`backend/Dockerfile`)
- Database/auth/storage: InsForge

The deployed frontend calls `/api/*` on its own origin. Both `vercel.json` files
rewrite that path to the compute service, so no production `VITE_API_URL` is
needed. Local development still uses `VITE_API_URL` from `frontend/.env.local`.

On the free 512 MB compute tier, set `WARM_DATASET_CACHE=false` so the ~84k-row
analytics dataset is not preloaded at startup (the prediction flow does not need
it). The Docker build also prunes the severity model from 180 to 90 trees per
stage (`python -m app.ml.trim_model`), because deserializing the full model peaks
above 400 MB. The 90-tree subset keeps ~93% prediction agreement with the full
model. If you need the full model and analytics together, use a machine with at
least 2 GB RAM and remove the trim step.

## License

Code: MIT. Data: UK DfT 2022 collision data under the Open Government Licence v3.0.
Model predictions are decision support, not guarantees.
