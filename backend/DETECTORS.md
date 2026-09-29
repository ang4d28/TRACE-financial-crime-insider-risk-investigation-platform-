# TRACE Detection System

## Architecture

The detection system uses **structured evidence** instead of opaque risk scores. Each detector returns `Evidence` objects with:

- **rule_name**: Identifier for the detection rule
- **severity**: `low`, `medium`, `high`, or `critical`
- **reason**: Plain-language explanation (one sentence)
- **supporting_ids**: List of entity IDs (transactions, employees, accounts)
- **metric**: Structured data with detection-specific measurements

Evidence objects are then aggregated using **explicit rules** to compute an overall risk level, never collapsing to a single number.

## Detectors

### 1. Circular Transfer Detector

**Module**: `app.detectors.circular_transfer_detector`

**Detection Logic**:
- Builds a directed graph of transactions (nodes = accounts, edges = transactions)
- Uses NetworkX to find strongly connected components
- Identifies simple cycles within configurable time windows
- Flags cycles of 3+ accounts that complete within hours/days

**Parameters**:
- `time_window_days` (default: 7) - Look for cycles within this window
- `min_cycle_length` (default: 3) - Minimum accounts in a cycle
- `min_amount` (default: $1,000) - Minimum transaction amount

**Severity Rules**:
- **Critical**: 5+ accounts OR completes within 6 hours
- **High**: 4+ accounts OR completes within 24 hours
- **Medium**: 3 accounts, longer duration

**Evidence Metrics**:
```json
{
  "cycle_length": 4,
  "cycle_duration_hours": 18.5,
  "total_amount": 24500.00,
  "account_ids": ["123", "456", "789", "321"]
}
```

**Example**:
```python
from app.detectors import detect_circular_transfers

evidence_list = detect_circular_transfers(db, time_window_days=7)
```

---

### 2. Structuring Detector (Smurfing)

**Module**: `app.detectors.structuring_detector`

**Detection Logic**:
- Finds clusters of transactions just under a reporting threshold (default: $10,000)
- Identifies suspicious range: 80-99% of threshold
- Compares current transaction rate against historical baseline for the account
- Flags both outgoing (single source, multiple destinations) and incoming (multiple sources, single destination) patterns

**Parameters**:
- `time_window_hours` (default: 24) - Look for clustering within this window
- `threshold_amount` (default: $10,000) - Reporting threshold
- `min_transaction_count` (default: 5) - Minimum transactions to flag
- `historical_days` (default: 90) - Period for baseline calculation

**Severity Rules**:
- **Critical**: 10x+ baseline deviation OR 8+ transactions with low baseline
- **High**: 5x+ baseline deviation OR 7+ transactions
- **Medium**: 3x+ baseline deviation OR meets minimum count
- **Low**: Below medium thresholds

**Evidence Metrics**:
```json
{
  "transaction_count": 6,
  "total_amount": 58200.00,
  "average_amount": 9700.00,
  "threshold": 10000.00,
  "time_span_hours": 4.5,
  "baseline_per_day": 0.8,
  "current_per_day": 32.0,
  "deviation_ratio": 40.0,
  "account_id": "123"
}
```

**Example**:
```python
from app.detectors import detect_structuring

evidence_list = detect_structuring(db, threshold_amount=Decimal("10000"))
```

---

### 3. Profile Mismatch Detector

**Module**: `app.detectors.profile_mismatch_detector`

**Detection Logic**:
- Compares customer transaction volume against expected baseline for their profile
- Uses occupation-based income estimates (e.g., Student: $2k/month, Executive: $20k/month)
- Adjusts for KYC status (pending/flagged customers have lower thresholds)
- Flags significant deviations from expected behavior

**Parameters**:
- `time_window_days` (default: 30) - Period to analyze volume
- `deviation_threshold` (default: 3.0x) - Flag if volume exceeds baseline by this factor

**Occupation Baselines** (monthly):
```python
{
  "Student": 2000,
  "Retail": 3500,
  "Service": 4000,
  "Clerk": 4500,
  "Teacher": 6000,
  "Technician": 7000,
  "Manager": 10000,
  "Engineer": 12000,
  "Executive": 20000,
  "Business Owner": 30000,
}
```

**Severity Rules**:
- **Critical**: 10x+ expected volume
- **High**: 6x+ expected volume
- **Medium**: 4x+ expected volume
- **Low**: 3x+ expected volume

**Evidence Metrics**:
```json
{
  "customer_id": "42",
  "customer_name": "John Doe",
  "occupation": "Teacher",
  "kyc_status": "verified",
  "total_volume": 45000.00,
  "expected_volume": 6000.00,
  "deviation_ratio": 7.5,
  "transaction_count": 23,
  "time_window_days": 30
}
```

**Example**:
```python
from app.detectors import detect_profile_mismatch

evidence_list = detect_profile_mismatch(db, deviation_threshold=3.0)
```

---

