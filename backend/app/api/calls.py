"""
Calls API

Endpoints for triggering verification calls and retrieving call history.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.entities import Case, CallRecord
from app.calling_agent import trigger_verification_call


router = APIRouter(prefix="/cases", tags=["calls"])


class CallTranscript(BaseModel):
    """Verification call transcript."""

    target: str
    target_type: str
    question: str
    answer: str
    consistency_flag: bool
    evidence_context: str
    called_at: str


class CallRecordResponse(BaseModel):
    """Call record with metadata."""

    id: int
    target: str
    target_type: str
    question: str
    answer: str
    consistency_flag: bool
    evidence_context: str
    called_at: str


@router.post("/{case_id}/trigger-call", response_model=CallTranscript)
def trigger_call(case_id: int, db: Session = Depends(get_db)) -> CallTranscript:
    """
    Trigger a simulated verification call for a case.

    Picks the relevant target (employee or customer) based on top evidence,
    builds a fixed-branch script, and returns a simulated transcript with
    consistency flag.

    The consistency flag compares the answer against logged transaction/access
    data. True if it matches, false if it contradicts.

    **This does not change the case risk level automatically.** It only appends
    evidence for the human auditor to review.

    Args:
        case_id: ID of the case
        db: Database session

    Returns:
        CallTranscript with target, question, answer, consistency_flag
    """
    try:
        result = trigger_verification_call(case_id, db)
        return CallTranscript(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Call failed: {str(e)}")


@router.get("/{case_id}/calls", response_model=list[CallRecordResponse])
def get_case_calls(case_id: int, db: Session = Depends(get_db)) -> list[CallRecordResponse]:
    """
    Get all verification calls for a case.

    Returns the full call history in chronological order.

    Args:
        case_id: ID of the case
        db: Database session

    Returns:
        List of CallRecordResponse objects
    """
    # Verify case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Fetch all call records
    call_records = (
        db.query(CallRecord)
        .filter(CallRecord.case_id == case_id)
        .order_by(CallRecord.called_at.asc())
        .all()
    )

    return [
        CallRecordResponse(
            id=record.id,
            target=record.target_name,
            target_type=record.target_type,
            question=record.question,
            answer=record.answer,
            consistency_flag=record.consistency_flag,
            evidence_context=record.evidence_context,
            called_at=record.called_at.isoformat(),
        )
        for record in call_records
    ]
