"""
Structuring Detector (Smurfing)

Detects clusters of transactions from/to the same account under a threshold
within a short time window. Compares against customer's historical baseline.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict

from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from app.detectors.models import Evidence
from app.models.entities import Transaction, Account


def detect_structuring(
    db: Session,
    time_window_hours: int = 24,
    threshold_amount: Decimal = Decimal("10000.00"),
    min_transaction_count: int = 5,
    historical_days: int = 90,
) -> list[Evidence]:
    """
    Detect structuring/smurfing patterns.

    Args:
        db: Database session
        time_window_hours: Time window to look for clustering
        threshold_amount: Transactions just under this amount are suspicious
        min_transaction_count: Minimum number of transactions to flag
        historical_days: Days to look back for historical baseline

    Returns:
        List of Evidence objects for detected structuring
    """
    cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
    historical_cutoff = datetime.now() - timedelta(days=historical_days)

    # Fetch recent transactions near the threshold
    # Look for transactions in range [threshold * 0.80, threshold * 0.99]
    lower_bound = threshold_amount * Decimal("0.80")
    upper_bound = threshold_amount * Decimal("0.99")

    recent_txns = (
        db.query(Transaction)
        .filter(
            and_(
                Transaction.occurred_at >= cutoff_time,
                Transaction.amount >= lower_bound,
                Transaction.amount < upper_bound,
            )
        )
        .all()
    )

    if not recent_txns:
        return []

    # Group by account (both outgoing and incoming)
    account_outgoing = defaultdict(list)
    account_incoming = defaultdict(list)

    for txn in recent_txns:
        account_outgoing[txn.from_account_id].append(txn)
        account_incoming[txn.to_account_id].append(txn)

    evidence_list = []

    # Check outgoing transactions (from same source)
    for account_id, txns in account_outgoing.items():
        if len(txns) < min_transaction_count:
            continue

        total_amount = sum(txn.amount for txn in txns)
        avg_amount = total_amount / len(txns)

        # Calculate historical baseline for this account
        historical_count = (
            db.query(func.count(Transaction.id))
            .filter(
                and_(
                    Transaction.from_account_id == account_id,
                    Transaction.occurred_at >= historical_cutoff,
                    Transaction.occurred_at < cutoff_time,
                )
            )
            .scalar()
        )

        # Calculate baseline transactions per day
        baseline_per_day = historical_count / historical_days if historical_days > 0 else 0
        current_per_day = len(txns) / (time_window_hours / 24)

        # Flag if current rate is significantly higher than baseline
        deviation_ratio = (
            current_per_day / baseline_per_day if baseline_per_day > 0 else float("inf")
        )

        # Determine severity
        if deviation_ratio > 10 or (len(txns) >= 8 and baseline_per_day < 1):
            severity = "critical"
        elif deviation_ratio > 5 or len(txns) >= 7:
            severity = "high"
        elif deviation_ratio > 3 or len(txns) >= min_transaction_count:
            severity = "medium"
        else:
            severity = "low"

        # Calculate time span
        earliest = min(txn.occurred_at for txn in txns)
        latest = max(txn.occurred_at for txn in txns)
        time_span_hours = (latest - earliest).total_seconds() / 3600

        evidence = Evidence(
            rule_name="structuring_outgoing",
            severity=severity,
            reason=f"Account made {len(txns)} transactions just under ${threshold_amount} threshold within {time_span_hours:.1f} hours, {deviation_ratio:.1f}x above historical baseline",
            supporting_ids=[str(txn.id) for txn in txns],
            metric={
                "transaction_count": len(txns),
                "total_amount": float(total_amount),
                "average_amount": float(avg_amount),
                "threshold": float(threshold_amount),
                "time_span_hours": round(time_span_hours, 2),
                "baseline_per_day": round(baseline_per_day, 2),
                "current_per_day": round(current_per_day, 2),
                "deviation_ratio": round(deviation_ratio, 2),
                "account_id": str(account_id),
            },
        )

        evidence_list.append(evidence)

    # Check incoming transactions (to same destination)
    for account_id, txns in account_incoming.items():
        if len(txns) < min_transaction_count:
            continue

        # Skip if we already flagged this account as outgoing
        if account_id in account_outgoing and len(account_outgoing[account_id]) >= min_transaction_count:
            continue

        total_amount = sum(txn.amount for txn in txns)
        avg_amount = total_amount / len(txns)

        # Check if transactions come from different sources (smurfing pattern)
        unique_sources = len(set(txn.from_account_id for txn in txns))

        # More severe if from multiple sources
        if unique_sources >= len(txns) - 1:  # Each from different source
            severity = "high" if len(txns) >= 7 else "medium"
        else:
            severity = "medium" if len(txns) >= 7 else "low"

        earliest = min(txn.occurred_at for txn in txns)
        latest = max(txn.occurred_at for txn in txns)
        time_span_hours = (latest - earliest).total_seconds() / 3600

        evidence = Evidence(
            rule_name="structuring_incoming",
            severity=severity,
            reason=f"Account received {len(txns)} transactions from {unique_sources} sources just under ${threshold_amount} threshold within {time_span_hours:.1f} hours",
            supporting_ids=[str(txn.id) for txn in txns],
            metric={
                "transaction_count": len(txns),
                "unique_sources": unique_sources,
                "total_amount": float(total_amount),
                "average_amount": float(avg_amount),
                "threshold": float(threshold_amount),
                "time_span_hours": round(time_span_hours, 2),
                "account_id": str(account_id),
            },
        )

        evidence_list.append(evidence)

    return evidence_list
