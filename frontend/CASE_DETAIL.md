# Case Detail Page

Comprehensive case investigation view with graph visualization, evidence panel, and timeline.

## Overview

The case detail page combines three API endpoints to provide a complete investigation workspace:

1. **GET /alerts/{id}** - Risk assessment and evidence list
2. **GET /graph/{id}** - Relationship graph (nodes and edges)
3. **GET /timeline/{id}** - Chronological event sequence

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header: Case Title + Risk Badge + Back Button          │
├─────────────────────────────────────────────────────────┤
│ Risk Assessment Reasoning (cyan highlight)              │
├──────────────────────────┬──────────────────────────────┤
│ LEFT COLUMN              │ RIGHT COLUMN                 │
│                          │                              │
│ Relationship Graph       │ Evidence Panel               │
│ (Force-directed)         │ (Mandatory, Prominent)       │
│                          │                              │
│ - Interactive nodes      │ - One card per evidence      │
│ - Colored by type        │ - Rule name + severity       │
│ - Legend below           │ - Plain-language reason      │
│                          │ - Supporting ID chips        │
│                          │ - Metrics (collapsible)      │
├──────────────────────────┴──────────────────────────────┤
│ Timeline (Full Width)                                   │
│                                                         │
│ Horizontal event sequence with:                        │
│ - Timestamp + event type                               │
│ - Actor name                                           │
│ - Description                                          │
│ - Evidence rule link (if flagged)                      │
└─────────────────────────────────────────────────────────┘
```

## Components

### Header

**Elements:**
- Back button → returns to `/dashboard`
- Case title (from API)
- Risk level badge (Critical/High/Medium/Low)
- Case ID (monospace)
- Evidence count

**Styling:**
- Risk badge uses full color backgrounds
- Monospace font for case ID
- Clear visual hierarchy

### Risk Assessment Box

**Purpose:**
- Shows the aggregated risk reasoning
- Explains WHY the overall risk level was assigned

**Design:**
- Cyan border/background (matches accent)
- Check icon
- Plain-language explanation from aggregator

**Example:**
> "2 critical-severity signals spanning 3 detection categories."

### Left Column: Relationship Graph

**Library:** `react-force-graph-2d`

**Features:**
- Force-directed layout (physics-based positioning)
- Interactive: drag nodes, zoom, pan
- Node colors by type:
  - 🔴 Red: Transactions
  - 🟢 Green: Accounts
  - 🔵 Blue: Customers
  - 🟠 Amber: Employees
- Node labels show entity names
- Directional arrows on edges
- Click handler (logs to console)

**Legend:**
- Color-coded dots below graph
- Explains node type mapping

**Graph Data:**
- Fetched from `GET /graph/{id}`
- Transformed to react-force-graph format
- Nodes have `id`, `name`, `type`, `color`
- Links have `source`, `target`, `type`

### Right Column: Evidence Panel (MANDATORY)

**Design Philosophy:**
- **Always visible** - not collapsed or hidden
- **Structurally prominent** - same height as graph
- **One card per evidence** - clear separation
- **No single score** - full evidence list preserved

**Evidence Card Structure:**

```tsx
┌─────────────────────────────────────┐
│ rule_name         [severity badge]  │
├─────────────────────────────────────┤
│ Plain-language reason               │
├─────────────────────────────────────┤
│ Supporting Evidence:                │
│ [#101] [#102] [#103] ...           │
├─────────────────────────────────────┤
│ > View metrics (collapsible)        │
└─────────────────────────────────────┘
```

**Severity Colors:**
- Critical: Red border/background
- High: Orange border/background
- Medium: Yellow border/background
- Low: Green border/background

**Supporting ID Chips:**
- Clickable (hover effect)
- Show first 8 IDs
- "+N more" badge if > 8
- Tooltip shows full ID

**Metrics:**
- Collapsed by default (`<details>`)
- JSON format
- Contains quantitative data (cycle_length, amount, etc.)

### Timeline (Full Width)

**Layout:**
- Vertical timeline with connecting line
- Dot indicator for each event
- Red dot + glow for flagged events
- Gray dot for normal events

**Event Card:**
- Timestamp (monospace, small)
- Event type badge (transaction vs employee_action)
- Evidence rule badge (if flagged)
- Actor name (bold)
- Description text

**Event Types:**
- 🔵 Blue: Transaction
- 🟣 Purple: Employee Action

**Flagged Events:**
- Red dot with ring glow
- Red border on evidence rule badge
- Shows which detector flagged it

**Example:**
```
🔴 [2026-09-20 14:30:00] [employee_action] [insider_link]
   Jane Smith
   Update Beneficiary on Account 4567

⚫ [2026-09-20 14:45:00] [transaction] [insider_link]
   John Doe
   Transferred $15,000.00 to Alice Johnson
```

## API Integration

### Data Flow

```typescript
useEffect(() => {
  Promise.all([
    fetch(`/alerts/${id}`),
    fetch(`/graph/${id}`),
    fetch(`/timeline/${id}`)
  ])
    .then(([alert, graph, timeline]) => {
      setAlertDetail(alert)
      setGraph(graph)
      setTimeline(timeline)
    })
}, [id])
```

### Error Handling

**States:**
1. **Loading**: Shows "Loading case detail..." message
2. **Error**: Red error box with back button
3. **No Data**: Shows "No data available"
4. **Success**: Renders full page

**Error Messages:**
- "Failed to fetch alert detail"
- "Failed to fetch graph"
- "Failed to fetch timeline"

### Data Validation

All API responses are typed:
- `AlertDetail` - case info + risk assessment
- `CaseGraph` - nodes and edges arrays
- `CaseTimeline` - events array

No data shown until all three endpoints succeed.

## Graph Visualization

### Node Rendering

Custom canvas rendering:
```typescript
nodeCanvasObject={(node, ctx, globalScale) => {
  // Draw circle
  ctx.beginPath()
  ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI)
  ctx.fillStyle = node.color
  ctx.fill()
  
  // Draw label
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(node.name, node.x, node.y + 12)
}
```

### Graph Configuration

- `nodeRelSize={6}` - Base node size
- `linkColor={() => '#475569'}` - Slate gray links
- `linkWidth={2}` - 2px link thickness
- `linkDirectionalArrowLength={3.5}` - Arrow size
- `backgroundColor="#020617"` - Slate-950 background

### Interactions

- **Drag**: Click and drag nodes to reposition
- **Zoom**: Scroll wheel to zoom in/out
- **Pan**: Click empty space and drag to pan
- **Click**: Node click logs to console (extensible)

### Performance

- Force simulation stabilizes automatically
- Canvas rendering (not DOM) for performance
- Handles 50+ nodes smoothly

## Evidence Panel Design

### Key Principle

**The evidence panel must remain visible and prominent.**

This is a core design requirement because:
1. Compliance needs full traceability
2. Auditors must see all evidence
3. No single "score" can replace structured reasoning
4. Aggregation rules must be transparent

### Why Not an Accordion?

❌ **Bad**: Collapsible evidence panel
```tsx
<Accordion>
  <AccordionItem title="Evidence">
    {/* Evidence buried here */}
  </AccordionItem>
</Accordion>
```

✅ **Good**: Always-visible evidence panel
```tsx
<div className="space-y-4">
  <h2>Evidence</h2>
  {evidence_list.map(ev => (
    <EvidenceCard {...ev} />
  ))}
</div>
```

### Evidence Prominence Checklist

✅ Same visual weight as graph (50% of width)
✅ Not hidden behind tabs or accordions
✅ All evidence visible without scrolling (when < 5 items)
✅ Clear severity color coding
✅ Direct access to supporting IDs
✅ Reason shown in full (not truncated)

## Responsive Design

### Desktop (lg: 1024px+)

- Two-column grid layout
- Graph and evidence side-by-side
- Timeline full width below

### Tablet (md: 768px - 1023px)

- Columns stack vertically
- Graph first, then evidence
- Timeline full width

### Mobile (< 768px)

- Single column
- All sections stack
- Graph height reduced to 400px
- Smaller text and padding

## Color System

### Risk Levels

| Level | Badge | Border | Background |
|-------|-------|--------|------------|
| Critical | `bg-red-500` | `border-red-500/50` | `bg-red-500/5` |
| High | `bg-orange-500` | `border-orange-500/50` | `bg-orange-500/5` |
| Medium | `bg-yellow-500` | `border-yellow-500/50` | `bg-yellow-500/5` |
| Low | `bg-green-500` | `border-green-500/50` | `bg-green-500/5` |

### Node Types

| Type | Color | Hex |
|------|-------|-----|
| Transaction | Red | `#ef4444` |
| Account | Green | `#10b981` |
| Customer | Blue | `#3b82f6` |
| Employee | Amber | `#f59e0b` |

### Event Types

| Type | Badge Color |
|------|-------------|
| Transaction | Blue `bg-blue-500/10` |
| Employee Action | Purple `bg-purple-500/10` |
| Flagged | Red `border-red-500/30` |

## Navigation

### Entry Points

1. **Dashboard Table**: Click any row → `/cases/{id}`
2. **Direct URL**: Navigate to `/cases/1`
3. **Back Button**: Returns to `/dashboard`

### Route Structure

```
/cases/:id → CasesPage → CaseDetail (if ID present)
```

## Testing

### Manual Testing

1. **Start API and frontend**
2. **Navigate to dashboard**
3. **Click a case row**
4. **Verify all sections load:**
   - Header shows case title + risk badge
   - Risk assessment box appears
   - Graph renders with nodes
   - Evidence panel shows all cards
   - Timeline shows events

### Test Checklist

- ✅ Case ID in URL loads correct data
- ✅ Graph nodes are colored correctly
- ✅ Evidence cards show all fields
- ✅ Supporting IDs are clickable
- ✅ Timeline events show chronologically
- ✅ Flagged events have red indicators
- ✅ Back button returns to dashboard
- ✅ Error handling works (bad ID)
- ✅ Loading state shows briefly
- ✅ Responsive on mobile

### Test Data

Use generated cases:
```bash
cd data
..\backend\.venv\Scripts\activate
python scripts\generate_data.py
```

Should create ~7 cases with IDs 1-7.

## Future Enhancements

### Graph Interactions

- Click node → highlight connected edges
- Filter by node type
- Search for specific entities
- Export graph as image

### Evidence Panel

- Expand all metrics at once
- Sort by severity
- Filter by rule name
- Export evidence report

### Timeline

- Filter by event type
- Show only flagged events
- Zoom to time range
- Export timeline CSV

### Performance

- Lazy load timeline (paginate)
- Cache graph layout positions
- Virtual scrolling for long evidence lists
- Optimize re-renders with useMemo

## Dependencies

```json
{
  "react-force-graph-2d": "^1.x.x"
}
```

### Why react-force-graph-2d?

- ✅ Clean installation
- ✅ Canvas-based (performant)
- ✅ Force-directed layout built-in
- ✅ Customizable node/link rendering
- ✅ TypeScript support
- ✅ Active maintenance

### Alternatives Considered

- **reactflow**: More complex, overkill for this use case
- **vis-network**: Heavier bundle, dated API
- **cytoscape**: Powerful but steeper learning curve

## Bundle Size Impact

**Before Case Detail:**
- JS: 280.03 kB (86.84 kB gzipped)

**After Case Detail:**
- JS: 472.80 kB (148.93 kB gzipped)

**Increase:** +192.77 kB (+62 kB gzipped)

Acceptable for a feature-rich investigation page with graph rendering.

## Accessibility

**Current:**
- Semantic HTML structure
- Keyboard navigation works
- Color contrast meets WCAG AA
- Focus management on back button

**TODO:**
- ARIA labels for graph nodes
- Screen reader announcements for evidence
- Keyboard shortcuts for graph navigation
- High contrast mode support
