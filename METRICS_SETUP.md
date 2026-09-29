# TRACE Metrics & Evaluation System

## Overview

The metrics system provides real-time performance evaluation of the fraud detection system, with a focus on demonstrating the value of AI verification calls.

## Files Created

### Backend

1. **`backend/scripts/evaluate.py`** - Standalone evaluation script
   - Runs all 4 detectors against the full synthetic dataset
   - Compares predictions against `ground_truth_label` field
   - Calculates: Precision, Recall, F1 Score, Accuracy, False Positive Rate
   - Analyzes impact of verification calls on FPR
   - Prints detailed metrics to console

2. **`backend/app/api/metrics.py`** - Metrics API endpoint
   - GET `/metrics` - Returns real-time system performance metrics
   - Same calculations as evaluate.py but as JSON API
   - Includes baseline, with_calls, adjusted, and evidence_stats

3. **`backend/scripts/__init__.py`** - Makes scripts a proper Python package

### Frontend

1. **`frontend/src/pages/MetricsDashboard.tsx`** - Metrics visualization page
   - Fetches from GET `/metrics`
   - **Key Differentiator Callout** at top showing FP reduction %
   - Core metrics grid (Precision, Recall, F1, Accuracy)
   - Before/After comparison chart for FPR
   - Confusion matrix with visual breakdown
   - Evidence statistics by detector type
   - "Why This Matters" summary for judges

2. **Navigation Updates**:
   - Added `/metrics` route to `App.tsx`
   - Added "Metrics" link to sidebar in `AppLayout.tsx`

## Running the Evaluation

### Option 1: Standalone Script

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python scripts/evaluate.py
```

This will print:
- Baseline metrics (before calls)
- AI verification call impact
- Adjusted metrics (after calls)
- Key takeaway for judges

### Option 2: API Endpoint

1. Start the backend server:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

2. Navigate to: http://localhost:3000/dashboard/metrics

Or call the API directly:
```bash
curl http://localhost:8000/metrics
```

## Key Metrics Displayed

### Baseline Metrics
- **Precision**: Of flagged cases, how many are actual fraud
- **Recall**: Of actual fraud, how many we caught
- **F1 Score**: Harmonic mean of precision & recall
- **Accuracy**: Overall correct predictions
- **False Positive Rate**: Legitimate cases incorrectly flagged

### Verification Call Impact
- **Cases with Calls**: Number of cases that received AI verification
- **FP Resolved**: False positives resolved by calls
- **FPR Comparison**: 
  - FPR without calls
  - FPR with calls
  - **% Reduction** (the key differentiator!)

### Adjusted Metrics
- Updated FP/TN counts after call resolution
- Adjusted precision and FPR

## The Differentiator

**AI verification calls reduce false positives by automatically validating suspicious activity with the actual parties involved (customers/employees).**

When a call confirms consistency with logged data:
- If the case was a false positive, it gets marked as resolved
- This reduces investigator workload
- Maintains fraud detection accuracy while minimizing disruption

Example output:
```
📊 FALSE POSITIVE REDUCTION: 35.2%
   (AI calls reduce false alarms by verifying with actual parties)
```

## Dashboard Highlights

1. **Top Callout Box**: Shows FP reduction % in large, bold text
2. **Before/After Bars**: Visual comparison of FPR with vs without calls
3. **Confusion Matrix**: Shows how FP count drops (strikethrough → new value)
4. **Judge Summary**: Explains why this matters in plain language

## Prerequisites

Before running metrics:

1. **Database must be populated**:
   ```powershell
   cd data
   python scripts/generate_data.py
   ```

2. **Migrations must be run**:
   ```powershell
   cd backend
   alembic upgrade head
   ```

3. **Some cases should have verification calls** (for meaningful FP comparison):
   - Navigate to case detail pages
   - Click "Trigger Verification Call" button
   - Do this for 5-10 cases to see the impact

## Troubleshooting

### Timeouts when running evaluate.py
- Database connection issue or large dataset
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Try reducing dataset size in generate_data.py

### Metrics show 0% improvement
- No cases have verification calls yet
- Trigger calls on some false positive cases
- Refresh the metrics page

### API returns 500 error
- Check backend logs for detector errors
- Ensure all migrations are applied
- Verify database has cases with ground_truth_label field

## For the Judges

Navigate to `/dashboard/metrics` to see:
- **Live performance metrics**
- **Visual proof of AI call effectiveness**
- **Clear before/after comparison**
- **Real numbers on false positive reduction**

This is TRACE's competitive advantage: automated second-layer validation that saves investigator time while maintaining accuracy.
