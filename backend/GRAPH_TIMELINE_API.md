# Graph & Timeline API Documentation

Read-only visualization endpoints for case investigation.

## Overview

These endpoints query the database models to provide structured data for frontend visualizations:

- **GET /graph/{case_id}** - Returns graph structure (nodes & edges) for force-directed visualization
- **GET /timeline/{case_id}** - Returns chronological event list with detector evidence links

---

## GET /graph/{case_id}

### Purpose

Builds a subgraph of entities (employees, customers, accounts, transactions) and their relationships relevant to a specific case. Output format is ready for force-directed graph libraries like D3.js, vis.js, or Cytoscape.

### Request

```
GET /graph/{case_id}
```

**Path Parameters:**
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
      "source": "emp_5",
      "target": "cust_42",
      "type": "accessed"
    }
  ]
}
```

### Node Types

| Type | Description | Label Format |
|------|-------------|--------------|
| `transaction` | Money transfer | `$15,000.00` |
| `account` | Bank account | `Account 4567` (last 4 digits) |
| `customer` | Bank customer | `John Doe` (full name) |
| `employee` | Bank employee | `Jane Smith` (full name) |

### Edge Types

| Type | Description | Direction |
|------|-------------|-----------|
| `owns` | Customer owns account | customer → account |
| `transfer` | Money transfer | account → transaction → account |
| `manages` | Employee portfolio assignment | employee → customer |
| `accessed` | Employee action on entity | employee → customer/account |

### Graph Construction Logic

1. **Start with case flagged transactions**
   - Add transaction nodes
   - Add from/to account nodes
   - Add account owner (customer) nodes
   - Create ownership and transfer edges

2. **Add flagged employees**
   - Add employee nodes
   - Link to customers they accessed (from EmployeeActions)
   - Link to customers in their portfolio (from AccessRights)

3. **Deduplicate**
   - Nodes are deduplicated by ID
   - Edges are deduplicated by (source, target, type) tuple

### Example Use Cases

**Frontend visualization:**
```javascript
fetch('/graph/1')
  .then(res => res.json())
  .then(data => {
    // Use with D3.js force-directed layout
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges).id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter());
  });
```

---

## GET /timeline/{case_id}

### Purpose

Returns a chronological timeline of all events (transactions and employee actions) related to a case's entities. Each event includes a reference to the detector rule that flagged it, if applicable.

### Request

```
GET /timeline/{case_id}
```

**Path Parameters:**
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

### Event Types

#### Transaction Events

| Field | Description |
|-------|-------------|
| `event_type` | Always `"transaction"` |
| `actor` | Name of customer who sent the money (from_account owner) |
| `description` | `"Transferred $X to [recipient] - [transaction description]"` |
| `entity_id` | Transaction ID |
| `evidence_rule` | Detector rule name if flagged (or `null`) |

#### Employee Action Events

| Field | Description |
|-------|-------------|
| `event_type` | Always `"employee_action"` |
| `actor` | Name of the employee who performed the action |
| `description` | `"[Action Type] on [Target] - [Details]"` |
| `entity_id` | EmployeeAction ID |
| `evidence_rule` | Detector rule name if flagged (or `null`) |

### Evidence Rule Values

Events may be linked to these detector rules:

- `circular_transfer` - Part of a circular transfer ring
- `structuring_outgoing` - Outgoing structuring pattern
- `structuring_incoming` - Incoming structuring pattern
- `profile_mismatch` - Transaction volume exceeds customer profile
- `insider_link` - Employee action linked to suspicious transaction

If `evidence_rule` is `null`, the event is part of the case context but wasn't directly flagged by a detector.

### Timeline Construction Logic

1. **Collect case transactions**
   - All flagged transactions from the case
   - Extract timestamp, amount, from/to customers, description

2. **Collect related employee actions**
   - Actions by flagged employees
   - Actions on accounts involved in case transactions
   - Actions on customers involved in case transactions

3. **Link to evidence**
   - Run all detectors to get evidence list
   - Map supporting_ids to rule names
   - Annotate events with `evidence_rule` if matched

4. **Sort chronologically**
   - All events sorted by timestamp (oldest first)

### Example Use Cases

**Frontend timeline visualization:**
```javascript
fetch('/timeline/1')
  .then(res => res.json())
  .then(data => {
    data.events.forEach(event => {
      const flagged = event.evidence_rule ? '🚨' : '';
      console.log(`${flagged} [${event.timestamp}] ${event.actor}: ${event.description}`);
    });
  });
