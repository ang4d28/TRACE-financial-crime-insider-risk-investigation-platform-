"""
Quick test script to verify detectors work with synthetic data.

Run this after generating data with scripts/generate_data.py
"""

from app.database import SessionLocal
from app.detectors import (
    detect_circular_transfers,
    detect_structuring,
    detect_profile_mismatch,
    detect_insider_links,
    aggregate_evidence,
)


def main():
    print("🔍 Running TRACE Detection System\n")
    print("=" * 70)

    db = SessionLocal()

    try:
        # Run detectors
        print("\n1️⃣  Circular Transfer Detector...")
        circular = detect_circular_transfers(db)
        print(f"   Found {len(circular)} circular transfer patterns")

        print("\n2️⃣  Structuring Detector...")
        structuring = detect_structuring(db)
        print(f"   Found {len(structuring)} structuring patterns")

        print("\n3️⃣  Profile Mismatch Detector...")
        profile = detect_profile_mismatch(db)
        print(f"   Found {len(profile)} profile mismatches")

        print("\n4️⃣  Insider Link Detector...")
        insider = detect_insider_links(db)
        print(f"   Found {len(insider)} insider links")

        # Aggregate all evidence
        all_evidence = circular + structuring + profile + insider

        print("\n" + "=" * 70)
        print(f"📊 TOTAL EVIDENCE: {len(all_evidence)} signals detected")
        print("=" * 70)

        if not all_evidence:
            print("\n⚠️  No evidence detected. Did you run scripts/generate_data.py?")
            return

        # Aggregate
        assessment = aggregate_evidence(all_evidence)

        print(f"\n🎯 OVERALL RISK: {assessment.overall_risk.upper()}")
        print(f"📝 Reasoning: {assessment.reasoning}\n")

        # Group by severity
        by_severity = {"critical": [], "high": [], "medium": [], "low": []}
        for ev in all_evidence:
            by_severity[ev.severity].append(ev)

        for severity in ["critical", "high", "medium", "low"]:
            if by_severity[severity]:
                print(f"\n{'🔴' if severity == 'critical' else '🟠' if severity == 'high' else '🟡' if severity == 'medium' else '🟢'} {severity.upper()} SEVERITY ({len(by_severity[severity])} signals):")
                print("-" * 70)
                for ev in by_severity[severity]:
                    print(f"  • [{ev.rule_name}]")
                    print(f"    {ev.reason}")
                    print(f"    Supporting IDs: {', '.join(ev.supporting_ids[:5])}")
                    if len(ev.supporting_ids) > 5:
                        print(f"    ... and {len(ev.supporting_ids) - 5} more")
                    print()

        print("=" * 70)
        print("✅ Detection complete!\n")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
