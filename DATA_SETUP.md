# TRACE Data Setup Guide

## Prerequisites

1. **PostgreSQL running** with an empty database named `trace`
2. **Backend virtual environment** activated with dependencies installed
3. **Environment variables** configured in `backend/.env`

## Steps

### 1. Run Database Migrations

From the `backend` directory with venv activated:

```powershell
cd backend
.\.venv\Scripts\activate
alembic upgrade head
```

This creates all tables:
- `employees` - Bank employees
- `customers` - Bank customers  
- `access_rights` - Employee portfolio assignments
- `accounts` - Customer bank accounts
- `transactions` - Money transfers between accounts
- `employee_actions` - Audit log of employee activities
- `cases` - Investigation cases
- `case_notes` - Notes on cases
- `case_flagged_transactions` - Links cases to suspicious transactions
- `case_flagged_employees` - Links cases to suspicious employees

### 2. Generate Synthetic Data

From the `data` directory with backend venv:

```powershell
cd data
..\backend\.venv\Scripts\activate
python scripts/generate_data.py
```

## What the Generator Creates

### Entities
- **10 employees** across departments (Operations, Compliance, Risk, etc.)
- **50 customers** with KYC status
- **~75 accounts** (1-2 per customer)
- **Portfolio assignments** (each employee manages 3-8 customers)

### Legitimate Scenarios (~95 transactions, ~30 actions)
- **Salary transfers**: Company → employee accounts
- **Supplier payments**: Business → supplier recurring payments  
- **Family transfers**: Between related accounts
- **Normal KYC updates**: Employee updates customer info in their portfolio

### Suspicious Scenarios (labeled with `ground_truth_label`)

#### 1. Circular Transfer Rings (2 cases)
- **Label**: `circular_ring`
- **Pattern**: 3-4 accounts transfer in a circle, completing within 24 hours
- **Amount**: $8,000-$25,000 minus small "fees" each hop

#### 2. Structuring / Smurfing (2 cases)
- **Label**: `structuring`  
- **Pattern**: 5-6 transfers from one source to multiple targets
- **Amount**: Just under $10,000 threshold ($9,200-$9,900)
- **Timeframe**: Within a few hours

#### 3. Insider Fraud (3 cases)
- **Label**: `insider_fraud`
- **Pattern**: 
  1. Employee accesses customer **outside** their assigned portfolio
  2. Updates beneficiary information on victim's account
  3. Suspicious transaction fires within same session
- **Session tracking**: All actions share a `session_id`

## Output Summary

The generator prints a detailed summary:

```
📊 SUMMARY
============================================================
Employees:              10
Customers:              50
Accounts:               ~75
Legitimate txns:        95
Suspicious txns:        ~20
Total transactions:     ~115
Legitimate actions:     30
Suspicious actions:     ~6
Cases opened:           7

Label breakdown:
  - legitimate:         95 txns, 30 actions
  - circular_ring:      6-8 txns (2 cases)
  - structuring:        10-12 txns (2 cases)
  - insider_fraud:      3 txns, 6 actions (3 cases)
```

## Verifying Data

Check the data was inserted:

```sql
-- Count transactions by label
SELECT ground_truth_label, COUNT(*) 
FROM transactions 
GROUP BY ground_truth_label;

-- View open cases
SELECT id, title, ground_truth_label, created_at 
FROM cases 
WHERE status = 'open';

-- Check insider fraud session
SELECT ea.occurred_at, ea.action_type, ea.target_type, ea.session_id
FROM employee_actions ea
WHERE ea.ground_truth_label = 'insider_fraud'
ORDER BY ea.session_id, ea.occurred_at;
```

## Regenerating Data

The generator **clears all existing data** before inserting new rows. Safe to run multiple times:

```powershell
cd data
..\backend\.venv\Scripts\activate
python scripts/generate_data.py
```
