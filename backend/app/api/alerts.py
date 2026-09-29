"""
Alerts API

Endpoints for retrieving detection results and risk assessments.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.detectors import (
    detect_circular_transfers,
    detect_structuring,
    detect_profile_mismatch,
    detect_insider_links,
    aggregate_evidence,
    Evidence,
    RiskAssessment,
)
from app.models.entities import Case
from pydantic import BaseModel


router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertSummary(BaseModel):
    """Summary of an alert with overall risk level."""

    case_id: int | None
    title: str
    overall_risk: str
    evidence_count: int
    detection_categories: list[str]


class AlertDetail(BaseModel):
    """Full alert detail with evidence breakdown."""

    case_id: int | None
    title: str
    risk_assessment: RiskAssessment


@router.get("", response_model=list[AlertSummary])
def list_alerts(db: Session = Depends(get_db)) -> list[AlertSummary]:
    """
    List all triggered alerts with overall risk levels.

    Returns cases from the database with their detected evidence.
    """
    # Get all cases
    cases = db.query(Case).all()
    if not cases:
        return []
    
    # Run all detectors once
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

    # Build summaries for each case
    summaries = []
    
    for case in cases:
        # Get flagged transaction and employee IDs for this case
        flagged_txn_ids = {str(txn.id) for txn in case.flagged_transactions}
        flagged_emp_ids = {str(emp.id) for emp in case.flagged_employees}
        
        # Filter evidence relevant to this case
        relevant_evidence = []
        for evidence in all_evidence:
            for supporting_id in evidence.supporting_ids:
                if supporting_id in flagged_txn_ids or supporting_id in flagged_emp_ids:
                    relevant_evidence.append(evidence)
                    break
        
        # If we found evidence, aggregate it; otherwise use default
        if relevant_evidence:
            assessment = aggregate_evidence(relevant_evidence)
            detection_categories = list(set(ev.rule_name for ev in relevant_evidence))
        else:
            # Case exists but no evidence matched - use medium risk as default
            assessment = aggregate_evidence([])
            detection_categories = ["unknown"]
        
        summary = AlertSummary(
            case_id=case.id,
            title=case.title,
            overall_risk=assessment.overall_risk,
            evidence_count=len(relevant_evidence),
            detection_categories=detection_categories,
        )
        
        summaries.append(summary)
    
    # Sort by risk level (critical first)
    risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    summaries.sort(key=lambda s: risk_order.get(s.overall_risk, 99))
    
    return summaries


@router.get("/{case_id}", response_model=AlertDetail)
def get_alert_detail(case_id: int, db: Session = Depends(get_db)) -> AlertDetail:
    """
    Get full alert detail with evidence breakdown for a specific case.

    Runs all detectors and filters evidence related to this case's
    flagged transactions and employees.
    """
    # Fetch the case
    case = db.query(Case).filter(Case.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Get flagged transaction IDs
    flagged_txn_ids = {str(txn.id) for txn in case.flagged_transactions}

    # Get flagged employee IDs
    flagged_emp_ids = {str(emp.id) for emp in case.flagged_employees}

    # Run all detectors
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

    # Filter evidence relevant to this case
    relevant_evidence = []

    for evidence in all_evidence:
        # Check if any supporting_ids match flagged transactions or employees
        for supporting_id in evidence.supporting_ids:
            if supporting_id in flagged_txn_ids or supporting_id in flagged_emp_ids:
                relevant_evidence.append(evidence)
                break

    # If no evidence matched by ID, check by metric fields
    if not relevant_evidence:
        for evidence in all_evidence:
            metric = evidence.metric
            # Check if customer_id, account_id, employee_id match case entities
            if "customer_id" in metric:
                # Get customer from case's transactions
                for txn in case.flagged_transactions:
                    if (
                        str(txn.from_account.customer_id) == metric["customer_id"]
                        or str(txn.to_account.customer_id) == metric["customer_id"]
                    ):
                        relevant_evidence.append(evidence)
                        break

    # Aggregate evidence
    assessment = aggregate_evidence(relevant_evidence)

    return AlertDetail(
        case_id=case.id,
        title=case.title,
        risk_assessment=assessment,
    )