```

**Filter flagged events only:**
```javascript
const flaggedEvents = data.events.filter(e => e.evidence_rule !== null);
console.log(`${flaggedEvents.length} flagged events out of ${data.events.length} total`);
```

---

## Error Responses

### 404 Not Found

```json
{
  "detail": "Case not found"
}
```

**Cause:** No case exists with the specified ID.

**Resolution:** Check that the case_id is correct and the database is populated.

---

## Testing

### Manual Testing (with cURL)

```bash
# Get graph for case 1
curl http://localhost:8000/graph/1 | jq

# Get timeline for case 1
curl http://localhost:8000/timeline/1 | jq
```

### Automated Testing

```bash
cd backend
python test_graph_timeline.py
```

**Expected output:**
```
🧪 Testing Graph & Timeline Endpoints
🔗 API: http://localhost:8000

======================================================================
🕸️  Testing GET /graph/1
======================================================================

✓ Response received
  Nodes: 12
  Edges: 15

📊 Node breakdown:
  - account: 4
  - customer: 4
  - employee: 1
  - transaction: 3

🔗 Edge breakdown:
  - accessed: 2
  - owns: 4
  - transfer: 6

======================================================================
📅 Testing GET /timeline/1
======================================================================

✓ Response received
  Case ID: 1
  Title: Circular transfer ring detected (4 accounts)
  Events: 8

📊 Event breakdown:
  - employee_action: 2
  - transaction: 6

🚨 Flagged events (linked to detectors): 4

======================================================================
✅ All tests passed!
```

---

## Performance Considerations

### Graph Endpoint

- **Complexity**: O(T + E) where T = transactions, E = employees
- **Database queries**: ~1 query per transaction + 1 per employee
- **Optimization**: Uses `joinedload` for relationships (already loaded with case)

### Timeline Endpoint

- **Complexity**: O(T + A) where T = transactions, A = employee actions
- **Database queries**: 1 query for transactions + 1 for actions + detector runs
- **Note**: Detectors run on entire dataset (not just case) to compute evidence_rule mapping

**Recommendation**: For production, cache detector results or run detectors asynchronously and store evidence_rule mappings in the database.

---

## Frontend Integration Examples

### Force-Directed Graph (D3.js)

```javascript
async function renderCaseGraph(caseId) {
  const data = await fetch(`/graph/${caseId}`).then(r => r.json());
  
  const svg = d3.select("#graph-container");
  const width = 800, height = 600;
  
  // Color by type
  const color = d3.scaleOrdinal()
    .domain(["employee", "customer", "account", "transaction"])
    .range(["#f59e0b", "#3b82f6", "#10b981", "#ef4444"]);
  
  const simulation = d3.forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.edges).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));
  
  // Render edges
  const link = svg.selectAll("line")
    .data(data.edges)
    .enter().append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 2);
  
  // Render nodes
  const node = svg.selectAll("circle")
    .data(data.nodes)
    .enter().append("circle")
    .attr("r", 10)
    .attr("fill", d => color(d.type))
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));
  
  // Labels
  const label = svg.selectAll("text")
    .data(data.nodes)
    .enter().append("text")
    .text(d => d.label)
    .attr("font-size", 12)
    .attr("dx", 12)
    .attr("dy", 4);
  
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
    
    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
    
    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });
}
```

### Timeline (React)

```tsx
function CaseTimeline({ caseId }: { caseId: number }) {
  const [timeline, setTimeline] = useState<CaseTimeline | null>(null);
  
  useEffect(() => {
    fetch(`/timeline/${caseId}`)
      .then(r => r.json())
      .then(data => setTimeline(data));
  }, [caseId]);
  
  if (!timeline) return <div>Loading...</div>;
  
  return (
    <div className="space-y-4">
      <h2>{timeline.case_title}</h2>
      
      <div className="relative">
        {timeline.events.map((event, i) => (
          <div key={i} className={`flex gap-4 ${event.evidence_rule ? 'bg-red-50' : ''}`}>
            <div className="text-sm text-gray-500">
              {new Date(event.timestamp).toLocaleString()}
            </div>
            
            <div className="flex-1">
              <div className="font-medium">{event.actor}</div>
              <div className="text-sm">{event.description}</div>
              {event.evidence_rule && (
                <div className="text-xs text-red-600 mt-1">
                  🚨 Flagged by: {event.evidence_rule}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Design Principles

1. **Read-Only**: These endpoints only query existing data, no new detection logic
2. **Structured**: Output format is optimized for frontend consumption
3. **Complete**: Include all relevant entities and relationships for comprehensive visualization
4. **Traced**: Link events back to detector evidence for explainability
5. **Chronological**: Timeline is sorted for narrative reconstruction

These endpoints enable investigators to:
- Visualize the network of entities involved in a case
- Understand the sequence of events leading to detection
- Identify which specific events triggered which detection rules
- Explore relationships between employees, customers, and accounts
