# TRACE Demo Guide

Complete walkthrough for presenting the TRACE fraud detection system.

## Quick Start

### 1. Start Backend API

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload
```

Running at: http://localhost:8000

### 2. Start Frontend

```powershell
cd frontend
npm run dev
```

Running at: http://localhost:5173

### 3. Generate Data (if needed)

```powershell
cd data
..\backend\.venv\Scripts\activate
python scripts\generate_data.py
```

---

## Demo Flow

### Part 1: Landing Page (30 seconds)

**Navigate to**: http://localhost:5173

**Talking points:**
- "TRACE is a fraud detection system that connects insider activity to financial crime"
- "Dark, security-focused UI with control room aesthetic"
- "Three key metrics: 247 cases resolved, 18-minute average time-to-evidence, 2.1% false positive rate"
- "Built for compliance teams who need explainable, auditable results"

**Show:**
- Hero headline and stats bar
- Three feature cards (Real-time Detection, Structured Evidence, Network Visualization)
- Click "Launch Dashboard" button

---

### Part 2: Alert Dashboard (2 minutes)

**Page**: http://localhost:5173/dashboard

**Talking points:**
- "Real-time alerts from our detection engine"
- "Risk level badges at the top show Critical, High, and Medium alerts at a glance"
- "Each row is a case with structured metadata"

**Demonstrate:**

1. **Risk Level Badges:**
   - Point out Critical (red), High (orange), Medium (yellow) counts
   - "Immediately see where to focus attention"

2. **Case Table:**
   - "Each case has an ID, risk level, title, pattern types, evidence count, and status"
   - Point to pattern type badges: `circular_transfer`, `structuring`, `insider_link`, etc.

3. **Sorting:**
   - Click "Risk Level" header → sorts by severity
   - Click again → reverses order
   - "Table is fully sortable by any column"

4. **Case Navigation:**
   - "Click any row to drill into full case detail"
   - Click a row (routes to `/cases/:id`)
   - Note: "Case detail page is a placeholder in this demo"

---

### Part 3: Detection System (3 minutes)

**Navigate to API Docs**: http://localhost:8000/docs

**Talking points:**
- "TRACE uses four specialized detectors that return structured evidence"
- "Not a black box ML model — every alert has plain-language reasoning"

**Show API Endpoints:**

1. **GET /alerts** - "Lists all triggered cases"
2. **GET /alerts/{case_id}** - "Full evidence breakdown"
3. **GET /graph/{case_id}** - "Graph data for visualization"
4. **GET /timeline/{case_id}** - "Chronological event list"

**Expand GET /alerts/{case_id}:**
- Click "Try it out"
- Enter case_id: `1`
- Click "Execute"
- Show response:
  - `overall_risk`: "critical"
  - `reasoning`: plain-language explanation
  - `evidence_list`: array of evidence objects

**Point to Evidence structure:**
```json
{
  "rule_name": "circular_transfer",
  "severity": "critical",
  "reason": "Detected circular transfer ring...",
  "supporting_ids": ["101", "102", "103"],
  "metric": {
    "cycle_length": 4,
    "cycle_duration_hours": 18.5,
    "total_amount": 24500.0
  }
}
```

**Talking points:**
- "Every piece of evidence has a severity, a reason, supporting IDs, and quantitative metrics"
- "Compliance officers can explain every decision to auditors"
- "Full traceability back to source transactions and employees"

---

### Part 4: Detection Rules (2 minutes)

**Talking points:**
- "Four detectors cover the most common fraud patterns"

**Explain each detector:**

1. **Circular Transfer Detector**
   - "Uses NetworkX to find cycles in the transaction graph"
   - "Flags 3+ accounts that complete a circle within hours or days"
   - "Classic money laundering pattern"

2. **Structuring Detector (Smurfing)**
   - "Finds clusters of transactions just under $10,000 reporting threshold"
   - "Compares against customer's historical baseline"
   - "Catches both single-source and multi-source patterns"

3. **Profile Mismatch Detector**
   - "Compares transaction volume vs. customer's occupation baseline"
   - "Student moving $50k/month is suspicious"
   - "Flags 3x+ deviations from expected behavior"

4. **Insider Link Detector**
   - "Monitors employee actions: beneficiary updates, KYC edits, unauthorized access"
   - "Links actions to transactions within time windows"
   - "Catches insider fraud with session tracking"

**Key point:**
- "Evidence aggregates using explicit rules, never collapses to a single opaque score"

---

### Part 5: Synthetic Data (1 minute)

**Talking points:**
- "Demo includes labeled synthetic data with ground truth"

**Show data breakdown:**
- 10 employees, 50 customers, ~75 accounts
- ~95 legitimate transactions (salaries, supplier payments, family transfers)
- ~20 suspicious transactions across 3 pattern types:
  - 2 circular transfer rings
  - 2 structuring cases
  - 3 insider fraud cases
- 7 investigation cases created

**Regenerate data (optional):**
```powershell
cd data
..\backend\.venv\Scripts\activate
python scripts\generate_data.py
```

"Takes 10 seconds to clear and regenerate entire dataset"

---

### Part 6: Graph & Timeline APIs (1 minute)

**GET /graph/1** (in Swagger UI):
- "Returns nodes and edges for force-directed visualization"
- Show response: `nodes` array (transactions, accounts, customers, employees)
- Show response: `edges` array (owns, transfer, manages, accessed)
- "Ready to drop into D3.js, vis.js, or Cytoscape"

**GET /timeline/1**:
- "Chronological list of every transaction and employee action"
- Each event has `timestamp`, `actor`, `description`, `evidence_rule`
- "Links back to detector that flagged it"
- "Enables narrative reconstruction of fraud patterns"

---

## Key Differentiators

### 1. Structured Evidence
- Not a risk score
- Every alert has plain-language reasoning
- Supporting IDs trace back to source data
- Quantitative metrics for verification

### 2. Explicit Aggregation
- Rules-based risk assessment
- "2+ independent high signals = critical"
- No black-box ML scoring
- Auditable decision process

### 3. Insider Link Detection
- Connects employee actions to transactions
- Session tracking for coordinated fraud
- Portfolio assignment checks
- Time-windowed correlation

### 4. Network Analysis
- Graph-based cycle detection
- Transaction flow visualization
- Entity relationship mapping
- Full subgraph extraction per case

---

## Questions & Answers

### Q: Is this ML-based?
**A:** Partially. The detectors use rule-based logic and graph algorithms (NetworkX). The profile mismatch detector uses statistical baselines. No black-box neural networks — everything is explainable.

### Q: Does it integrate with real banking systems?
**A:** This is a hackathon prototype with synthetic data. Production would integrate via:
- Real-time transaction feeds
- Employee audit log ingestion
- Customer profile databases
- Core banking system APIs

### Q: How does it scale?
**A:** Current implementation runs all detectors on every API call. Production would:
- Run detectors asynchronously on new data
- Cache results in database
- Use job queues (Celery, RQ)
- Index transactions for fast graph queries

### Q: What about false positives?
**A:** Severity levels help triage. Critical/High alerts need immediate review. Medium/Low are informational. Tune thresholds per institution's risk tolerance.

### Q: Can compliance teams customize rules?
**A:** Yes! Each detector has configurable parameters:
- Time windows
- Amount thresholds
- Deviation ratios
- Minimum transaction counts

---

## Technical Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL + SQLAlchemy
- Alembic (migrations)
- NetworkX (graph analysis)
- Pydantic (validation)

**Frontend:**
- React + TypeScript
- Vite (build tool)
- React Router (navigation)
- Tailwind CSS v4 (styling)

**Key design decisions:**
- No component library (fast, minimal bundle)
- Tailwind-only styling (consistent, responsive)
- Read-only visualization endpoints
- Structured response formats

---

## Files to Show

### Backend Structure
```
backend/app/
├── api/
│   ├── alerts.py          # Detection endpoints
│   ├── graph.py           # Graph visualization
│   └── timeline.py        # Event timeline
├── detectors/
│   ├── circular_transfer_detector.py
│   ├── structuring_detector.py
│   ├── profile_mismatch_detector.py
│   ├── insider_link_detector.py
│   └── aggregator.py      # Evidence aggregation
└── models/
    └── entities.py        # Database models
