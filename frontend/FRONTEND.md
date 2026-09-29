# TRACE Frontend

Dark, security-focused UI for fraud detection and investigation.

## Pages

### 1. Home (`/`)

**Marketing/hero landing page**

**Design:**
- Dark navy/charcoal background with subtle grid pattern
- Electric cyan accent color (sparingly used)
- "Control room" aesthetic
- Mobile-responsive with hamburger nav

**Sections:**
- **Hero**: Headline about connecting insider activity to financial crime
- **Stats Bar**: 3 callout metrics (cases resolved, avg time-to-evidence, false positive rate)
- **Features**: 3-column grid highlighting key capabilities
- **Footer**: Links and API version

**CTAs:**
- "Launch Dashboard" → `/dashboard`
- "Learn More" → scrolls to features

---

### 2. Dashboard (`/dashboard`)

**Functional alert dashboard fed by API**

**Features:**
- **Risk Level Badges**: Top strip with count by severity (Critical/High/Medium)
- **Case Table**: Sortable list of all alerts
  - Columns: ID, Risk Level, Case Title, Pattern Types, Evidence Count, Status
  - Click row → navigate to `/cases/:id`
  - Sort by ID, risk level, or title

**API Integration:**
- Fetches from `GET http://localhost:8000/alerts`
- Shows loading state
- Error handling with connection message

**Sorting:**
- Default: sort by risk level (critical first)
- Click column headers to change sort
- Toggle ascending/descending

---

### 3. Cases (`/cases` and `/cases/:id`)

**Placeholder page** - ready for case detail implementation

**Planned features:**
- Case header with title, risk level, status
- Full evidence breakdown (from `/alerts/:id`)
- Network graph visualization (from `/graph/:id`)
- Timeline view (from `/timeline/:id`)

---

### 4. Graph Explorer (`/graph`)

**Placeholder page** - ready for graph visualization

**Planned features:**
- Interactive force-directed graph
- Node filtering by type
- Edge filtering by relationship
- Zoom and pan controls

---

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Marketing landing page |
| `/dashboard` | DashboardPage | Alert dashboard (main app) |
| `/cases` | CasesPage | Case list (placeholder) |
| `/cases/:id` | CasesPage | Case detail (placeholder) |
| `/graph` | GraphExplorerPage | Graph explorer (placeholder) |

---

## Layout

**Home page**: Full-page standalone layout with custom nav

**App pages** (`/dashboard`, `/cases`, `/graph`): Use `AppLayout` with:
- Left sidebar navigation
- TRACE branding
- Active route highlighting
- Main content area with padding

---

## Design System

### Colors

**Background:**
- Base: `bg-slate-950` (dark navy/charcoal)
- Cards: `bg-slate-900/50` (semi-transparent overlay)
- Borders: `border-slate-800`

**Accent (Cyan):**
- Primary: `bg-cyan-500` / `text-cyan-500`
- Hover: `bg-cyan-400`
- Subtle: `bg-cyan-500/10` (10% opacity)
- Border: `border-cyan-500/30`

**Risk Levels:**
- Critical: Red (`bg-red-500`, `text-red-400`)
- High: Orange (`bg-orange-500`, `text-orange-400`)
- Medium: Yellow (`bg-yellow-500`, `text-yellow-400`)
- Low: Green (`bg-green-500`, `text-green-400`)

### Typography

**Headings:**
- Hero: `text-4xl sm:text-6xl font-bold`
- Page title: `text-2xl font-semibold`
- Section: `text-xl font-semibold`

**Body:**
- Default: `text-slate-100`
- Muted: `text-slate-400`
- Small: `text-sm text-slate-400`

**Monospace:**
- IDs: `font-mono text-sm`
- Stats: `font-mono text-5xl`

### Spacing

- Page padding: `px-6 py-8` (desktop), `px-6 py-6` (mobile)
- Card padding: `p-6` or `p-4`
- Section gaps: `space-y-6`
- Grid gaps: `gap-4` or `gap-8`

