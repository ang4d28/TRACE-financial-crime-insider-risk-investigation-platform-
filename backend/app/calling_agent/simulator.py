"""
Calling Agent Simulator

Simulates verification calls using Gemini API. Does not integrate with real telephony
to avoid Twilio setup complexity during hackathon.
"""

import os
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.entities import Case, CallRecord, Employee, Customer, Account
from app.detectors import (
    detect_circular_transfers,
    detect_structuring,
    detect_profile_mismatch,
    detect_insider_links,
)


def trigger_verification_call(case_id: int, db: Session) -> dict:
    """
    Simulate a verification call for a case.

    1. Picks target (employee or customer) based on top evidence
    2. Builds a fixed-branch script using Gemini API
    3. Returns simulated transcript with consistency flag
    4. Stores result as CallRecord

    Args:
        case_id: ID of the case
        db: Database session

    Returns:
        dict with target, question, answer, consistency_flag
    """
    # Fetch case
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    # Get all evidence for this case
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

    # Filter evidence for this case's transactions
    flagged_txn_ids = {str(txn.id) for txn in case.flagged_transactions}
    flagged_emp_ids = {str(emp.id) for emp in case.flagged_employees}

    relevant_evidence = []
    for evidence in all_evidence:
        for supporting_id in evidence.supporting_ids:
            if supporting_id in flagged_txn_ids or supporting_id in flagged_emp_ids:
                relevant_evidence.append(evidence)
                break

    if not relevant_evidence:
        raise ValueError("No evidence found for this case")

    # Pick target based on top evidence (highest severity)
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    top_evidence = sorted(relevant_evidence, key=lambda e: severity_order[e.severity])[0]

    # Determine target type
    target_type = None
    target_id = None
    target_name = None

    if top_evidence.rule_name == "insider_link":
        # Target the employee
        if case.flagged_employees:
            target_type = "employee"
            target_id = case.flagged_employees[0].id
            target_name = case.flagged_employees[0].full_name
    else:
        # Target the customer (from first flagged transaction)
        if case.flagged_transactions:
            first_txn = case.flagged_transactions[0]
            customer = first_txn.from_account.customer
            target_type = "customer"
            target_id = customer.id
            target_name = customer.full_name

    if not target_type:
        raise ValueError("Could not determine target for verification call")

    # Build question and simulate answer
    question, answer, consistency_flag = _simulate_call_interaction(
        top_evidence, target_type, target_name, db
    )

    # Store call record
    call_record = CallRecord(
        case_id=case_id,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        question=question,
        answer=answer,
        consistency_flag=consistency_flag,
        evidence_context=f"{top_evidence.rule_name}: {top_evidence.reason}",
        called_at=datetime.now(),
    )

    db.add(call_record)
    db.commit()
    db.refresh(call_record)

    return {
        "target": target_name,
        "target_type": target_type,
        "question": question,
        "answer": answer,
        "consistency_flag": consistency_flag,
        "evidence_context": call_record.evidence_context,
        "called_at": call_record.called_at.isoformat(),
    }


def _simulate_call_interaction(
    evidence, target_type: str, target_name: str, db: Session
) -> tuple[str, str, bool]:
    """
    Simulate a verification call using Gemini API (or fallback to fixed branches).

    Args:
        evidence: Evidence object
        target_type: "employee" or "customer"
        target_name: Name of target
        db: Database session

    Returns:
        tuple of (question, answer, consistency_flag)
    """
    # Try Gemini API first, fall back to fixed branches if not available
    try:
        return _call_with_gemini(evidence, target_type, target_name)
    except Exception:
        # Fallback to fixed-branch simulation
        return _call_with_fixed_branches(evidence, target_type, target_name)


def _call_with_gemini(evidence, target_type: str, target_name: str) -> tuple[str, str, bool]:
    """
    Use Gemini API to generate realistic call transcript.

    Requires GEMINI_API_KEY environment variable.
    """
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""You are simulating a fraud verification call. Generate a realistic short conversation.

Evidence: {evidence.reason}
Rule: {evidence.rule_name}
Target: {target_name} ({target_type})

Generate a verification question and a realistic answer. The answer should be one of:
- Confirm (matches the evidence)
- Deny (contradicts the evidence)
- Evasive (avoids direct answer)
- Unreachable (no answer)

Return ONLY a JSON object with this exact format:
{{
  "question": "the verification question to ask",
  "answer": "the target's response",
  "consistent": true or false (true if answer confirms evidence, false if it contradicts)
}}

Make it sound natural and conversational. Keep responses under 50 words."""

    response = model.generate_content(prompt)
    text = response.text.strip()

    # Extract JSON from response
    import json
    import re

    # Try to find JSON in the response
    json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
    if json_match:
        data = json.loads(json_match.group())
        return data["question"], data["answer"], data["consistent"]
    else:
        raise ValueError("Could not parse Gemini response")


def _call_with_fixed_branches(evidence, target_type: str, target_name: str) -> tuple[str, str, bool]:
    """
    Fallback: Use fixed-branch simulation based on evidence type.
    """
    import random

    rule_name = evidence.rule_name

    # Build question based on evidence type
    if rule_name == "insider_link":
        question = f"Hi {target_name}, this is the compliance team. We're verifying some recent account access. Did you access customer account data outside your assigned portfolio on {datetime.now().strftime('%B %d')}?"
        
        # Simulate answer branches
        branch = random.choice(["confirm", "deny", "evasive"])
        if branch == "confirm":
            answer = "Yes, I did access that account. I was helping out another team member who was out sick."
            consistency_flag = True  # Matches evidence
        elif branch == "deny":
            answer = "No, I haven't accessed any accounts outside my portfolio. That must be a mistake."
            consistency_flag = False  # Contradicts evidence
        else:
            answer = "I'm not sure, I access many accounts during my work. Can you be more specific?"
            consistency_flag = False  # Evasive = suspicious

    elif rule_name in ("circular_transfer", "structuring_outgoing", "structuring_incoming"):
        question = f"Hi {target_name}, this is the compliance team following up on some recent transactions. Can you explain the purpose of the transfers totaling ${evidence.metric.get('total_amount', 0):,.2f} made recently?"
        
        branch = random.choice(["legitimate", "evasive", "deny"])
        if branch == "legitimate":
            answer = "Those were business payments to suppliers. I can provide the invoices if needed."
            consistency_flag = True  # Plausible explanation
        elif branch == "evasive":
            answer = "I'd need to check my records. I don't remember the exact details right now."
            consistency_flag = False  # Evasive = suspicious
        else:
            answer = "I'm not aware of those transactions. My account may have been compromised."
            consistency_flag = False  # Denial = suspicious

    elif rule_name == "profile_mismatch":
        question = f"Hi {target_name}, this is the compliance team. We noticed unusually high transaction volumes on your account. Can you explain the source of these funds?"
        
        branch = random.choice(["legitimate", "evasive"])
        if branch == "legitimate":
            answer = "I recently received an inheritance and I'm investing the funds."
            consistency_flag = True  # Reasonable explanation
        else:
            answer = "Those are just normal transactions. I don't see anything unusual."
            consistency_flag = False  # Dismissive = suspicious

    else:
        # Generic fallback
        question = f"Hi {target_name}, this is the compliance team. We're following up on some flagged activity. Can you provide more information?"
        answer = "I'm not sure what you're referring to. Can you be more specific?"
        consistency_flag = False

    return question, answer, consistency_flag
