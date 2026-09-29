"""
Cases API

Endpoints for case management: status updates, assignee, notes, and PDF export.
"""

from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.entities import Case, CaseNote, Employee
from app.detectors import (
    detect_circular_transfers,
    detect_structuring,
    detect_profile_mismatch,
    detect_insider_links,
    aggregate_evidence,
)


router = APIRouter(prefix="/cases", tags=["cases"])


# Valid status transitions
VALID_STATUSES = [
    "new",
    "assigned",
    "under_review",
    "escalated",
    "closed_legit",
    "closed_confirmed",
]


class CaseUpdateRequest(BaseModel):
    """Request to update case fields."""

    status: str | None = None
    assigned_to_id: int | None = None
    note: str | None = None  # Optional note to add


@router.patch("/{case_id}")
def update_case(
    case_id: int, update: CaseUpdateRequest, db: Session = Depends(get_db)
) -> dict:
    """
    Update case status, assignee, and optionally add a note.

    Workflow statuses:
    - new: Freshly detected case
    - assigned: Assigned to an investigator
    - under_review: Active investigation
    - escalated: Escalated to senior team
    - closed_legit: Closed as legitimate
    - closed_confirmed: Closed as confirmed fraud

    **Closing requirement:** Must include a note when closing a case.

    Args:
        case_id: ID of the case
        update: Fields to update
        db: Database session

    Returns:
        Updated case info
    """
    # Fetch case
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Validate status
    if update.status and update.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )

    # Require note when closing
    if update.status and update.status.startswith("closed_") and not update.note:
        raise HTTPException(
            status_code=400, detail="A note is required when closing a case"
        )

    # Update status
    if update.status:
        case.status = update.status

    # Update assignee
    if update.assigned_to_id is not None:
        # Verify employee exists
        if update.assigned_to_id > 0:
            employee = (
                db.query(Employee)
                .filter(Employee.id == update.assigned_to_id)
                .first()
            )
            if not employee:
                raise HTTPException(status_code=404, detail="Employee not found")
        case.assigned_to_id = update.assigned_to_id if update.assigned_to_id > 0 else None

    # Add note if provided
    if update.note:
        note = CaseNote(
            case_id=case_id,
            author_id=update.assigned_to_id if update.assigned_to_id else None,
            body=update.note,
            created_at=datetime.now(),
        )
        db.add(note)

    case.updated_at = datetime.now()
    db.commit()
    db.refresh(case)

    return {
        "id": case.id,
        "title": case.title,
        "status": case.status,
        "assigned_to": case.assigned_to.full_name if case.assigned_to else None,
        "updated_at": case.updated_at.isoformat(),
    }


