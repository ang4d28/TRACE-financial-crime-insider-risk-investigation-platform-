"""
Metrics API

Provides performance metrics for the fraud detection system.
"""

import sys
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Add scripts directory to path for evaluate module
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))

from app.database import get_db
from app.models.entities import Case, CallRecord
from app.detectors import (
    detect_circular_transfers,
    detect_structuring,
    detect_profile_mismatch,
    detect_insider_links,
    aggregate_evidence,
)


router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("")
def get_metrics(db: Session = Depends(get_db)) -> dict:
    """
    Get performance metrics for the fraud detection system.
    
    Returns:
    - Baseline metrics (precision, recall, F1, FPR)
    - Impact of verification calls on false positive rate
    - Adjusted metrics after calls
    
    This endpoint calculates real-time metrics from the current database state.
    """
    # Run all detectors
    circular_evidence = detect_circular_transfers(db)
    structuring_evidence = detect_structuring(db)
    profile_evidence = detect_profile_mismatch(db)
    insider_evidence = detect_insider_links(db)
    
    all_evidence = (
        circular_evidence + structuring_evidence + 
        profile_evidence + insider_evidence
    )
    
    # Get all cases
    cases = db.query(Case).all()
    
    # Build case-to-evidence mapping
    case_evidence_map = {}
    for case in cases:
        flagged_txn_ids = {str(txn.id) for txn in case.flagged_transactions}
        flagged_emp_ids = {str(emp.id) for emp in case.flagged_employees}
        
        relevant_evidence = []
        for evidence in all_evidence:
            for supporting_id in evidence.supporting_ids:
                if supporting_id in flagged_txn_ids or supporting_id in flagged_emp_ids:
                    relevant_evidence.append(evidence)
                    break
        
        case_evidence_map[case.id] = relevant_evidence
    
    # Calculate predictions
    case_predictions = {}
    for case_id, evidence_list in case_evidence_map.items():
        if evidence_list:
            assessment = aggregate_evidence(evidence_list)
            predicted_fraud = assessment.overall_risk in ["high", "critical"]
        else:
            predicted_fraud = False
        case_predictions[case_id] = predicted_fraud
    
    # Ground truth: Cases with specific fraud labels are fraud, otherwise legitimate
    ground_truth = {}
    for case in cases:
        # Fraud labels from synthetic data generator
        is_fraud = case.ground_truth_label in [
            "circular_ring",
            "structuring",
            "insider_fraud",
            "suspicious"  # fallback
        ]
        ground_truth[case.id] = is_fraud
    
    # Calculate baseline metrics
    true_positives = sum(
        1 for case_id in case_predictions
        if case_predictions[case_id] and ground_truth[case_id]
    )
    false_positives = sum(
        1 for case_id in case_predictions
        if case_predictions[case_id] and not ground_truth[case_id]
    )
    true_negatives = sum(
        1 for case_id in case_predictions
        if not case_predictions[case_id] and not ground_truth[case_id]
    )
    false_negatives = sum(
        1 for case_id in case_predictions
        if not case_predictions[case_id] and ground_truth[case_id]
    )
    
    total = len(cases)
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    fpr = false_positives / (false_positives + true_negatives) if (false_positives + true_negatives) > 0 else 0
    accuracy = (true_positives + true_negatives) / total if total > 0 else 0
    
    # Analyze verification calls
    cases_with_calls = db.query(Case).join(CallRecord).distinct().all()
    cases_with_calls_ids = {c.id for c in cases_with_calls}
    
    # Cases where calls confirmed legitimacy (resolved false positives)
    call_confirmed_legit = set()
    for case in cases_with_calls:
        for call in case.call_records:
            if call.consistency_flag and not ground_truth[case.id]:
                call_confirmed_legit.add(case.id)
                break
    
    # Calculate FPR with vs without calls
    fp_with_calls = sum(
        1 for case_id in cases_with_calls_ids
        if case_predictions.get(case_id, False) and not ground_truth[case_id]
        and case_id not in call_confirmed_legit
    )
    tn_with_calls = sum(
        1 for case_id in cases_with_calls_ids
        if not case_predictions.get(case_id, False) and not ground_truth[case_id]
    ) + len(call_confirmed_legit)
    
    fp_without_calls = sum(
        1 for case_id in case_predictions
        if case_id not in cases_with_calls_ids
        and case_predictions[case_id] and not ground_truth[case_id]
    )
    tn_without_calls = sum(
        1 for case_id in case_predictions
        if case_id not in cases_with_calls_ids
        and not case_predictions[case_id] and not ground_truth[case_id]
    )
    
    fpr_with_calls = fp_with_calls / (fp_with_calls + tn_with_calls) if (fp_with_calls + tn_with_calls) > 0 else 0
    fpr_without_calls = fp_without_calls / (fp_without_calls + tn_without_calls) if (fp_without_calls + tn_without_calls) > 0 else 0
    
    fp_reduction = ((fpr_without_calls - fpr_with_calls) / fpr_without_calls * 100) if fpr_without_calls > 0 else 0
    
    # Adjusted metrics after calls
    adjusted_fp = false_positives - len(call_confirmed_legit)
    adjusted_tn = true_negatives + len(call_confirmed_legit)
    adjusted_fpr = adjusted_fp / (adjusted_fp + adjusted_tn) if (adjusted_fp + adjusted_tn) > 0 else 0
    adjusted_precision = true_positives / (true_positives + adjusted_fp) if (true_positives + adjusted_fp) > 0 else 0
    
    return {
        "baseline": {
            "total_cases": total,
            "true_positives": true_positives,
            "false_positives": false_positives,
            "true_negatives": true_negatives,
            "false_negatives": false_negatives,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "false_positive_rate": round(fpr, 4),
        },
        "with_calls": {
            "cases_with_calls": len(cases_with_calls_ids),
            "false_positives_resolved": len(call_confirmed_legit),
            "fpr_with_calls": round(fpr_with_calls, 4),
            "fpr_without_calls": round(fpr_without_calls, 4),
            "fp_reduction_percent": round(fp_reduction, 2),
        },
        "adjusted": {
            "false_positives": adjusted_fp,
            "true_negatives": adjusted_tn,
            "precision": round(adjusted_precision, 4),
            "false_positive_rate": round(adjusted_fpr, 4),
        },
        "evidence_stats": {
            "total_signals": len(all_evidence),
            "circular_transfer": len(circular_evidence),
            "structuring": len(structuring_evidence),
            "profile_mismatch": len(profile_evidence),
            "insider_link": len(insider_evidence),
        },
    }
