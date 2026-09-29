from typing import Literal

from pydantic import BaseModel


class Evidence(BaseModel):
    """Structured evidence for a single detection rule."""

    rule_name: str
    severity: Literal["low", "medium", "high", "critical"]
    reason: str  # plain-language, one sentence
    supporting_ids: list[str]  # transaction/employee/access ids
    metric: dict  # e.g. {"cycle_length_hours": 18, "amount_total": 264000}


class RiskAssessment(BaseModel):
    """Overall risk assessment with full evidence breakdown."""

    overall_risk: Literal["low", "medium", "high", "critical"]
    evidence_list: list[Evidence]
    reasoning: str  # explanation of how overall_risk was determined