@router.get("/{case_id}/export")
def export_case_pdf(case_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    """
    Export case as a PDF report.

    Includes:
    - Case metadata (title, status, risk level)
    - Evidence list with details
    - Timeline of events
    - Call transcripts (if any)
    - Audit decision trail (notes)

    Args:
        case_id: ID of the case
        db: Database session

    Returns:
        PDF file as streaming response
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        PageBreak,
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER

    # Fetch case
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Get evidence
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

    # Filter evidence for this case
    flagged_txn_ids = {str(txn.id) for txn in case.flagged_transactions}
    flagged_emp_ids = {str(emp.id) for emp in case.flagged_employees}

    relevant_evidence = []
    for evidence in all_evidence:
        for supporting_id in evidence.supporting_ids:
            if supporting_id in flagged_txn_ids or supporting_id in flagged_emp_ids:
                relevant_evidence.append(evidence)
                break

    # Aggregate risk assessment
    assessment = aggregate_evidence(relevant_evidence)

    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)

    # Container for flowables
    story = []

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#0891b2"),
        spaceAfter=30,
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=colors.HexColor("#0891b2"),
        spaceAfter=12,
    )
    body_style = styles["BodyText"]

    # Title
    story.append(Paragraph(f"TRACE Investigation Report", title_style))
    story.append(Paragraph(f"Case #{case.id}: {case.title}", styles["Heading2"]))
    story.append(Spacer(1, 0.2 * inch))

    # Case metadata
    meta_data = [
        ["Status:", case.status.replace("_", " ").title()],
        [
            "Assigned To:",
            case.assigned_to.full_name if case.assigned_to else "Unassigned",
        ],
        ["Created:", case.created_at.strftime("%Y-%m-%d %H:%M:%S")],
        ["Updated:", case.updated_at.strftime("%Y-%m-%d %H:%M:%S")],
    ]
    meta_table = Table(meta_data, colWidths=[1.5 * inch, 4 * inch])
    meta_table.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONT", (1, 0), (1, -1), "Helvetica"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 0.3 * inch))

    # Risk Assessment
    story.append(Paragraph("Risk Assessment", heading_style))
    risk_color = {
        "critical": "#ef4444",
        "high": "#f97316",
        "medium": "#eab308",
        "low": "#22c55e",
    }.get(assessment.overall_risk, "#64748b")
    
    story.append(
        Paragraph(
            f'<b>Overall Risk:</b> <font color="{risk_color}">{assessment.overall_risk.upper()}</font>',
            body_style,
        )
    )
    story.append(Paragraph(f"<b>Reasoning:</b> {assessment.reasoning}", body_style))
    story.append(Spacer(1, 0.3 * inch))

    # Evidence
    story.append(Paragraph("Evidence", heading_style))
    for idx, evidence in enumerate(relevant_evidence, 1):
        story.append(
            Paragraph(
                f'<b>{idx}. {evidence.rule_name}</b> [{evidence.severity.upper()}]',
                body_style,
            )
        )
        story.append(Paragraph(evidence.reason, body_style))
        story.append(
            Paragraph(
                f'Supporting IDs: {", ".join(evidence.supporting_ids[:10])}',
                body_style,
            )
        )
        story.append(Spacer(1, 0.15 * inch))

    story.append(Spacer(1, 0.2 * inch))

    # Call Transcripts
    if case.call_records:
        story.append(PageBreak())
        story.append(Paragraph("Verification Calls", heading_style))
        for call in case.call_records:
            story.append(
                Paragraph(
                    f'<b>Called:</b> {call.target_name} ({call.target_type}) at {call.called_at.strftime("%Y-%m-%d %H:%M:%S")}',
                    body_style,
                )
            )
            story.append(Paragraph(f"<b>Q:</b> {call.question}", body_style))
            story.append(Paragraph(f"<b>A:</b> {call.answer}", body_style))
            consistency = "✓ Consistent" if call.consistency_flag else "✗ Inconsistent"
            story.append(Paragraph(f"<b>Result:</b> {consistency}", body_style))
            story.append(Spacer(1, 0.2 * inch))

    # Timeline
    story.append(PageBreak())
    story.append(Paragraph("Timeline", heading_style))
    
    # Fetch timeline events
    from app.api.timeline import get_case_timeline
    timeline = get_case_timeline(case_id, db)
    
    for event in timeline.events[:20]:  # Limit to first 20 events
        timestamp = event.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        actor = event.actor or "System"
        desc = event.description
        flagged = " [FLAGGED]" if event.evidence_rule else ""
        
        story.append(
            Paragraph(
                f'<b>{timestamp}</b> - {actor}{flagged}',
                body_style,
            )
        )
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 0.1 * inch))

    # Audit Notes
    if case.notes:
        story.append(PageBreak())
        story.append(Paragraph("Audit Decision Trail", heading_style))
        for note in case.notes:
            author = note.author.full_name if note.author else "System"
            timestamp = note.created_at.strftime("%Y-%m-%d %H:%M:%S")
            story.append(
                Paragraph(f"<b>{author}</b> - {timestamp}", body_style)
            )
            story.append(Paragraph(note.body, body_style))
            story.append(Spacer(1, 0.2 * inch))

    # Build PDF
    doc.build(story)

    # Return as streaming response
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="case_{case_id}_report.pdf"'
        },
    )
