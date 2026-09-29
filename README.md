<<<<<<< HEAD
# TRACE

Transaction and Risk Audit with Calling Engine. TRACE is a working hackathon demo for investigating suspicious transaction patterns through evidence, relationship graphs, timelines, verification calls, and live metrics.

```
.
|-- backend/   FastAPI, SQLAlchemy, Alembic, and local SQLite database
|-- frontend/  Vite, React, TypeScript, and Tailwind
`-- data/      Synthetic-data generator
```

## Prerequisites

- Python 3.11+
- Node.js 20+

SQLite is file-based. No PostgreSQL installation, service, credentials, or database-creation command is required.

## Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Copy the environment config if needed:

- Windows: `copy .env.example .env`
- macOS / Linux: `cp .env.example .env`

The default configuration is local and self-contained:

```env
DATABASE_URL=sqlite:///./trace.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Run the SQLite migration and seed the data:

```bash
cd backend
alembic upgrade head
.venv\Scripts\python ..\data\scripts\generate_data.py
```

Start the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check: [http://localhost:8000/health](http://localhost:8000/health)

OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite server runs at [http://localhost:5173](http://localhost:5173). To target a different API host, create `frontend/.env.local` with:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Pages

| Path | Page |
|---|---|
| `/dashboard` | Active fraud alerts |
| `/cases` | Searchable case registry |
| `/cases/:id` | Evidence, relationship graph, timeline, and calls |
| `/graph` | Case relationship graph explorer |
| `/metrics` | Precision, recall, FPR, and call impact |

## API

- `GET /alerts` and `GET /alerts/{case_id}`
- `GET /graph/{case_id}` and `GET /timeline/{case_id}`
- `GET /metrics`
- `POST /cases/{case_id}/trigger-call`
- `GET /cases/{case_id}/calls`
- `PATCH /cases/{case_id}`
- `GET /cases/{case_id}/export`

## Verification

```bash
cd backend
.venv\Scripts\python scripts\evaluate.py
.venv\Scripts\python test_detectors.py
.venv\Scripts\python test_graph_timeline.py
```

## Stack

- API: FastAPI, SQLAlchemy, Alembic, SQLite, NetworkX
- UI: Vite, React, TypeScript, Tailwind, React Router, react-force-graph-2d
=======
# TRACE-financial-crime-insider-risk-investigation-platform-
Financial crime &amp; insider risk investigation platform — hackathon build with explainable alerts and an AI verification calling agent
>>>>>>> 80ed4e0e07522c7aa8cc835bacb509513bd5cbcc
