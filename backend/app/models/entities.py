from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Table,
    Text,
    Column,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

case_flagged_transactions = Table(
    "case_flagged_transactions",
    Base.metadata,
    Column("case_id", ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("transaction_id", ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True),
)

case_flagged_employees = Table(
    "case_flagged_employees",
    Base.metadata,
    Column("case_id", ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("employee_id", ForeignKey("employees.id", ondelete="CASCADE"), primary_key=True),
)


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    department: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    access_rights: Mapped[list["AccessRight"]] = relationship(back_populates="employee")
    actions: Mapped[list["EmployeeAction"]] = relationship(back_populates="employee")
    case_notes: Mapped[list["CaseNote"]] = relationship(back_populates="author")
    assigned_cases: Mapped[list["Case"]] = relationship(back_populates="assigned_to")
    flagged_cases: Mapped[list["Case"]] = relationship(
        secondary=case_flagged_employees, back_populates="flagged_employees"
    )


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    kyc_status: Mapped[str] = mapped_column(String(50), default="verified")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    accounts: Mapped[list["Account"]] = relationship(back_populates="customer")
    access_rights: Mapped[list["AccessRight"]] = relationship(back_populates="customer")


class AccessRight(Base):
    __tablename__ = "access_rights"
    __table_args__ = (
        UniqueConstraint("employee_id", "customer_id", name="uq_access_employee_customer"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    permission: Mapped[str] = mapped_column(String(50), default="portfolio")
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    employee: Mapped[Employee] = relationship(back_populates="access_rights")
    customer: Mapped[Customer] = relationship(back_populates="access_rights")


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    account_number: Mapped[str] = mapped_column(String(34), unique=True)
    account_type: Mapped[str] = mapped_column(String(50), default="checking")
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    beneficiary_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    beneficiary_account_number: Mapped[str | None] = mapped_column(String(34), nullable=True)
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    customer: Mapped[Customer] = relationship(back_populates="accounts")
    outgoing_transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="from_account", foreign_keys="Transaction.from_account_id"
    )
    incoming_transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="to_account", foreign_keys="Transaction.to_account_id"
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    to_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    description: Mapped[str] = mapped_column(String(255), default="")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ground_truth_label: Mapped[str] = mapped_column(String(50), default="legitimate")

    from_account: Mapped[Account] = relationship(
        back_populates="outgoing_transactions", foreign_keys=[from_account_id]
    )
    to_account: Mapped[Account] = relationship(
        back_populates="incoming_transactions", foreign_keys=[to_account_id]
    )
    cases: Mapped[list["Case"]] = relationship(
        secondary=case_flagged_transactions, back_populates="flagged_transactions"
    )


class EmployeeAction(Base):
    __tablename__ = "employee_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    action_type: Mapped[str] = mapped_column(String(80))
    target_type: Mapped[str] = mapped_column(String(50))
    target_id: Mapped[int] = mapped_column()
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ground_truth_label: Mapped[str] = mapped_column(String(50), default="legitimate")

    employee: Mapped[Employee] = relationship(back_populates="actions")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="new")
    assigned_to_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    ground_truth_label: Mapped[str] = mapped_column(String(50), default="legitimate")

    assigned_to: Mapped[Employee | None] = relationship(back_populates="assigned_cases")
    notes: Mapped[list["CaseNote"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    flagged_transactions: Mapped[list[Transaction]] = relationship(
        secondary=case_flagged_transactions, back_populates="cases"
    )
    flagged_employees: Mapped[list[Employee]] = relationship(
        secondary=case_flagged_employees, back_populates="flagged_cases"
    )
    call_records: Mapped[list["CallRecord"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


class CaseNote(Base):
    __tablename__ = "case_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    case: Mapped[Case] = relationship(back_populates="notes")
    author: Mapped[Employee | None] = relationship(back_populates="case_notes")


class CallRecord(Base):
    __tablename__ = "call_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))
    target_type: Mapped[str] = mapped_column(String(50))  # "employee" or "customer"
    target_id: Mapped[int] = mapped_column()
    target_name: Mapped[str] = mapped_column(String(255))
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    consistency_flag: Mapped[bool] = mapped_column()
    evidence_context: Mapped[str] = mapped_column(Text)  # What evidence this call is verifying
    called_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    case: Mapped["Case"] = relationship(back_populates="call_records")
