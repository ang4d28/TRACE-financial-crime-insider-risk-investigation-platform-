"""
Synthetic data generator for TRACE.

Creates a labeled dataset with legitimate and suspicious scenarios:
- Legitimate: salary transfers, supplier payments, KYC updates, family transfers
- Suspicious: circular transfer rings, structuring, insider fraud
"""

import random
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

# Avoid failures on Windows consoles that cannot encode the script's status icons.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")

# Add backend to path so we can import app modules
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(_BACKEND_DIR))

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.entities import (
    Employee,
    Customer,
    AccessRight,
    Account,
    Transaction,
    EmployeeAction,
    Case,
    CaseNote,
    CallRecord,
    case_flagged_employees,
    case_flagged_transactions,
)


# Seed for reproducibility
random.seed(42)


def clear_all_tables(db: Session) -> None:
    """Delete all existing data."""
    db.execute(delete(CaseNote))
    db.execute(delete(CallRecord))
    db.execute(delete(case_flagged_transactions))
    db.execute(delete(case_flagged_employees))
    db.execute(delete(Case))
    db.execute(delete(EmployeeAction))
    db.execute(delete(Transaction))
    db.execute(delete(Account))
    db.execute(delete(AccessRight))
    db.execute(delete(Customer))
    db.execute(delete(Employee))
    db.commit()


def generate_account_number() -> str:
    """Generate a random IBAN-like account number."""
    return f"US{random.randint(10000000, 99999999):08d}{random.randint(100000000000, 999999999999):012d}"


def random_datetime(days_ago: int = 30) -> datetime:
    """Generate a random datetime within the past N days."""
    now = datetime.now()
    delta = timedelta(days=random.randint(0, days_ago), hours=random.randint(0, 23), minutes=random.randint(0, 59))
    return now - delta


def create_employees(db: Session, count: int = 10) -> list[Employee]:
    """Create bank employees."""
    departments = ["Operations", "Compliance", "Customer Service", "Risk Management", "IT"]
    roles = ["Analyst", "Manager", "Associate", "Senior Associate", "Specialist"]
    
    employees = []
    for i in range(count):
        emp = Employee(
            full_name=f"Employee {chr(65 + i)} {random.choice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'])}",
            email=f"employee{i+1}@bank.example.com",
            department=random.choice(departments),
            role=random.choice(roles),
        )
        employees.append(emp)
        db.add(emp)
    
    db.commit()
    for emp in employees:
        db.refresh(emp)
    return employees


def create_customers(db: Session, count: int = 50) -> list[Customer]:
    """Create bank customers."""
    customers = []
    for i in range(count):
        cust = Customer(
            full_name=f"Customer {i+1} {random.choice(['Anderson', 'Taylor', 'Thomas', 'Moore', 'Martin'])}",
            email=f"customer{i+1}@example.com",
            kyc_status=random.choice(["verified", "verified", "verified", "pending"]),
        )
        customers.append(cust)
        db.add(cust)
    
    db.commit()
    for cust in customers:
        db.refresh(cust)
    return customers


def create_access_rights(db: Session, employees: list[Employee], customers: list[Customer]) -> None:
    """Assign portfolio access to employees."""
    # Each employee gets a random portfolio of 3-8 customers
    for emp in employees:
        portfolio_size = random.randint(3, 8)
        assigned_customers = random.sample(customers, portfolio_size)
        for cust in assigned_customers:
            access = AccessRight(
                employee_id=emp.id,
                customer_id=cust.id,
                permission="portfolio",
            )
            db.add(access)
    
    db.commit()


def create_accounts(db: Session, customers: list[Customer]) -> list[Account]:
    """Create bank accounts for customers."""
    accounts = []
    for cust in customers:
        # Each customer gets 1-2 accounts
        num_accounts = random.randint(1, 2)
        for _ in range(num_accounts):
            acc = Account(
                customer_id=cust.id,
                account_number=generate_account_number(),
                account_type=random.choice(["checking", "checking", "savings"]),
                currency="USD",
            )
            accounts.append(acc)
            db.add(acc)
    
    db.commit()
    for acc in accounts:
        db.refresh(acc)
    return accounts


# ======================================================================
# LEGITIMATE SCENARIOS
# ======================================================================

