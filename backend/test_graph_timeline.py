"""
Test script for graph and timeline endpoints.

Run this after generating data and starting the API server.
"""

import json
import sys

try:
    import requests
except ImportError:
    print("❌ requests library not found. Install with: pip install requests")
    sys.exit(1)


BASE_URL = "http://localhost:8000"


def test_graph_endpoint():
    """Test the graph endpoint for case 1."""
    print("\n" + "=" * 70)
    print("🕸️  Testing GET /graph/1")
    print("=" * 70)

    try:
        response = requests.get(f"{BASE_URL}/graph/1", timeout=5)
        response.raise_for_status()

        data = response.json()
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])

        print(f"\n✓ Response received")
        print(f"  Nodes: {len(nodes)}")
        print(f"  Edges: {len(edges)}")

        # Group nodes by type
        nodes_by_type = {}
        for node in nodes:
            node_type = node["type"]
            if node_type not in nodes_by_type:
                nodes_by_type[node_type] = []
            nodes_by_type[node_type].append(node)

        print(f"\n📊 Node breakdown:")
        for node_type, type_nodes in sorted(nodes_by_type.items()):
            print(f"  - {node_type}: {len(type_nodes)}")

        # Group edges by type
        edges_by_type = {}
        for edge in edges:
            edge_type = edge["type"]
            if edge_type not in edges_by_type:
                edges_by_type[edge_type] = 0
            edges_by_type[edge_type] += 1

        print(f"\n🔗 Edge breakdown:")
        for edge_type, count in sorted(edges_by_type.items()):
            print(f"  - {edge_type}: {count}")

        # Show sample nodes
        print(f"\n📝 Sample nodes:")
        for node_type in ["employee", "customer", "account", "transaction"]:
            if node_type in nodes_by_type and nodes_by_type[node_type]:
                sample = nodes_by_type[node_type][0]
                print(f"  {node_type}: {sample['label']} (id: {sample['id']})")

        # Show sample edges
        print(f"\n🔗 Sample edges:")
        for i, edge in enumerate(edges[:3]):
            print(f"  {edge['source']} --[{edge['type']}]--> {edge['target']}")

        return True

    except requests.exceptions.ConnectionError:
        print("\n❌ Connection failed. Is the API server running?")
        print("   Start it with: uvicorn app.main:app --reload")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ HTTP Error: {e}")
        if e.response.status_code == 404:
            print("   Case 1 not found. Did you run scripts/generate_data.py?")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


def test_timeline_endpoint():
    """Test the timeline endpoint for case 1."""
    print("\n" + "=" * 70)
    print("📅 Testing GET /timeline/1")
    print("=" * 70)

    try:
        response = requests.get(f"{BASE_URL}/timeline/1", timeout=5)
        response.raise_for_status()

        data = response.json()
        case_id = data.get("case_id")
        case_title = data.get("case_title")
        events = data.get("events", [])

        print(f"\n✓ Response received")
        print(f"  Case ID: {case_id}")
        print(f"  Title: {case_title}")
        print(f"  Events: {len(events)}")

        # Group events by type
        events_by_type = {}
        for event in events:
            event_type = event["event_type"]
            if event_type not in events_by_type:
                events_by_type[event_type] = []
            events_by_type[event_type].append(event)

        print(f"\n📊 Event breakdown:")
        for event_type, type_events in sorted(events_by_type.items()):
            print(f"  - {event_type}: {len(type_events)}")

        # Count flagged events
        flagged_count = sum(1 for e in events if e.get("evidence_rule"))
        print(f"\n🚨 Flagged events (linked to detectors): {flagged_count}")

        # Show timeline
        print(f"\n📅 Timeline (first 10 events):")
        for i, event in enumerate(events[:10], 1):
            timestamp = event["timestamp"]
            event_type = event["event_type"]
            actor = event.get("actor", "System")
            description = event["description"]
            evidence = event.get("evidence_rule")

            flag = "🚨" if evidence else "  "
            print(f"\n  {flag} {i}. [{timestamp}]")
            print(f"     Type: {event_type}")
            print(f"     Actor: {actor}")
            print(f"     {description}")
            if evidence:
                print(f"     🔍 Flagged by: {evidence}")

        if len(events) > 10:
            print(f"\n  ... and {len(events) - 10} more events")

        return True

    except requests.exceptions.ConnectionError:
        print("\n❌ Connection failed. Is the API server running?")
        print("   Start it with: uvicorn app.main:app --reload")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ HTTP Error: {e}")
        if e.response.status_code == 404:
            print("   Case 1 not found. Did you run scripts/generate_data.py?")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


def main():
    """Run all tests."""
    print("🧪 Testing Graph & Timeline Endpoints")
    print(f"🔗 API: {BASE_URL}")

    success = True

    # Test graph endpoint
    if not test_graph_endpoint():
        success = False

    # Test timeline endpoint
    if not test_timeline_endpoint():
        success = False

    # Summary
    print("\n" + "=" * 70)
    if success:
        print("✅ All tests passed!")
        print("\n💡 Tip: View full API docs at http://localhost:8000/docs")
    else:
        print("❌ Some tests failed")
        print("\n📝 Make sure:")
        print("  1. API server is running (uvicorn app.main:app --reload)")
        print("  2. Database is populated (python scripts/generate_data.py)")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
