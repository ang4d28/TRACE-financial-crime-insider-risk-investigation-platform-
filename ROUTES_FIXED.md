# TRACE Route Structure - Fixed

## Issue
Routes nested under `/dashboard` were using absolute paths (e.g., `path="/cases"`) instead of relative paths, causing React Router error.

## Solution
Changed all nested routes to relative paths (e.g., `path="cases"`).

## Full Route Tree

```
/ (Home landing page)
/dashboard (AppLayout wrapper)
  ├─ index → DashboardPage
  ├─ cases → CasesPage
  ├─ cases/:id → CaseDetail
  ├─ graph → GraphExplorerPage
  ├─ metrics → MetricsDashboard
  └─ * → Navigate to /dashboard
```

## Actual URLs

| Route Definition | Rendered URL | Component |
|-----------------|--------------|-----------|
| `/` | http://localhost:3000/ | Home (landing) |
| `/dashboard` (index) | http://localhost:3000/dashboard | DashboardPage |
| `cases` | http://localhost:3000/dashboard/cases | CasesPage |
| `cases/:id` | http://localhost:3000/dashboard/cases/123 | CaseDetail |
| `graph` | http://localhost:3000/dashboard/graph | GraphExplorerPage |
| `metrics` | http://localhost:3000/dashboard/metrics | MetricsDashboard |

## Sidebar Navigation Links

All nav items now point to the correct full paths:

```tsx
const navItems = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/cases', label: 'Cases', end: false },
  { to: '/dashboard/graph', label: 'Graph Explorer', end: false },
  { to: '/dashboard/metrics', label: 'Metrics', end: false },
]
```

## Fixed Navigation References

1. **DashboardPage.tsx**: Updated case row click
   - Before: `navigate('/cases/${alert.case_id}')`
   - After: `navigate('/dashboard/cases/${alert.case_id}')`

2. **CaseDetail.tsx**: Already correct
   - Back button: `navigate('/dashboard')` ✓

3. **Home.tsx**: Already correct
   - CTA buttons: `to="/dashboard"` ✓

## Key Changes Made

### App.tsx
```tsx
// Before:
<Route path="/cases" element={<CasesPage />} />

// After:
<Route path="cases" element={<CasesPage />} />
```

### AppLayout.tsx
```tsx
// Before:
{ to: '/cases', label: 'Cases' }

// After:
{ to: '/dashboard/cases', label: 'Cases' }
```

### DashboardPage.tsx
```tsx
// Before:
navigate(`/cases/${alert.case_id}`)

// After:
navigate(`/dashboard/cases/${alert.case_id}`)
```

## Verification

✅ No absolute paths in nested routes
✅ All navigation links use full paths
✅ Sidebar nav matches actual URLs
✅ Case detail back button returns to dashboard
✅ Dashboard case rows navigate to case detail

The route structure now follows React Router v6 best practices with proper relative path nesting.
