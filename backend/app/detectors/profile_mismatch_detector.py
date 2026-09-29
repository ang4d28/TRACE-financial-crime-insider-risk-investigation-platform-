"""
Profile Mismatch Detector

Flags when transaction volume deviates >Nx from the customer's declared
income bracket/occupation baseline. Uses synthetic risk profiles based on
customer attributes.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.detectors.models import Evidence
from app.models.entities import Transaction, Account, Customer


# Synthetic income/occupation baselines (monthly expected transaction volume)
OCCUPATION_BASELINES = {
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

KYC_STATUS_MULTIPLIERS = {
    "verified": 1.0,
    "pending": 0.5,  # More suspicious if not fully verified
    "flagged": 0.3,
}


def infer_occupation_from_customer(customer: Customer) -> str:
    """
    Infer occupation from customer attributes.
    In a real system, this would be a field in the customer profile.
    For synthetic data, we'll use a simple heuristic based on customer_id.
    """
    # Synthetic: map customer ID ranges to occupations
    occupations = list(OCCUPATION_BASELINES.keys())
    idx = customer.id % len(occupations)
    return occupations[idx]


def detect_profile_mismatch(
    db: Session,
    time_window_days: int = 30,
    deviation_threshold: float = 3.0,
) -> list[Evidence]:
    """
    Detect transaction volume mismatches with customer profile.

    Args:
        db: Database session
        time_window_days: Period to analyze transaction volume
        deviation_threshold: Flag if volume exceeds baseline by this factor

    Returns:
        List of Evidence objects for detected profile mismatches
    """
    cutoff_time = datetime.now() - timedelta(days=time_window_days)

    # Get all customers with their accounts
    customers = db.query(Customer).all()

    evidence_list = []

    for customer in customers:
        # Get customer's accounts
        accounts = db.query(Account).filter(Account.customer_id == customer.id).all()

        if not accounts:
            continue

        account_ids = [acc.id for acc in accounts]

        # Calculate total outgoing transaction volume in the window
        outgoing_volume = (
            db.query(func.sum(Transaction.amount))
            .filter(
                and_(
                    Transaction.from_account_id.in_(account_ids),
                    Transaction.occurred_at >= cutoff_time,
                )
            )
            .scalar()
        ) or Decimal("0")

        # Calculate total incoming transaction volume
        incoming_volume = (
            db.query(func.sum(Transaction.amount))
            .filter(
                and_(
                    Transaction.to_account_id.in_(account_ids),
                    Transaction.occurred_at >= cutoff_time,
                )
            )
            .scalar()
        ) or Decimal("0")

        total_volume = outgoing_volume + incoming_volume

        if total_volume == 0:
            continue

        # Infer occupation and get baseline
        occupation = infer_occupation_from_customer(customer)
        monthly_baseline = OCCUPATION_BASELINES.get(occupation, 5000)

        # Adjust baseline for time window
        expected_volume = monthly_baseline * (time_window_days / 30)

        # Apply KYC status multiplier
        kyc_multiplier = KYC_STATUS_MULTIPLIERS.get(customer.kyc_status, 1.0)
        expected_volume *= kyc_multiplier

        # Calculate deviation
        actual_volume_float = float(total_volume)
        deviation_ratio = actual_volume_float / expected_volume if expected_volume > 0 else float("inf")

        if deviation_ratio < deviation_threshold:
            continue

        # Count transactions
        txn_count = (
            db.query(func.count(Transaction.id))
            .filter(
                and_(
                    or_(
                        Transaction.from_account_id.in_(account_ids),
                        Transaction.to_account_id.in_(account_ids),
                    ),
                    Transaction.occurred_at >= cutoff_time,
                )
            )
            .scalar()
        )

        # Get supporting transaction IDs (top 10 largest)
        top_txns = (
            db.query(Transaction.id)
            .filter(
                and_(
                    or_(
                        Transaction.from_account_id.in_(account_ids),
                        Transaction.to_account_id.in_(account_ids),
                    ),
                    Transaction.occurred_at >= cutoff_time,
                )
            )
            .order_by(Transaction.amount.desc())
            .limit(10)
            .all()
        )

        supporting_ids = [str(txn_id) for (txn_id,) in top_txns]

        # Determine severity
        if deviation_ratio >= 10:
            severity = "critical"
        elif deviation_ratio >= 6:
            severity = "high"
        elif deviation_ratio >= 4:
            severity = "medium"
        else:
            severity = "low"

        evidence = Evidence(
            rule_name="profile_mismatch",
            severity=severity,
            reason=f"Customer '{customer.full_name}' ({occupation}) transaction volume ${actual_volume_float:,.2f} is {deviation_ratio:.1f}x expected baseline for their profile",
            supporting_ids=supporting_ids,
            metric={
                "customer_id": str(customer.id),
                "customer_name": customer.full_name,
                "occupation": occupation,
                "kyc_status": customer.kyc_status,
                "total_volume": round(actual_volume_float, 2),
                "expected_volume": round(expected_volume, 2),
                "deviation_ratio": round(deviation_ratio, 2),
                "transaction_count": txn_count,
                "time_window_days": time_window_days,
            },
        )

        evidence_list.append(evidence)

    return evidence_list


# Make or_ available to this module
from sqlalchemy import or_
