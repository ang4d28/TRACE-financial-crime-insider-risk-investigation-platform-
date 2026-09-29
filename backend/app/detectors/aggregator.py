"""
Evidence Aggregator

Combines multiple Evidence objects into an overall risk assessment using
explicit rules. Never collapses to a single opaque score.
"""

from typing import Literal
from collections import Counter

from app.detectors.models import Evidence, RiskAssessment


def aggregate_evidence(evidence_list: list[Evidence]) -> RiskAssessment:
    """
    Aggregate multiple evidence objects into an overall risk assessment.

    Rules:
    - 2+ independent high-severity signals = critical
    - 1 critical signal = critical
    - 2+ medium + 1 high = high
    - 1 high OR 3+ medium = high
    - 2+ medium OR 1 medium + 2+ low = medium
    - Otherwise = low

    Args:
        evidence_list: List of Evidence objects

    Returns:
        RiskAssessment with overall risk level and reasoning
    """
    if not evidence_list:
        return RiskAssessment(
            overall_risk="low",
            evidence_list=[],
            reasoning="No evidence detected",
        )

    # Count severity levels
    severity_counts = Counter(ev.severity for ev in evidence_list)

    critical_count = severity_counts.get("critical", 0)
    high_count = severity_counts.get("high", 0)
    medium_count = severity_counts.get("medium", 0)
    low_count = severity_counts.get("low", 0)

    # Count unique rule types (independent signals)
    unique_rules = set(ev.rule_name for ev in evidence_list)
    independent_high_signals = sum(
        1 for rule in unique_rules if any(
            ev.rule_name == rule and ev.severity in ("high", "critical")
            for ev in evidence_list
        )
    )

    # Apply aggregation rules
    overall_risk: Literal["low", "medium", "high", "critical"]
    reasoning_parts = []

    if critical_count >= 1:
        overall_risk = "critical"
        reasoning_parts.append(f"{critical_count} critical-severity signal{'s' if critical_count > 1 else ''}")

    elif independent_high_signals >= 2:
        overall_risk = "critical"
        reasoning_parts.append(f"{independent_high_signals} independent high-severity signals from different detectors")

    elif high_count >= 1 and medium_count >= 2:
        overall_risk = "high"
        reasoning_parts.append(f"{high_count} high-severity and {medium_count} medium-severity signals")

    elif high_count >= 1:
        overall_risk = "high"
        reasoning_parts.append(f"{high_count} high-severity signal{'s' if high_count > 1 else ''}")

    elif medium_count >= 3:
        overall_risk = "high"
        reasoning_parts.append(f"{medium_count} medium-severity signals indicating sustained pattern")

    elif medium_count >= 2:
        overall_risk = "medium"
        reasoning_parts.append(f"{medium_count} medium-severity signals")

    elif medium_count >= 1 and low_count >= 2:
        overall_risk = "medium"
        reasoning_parts.append(f"{medium_count} medium-severity and {low_count} low-severity signals")

    elif medium_count >= 1:
        overall_risk = "medium"
        reasoning_parts.append(f"{medium_count} medium-severity signal")

    else:
        overall_risk = "low"
        reasoning_parts.append(f"{low_count} low-severity signal{'s' if low_count > 1 else ''} only")

    # Add rule type information
    if len(unique_rules) > 1:
        reasoning_parts.append(f"spanning {len(unique_rules)} detection categories")

    reasoning = "; ".join(reasoning_parts) + "."

    return RiskAssessment(
        overall_risk=overall_risk,
        evidence_list=evidence_list,
        reasoning=reasoning,
    )
