# TRACE Quick Start Guide

Complete setup and testing guide for the TRACE fraud detection system.

## Prerequisites

- ✅ Python 3.11+ installed
- ✅ Node.js 20+ installed  
- ✅ PostgreSQL 14+ running
- ✅ Empty database named `trace` created

## Step 1: Backend Setup

### Install dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Configure environment

Copy `.env.example` to `.env` and edit if needed:

```powershell
copy .env.example .env
```

Default settings:
```
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/trace
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Run migrations

```powershell
alembic upgrade head
```

This creates 8 tables:
- `employees`, `customers`, `access_rights`
- `accounts`, `transactions`, `employee_actions`
- `cases`, `case_notes`
- Association tables: `case_flagged_transactions`, `case_flagged_employees`

## Step 2: Generate Synthetic Data

```powershell
cd ..\data
..\backend\.venv\Scripts\activate
python scripts\generate_data.py
```

**Output**: ~115 transactions (95 legitimate, ~20 suspicious), 10 employees, 50 customers, 7 cases

**Labeled scenarios**:
- Legitimate: salaries, supplier payments, family transfers, normal KYC updates
- Suspicious: circular rings (2), structuring (2), insider fraud (3)

## Step 3: Test Detectors

```powershell
cd ..\backend
python test_detectors.py
```

**Expected output**:
```
🔍 Running TRACE Detection System
======================================================================

1️⃣  Circular Transfer Detector...
   Found 2-4 circular transfer patterns

2️⃣  Structuring Detector...
   Found 2-6 structuring patterns

3️⃣  Profile Mismatch Detector...
   Found 5-15 profile mismatches

4️⃣  Insider Link Detector...
   Found 3-6 insider links

======================================================================
📊 TOTAL EVIDENCE: 15-30 signals detected
======================================================================

🎯 OVERALL RISK: CRITICAL
📝 Reasoning: 2 critical-severity signals spanning 3 detection categories.
```

## Step 4: Test Graph & Timeline Endpoints (Optional)

After starting the API server (Step 5), test the visualization endpoints:

```powershell
# Install requests library if needed
pip install requests

