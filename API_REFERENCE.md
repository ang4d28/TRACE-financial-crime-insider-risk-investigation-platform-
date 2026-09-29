# TRACE API Reference

Complete API documentation for the TRACE fraud detection system.

## Base URL

```
http://localhost:8000
```

## Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/alerts` | GET | List all triggered cases with risk levels |
| `/alerts/{case_id}` | GET | Full evidence breakdown for a case |
| `/graph/{case_id}` | GET | Graph structure for visualization |
| `/timeline/{case_id}` | GET | Chronological event timeline |

---

## GET /health

Health check endpoint to verify API is running.

### Request

```bash
curl http://localhost:8000/health
```

### Response

```json
{
  "status": "ok",
  "service": "TRACE"
}
```

---

## GET /alerts

List all triggered cases with overall risk levels.

### Request

```bash
curl http://localhost:8000/alerts
```

### Response

```json
[
  {
    "case_id": 1,
    "title": "Circular transfer ring detected (4 accounts)",
    "overall_risk": "critical",
    "evidence_count": 3,
    "detection_categories": ["circular_transfer", "structuring_outgoing"]
  },
  {
    "case_id": 2,
    "title": "Structuring detected: 6 transfers under $10k threshold",
    "overall_risk": "high",
    "evidence_count": 2,
    "detection_categories": ["structuring_incoming"]
  }
]
```

### Fields

- `case_id` (int | null) - Database ID of the case, or null for dynamic alerts
- `title` (string) - Human-readable case title
- `overall_risk` (string) - `"low"` | `"medium"` | `"high"` | `"critical"`
- `evidence_count` (int) - Number of evidence signals
- `detection_categories` (string[]) - List of detector rule names

### Detection Categories

- `circular_transfer` - Circular transfer ring
- `structuring_outgoing` - Structuring (single source)
- `structuring_incoming` - Structuring (multiple sources)
- `profile_mismatch` - Transaction volume exceeds profile
- `insider_link` - Employee action linked to suspicious transaction

---

## GET /alerts/{case_id}

Full evidence breakdown for a specific case.

### Request

```bash
curl http://localhost:8000/alerts/1
```

### Path Parameters

- `case_id` (int, required) - ID of the case

### Response

```json
{
  "case_id": 1,
  "title": "Circular transfer ring detected (4 accounts)",
  "risk_assessment": {
    "overall_risk": "critical",
    "reasoning": "1 critical-severity signal; spanning 1 detection categories.",
    "evidence_list": [
      {
        "rule_name": "circular_transfer",
        "severity": "critical",
        "reason": "Detected circular transfer ring involving 4 accounts completing within 18.5 hours",
        "supporting_ids": ["101", "102", "103", "104"],
        "metric": {
          "cycle_length": 4,
          "cycle_duration_hours": 18.5,
          "total_amount": 24500.0,
          "account_ids": ["123", "456", "789", "321"]
        }
      }
    ]
  }
}
```

### Evidence Object

| Field | Type | Description |
|-------|------|-------------|
| `rule_name` | string | Detector rule identifier |
| `severity` | string | `"low"` \| `"medium"` \| `"high"` \| `"critical"` |
| `reason` | string | Plain-language explanation (one sentence) |
| `supporting_ids` | string[] | Entity IDs (transactions, employees, accounts) |
| `metric` | object | Detector-specific metrics |

### Error Responses

**404 Not Found:**
```json
{
  "detail": "Case not found"
}
```

---

## GET /graph/{case_id}

Graph structure (nodes & edges) for force-directed visualization.

### Request

```bash
curl http://localhost:8000/graph/1
```

### Path Parameters

- `case_id` (int, required) - ID of the case

### Response

```json
{
  "nodes": [
    {
      "id": "txn_101",
      "type": "transaction",
      "label": "$15,000.00"
    },
    {
      "id": "acc_123",
      "type": "account",
      "label": "Account 4567"
    },
    {
      "id": "cust_42",
      "type": "customer",
      "label": "John Doe"
    },
    {
      "id": "emp_5",
      "type": "employee",
      "label": "Jane Smith"
    }
  ],
  "edges": [
    {
      "source": "cust_42",
      "target": "acc_123",
      "type": "owns"
    },
    {
      "source": "acc_123",
      "target": "txn_101",
      "type": "transfer"
    },
    {
      "source": "txn_101",
      "target": "acc_456",
      "type": "transfer"
    },
    {
      "source": "emp_5",
      "target": "cust_42",
      "type": "accessed"
    }
  ]
}
```

### Node Types

| Type | Description | ID Format | Label Format |
|------|-------------|-----------|--------------|
| `transaction` | Money transfer | `txn_{id}` | `$15,000.00` |
| `account` | Bank account | `acc_{id}` | `Account 4567` |
| `customer` | Bank customer | `cust_{id}` | `John Doe` |
| `employee` | Bank employee | `emp_{id}` | `Jane Smith` |

### Edge Types

| Type | Description | Direction |
|------|-------------|-----------|
| `owns` | Customer owns account | customer → account |
| `transfer` | Money transfer | account → transaction → account |
| `manages` | Employee portfolio assignment | employee → customer |
| `accessed` | Employee action on entity | employee → customer/account |

