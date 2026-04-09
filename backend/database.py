# backend/database.py
# SQLite + SQLAlchemy setup for persistent loan suggestion history
# No external server needed — DB file auto-created at loan_history.db

from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    Boolean, DateTime, Text, JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

# ── Engine & session ───────────────────────────────────────────────────────
DATABASE_URL = "sqlite:///./loan_history.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # needed for SQLite + FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Model ──────────────────────────────────────────────────────────────────
class LoanSuggestion(Base):
    __tablename__ = "loan_suggestions"

    id              = Column(Integer, primary_key=True, index=True, autoincrement=True)
    app_id          = Column(String(50),  index=True)
    timestamp       = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Core outputs
    risk_level      = Column(String(10))   # High / Medium / Low
    confidence      = Column(Float)
    action          = Column(String(50))   # e.g. Fast-track
    action_source   = Column(String(30))   # rl_agent / rule_override
    sla_breached    = Column(Boolean)
    policy_id       = Column(String(20), nullable=True)
    rag_relevance   = Column(Float, nullable=True)

    # Probabilities stored as JSON  {"High": 0.12, "Medium": 0.77, "Low": 0.11}
    probabilities   = Column(JSON, nullable=True)

    # Key input features (for audit trail)
    current_stage   = Column(Integer, nullable=True)
    pending_days    = Column(Integer, nullable=True)
    credit_score    = Column(Integer, nullable=True)
    loan_amount     = Column(Float,   nullable=True)
    annual_income   = Column(Float,   nullable=True)
    loan_type       = Column(String(30), nullable=True)
    employment_type = Column(String(30), nullable=True)
    doc_complete_pct= Column(Float,   nullable=True)
    officer_load    = Column(Integer, nullable=True)
    fraud_flag      = Column(Boolean, nullable=True)
    aml_flag        = Column(Boolean, nullable=True)
    past_default    = Column(Boolean, nullable=True)

    # Source: "single" | "batch"
    source          = Column(String(10), default="single")


# ── Create tables on import ────────────────────────────────────────────────
def init_db():
    Base.metadata.create_all(bind=engine)


# ── Dependency for FastAPI routes ──────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Helper: build a LoanSuggestion from pipeline output ───────────────────
def build_record(input_data: dict, result: dict, source: str = "single") -> LoanSuggestion:
    """
    input_data : the raw request dict (loan parameters)
    result     : the flattened frontend-facing response dict
    """
    return LoanSuggestion(
        app_id          = str(input_data.get("app_id", "UNKNOWN")),
        risk_level      = result.get("risk_level"),
        confidence      = result.get("confidence"),
        action          = result.get("action"),
        action_source   = result.get("action_source"),
        sla_breached    = bool(result.get("sla_alert", False)),
        policy_id       = result.get("policy_id"),
        rag_relevance   = result.get("rag_relevance_score"),
        probabilities   = result.get("probabilities"),
        current_stage   = input_data.get("current_stage"),
        pending_days    = input_data.get("pending_days"),
        credit_score    = input_data.get("credit_score"),
        loan_amount     = input_data.get("loan_amount"),
        annual_income   = input_data.get("annual_income"),
        loan_type       = input_data.get("loan_type"),
        employment_type = input_data.get("employment_type"),
        doc_complete_pct= input_data.get("doc_complete_pct"),
        officer_load    = input_data.get("officer_load"),
        fraud_flag      = bool(input_data.get("fraud_flag", False)),
        aml_flag        = bool(input_data.get("aml_flag", False)),
        past_default    = bool(input_data.get("past_default", False)),
        source          = source,
    )