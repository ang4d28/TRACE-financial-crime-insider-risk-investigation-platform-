"""
Circular Transfer Detector

Detects cycles in the transaction graph within a configurable day window.
Uses NetworkX to find strongly connected components and cycles.
"""

from datetime import datetime, timedelta
from decimal import Decimal

import networkx as nx
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.detectors.models import Evidence
from app.models.entities import Transaction, Account


def detect_circular_transfers(
    db: Session,
    time_window_days: int = 7,
    min_cycle_length: int = 3,
    min_amount: Decimal = Decimal("1000.00"),
) -> list[Evidence]:
    """
    Detect circular transfer patterns in the transaction graph.

    Args:
        db: Database session
        time_window_days: Look for cycles within this time window
        min_cycle_length: Minimum number of accounts in a cycle
        min_amount: Minimum transaction amount to consider

    Returns:
        List of Evidence objects for detected circular transfers
    """
    cutoff_time = datetime.now() - timedelta(days=time_window_days)

    # Fetch recent transactions
    transactions = (
        db.query(Transaction)
        .filter(
            and_(
                Transaction.occurred_at >= cutoff_time,
                Transaction.amount >= min_amount,
            )
        )
        .all()
    )

    if not transactions:
        return []

    # Build directed graph: nodes = account_ids, edges = transactions
    graph = nx.DiGraph()

    for txn in transactions:
        graph.add_edge(
            txn.from_account_id,
            txn.to_account_id,
            transaction_id=txn.id,
            amount=float(txn.amount),
            occurred_at=txn.occurred_at,
        )

    evidence_list = []

    # Find strongly connected components (potential cycles)
    for component in nx.strongly_connected_components(graph):
        if len(component) < min_cycle_length:
            continue

        # Extract subgraph for this component
        subgraph = graph.subgraph(component)

        # Find simple cycles in this component
        try:
            cycles = list(nx.simple_cycles(subgraph))
        except nx.NetworkXNoCycle:
            continue

        for cycle in cycles:
            if len(cycle) < min_cycle_length:
                continue

            # Collect transactions in this cycle
            cycle_txns = []
            cycle_amount = Decimal("0")
            earliest_time = None
            latest_time = None

            for i in range(len(cycle)):
                from_acc = cycle[i]
                to_acc = cycle[(i + 1) % len(cycle)]

                if subgraph.has_edge(from_acc, to_acc):
                    edge_data = subgraph[from_acc][to_acc]
                    cycle_txns.append(str(edge_data["transaction_id"]))
                    cycle_amount += Decimal(str(edge_data["amount"]))

                    txn_time = edge_data["occurred_at"]
                    if earliest_time is None or txn_time < earliest_time:
                        earliest_time = txn_time
                    if latest_time is None or txn_time > latest_time:
                        latest_time = txn_time

            if not cycle_txns:
                continue

            # Calculate cycle duration in hours
            if earliest_time and latest_time:
                cycle_duration_hours = (latest_time - earliest_time).total_seconds() / 3600
            else:
                cycle_duration_hours = 0

            # Determine severity based on cycle length and duration
            if len(cycle) >= 5 or cycle_duration_hours <= 6:
                severity = "critical"
            elif len(cycle) >= 4 or cycle_duration_hours <= 24:
                severity = "high"
            else:
                severity = "medium"

            evidence = Evidence(
                rule_name="circular_transfer",
                severity=severity,
                reason=f"Detected circular transfer ring involving {len(cycle)} accounts completing within {cycle_duration_hours:.1f} hours",
                supporting_ids=cycle_txns,
                metric={
                    "cycle_length": len(cycle),
                    "cycle_duration_hours": round(cycle_duration_hours, 2),
                    "total_amount": float(cycle_amount),
                    "account_ids": [str(acc_id) for acc_id in cycle],
                },
            )

            evidence_list.append(evidence)

    return evidence_list
