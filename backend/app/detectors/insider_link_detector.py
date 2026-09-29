"""
Insider Link Detector

Flags when an EmployeeAction (access, KYC edit, beneficiary change) by an
employee precedes an anomalous transaction on that same account within a short
window, especially if the customer isn't in that employee's normal portfolio.
"""

from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.detectors.models import Evidence
from app.models.entities import (
    EmployeeAction,
    Transaction,
    Account,
    Employee,
    Customer,
    AccessRight,
)


# Action types that are particularly suspicious when linked to transactions
SUSPICIOUS_ACTION_TYPES = {
    "update_beneficiary",
    "kyc_update",
    "access_override",
    "permission_change",
    "view_customer_details",
}


def detect_insider_links(
    db: Session,
    time_window_hours: int = 48,
    min_transaction_amount: Decimal = Decimal("5000.00"),
) -> list[Evidence]:
    """
    Detect insider fraud patterns: employee actions followed by anomalous transactions.

    Args:
        db: Database session
        time_window_hours: Look for transactions within this window after action
        min_transaction_amount: Minimum transaction amount to flag

    Returns:
        List of Evidence objects for detected insider links
    """
    cutoff_time = datetime.now() - timedelta(days=30)  # Look at past 30 days

    # Fetch suspicious employee actions
    actions = (
        db.query(EmployeeAction)
        .filter(
            and_(
                EmployeeAction.occurred_at >= cutoff_time,
                EmployeeAction.action_type.in_(SUSPICIOUS_ACTION_TYPES),
            )
        )
        .all()
    )

    if not actions:
        return []

    evidence_list = []

    for action in actions:
        # Determine the account affected by this action
        if action.target_type == "account":
            account_id = action.target_id
        elif action.target_type == "customer":
            # Get customer's accounts
            customer_accounts = (
                db.query(Account.id).filter(Account.customer_id == action.target_id).all()
            )
            if not customer_accounts:
                continue
            # For simplicity, check first account
            account_id = customer_accounts[0][0]
        else:
            continue

        # Look for transactions on this account within the time window AFTER the action
        action_end_window = action.occurred_at + timedelta(hours=time_window_hours)

        related_txns = (
            db.query(Transaction)
            .filter(
                and_(
                    or_(
                        Transaction.from_account_id == account_id,
                        Transaction.to_account_id == account_id,
                    ),
                    Transaction.occurred_at >= action.occurred_at,
                    Transaction.occurred_at <= action_end_window,
                    Transaction.amount >= min_transaction_amount,
                )
            )
            .all()
        )

        if not related_txns:
            continue

        # Check if customer is in employee's portfolio
        employee = db.query(Employee).filter(Employee.id == action.employee_id).first()
        if not employee:
            continue

        # Get account's customer
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            continue

        customer = db.query(Customer).filter(Customer.id == account.customer_id).first()
        if not customer:
            continue

        # Check if employee has access to this customer
        has_access = (
            db.query(AccessRight)
            .filter(
                and_(
                    AccessRight.employee_id == employee.id,
                    AccessRight.customer_id == customer.id,
                )
            )
            .first()
        )

        is_unauthorized = not has_access

        # Calculate time gap between action and first transaction
        time_gap_hours = (related_txns[0].occurred_at - action.occurred_at).total_seconds() / 3600

        # Calculate total transaction amount
        total_amount = sum(txn.amount for txn in related_txns)

        # Check if actions are in the same session
        same_session = False
        if action.session_id:
            # Check if any other actions in same session
            session_actions = (
                db.query(EmployeeAction)
                .filter(
                    and_(
                        EmployeeAction.session_id == action.session_id,
                        EmployeeAction.id != action.id,
                    )
                )
                .all()
            )
            same_session = len(session_actions) > 0

        # Determine severity
        if is_unauthorized and same_session:
            severity = "critical"
        elif is_unauthorized:
            severity = "high"
        elif time_gap_hours <= 1:
            severity = "high"
        elif same_session or time_gap_hours <= 6:
            severity = "medium"
        else:
            severity = "low"

        # Build reason
        access_qualifier = "outside their portfolio " if is_unauthorized else ""
        session_qualifier = " in the same session" if same_session else ""

        evidence = Evidence(
            rule_name="insider_link",
            severity=severity,
            reason=f"Employee {employee.full_name} performed '{action.action_type}' on customer {access_qualifier}followed by ${float(total_amount):,.2f} in transactions within {time_gap_hours:.1f} hours{session_qualifier}",
            supporting_ids=[str(action.id)] + [str(txn.id) for txn in related_txns],
            metric={
                "employee_id": str(employee.id),
                "employee_name": employee.full_name,
                "customer_id": str(customer.id),
                "customer_name": customer.full_name,
                "account_id": str(account_id),
                "action_type": action.action_type,
                "action_occurred_at": action.occurred_at.isoformat(),
                "time_gap_hours": round(time_gap_hours, 2),
                "transaction_count": len(related_txns),
                "total_amount": float(total_amount),
                "is_unauthorized_access": is_unauthorized,
                "same_session": same_session,
                "session_id": action.session_id,
            },
        )

        evidence_list.append(evidence)

    return evidence_list