def generate_salary_transfers(db: Session, accounts: list[Account]) -> list[Transaction]:
    """Generate legitimate salary transfers."""
    transactions = []
    # Company accounts (first 3 accounts belong to "company" customers)
    company_accounts = accounts[:3]
    employee_accounts = random.sample(accounts[10:], 20)
    
    for _ in range(30):
        txn = Transaction(
            from_account_id=random.choice(company_accounts).id,
            to_account_id=random.choice(employee_accounts).id,
            amount=Decimal(str(round(random.uniform(2500, 8000), 2))),
            currency="USD",
            description="Salary payment",
            occurred_at=random_datetime(30),
            ground_truth_label="legitimate",
        )
        transactions.append(txn)
        db.add(txn)
    
    return transactions


def generate_supplier_payments(db: Session, accounts: list[Account]) -> list[Transaction]:
    """Generate recurring supplier payments."""
    transactions = []
    business_accounts = accounts[:5]
    supplier_accounts = accounts[5:15]
    
    for _ in range(25):
        txn = Transaction(
            from_account_id=random.choice(business_accounts).id,
            to_account_id=random.choice(supplier_accounts).id,
            amount=Decimal(str(round(random.uniform(500, 15000), 2))),
            currency="USD",
            description=random.choice(["Invoice payment", "Supplier payment", "Service fee"]),
            occurred_at=random_datetime(30),
            ground_truth_label="legitimate",
        )
        transactions.append(txn)
        db.add(txn)
    
    return transactions


def generate_family_transfers(db: Session, accounts: list[Account]) -> list[Transaction]:
    """Generate family transfers between related accounts."""
    transactions = []
    
    for _ in range(40):
        # Pick two random accounts (simulating family members)
        from_acc, to_acc = random.sample(accounts[15:], 2)
        txn = Transaction(
            from_account_id=from_acc.id,
            to_account_id=to_acc.id,
            amount=Decimal(str(round(random.uniform(50, 2000), 2))),
            currency="USD",
            description=random.choice(["Family support", "Gift", "Loan repayment", "Rent share"]),
            occurred_at=random_datetime(30),
            ground_truth_label="legitimate",
        )
        transactions.append(txn)
        db.add(txn)
    
    return transactions


def generate_normal_kyc_updates(db: Session, employees: list[Employee], customers: list[Customer]) -> list[EmployeeAction]:
    """Generate legitimate KYC update actions."""
    actions = []
    
    for _ in range(30):
        emp = random.choice(employees)
        # Find a customer in this employee's portfolio
        emp_customers = [ar.customer_id for ar in emp.access_rights]
        if not emp_customers:
            continue
        
        cust_id = random.choice(emp_customers)
        action = EmployeeAction(
            employee_id=emp.id,
            action_type="kyc_update",
            target_type="customer",
            target_id=cust_id,
            session_id=str(uuid4()),
            details="Updated address and contact information",
            occurred_at=random_datetime(30),
            ground_truth_label="legitimate",
        )
        actions.append(action)
        db.add(action)
    
    return actions


# ======================================================================
# SUSPICIOUS SCENARIOS
# ======================================================================

def generate_circular_transfer_ring(db: Session, accounts: list[Account]) -> tuple[list[Transaction], Case]:
    """
    Suspicious: Circular transfer ring.
    3-4 accounts transfer in a circle, closing within 24h.
    """
    ring_size = random.choice([3, 4])
    ring_accounts = random.sample(accounts[20:40], ring_size)
    
    base_time = datetime.now() - timedelta(days=random.randint(1, 10))
    transactions = []
    
    # Amount stays roughly the same minus small "fees"
    initial_amount = Decimal(str(round(random.uniform(8000, 25000), 2)))
    
    for i in range(ring_size):
        from_acc = ring_accounts[i]
        to_acc = ring_accounts[(i + 1) % ring_size]
        # Slightly reduce amount each hop
        amount = initial_amount - Decimal(str(round(random.uniform(10, 100), 2))) * i
        
        txn = Transaction(
            from_account_id=from_acc.id,
            to_account_id=to_acc.id,
            amount=amount,
            currency="USD",
            description=random.choice(["Business expense", "Payment", "Transfer"]),
            occurred_at=base_time + timedelta(hours=random.randint(1, 20)),
            ground_truth_label="circular_ring",
        )
        transactions.append(txn)
        db.add(txn)
    
    db.flush()
    
    # Create a case for this ring
    case = Case(
        title=f"Circular transfer ring detected ({ring_size} accounts)",
        status="new",
        created_at=datetime.now(),
        ground_truth_label="circular_ring",
    )
    db.add(case)
    db.flush()
    
    # Link transactions to case
    for txn in transactions:
        case.flagged_transactions.append(txn)
    
    return transactions, case


