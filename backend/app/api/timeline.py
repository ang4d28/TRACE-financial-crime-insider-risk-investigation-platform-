"""
Timeline API

Endpoint for retrieving chronological case timelines.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.entities import Case, Transaction, EmployeeAction, Account
from app.detectors import (
    detect_circular_transfers,
    detect_structuring,
    detect_profile_mismatch,
    detect_insider_links,
)


router = APIRouter(prefix="/timeline", tags=["timeline"])


class TimelineEvent(BaseModel):
    """Single event in the case timeline."""

    timestamp: datetime
    event_type: str  # "transaction" | "employee_action"
    actor: str | None  # Employee name for actions, customer name for transactions
    description: str
    entity_id: int
    evidence_rule: str | None  # Rule name if this event is flagged by a detector


class CaseTimeline(BaseModel):
    """Complete case timeline."""

    case_id: int
    case_title: str
    events: list[TimelineEvent]


@router.get("/{case_id}", response_model=CaseTimeline)
def get_case_timeline(case_id: int, db: Session = Depends(get_db)) -> CaseTimeline:
    """
    Get the chronological timeline for a specific case.

    Returns all EmployeeActions and Transactions tied to the case's entities,
    sorted by timestamp. Each event includes a reference to its Evidence rule
    if it was flagged by a detector.

    Args:
        case_id: ID of the case
        db: Database session

    Returns:
        CaseTimeline with chronologically sorted events
    """
    # Fetch the case
    case = db.query(Case).filter(Case.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Run detectors to get evidence (for linking events to rules)
    circular_evidence = detect_circular_transfers(db)
    structuring_evidence = detect_structuring(db)
    profile_evidence = detect_profile_mismatch(db)
    insider_evidence = detect_insider_links(db)

    all_evidence = (
        circular_evidence
        + structuring_evidence
        + profile_evidence
        + insider_evidence
    )

    # Build a map of entity_id -> evidence_rule for quick lookup
    entity_to_rule: dict[str, str] = {}
    for evidence in all_evidence:
        for supporting_id in evidence.supporting_ids:
            entity_to_rule[supporting_id] = evidence.rule_name

    events: list[TimelineEvent] = []

    # Add transaction events
    for txn in case.flagged_transactions:
        # Determine actor (from account's customer)
        from_customer = txn.from_account.customer
        actor = from_customer.full_name

        # Build description
        to_customer = txn.to_account.customer
        description = f"Transferred ${float(txn.amount):,.2f} to {to_customer.full_name} - {txn.description}"

        # Check if this transaction is flagged by any detector
        evidence_rule = entity_to_rule.get(str(txn.id))

        event = TimelineEvent(
            timestamp=txn.occurred_at,
            event_type="transaction",
            actor=actor,
            description=description,
            entity_id=txn.id,
            evidence_rule=evidence_rule,
        )

        events.append(event)

    # Add employee action events
    # Get all employee actions related to case entities
    flagged_employee_ids = [emp.id for emp in case.flagged_employees]

    # Get account IDs from case transactions
    account_ids = set()
    customer_ids = set()

    for txn in case.flagged_transactions:
        account_ids.add(txn.from_account_id)
        account_ids.add(txn.to_account_id)
        customer_ids.add(txn.from_account.customer_id)
        customer_ids.add(txn.to_account.customer_id)

    # Query employee actions related to these entities
    employee_actions = (
        db.query(EmployeeAction)
        .filter(
            or_(
                # Actions by flagged employees
                EmployeeAction.employee_id.in_(flagged_employee_ids),
                # Actions on case accounts
                (
                    (EmployeeAction.target_type == "account")
                    & (EmployeeAction.target_id.in_(account_ids))
                ),
                # Actions on case customers
                (
                    (EmployeeAction.target_type == "customer")
                    & (EmployeeAction.target_id.in_(customer_ids))
                ),
            )
        )
        .all()
    )

    for action in employee_actions:
        # Get employee name
        actor = action.employee.full_name

        # Build description based on action type
        target_name = "unknown"
        if action.target_type == "customer":
            customer = db.query(Account).filter(Account.customer_id == action.target_id).first()
            if customer:
                target_name = customer.customer.full_name
        elif action.target_type == "account":
            account = db.query(Account).filter(Account.id == action.target_id).first()
            if account:
                target_name = f"Account {account.account_number[-4:]}"

        description = f"{action.action_type.replace('_', ' ').title()} on {target_name}"
        if action.details:
            description += f" - {action.details}"

        # Check if this action is flagged by any detector
        evidence_rule = entity_to_rule.get(str(action.id))

        event = TimelineEvent(
            timestamp=action.occurred_at,
            event_type="employee_action",
            actor=actor,
            description=description,
            entity_id=action.id,
            evidence_rule=evidence_rule,
        )

        events.append(event)

    # Sort events chronologically
    events.sort(key=lambda e: e.timestamp)

    return CaseTimeline(
        case_id=case.id,
        case_title=case.title,
        events=events,
    )