# Run test
python test_graph_timeline.py
```

This verifies the graph and timeline endpoints return properly structured data.

## Step 5: Start Backend API

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Endpoints**:
- Health: http://localhost:8000/health
- API Docs: http://localhost:8000/docs
- Alerts List: http://localhost:8000/alerts
- Alert Detail: http://localhost:8000/alerts/1

## Step 6: Start Frontend

In a **new terminal**:

```powershell
cd frontend
npm install    # First time only
npm run dev
```

**Access**: http://localhost:5173

## Testing the APIs

### List all alerts

```bash
curl http://localhost:8000/alerts
```

**Response**:
```json
[
  {
    "case_id": 1,
    "title": "Circular transfer ring detected (4 accounts)",
    "overall_risk": "critical",
    "evidence_count": 3,
    "detection_categories": ["circular_transfer", "structuring_outgoing"]
  }
]
```

### Get alert detail

```bash
curl http://localhost:8000/alerts/1
```

### Get case graph (for visualization)

```bash
curl http://localhost:8000/graph/1
```

**Response**:
```json
{
  "nodes": [
    {"id": "txn_101", "type": "transaction", "label": "$15,000.00"},
    {"id": "acc_123", "type": "account", "label": "Account 4567"},
    {"id": "cust_42", "type": "customer", "label": "John Doe"}
  ],
  "edges": [
    {"source": "cust_42", "target": "acc_123", "type": "owns"},
    {"source": "acc_123", "target": "txn_101", "type": "transfer"}
  ]
}
```

### Get case timeline

```bash
curl http://localhost:8000/timeline/1
```

**Response**: Chronological list of all transactions and employee actions related to the case, with links to detector evidence.

## Detection System Overview

TRACE uses **structured evidence** instead of black-box scores:

### 1. Circular Transfer Detector
- Uses NetworkX to find cycles in transaction graph
- Flags 3+ accounts completing circle within days
- Severity based on cycle length and duration

### 2. Structuring Detector  
- Finds transactions just under $10k reporting threshold
- Compares against historical baseline
- Detects both outgoing (single source) and incoming (multiple sources) patterns

### 3. Profile Mismatch Detector
- Compares transaction volume vs. customer occupation baseline
- Uses income estimates (Student: $2k/month, Executive: $20k/month)
- Flags 3x+ deviations from expected behavior

### 4. Insider Link Detector
- Monitors employee actions (beneficiary updates, KYC edits, unauthorized access)
- Links actions to subsequent transactions
- Tracks session IDs for coordinated fraud
- Checks portfolio assignments

### Evidence Aggregation
- **Critical**: 1+ critical signal OR 2+ independent high signals
- **High**: 1+ high signal OR 3+ medium signals
- **Medium**: 2+ medium signals OR 1 medium + 2 low
- **Low**: Only low signals

**Key**: Never collapses to single opaque score—full evidence trail preserved.

## Project Structure

```
TRACE/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health.py          # Health check endpoint
│   │   │   ├── alerts.py          # Detection API endpoints
│   │   │   ├── graph.py           # 🆕 Graph visualization endpoint
│   │   │   └── timeline.py        # 🆕 Timeline endpoint
│   │   ├── detectors/             # Detection module
│   │   │   ├── models.py          # Evidence & RiskAssessment models
│   │   │   ├── circular_transfer_detector.py
│   │   │   ├── structuring_detector.py
│   │   │   ├── profile_mismatch_detector.py
│   │   │   ├── insider_link_detector.py
│   │   │   └── aggregator.py      # Evidence aggregation rules
│   │   ├── models/
│   │   │   └── entities.py        # SQLAlchemy models
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── alembic/                   # Database migrations
│   ├── requirements.txt
│   ├── DETECTORS.md              # Detection system docs
│   ├── GRAPH_TIMELINE_API.md     # 🆕 Visualization API docs
│   ├── test_detectors.py         # Test script
│   └── test_graph_timeline.py    # 🆕 Graph/timeline test
├── data/
│   └── scripts/
│       └── generate_data.py       # Synthetic data generator
├── frontend/
│   └── src/
│       ├── pages/                 # Dashboard, Cases, GraphExplorer
│       └── layout/                # AppLayout with nav
├── DATA_SETUP.md
├── QUICKSTART.md
└── README.md
```

## Troubleshooting

### Database connection error
```
sqlalchemy.exc.OperationalError: could not connect to server
```
**Fix**: Ensure PostgreSQL is running and `trace` database exists:
```sql
CREATE DATABASE trace;
```

### Import error: No module named 'networkx'
```
ModuleNotFoundError: No module named 'networkx'
```
**Fix**: Install dependencies:
```powershell
cd backend
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### No evidence detected
```
⚠️  No evidence detected. Did you run scripts/generate_data.py?
```
**Fix**: Generate synthetic data first:
```powershell
cd data
..\backend\.venv\Scripts\activate
python scripts\generate_data.py
```

### Port already in use
```
ERROR:    [Errno 10048] error while attempting to bind on address
```
**Fix**: Change port or stop the conflicting process:
```powershell
# Use different port
uvicorn app.main:app --reload --port 8001

# Or find and stop the process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

## Next Steps

1. **Explore the data**: Use pgAdmin or psql to query the `trace` database
2. **Customize detectors**: Edit threshold values in detector files
3. **Add new rules**: Create new detector modules following the existing pattern
4. **Integrate frontend**: Connect React components to `/alerts` endpoints
5. **Visualization**: Build graph views using the transaction network data

## Documentation

- **Detection System**: `backend/DETECTORS.md`
- **Data Setup**: `DATA_SETUP.md`
- **Main README**: `README.md`
- **API Docs**: http://localhost:8000/docs (when backend is running)

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review `backend/DETECTORS.md` for detection logic details
3. Check `DATA_SETUP.md` for data generation info
4. Inspect logs from `uvicorn` and the test script