### Error Responses

**404 Not Found:**
```json
{
  "detail": "Case not found"
}
```

---

## GET /timeline/{case_id}

Chronological timeline of all events related to a case.

### Request

```bash
curl http://localhost:8000/timeline/1
```

### Path Parameters

- `case_id` (int, required) - ID of the case

### Response

```json
{
  "case_id": 1,
  "case_title": "Circular transfer ring detected (4 accounts)",
  "events": [
    {
      "timestamp": "2026-09-20T14:30:00",
      "event_type": "employee_action",
      "actor": "Jane Smith",
      "description": "Update Beneficiary on Account 4567 - Changed beneficiary account information",
      "entity_id": 42,
      "evidence_rule": "insider_link"
    },
    {
      "timestamp": "2026-09-20T14:45:00",
      "event_type": "transaction",
      "actor": "John Doe",
      "description": "Transferred $15,000.00 to Alice Johnson - Beneficiary payment",
      "entity_id": 101,
      "evidence_rule": "insider_link"
    },
    {
      "timestamp": "2026-09-21T10:15:00",
      "event_type": "transaction",
      "actor": "Alice Johnson",
      "description": "Transferred $14,800.00 to Bob Smith - Business expense",
      "entity_id": 102,
      "evidence_rule": "circular_transfer"
    }
  ]
}
```

### Event Object

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string (ISO 8601) | When the event occurred |
| `event_type` | string | `"transaction"` \| `"employee_action"` |
| `actor` | string \| null | Employee name (actions) or customer name (transactions) |
| `description` | string | Human-readable event description |
| `entity_id` | int | Database ID of the transaction or employee action |
| `evidence_rule` | string \| null | Detector rule name if flagged, otherwise null |

### Event Types

**Transaction Event:**
- `actor`: Customer who sent the money
- `description`: "Transferred $X to [recipient] - [transaction description]"

**Employee Action Event:**
- `actor`: Employee who performed the action
- `description`: "[Action Type] on [Target] - [Details]"

### Error Responses

**404 Not Found:**
```json
{
  "detail": "Case not found"
}
```

---

## Common Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 404 | Not Found | Case not found |
| 422 | Unprocessable Entity | Invalid request parameters |
| 500 | Internal Server Error | Server error (check logs) |

---

## Authentication

Currently, the API has no authentication. For production use, implement:
- API keys or JWT tokens
- Role-based access control (RBAC)
- Rate limiting

---

## CORS

The API allows cross-origin requests from:
- `http://localhost:5173` (Vite dev server)
- `http://127.0.0.1:5173`

Configure via `CORS_ORIGINS` in `.env`.

---

## Interactive Documentation

When the API is running, view interactive docs at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These provide:
- Full endpoint documentation
- Request/response schemas
- "Try it out" functionality

---

## Examples

### Python (requests)

```python
import requests

# List alerts
response = requests.get("http://localhost:8000/alerts")
alerts = response.json()

for alert in alerts:
    print(f"{alert['overall_risk'].upper()}: {alert['title']}")

# Get case detail
case_id = alerts[0]['case_id']
detail = requests.get(f"http://localhost:8000/alerts/{case_id}").json()

for evidence in detail['risk_assessment']['evidence_list']:
    print(f"  - [{evidence['severity']}] {evidence['reason']}")
```

### JavaScript (fetch)

```javascript
// List alerts
fetch('http://localhost:8000/alerts')
  .then(res => res.json())
  .then(alerts => {
    alerts.forEach(alert => {
      console.log(`${alert.overall_risk.toUpperCase()}: ${alert.title}`);
    });
  });

// Get graph data
fetch('http://localhost:8000/graph/1')
  .then(res => res.json())
  .then(graph => {
    console.log(`Nodes: ${graph.nodes.length}`);
    console.log(`Edges: ${graph.edges.length}`);
  });
```

### cURL

```bash
# List alerts
curl http://localhost:8000/alerts | jq

# Get alert detail
curl http://localhost:8000/alerts/1 | jq '.risk_assessment.overall_risk'

# Get graph
curl http://localhost:8000/graph/1 | jq '.nodes[].type' | sort | uniq -c

# Get timeline
curl http://localhost:8000/timeline/1 | jq '.events[] | select(.evidence_rule != null)'
```

---

## Rate Limiting (Recommended for Production)

Consider implementing rate limiting:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.get("/alerts")
@limiter.limit("10/minute")
def list_alerts(request: Request, db: Session = Depends(get_db)):
    ...
```

---

## Versioning

Current API version: **v1** (implicit)

For future versions, consider:
- Path-based: `/v2/alerts`
- Header-based: `Accept: application/vnd.trace.v2+json`

---

## Further Reading

- **Detection System**: `backend/DETECTORS.md`
- **Graph & Timeline**: `backend/GRAPH_TIMELINE_API.md`
- **Data Setup**: `DATA_SETUP.md`
- **Quick Start**: `QUICKSTART.md`