### 4. Insider Link Detector

**Module**: `app.detectors.insider_link_detector`

**Detection Logic**:
- Monitors suspicious employee actions: beneficiary updates, KYC edits, unauthorized access
- Looks for transactions on the affected account within a time window AFTER the action
- Checks if the customer is in the employee's assigned portfolio
- Tracks session IDs to identify coordinated actions

**Suspicious Action Types**:
- `update_beneficiary`
- `kyc_update`
- `access_override`
- `permission_change`
- `view_customer_details`

**Parameters**:
- `time_window_hours` (default: 48) - Look for transactions within this window after action
- `min_transaction_amount` (default: $5,000) - Minimum amount to flag

**Severity Rules**:
- **Critical**: Unauthorized access + same session
- **High**: Unauthorized access OR transaction within 1 hour
- **Medium**: Same session OR transaction within 6 hours
- **Low**: Below medium thresholds

**Evidence Metrics**:
```json
{
  "employee_id": "5",
  "employee_name": "Jane Smith",
  "customer_id": "42",
  "customer_name": "John Doe",
  "account_id": "123",
  "action_type": "update_beneficiary",
  "action_occurred_at": "2026-09-29T14:30:00",
  "time_gap_hours": 0.5,
  "transaction_count": 1,
  "total_amount": 15000.00,
  "is_unauthorized_access": true,
  "same_session": true,
  "session_id": "abc123"
}
```

**Example**:
```python
from app.detectors import detect_insider_links

evidence_list = detect_insider_links(db, time_window_hours=48)
```

---

## Evidence Aggregator

**Module**: `app.detectors.aggregator`

**Function**: `aggregate_evidence(evidence_list: list[Evidence]) -> RiskAssessment`

**Aggregation Rules**:

1. **Critical** overall risk if:
   - 1+ critical-severity evidence, OR
   - 2+ independent high-severity signals from different detectors

2. **High** overall risk if:
   - 1+ high-severity AND 2+ medium-severity, OR
   - 1+ high-severity, OR
   - 3+ medium-severity (sustained pattern)

3. **Medium** overall risk if:
   - 2+ medium-severity, OR
   - 1+ medium AND 2+ low-severity

4. **Low** overall risk if:
   - Only low-severity signals

**Output**:
```python
RiskAssessment(
    overall_risk="critical",
    evidence_list=[...],
    reasoning="2 critical-severity signals spanning 2 detection categories."
)
```

**Key Principle**: The aggregator **never collapses to a single opaque number**. It provides:
- Explicit overall risk level with clear rules
- Full list of underlying evidence
- Plain-language reasoning explaining the assessment

**Example**:
```python
from app.detectors import aggregate_evidence

assessment = aggregate_evidence(all_evidence)
print(assessment.overall_risk)  # "critical"
print(assessment.reasoning)
for evidence in assessment.evidence_list:
    print(f"  - {evidence.severity}: {evidence.reason}")
```

---

## API Endpoints

### GET /alerts

List all triggered alerts with overall risk levels.

**Response**:
```json
[
  {
    "case_id": 1,
    "title": "Circular transfer ring detected",
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

### GET /alerts/{case_id}

Get full evidence breakdown for a specific case.

**Response**:
```json
{
  "case_id": 1,
  "title": "Circular transfer ring detected",
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

---

## Testing with Synthetic Data

After generating synthetic data with `scripts/generate_data.py`, you can test the detectors:

```python
from app.database import SessionLocal
from app.detectors import (
    detect_circular_transfers,
    detect_structuring,
    detect_profile_mismatch,
    detect_insider_links,
    aggregate_evidence,
)

db = SessionLocal()

# Run individual detectors
circular = detect_circular_transfers(db)
structuring = detect_structuring(db)
profile = detect_profile_mismatch(db)
insider = detect_insider_links(db)

# Aggregate all evidence
all_evidence = circular + structuring + profile + insider
assessment = aggregate_evidence(all_evidence)

print(f"Overall Risk: {assessment.overall_risk}")
print(f"Evidence Count: {len(assessment.evidence_list)}")
print(f"\nReasoning: {assessment.reasoning}")

for ev in assessment.evidence_list:
    print(f"\n[{ev.severity.upper()}] {ev.rule_name}")
    print(f"  {ev.reason}")
    print(f"  Supporting IDs: {ev.supporting_ids[:3]}...")
```

---

## Design Principles

1. **Transparency**: Every detection returns structured evidence with plain-language explanations
2. **Traceability**: Supporting IDs link back to source entities in the database
3. **Explainability**: Metrics provide quantitative backing for qualitative assessments
4. **Composability**: Evidence aggregates using explicit rules, never black-box scoring
5. **Auditability**: Full evidence trail preserved for compliance and review

This approach enables:
- Compliance officers to understand and explain decisions
- Developers to debug and tune detection logic
- Auditors to verify risk assessment methodology
- Users to trust the system's recommendations