```

### Frontend Structure
```
frontend/src/
├── pages/
│   ├── Home.tsx           # Marketing landing
│   └── DashboardPage.tsx  # Alert dashboard
└── layout/
    └── AppLayout.tsx      # Sidebar navigation
```

### Documentation
- `README.md` - Project overview
- `QUICKSTART.md` - Setup guide
- `backend/DETECTORS.md` - Detection system details
- `backend/GRAPH_TIMELINE_API.md` - Visualization API docs
- `API_REFERENCE.md` - Complete API docs
- `frontend/FRONTEND.md` - UI documentation

---

## Demo Tips

1. **Have both servers running** before starting the demo
2. **Generate fresh data** if you haven't already
3. **Open browser dev tools** to show API calls in Network tab
4. **Have Swagger UI ready** (http://localhost:8000/docs) for live API demo
5. **Prepare to click through** a case from dashboard to detail page
6. **Keep it fast** — this is a hackathon demo, focus on key features

---

## Backup Demo (API Only)

If frontend has issues, demo via API only:

```bash
# List alerts
curl http://localhost:8000/alerts | jq

# Get case detail
curl http://localhost:8000/alerts/1 | jq

# Get graph
curl http://localhost:8000/graph/1 | jq '.nodes[].type' | sort | uniq -c

# Get timeline
curl http://localhost:8000/timeline/1 | jq '.events[0]'
```

Use Swagger UI for interactive demo: http://localhost:8000/docs

---

## Post-Demo

**What's next?**
1. Implement case detail page with full evidence breakdown
2. Add force-directed graph visualization (D3.js)
3. Build timeline component with event cards
4. Add filters and search to dashboard
5. Real-time updates via WebSockets
6. Export reports to PDF/CSV
7. User authentication and RBAC
8. Integration with real banking systems

**Questions?** Point to documentation in the repo.
