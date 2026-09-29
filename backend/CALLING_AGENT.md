# Calling Agent Module

AI-powered verification call simulator for fraud investigation.

## Overview

The calling agent simulates phone verification calls to validate suspicious activity. It does **not** integrate with real telephony (Twilio, etc.) to avoid setup complexity during hackathon.

## Key Principles

1. **Simulation Only** - No real phone calls made
2. **No Auto-Decision** - Calls append evidence, never change risk level automatically
3. **Human-in-Loop** - Results are for auditor review, not autonomous action
4. **Consistency Checking** - Compares answers against logged data

## Architecture

```
┌─────────────────────────────────────────────────┐
│ POST /cases/{id}/trigger-call                   │
├─────────────────────────────────────────────────┤
│ 1. Analyze case evidence                        │
│ 2. Pick target (employee or customer)           │
│ 3. Build question based on evidence type        │
│ 4. Simulate answer (Gemini API or fixed branch) │
│ 5. Check consistency with logged data           │
│ 6. Store as CallRecord                          │
│ 7. Return transcript                            │
└─────────────────────────────────────────────────┘
```

## API Endpoints

### POST /cases/{case_id}/trigger-call

Trigger a simulated verification call for a case.

**Process:**
1. Fetch case and all evidence
2. Filter evidence relevant to case
3. Select top evidence (highest severity)
4. Determine target:
   - Insider link → Employee
   - Other patterns → Customer (from first transaction)
5. Generate question based on evidence type
6. Simulate answer with consistency check
7. Store CallRecord in database
8. Return transcript

**Response:**
```json
{
  "target": "Jane Smith",
  "target_type": "employee",
  "question": "Did you access customer account data outside your assigned portfolio?",
  "answer": "Yes, I was helping out another team member.",
  "consistency_flag": true,
  "evidence_context": "insider_link: Employee accessed customer outside portfolio",
  "called_at": "2026-09-29T16:30:00"
}
```

**Consistency Flag:**
- `true` - Answer matches or confirms evidence
- `false` - Answer contradicts evidence or is evasive

### GET /cases/{case_id}/calls

Retrieve all verification calls for a case.

**Response:**
```json
[
  {
    "id": 1,
    "target": "Jane Smith",
    "target_type": "employee",
    "question": "Did you access customer account data...",
    "answer": "Yes, I was helping out...",
    "consistency_flag": true,
    "evidence_context": "insider_link: Employee accessed...",
    "called_at": "2026-09-29T16:30:00"
  }
]
```

## Call Simulation

### Gemini API (Primary)

If `GEMINI_API_KEY` environment variable is set:

```python
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

prompt = f"""Generate verification question and answer for:
Evidence: {evidence.reason}
Target: {target_name} ({target_type})

Return JSON:
{{
  "question": "...",
  "answer": "...",
  "consistent": true/false
}}
"""

response = model.generate_content(prompt)
```

**Benefits:**
- Natural, varied conversations
- Context-aware questions
- Realistic answers

### Fixed Branches (Fallback)

If Gemini API unavailable, uses predetermined conversation flows:

**Insider Link:**
```
Q: Did you access customer account data outside your portfolio?
A: [confirm | deny | evasive]
```

**Circular Transfer:**
```
Q: Can you explain the purpose of transfers totaling $X?
A: [legitimate explanation | evasive | deny]
```

**Structuring:**
```
Q: Can you explain the purpose of multiple transactions under $10k?
A: [legitimate | evasive | deny]
```

**Profile Mismatch:**
```
Q: Can you explain the unusually high transaction volume?
A: [reasonable explanation | dismissive]
```

### Answer Branches

Each call randomly selects a branch:

1. **Confirm** - Matches evidence, consistency = true
2. **Deny** - Contradicts evidence, consistency = false
3. **Evasive** - Avoids answer, consistency = false
4. **Legitimate** - Plausible explanation, consistency = true

## Database Model

### CallRecord

```python
class CallRecord(Base):
    __tablename__ = "call_records"

    id: int
    case_id: int
    target_type: str  # "employee" or "customer"
    target_id: int
    target_name: str
    question: str
    answer: str
    consistency_flag: bool
    evidence_context: str  # What evidence this verifies
    called_at: datetime
```

**Relationships:**
- `case` - Linked to Case (one-to-many)

### Migration

File: `alembic/versions/0002_add_call_records.py`

Run with:
```bash
alembic upgrade head
```

## Target Selection

### Logic

```python
if top_evidence.rule_name == "insider_link":
    target = flagged_employee
else:
    target = customer_from_first_transaction
```

### Why This Works

- **Insider fraud**: Need to question the employee
- **Transaction fraud**: Need to question the account owner
- **Multiple targets**: Pick first (can extend later)

## Consistency Checking

### What It Means

**True** - Answer aligns with logged evidence:
- Confirms the action happened
- Provides reasonable explanation
- Matches transaction records

**False** - Answer contradicts evidence:
- Denies logged action
- Evasive or vague
- Doesn't match records

### Examples

**Insider Link - Consistent:**
```
Q: Did you access account #1234 on Sept 29?
A: Yes, I was helping a colleague.
Logged: Employee accessed #1234 on Sept 29
✓ Consistent
```

**Insider Link - Inconsistent:**
```
Q: Did you access account #1234 on Sept 29?
A: No, I haven't accessed any accounts outside my portfolio.
Logged: Employee accessed #1234 on Sept 29
✗ Inconsistent (denial contradicts logs)
```