### Components

**Badges:**
```tsx
// Risk level badge
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase bg-red-500 text-white">
  CRITICAL
</span>

// Pattern type badge
<span className="inline-flex items-center rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-mono text-cyan-400">
  circular_transfer
</span>
```

**Cards:**
```tsx
<div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
  {/* content */}
</div>
```

**Buttons:**
```tsx
// Primary CTA
<button className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
  Launch Dashboard
</button>

// Secondary
<button className="rounded-md border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800">
  Learn More
</button>
```

---

## API Configuration

**Base URL**: `http://localhost:8000`

Currently hardcoded in `DashboardPage.tsx`. For production, create a config file:

```typescript
// src/config.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

Then use:
```typescript
fetch(`${API_BASE_URL}/alerts`)
```

---

## Development

### Start dev server

```bash
cd frontend
npm run dev
```

Runs on http://localhost:5173

### Build for production

```bash
npm run build
```

Output: `dist/` directory

### Lint

```bash
npm run lint
```

Uses oxlint (faster alternative to ESLint)

---

## Mobile Responsiveness

### Breakpoints

- Mobile: `< 640px` (default)
- Tablet: `sm:` (640px+)
- Desktop: `md:` (768px+)

### Mobile Adaptations

**Home page:**
- Nav collapses to hamburger menu
- Hero text stacks vertically
- Stats bar stacks vertically with borders
- Features grid becomes single column

**Dashboard:**
- Risk badges stack vertically on mobile
- Table scrolls horizontally
- Smaller text/padding on mobile

**Pattern:**
```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-4">

// Hide on mobile, show on desktop
<div className="hidden md:block">

// Full width on mobile, auto on desktop
<button className="w-full sm:w-auto">
```

---

## Next Steps

### Implement Case Detail Page

```typescript
// src/pages/CasesPage.tsx
import { useParams } from 'react-router-dom'

export function CasesPage() {
  const { id } = useParams()
  
  if (id) {
    // Fetch case detail from /alerts/:id
    // Show evidence breakdown
    // Embed graph and timeline
  } else {
    // Show case list
  }
}
```

### Add Graph Visualization

Use D3.js or vis.js to render force-directed graphs from `/graph/:id`:

```bash
npm install d3
# or
npm install vis-network
```

### Add Timeline Component

Render chronological events from `/timeline/:id` with:
- Vertical timeline with dots
- Event cards
- Flagged event indicators
- Actor avatars

### Add Filters & Search

**Dashboard filters:**
- Filter by risk level
- Search by case title
- Filter by pattern type
- Date range picker

---

## File Structure

```
frontend/src/
├── App.tsx                    # Root router
├── main.tsx                   # Entry point
├── index.css                  # Global Tailwind imports
├── layout/
│   └── AppLayout.tsx          # Sidebar navigation layout
└── pages/
    ├── Home.tsx               # ✨ Marketing landing page
    ├── DashboardPage.tsx      # ✨ Alert dashboard with API
    ├── CasesPage.tsx          # Placeholder
    └── GraphExplorerPage.tsx  # Placeholder
```

---

## Performance

**Current bundle size:**
- CSS: 25.51 kB (5.42 kB gzipped)
- JS: 280.03 kB (86.84 kB gzipped)

**Fast by design:**
- No component library overhead
- Tailwind purges unused CSS
- Code splitting via React Router
- No heavy dependencies

---

## Accessibility

**Current state:**
- Semantic HTML (`<nav>`, `<section>`, `<table>`)
- Button hover states
- Sufficient color contrast (WCAG AA)
- Keyboard navigation works

**TODO:**
- Add ARIA labels for interactive elements
- Focus management for modals
- Skip to content link
- Screen reader announcements for loading states

---

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+

Uses modern CSS features:
- CSS Grid
- Flexbox
- Custom properties (via Tailwind)
- backdrop-filter (for blur effects)