def generate_structuring_case(db: Session, accounts: list[Account]) -> tuple[list[Transaction], Case]:
    """
    Suspicious: Structuring (smurfing).
    5+ transfers just under $10,000 threshold within a few hours.
    """
    source_acc = random.choice(accounts[40:60])
    target_accounts = random.sample(accounts[60:], 6)
    
    base_time = datetime.now() - timedelta(days=random.randint(1, 15))
    transactions = []
    
    for target_acc in target_accounts:
        # Amount just under $10,000
        amount = Decimal(str(round(random.uniform(9200, 9900), 2)))
        
        txn = Transaction(
            from_account_id=source_acc.id,
            to_account_id=target_acc.id,
            amount=amount,
            currency="USD",
            description=random.choice(["Payment", "Transfer", "Settlement"]),
            occurred_at=base_time + timedelta(minutes=random.randint(10, 300)),
            ground_truth_label="structuring",
        )
        transactions.append(txn)
        db.add(txn)
    
    db.flush()
    
    case = Case(
        title=f"Structuring detected: {len(transactions)} transfers under $10k threshold",
        status="new",
        created_at=datetime.now(),
        ground_truth_label="structuring",
    )
    db.add(case)
    db.flush()
    
    for txn in transactions:
        case.flagged_transactions.append(txn)
    
    return transactions, case


def generate_insider_fraud_case(
    db: Session,
    employees: list[Employee],
    customers: list[Customer],
    accounts: list[Account],
) -> tuple[list[EmployeeAction], list[Transaction], Case]:
    """
    Suspicious: Insider fraud.
    Employee accesses customer outside portfolio, edits beneficiary info,
    then transaction fires within the same session.
    """
    emp = random.choice(employees)
    
    # Find a customer NOT in this employee's portfolio
    emp_customer_ids = {ar.customer_id for ar in emp.access_rights}
    outside_customers = [c for c in customers if c.id not in emp_customer_ids]
    
    if not outside_customers:
        # Fallback: use any customer
        outside_customers = customers
    
    victim_customer = random.choice(outside_customers)
    victim_accounts = [acc for acc in accounts if acc.customer_id == victim_customer.id]
    
    if not victim_accounts:
        # Fallback: pick any account
        victim_accounts = accounts[:1]
    
    victim_account = victim_accounts[0]
    
    session_id = str(uuid4())
    base_time = datetime.now() - timedelta(days=random.randint(1, 20))
    
    actions = []
    
    # 1. Unauthorized access
    action1 = EmployeeAction(
        employee_id=emp.id,
        action_type="view_customer_details",
        target_type="customer",
        target_id=victim_customer.id,
        session_id=session_id,
        details="Accessed customer outside assigned portfolio",
        occurred_at=base_time,
        ground_truth_label="insider_fraud",
    )
    actions.append(action1)
    db.add(action1)
    
    # 2. Beneficiary update
    action2 = EmployeeAction(
        employee_id=emp.id,
        action_type="update_beneficiary",
        target_type="account",
        target_id=victim_account.id,
        session_id=session_id,
        details="Changed beneficiary account information",
        occurred_at=base_time + timedelta(minutes=5),
        ground_truth_label="insider_fraud",
    )
    actions.append(action2)
    db.add(action2)
    
    db.flush()
    
    # 3. Suspicious transaction shortly after
    # Pick a random account as the fraudulent beneficiary
    fraudulent_target = random.choice([acc for acc in accounts if acc.id != victim_account.id])
    
    txn = Transaction(
        from_account_id=victim_account.id,
        to_account_id=fraudulent_target.id,
        amount=Decimal(str(round(random.uniform(5000, 30000), 2))),
        currency="USD",
        description="Beneficiary payment",
        occurred_at=base_time + timedelta(minutes=10),
        ground_truth_label="insider_fraud",
    )
    db.add(txn)
    db.flush()
    
    # Create case
    case = Case(
        title=f"Insider fraud: Unauthorized access by {emp.full_name}",
        status="new",
        created_at=datetime.now(),
        ground_truth_label="insider_fraud",
    )
    db.add(case)
    db.flush()
    
    case.flagged_employees.append(emp)
    case.flagged_transactions.append(txn)
    
    # Add a case note
    note = CaseNote(
        case_id=case.id,
        author_id=None,
        body="Automated detection: Employee accessed customer outside portfolio, modified beneficiary, transaction followed in same session.",
        created_at=datetime.now(),
    )
    db.add(note)
    
    return actions, [txn], case


