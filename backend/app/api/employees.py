"""
Employees API

Provides the list of employees for assignment dropdowns and auditor UI.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.entities import Employee


router = APIRouter(prefix="/employees", tags=["employees"])


class EmployeeOut(BaseModel):
    id: int
    full_name: str
    email: str
    department: str
    role: str

    model_config = {"from_attributes": True}


@router.get("", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db)) -> list[EmployeeOut]:
    """Return all employees — used to populate assignee dropdowns."""
    employees = db.query(Employee).order_by(Employee.full_name).all()
    return employees
