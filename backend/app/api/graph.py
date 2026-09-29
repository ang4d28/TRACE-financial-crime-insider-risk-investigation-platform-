"""
Graph API

Endpoint for retrieving case subgraphs for force-directed visualization.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.entities import Case, Transaction, Account, Customer, Employee


router = APIRouter(prefix="/graph", tags=["graph"])


class GraphNode(BaseModel):
    """Node in the case graph."""

    id: str
    type: str  # "employee" | "customer" | "account" | "transaction"
    label: str


class GraphEdge(BaseModel):
    """Edge in the case graph."""

    source: str
    target: str
    type: str  # "owns" | "transfer" | "manages" | "accessed"


class CaseGraph(BaseModel):
    """Complete case graph for visualization."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]


@router.get("/{case_id}", response_model=CaseGraph)
def get_case_graph(case_id: int, db: Session = Depends(get_db)) -> CaseGraph:
    """
    Get the graph structure for a specific case.

    Returns nodes (employees, customers, accounts, transactions) and edges
    (relationships) relevant to this case in a format ready for force-directed
    graph visualization.

    Args:
        case_id: ID of the case
        db: Database session

    Returns:
        CaseGraph with nodes and edges
    """
    # Fetch the case with all relationships
    case = db.query(Case).filter(Case.id == case_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []

    # Track entities we've already added to avoid duplicates
    added_nodes: set[str] = set()
    
    # Helper to add node if not already added
    def add_node(node: GraphNode) -> None:
        if node.id not in added_nodes:
            nodes.append(node)
            added_nodes.add(node.id)

    # Add flagged transactions and build graph from them
    for txn in case.flagged_transactions:
        # Add transaction node
        txn_node = GraphNode(
            id=f"txn_{txn.id}",
            type="transaction",
            label=f"${float(txn.amount):,.2f}",
        )
        add_node(txn_node)

        # Get from account
        from_account = txn.from_account
        from_customer = from_account.customer

        # Add from account node
        from_acc_node = GraphNode(
            id=f"acc_{from_account.id}",
            type="account",
            label=f"Account {from_account.account_number[-4:]}",
        )
        add_node(from_acc_node)

        # Add from customer node
        from_cust_node = GraphNode(
            id=f"cust_{from_customer.id}",
            type="customer",
            label=from_customer.full_name,
        )
        add_node(from_cust_node)

        # Get to account
        to_account = txn.to_account
        to_customer = to_account.customer

        # Add to account node
        to_acc_node = GraphNode(
            id=f"acc_{to_account.id}",
            type="account",
            label=f"Account {to_account.account_number[-4:]}",
        )
        add_node(to_acc_node)

        # Add to customer node
        to_cust_node = GraphNode(
            id=f"cust_{to_customer.id}",
            type="customer",
            label=to_customer.full_name,
        )
        add_node(to_cust_node)

        # Add edges
        # Customer owns account
        edges.append(
            GraphEdge(
                source=f"cust_{from_customer.id}",
                target=f"acc_{from_account.id}",
                type="owns",
            )
        )

        edges.append(
            GraphEdge(
                source=f"cust_{to_customer.id}",
                target=f"acc_{to_account.id}",
                type="owns",
            )
        )

        # Account -> transaction -> account
        edges.append(
            GraphEdge(
                source=f"acc_{from_account.id}",
                target=f"txn_{txn.id}",
                type="transfer",
            )
        )

        edges.append(
            GraphEdge(
                source=f"txn_{txn.id}",
                target=f"acc_{to_account.id}",
                type="transfer",
            )
        )

    # Add flagged employees and their relationships
    for employee in case.flagged_employees:
        # Add employee node
        emp_node = GraphNode(
            id=f"emp_{employee.id}",
            type="employee",
            label=employee.full_name,
        )
        add_node(emp_node)

        # Get employee actions related to this case's transactions
        for action in employee.actions:
            # Check if action target is a customer or account in our graph
            if action.target_type == "customer":
                target_id = f"cust_{action.target_id}"
                if target_id in added_nodes:
                    edges.append(
                        GraphEdge(
                            source=f"emp_{employee.id}",
                            target=target_id,
                            type="accessed",
                        )
                    )
            elif action.target_type == "account":
                target_id = f"acc_{action.target_id}"
                if target_id in added_nodes:
                    edges.append(
                        GraphEdge(
                            source=f"emp_{employee.id}",
                            target=target_id,
                            type="accessed",
                        )
                    )

        # Add edges for portfolio relationships (employee manages customer)
        for access_right in employee.access_rights:
            customer_id = f"cust_{access_right.customer_id}"
            if customer_id in added_nodes:
                edges.append(
                    GraphEdge(
                        source=f"emp_{employee.id}",
                        target=customer_id,
                        type="manages",
                    )
                )

    # Deduplicate edges
    seen_edges = set()
    unique_edges = []
    for edge in edges:
        edge_key = (edge.source, edge.target, edge.type)
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            unique_edges.append(edge)

    return CaseGraph(nodes=nodes, edges=unique_edges)