**Structuring - Consistent:**
```
Q: Why 6 transactions under $10k on Sept 29?
A: Those were supplier payments. I have invoices.
Logged: 6 transactions, $9,500 each
✓ Consistent (plausible explanation)
```

**Structuring - Inconsistent:**
```
Q: Why 6 transactions under $10k on Sept 29?
A: I don't remember. I'd need to check my records.
Logged: 6 transactions, $9,500 each
✗ Inconsistent (evasive)
```

## Integration with UI

### Frontend Component

`CaseDetail.tsx` adds:

1. **"Trigger Verification Call" button** in Evidence Panel header
2. **Loading state** while calling
3. **Call transcript card** in chat style:
   - AI avatar + question
   - Target avatar + answer
   - Consistency badge
   - Evidence context (collapsible)
4. **Error handling** for failed calls

### Visual Design

```
┌─────────────────────────────────────────┐
│ Evidence                [Trigger Call]  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 📞 AI Verification Call — not a     │ │
│ │    decision                          │ │
│ │                                      │ │
│ │ AI: Did you access account #1234?   │ │
│ │ JS: Yes, I was helping a colleague. │ │
│ │                                      │ │
│ │ [Consistent] ✓                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Standard Evidence Cards...]            │
└─────────────────────────────────────────┘
```

**Key UI Principle:** Call transcripts labeled "AI Verification Call — not a decision" to make clear they're informational, not automated rulings.

## Limitations & Guardrails

### What It Does NOT Do

❌ Change case risk level automatically
❌ Close cases automatically
❌ Escalate cases automatically
❌ Make decisions without human review
❌ Integrate with real telephony
❌ Actually call real people

### What It DOES Do

✅ Append evidence for auditor review
✅ Check consistency with logged data
✅ Generate realistic transcripts
✅ Store full call history
✅ Display in UI for investigation

## Configuration

### Environment Variables

**Optional:**
- `GEMINI_API_KEY` - Google Gemini API key for natural conversation

If not set, falls back to fixed-branch simulation.

### Get Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

## Testing

### Manual Test

```bash
# Start API
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload

# Trigger call (in another terminal)
curl -X POST http://localhost:8000/cases/1/trigger-call

# Get call history
curl http://localhost:8000/cases/1/calls
```

### Expected Response

```json
{
  "target": "Employee A Smith",
  "target_type": "employee",
  "question": "Did you access customer account data outside your assigned portfolio?",
  "answer": "Yes, I did access that account. I was helping out another team member.",
  "consistency_flag": true,
  "evidence_context": "insider_link: Employee accessed customer outside portfolio",
  "called_at": "2026-09-29T16:30:00"
}
```

### UI Test

1. Navigate to case detail page
2. Click "Trigger Verification Call" button
3. Wait for loading state
4. See new call transcript card appear
5. Verify consistency badge shows correct color
6. Expand evidence context

## Future Enhancements

### Production Features

1. **Real Telephony Integration**
   - Twilio API for actual calls
   - Voice transcription
   - Call recording storage

2. **Multi-Target Calls**
   - Call multiple relevant parties
   - Compare stories across calls
   - Detect inconsistencies between accounts

3. **Advanced AI**
   - Follow-up questions based on answers
   - Dynamic branching conversations
   - Sentiment analysis
   - Voice stress detection

4. **Workflow Integration**
   - Require call before case closure
   - Escalation on inconsistent answers
   - Automatic scheduling of follow-ups

### Hackathon Scope

For demo purposes, current implementation:
- ✅ Simulates calls instantly
- ✅ Uses fixed branches or Gemini
- ✅ Stores results in database
- ✅ Displays in UI
- ✅ Sufficient for proof-of-concept

## Error Handling

### Common Errors

**Case Not Found:**
```json
{
  "detail": "Case 999 not found"
}
```
Status: 404

**No Evidence:**
```json
{
  "detail": "No evidence found for this case"
}
```
Status: 404

**API Failure:**
```json
{
  "detail": "Call failed: Could not generate response"
}
```
Status: 500

### Recovery

- Gemini API fails → Falls back to fixed branches
- No target found → Returns error (case needs investigation)
- Network issues → Shows error in UI, retry available

## Compliance Notes

**For Production Use:**

1. **Consent** - Obtain consent before recorded calls
2. **Disclosure** - Inform that AI is being used
3. **Review** - Human must review all AI-generated content
4. **Audit** - Log all calls with timestamps
5. **Privacy** - PII handling per regulations

**Current Demo:**
- Simulated calls only (no actual contact)
- Stored in database for audit trail
- Clearly labeled as AI-generated
- Not used for autonomous decisions

## Code Structure

```
backend/app/
├── calling_agent/
│   ├── __init__.py
│   └── simulator.py           # Core simulation logic
├── api/
│   └── calls.py               # API endpoints
└── models/
    └── entities.py            # CallRecord model

backend/alembic/versions/
└── 0002_add_call_records.py   # Migration
```

## Dependencies

- `google-generativeai>=0.8.0` - Optional, for Gemini API
- All other deps already present

## Summary

The calling agent provides a **proof-of-concept** for AI-assisted fraud investigation. It simulates verification calls, checks consistency, and presents results for human review.

**Key distinction:** This is an **evidence tool**, not an **decision engine**. Auditors remain in full control.