# ======================================================================
# MAIN
# ======================================================================

def main() -> None:
    """Generate all synthetic data."""
    print("🔄 Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print("🗑️  Clearing existing data...")
        clear_all_tables(db)
        
        print("👥 Creating employees...")
        employees = create_employees(db, count=10)
        
        print("👤 Creating customers...")
        customers = create_customers(db, count=50)
        
        print("🔑 Assigning portfolio access rights...")
        create_access_rights(db, employees, customers)
        
        print("🏦 Creating accounts...")
        accounts = create_accounts(db, customers)
        
        print("\n✅ Generating LEGITIMATE scenarios...")
        legit_txns = []
        legit_txns.extend(generate_salary_transfers(db, accounts))
        legit_txns.extend(generate_supplier_payments(db, accounts))
        legit_txns.extend(generate_family_transfers(db, accounts))
        
        legit_actions = []
        legit_actions.extend(generate_normal_kyc_updates(db, employees, customers))
        
        print(f"   ✓ {len(legit_txns)} legitimate transactions")
        print(f"   ✓ {len(legit_actions)} legitimate employee actions")
        
        print("\n🚨 Generating SUSPICIOUS scenarios...")
        suspicious_txns = []
        suspicious_actions = []
        cases = []
        
        # Generate 2 circular rings
        for _ in range(2):
            txns, case = generate_circular_transfer_ring(db, accounts)
            suspicious_txns.extend(txns)
            cases.append(case)
        
        # Generate 2 structuring cases
        for _ in range(2):
            txns, case = generate_structuring_case(db, accounts)
            suspicious_txns.extend(txns)
            cases.append(case)
        
        # Generate 3 insider fraud cases
        for _ in range(3):
            actions, txns, case = generate_insider_fraud_case(db, employees, customers, accounts)
            suspicious_actions.extend(actions)
            suspicious_txns.extend(txns)
            cases.append(case)
        
        print(f"   ✓ {len(suspicious_txns)} suspicious transactions")
        print(f"   ✓ {len(suspicious_actions)} suspicious employee actions")
        print(f"   ✓ {len(cases)} cases created")
        
        db.commit()
        
        print("\n" + "="*60)
        print("📊 SUMMARY")
        print("="*60)
        print(f"Employees:              {len(employees)}")
        print(f"Customers:              {len(customers)}")
        print(f"Accounts:               {len(accounts)}")
        print(f"Legitimate txns:        {len(legit_txns)}")
        print(f"Suspicious txns:        {len(suspicious_txns)}")
        print(f"Total transactions:     {len(legit_txns) + len(suspicious_txns)}")
        print(f"Legitimate actions:     {len(legit_actions)}")
        print(f"Suspicious actions:     {len(suspicious_actions)}")
        print(f"Total employee actions: {len(legit_actions) + len(suspicious_actions)}")
        print(f"Cases opened:           {len(cases)}")
        print()
        print("Label breakdown:")
        print(f"  - legitimate:         {len(legit_txns)} txns, {len(legit_actions)} actions")
        print(f"  - circular_ring:      {sum(1 for t in suspicious_txns if t.ground_truth_label == 'circular_ring')} txns")
        print(f"  - structuring:        {sum(1 for t in suspicious_txns if t.ground_truth_label == 'structuring')} txns")
        print(f"  - insider_fraud:      {sum(1 for t in suspicious_txns if t.ground_truth_label == 'insider_fraud')} txns, {len(suspicious_actions)} actions")
        print("="*60)
        print("✅ Data generation complete!\n")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
