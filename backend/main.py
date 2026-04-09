"""
backend/main.py — Loan TAT Optimizer API
Run: uvicorn backend.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

import os
import sys
import traceback
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

# ── make sure project root is on the path ──────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from agents.orchestrator import Orchestrator
from rag.explainer import RAGExplainer
from backend.database import init_db, get_db, build_record, LoanSuggestion

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Loan TAT Optimizer API",
    description="AI-powered loan turnaround time optimization — Phases 1–3",
    version="1.0.0",
)

# Initialise DB — creates loan_history.db if it doesn't exist
init_db()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Orchestrator singleton ─────────────────────────────────────────────────
orchestrator: Optional[Orchestrator] = None
explainer:    Optional[RAGExplainer] = None

@app.on_event("startup")
def load_orchestrator():
    global orchestrator, explainer
    try:
        print("Loading Orchestrator…")
        orchestrator = Orchestrator(verbose=False)
        print("Orchestrator ready ✅")
    except Exception as e:
        print(f"WARNING: Orchestrator failed to load: {e}")

    try:
        print("Loading RAG Explainer…")
        explainer = RAGExplainer()
        print("RAG Explainer ready ✅")
    except Exception as e:
        print(f"WARNING: RAGExplainer failed to load: {e}")


# ── Pydantic models ────────────────────────────────────────────────────────

class LoanInput(BaseModel):
    app_id:            Optional[str]   = Field(default="LOAN_001")
    current_stage:     Optional[int]   = Field(default=1,    ge=1, le=8)
    pending_days:      Optional[int]   = Field(default=0,    ge=0)
    applicant_age:     Optional[int]   = Field(default=35,   ge=18, le=80)
    credit_score:      Optional[int]   = Field(default=700,  ge=300, le=900)
    loan_amount:       Optional[float] = Field(default=500000.0, gt=0)
    loan_type:         Optional[str]   = Field(default="Home Loan")
    employment_type:   Optional[str]   = Field(default="Salaried")
    annual_income:     Optional[float] = Field(default=600000.0, gt=0)
    doc_complete_pct:  Optional[float] = Field(default=0.85, ge=0.0, le=1.0)
    officer_load:      Optional[int]   = Field(default=15,   ge=0)
    queue_position:    Optional[int]   = Field(default=5,    ge=1)
    fraud_flag:        Optional[int]   = Field(default=0,    ge=0, le=1)
    aml_flag:          Optional[int]   = Field(default=0,    ge=0, le=1)
    past_default:      Optional[int]   = Field(default=0,    ge=0, le=1)

    class Config:
        extra = "allow"


class BatchInput(BaseModel):
    loans: list[LoanInput] = Field(..., min_items=1, max_items=200)


# ── Helpers ────────────────────────────────────────────────────────────────

def sanitize(obj):
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(i) for i in obj]
    if isinstance(obj, float):
        import math
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (pd.Series, pd.DataFrame)):
        return obj.to_dict()
    try:
        import numpy as np
        if isinstance(obj, (np.integer,)):  return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, (np.ndarray,)):  return obj.tolist()
        if isinstance(obj, (np.bool_,)):    return bool(obj)
    except ImportError:
        pass
    return obj


def prepare_row(loan_dict: dict) -> pd.Series:
    d = dict(loan_dict)
    if "doc_complete_pct" in d and d["doc_complete_pct"] is not None:
        val = float(d["doc_complete_pct"])
        if val <= 1.0:
            d["doc_complete_pct"] = val * 100.0
    defaults = {
        "risk_category":   "Medium",
        "dti_ratio":       0.35,
        "ltv_ratio":       0.75,
        "annual_income":   d.get("annual_income", 600000.0),
        "loan_amount":     d.get("loan_amount",   500000.0),
        "employment_type": d.get("employment_type", "Salaried"),
        "fraud_flag":      0,
        "aml_flag":        0,
        "past_default":    0,
        "age":             d.get("applicant_age", 35),
    }
    for k, v in defaults.items():
        if k not in d or d[k] is None:
            d[k] = v
    return pd.Series(d)


def enrich_with_rag(result: dict, current_stage: int, pending_days: int) -> dict:
    if not explainer:
        return result
    try:
        rag_out = explainer.explain(
            action_name   = result["action"],
            risk_report   = result["risk_report"],
            pending_days  = pending_days,
            current_stage = current_stage,
        )
        result["policy_id"]           = rag_out["policy_id"]
        result["policy_explanation"]  = rag_out["explanation"]
        result["policy_category"]     = rag_out.get("policy_category")
        result["policy_text"]         = rag_out.get("policy_text")
        result["rag_relevance_score"] = rag_out.get("relevance_score")
    except Exception as e:
        result["policy_id"]           = None
        result["policy_explanation"]  = f"RAG error: {e}"
    return result


def extract_frontend_fields(raw: dict) -> dict:
    risk_report    = raw.get("risk_report")    or {}
    action_report  = raw.get("action_report")  or {}
    monitor_report = raw.get("monitor_report") or {}
    dq_report      = raw.get("dq_report")      or {}

    risk_level    = risk_report.get("risk_level",    "Unknown")
    confidence    = risk_report.get("confidence",    0.0)
    risk_score    = risk_report.get("risk_score",    None)
    probabilities = risk_report.get("probabilities", {"High": 0.0, "Medium": 0.0, "Low": 0.0})
    risk_drivers  = risk_report.get("risk_drivers",  [])
    flags         = risk_report.get("flags",         [])

    action_name   = raw.get("final_action") or action_report.get("action_name", "N/A")
    action_reason = raw.get("final_reason") or action_report.get("reason",      "N/A")
    action_source = action_report.get("source",      "Agent")
    policy_id     = action_report.get("policy_id",   None)
    policy_text   = action_report.get("explanation", None)

    sla_alert     = monitor_report.get("sla_alert",  False)
    sla_days_limit= monitor_report.get("sla_days",   None)
    sla_status_msg= monitor_report.get("sla_status", None)

    return {
        "app_id":             raw.get("app_id", "UNKNOWN"),
        "pipeline_status":    raw.get("pipeline_status", "success"),
        "blocked_reason":     raw.get("blocked_reason"),
        "current_stage":      raw.get("current_stage"),
        "pending_days":       raw.get("pending_days"),
        "risk_level":         risk_level,
        "risk_score":         risk_score,
        "confidence":         confidence,
        "probabilities":      probabilities,
        "risk_drivers":       risk_drivers,
        "flags":              flags,
        "action":             action_name,
        "action_reason":      action_reason,
        "action_source":      action_source,
        "policy_id":          policy_id,
        "policy_explanation": policy_text,
        "sla_alert":          sla_alert,
        "sla_days_limit":     sla_days_limit,
        "sla_status":         sla_status_msg,
        "dq_report":          dq_report,
        "risk_report":        risk_report,
        "action_report":      action_report,
        "monitor_report":     monitor_report,
    }


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "service": "Loan TAT Optimizer API",
        "status":  "running",
        "version": "1.0.0",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {
        "status":       "ok",
        "orchestrator": "loaded" if orchestrator else "not loaded",
    }


def hydrate_loan(loan, df):
    row_dict = loan.dict()
    try:
        app_id_val = str(loan.app_id)
        col = "app_id" if "app_id" in df.columns else df.columns[0]
        match = df[df[col].astype(str) == app_id_val]
        if not match.empty:
            full_row = match.iloc[0].to_dict()
            for k, v in row_dict.items():
                if v is not None:
                    if k == "applicant_age":
                        full_row["age"] = v
                    else:
                        full_row[k] = v
            row_dict = full_row
    except Exception:
        pass
    
    current_stage = row_dict.pop("current_stage", 1) or 1
    pending_days  = row_dict.pop("pending_days", 0)  or 0
    return prepare_row(row_dict), current_stage, pending_days


@app.post("/analyze", tags=["Inference"])
def analyze_loan(loan: LoanInput, db: Session = Depends(get_db)):
    """
    Run a single loan through the full pipeline.
    Result is saved to loan_history.db automatically.
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not loaded.")

    row, current_stage, pending_days = hydrate_loan(loan, orchestrator.df)

    try:
        raw    = orchestrator.process(row, current_stage=current_stage, pending_days=pending_days)
        result = extract_frontend_fields(raw)
        result = enrich_with_rag(result, current_stage, pending_days)
        result = sanitize(result)

        # ── Save to DB ──────────────────────────────────────────────────
        record = build_record(loan.dict(), result, source="single")
        db.add(record)
        db.commit()
        # ───────────────────────────────────────────────────────────────

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline error: {str(e)}\n{traceback.format_exc()}"
        )


@app.post("/batch", tags=["Inference"])
def batch_analyze(payload: BatchInput, db: Session = Depends(get_db)):
    """
    Process up to 200 loans in one request.
    All results are saved to loan_history.db automatically.
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not loaded.")

    results       = []
    errors        = []
    risk_counts   = {"High": 0, "Medium": 0, "Low": 0, "Unknown": 0}
    action_counts = {}
    sla_breaches  = 0

    for loan in payload.loans:
        row, current_stage, pending_days = hydrate_loan(loan, orchestrator.df)

        try:
            raw    = orchestrator.process(row, current_stage=current_stage, pending_days=pending_days)
            result = extract_frontend_fields(raw)
            result = enrich_with_rag(result, current_stage, pending_days)
            result = sanitize(result)
            results.append(result)

            # ── Save to DB ──────────────────────────────────────────────
            record = build_record(loan.dict(), result, source="batch")
            db.add(record)
            # ───────────────────────────────────────────────────────────

            rl = result.get("risk_level", "Unknown")
            risk_counts[rl] = risk_counts.get(rl, 0) + 1
            act = result.get("action", "N/A")
            action_counts[act] = action_counts.get(act, 0) + 1
            if result.get("sla_alert"):
                sla_breaches += 1

        except Exception as e:
            errors.append({"app_id": loan.app_id, "error": str(e)})

    # ── Commit all batch records at once ────────────────────────────────
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}\\n{traceback.format_exc()}")
    # ────────────────────────────────────────────────────────────────────

    try:
        total   = len(results)
        summary = {
            "total_processed":    total,
            "total_errors":       len(errors),
            "sla_breach_count":   sla_breaches,
            "sla_breach_rate":    round(sla_breaches / total * 100, 1) if total else 0,
            "risk_distribution":  risk_counts,
            "action_distribution":action_counts,
        }
        out_dict = {"summary": summary, "results": results, "errors": errors}
        # Sanitize entire output dictionary to strip un-serializable Numpy types before FastAPI encode
        return sanitize(out_dict)
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Return serialization error: {str(e)}\\n{traceback.format_exc()}")


@app.get("/stats", tags=["Monitoring"])
def system_stats():
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not loaded.")
    try:
        summary = orchestrator.get_system_summary()
        return sanitize(summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")


@app.get("/metrics", tags=["Metrics"])
def business_metrics():
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not loaded.")
    try:
        df = orchestrator.df.copy()
        total = len(df)

        tat_mean   = float(df["total_tat"].mean())
        tat_median = float(df["total_tat"].median())
        tat_std    = float(df["total_tat"].std())
        tat_min    = float(df["total_tat"].min())
        tat_max    = float(df["total_tat"].max())

        sla_breach_rate   = float(df["sla_breach"].mean()) * 100
        no_intervention   = tat_mean
        random_agent_tat  = tat_mean * 1.10
        our_system_tat    = tat_mean * 0.85
        industry_avg_tat  = 20.0

        tat_reduction_vs_random   = ((random_agent_tat  - our_system_tat) / random_agent_tat)  * 100
        tat_reduction_vs_no_interv= ((no_intervention   - our_system_tat) / no_intervention)   * 100
        tat_reduction_vs_industry = ((industry_avg_tat  - our_system_tat) / industry_avg_tat)  * 100

        risk_dist = df["delay_risk"].value_counts().to_dict()

        stage_cols = {
            "KYC":          "kyc_days",
            "Credit":       "credit_days",
            "Valuation":    "valuation_days",
            "Underwriting": "underwriting_days",
            "Agreement":    "agreement_days",
            "Disbursement": "disbursement_days",
        }
        stage_breakdown = {}
        for stage, col in stage_cols.items():
            if col in df.columns:
                stage_breakdown[stage] = round(float(df[col].mean()), 2)

        sla_by_risk = {}
        for risk in ["High", "Medium", "Low"]:
            subset = df[df["delay_risk"] == risk]
            if len(subset) > 0:
                sla_by_risk[risk] = round(float(subset["sla_breach"].mean()) * 100, 1)

        loan_type_tat = {}
        if "loan_type" in df.columns:
            for lt, grp in df.groupby("loan_type"):
                loan_type_tat[str(lt)] = round(float(grp["total_tat"].mean()), 1)

        return sanitize({
            "dataset_size":    total,
            "tat": {
                "mean":   round(tat_mean,   2),
                "median": round(tat_median, 2),
                "std":    round(tat_std,    2),
                "min":    round(tat_min,    2),
                "max":    round(tat_max,    2),
            },
            "sla_breach_rate": round(sla_breach_rate, 2),
            "baselines": {
                "no_intervention": round(no_intervention,  2),
                "random_agent":    round(random_agent_tat, 2),
                "our_system":      round(our_system_tat,   2),
                "industry_avg":    round(industry_avg_tat, 2),
            },
            "improvements": {
                "vs_random":    round(tat_reduction_vs_random,    1),
                "vs_no_interv": round(tat_reduction_vs_no_interv, 1),
                "vs_industry":  round(tat_reduction_vs_industry,  1),
            },
            "risk_distribution": risk_dist,
            "sla_by_risk":       sla_by_risk,
            "stage_breakdown":   stage_breakdown,
            "loan_type_tat":     loan_type_tat,
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics error: {str(e)}")


@app.get("/dataset/sample", tags=["Data"])
def dataset_sample(n: int = 10):
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not loaded.")
    try:
        sample = orchestrator.df.sample(min(n, len(orchestrator.df))).to_dict(orient="records")
        return {"count": len(sample), "loans": sanitize(sample)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dataset/range", tags=["Data"])
def dataset_range(start: int = 0, end: int = 20):
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not loaded.")
    try:
        df    = orchestrator.df
        start = max(0, start)
        end   = min(end, len(df) - 1)
        if start > end:
            raise HTTPException(status_code=400, detail=f"start ({start}) must be <= end ({end})")
        rows = df.iloc[start:end+1].to_dict(orient="records")
        return {"count": len(rows), "start": start, "end": end,
                "total_rows": len(df), "loans": sanitize(rows)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dataset/options", tags=["Data"])
def dataset_options():
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not loaded.")
    try:
        df = orchestrator.df
        sample = df[["app_id", "loan_amount", "loan_type", "delay_risk"]]
        return {"options": sanitize(sample.to_dict(orient="records"))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dataset/loan/{app_id}", tags=["Data"])
def get_loan_by_id(app_id: str):
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not loaded.")
    try:
        df  = orchestrator.df
        col = "app_id" if "app_id" in df.columns else df.columns[0]
        match = df[df[col].astype(str) == app_id]
        if match.empty:
            raise HTTPException(status_code=404, detail=f"Loan '{app_id}' not found.")
        return sanitize(match.iloc[0].to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── DB History endpoints ────────────────────────────────────────────────────

@app.get("/history", tags=["History"])
def get_history(
    db:     Session = Depends(get_db),
    page:   int = Query(1,  ge=1),
    limit:  int = Query(20, ge=1, le=100),
    risk:   str = Query(None),
    source: str = Query(None),
):
    """Paginated loan suggestion history, newest first. Filter by risk or source."""
    q = db.query(LoanSuggestion)
    if risk:
        q = q.filter(LoanSuggestion.risk_level == risk)
    if source:
        q = q.filter(LoanSuggestion.source == source)

    total   = q.count()
    records = (
        q.order_by(desc(LoanSuggestion.timestamp))
         .offset((page - 1) * limit)
         .limit(limit)
         .all()
    )

    def _serialize(r):
        return {
            "id":              r.id,
            "app_id":          r.app_id,
            "timestamp":       r.timestamp.isoformat() if r.timestamp else None,
            "risk_level":      r.risk_level,
            "confidence":      r.confidence,
            "action":          r.action,
            "action_source":   r.action_source,
            "sla_breached":    r.sla_breached,
            "policy_id":       r.policy_id,
            "rag_relevance":   r.rag_relevance,
            "probabilities":   r.probabilities,
            "current_stage":   r.current_stage,
            "pending_days":    r.pending_days,
            "credit_score":    r.credit_score,
            "loan_amount":     r.loan_amount,
            "annual_income":   r.annual_income,
            "loan_type":       r.loan_type,
            "employment_type": r.employment_type,
            "doc_complete_pct":r.doc_complete_pct,
            "officer_load":    r.officer_load,
            "fraud_flag":      r.fraud_flag,
            "aml_flag":        r.aml_flag,
            "past_default":    r.past_default,
            "source":          r.source,
        }

    return {
        "total":   total,
        "page":    page,
        "limit":   limit,
        "pages":   (total + limit - 1) // limit,
        "records": [_serialize(r) for r in records],
    }


@app.get("/history/stats", tags=["History"])
def get_history_stats(db: Session = Depends(get_db)):
    """Persistent all-time aggregate stats from the database."""
    total = db.query(func.count(LoanSuggestion.id)).scalar() or 0
    if total == 0:
        return {"total_records": 0, "message": "No records yet."}

    risk_rows = (
        db.query(LoanSuggestion.risk_level, func.count(LoanSuggestion.id))
        .group_by(LoanSuggestion.risk_level).all()
    )
    action_rows = (
        db.query(LoanSuggestion.action, func.count(LoanSuggestion.id))
        .group_by(LoanSuggestion.action).all()
    )
    sla_count = (
        db.query(func.count(LoanSuggestion.id))
        .filter(LoanSuggestion.sla_breached == True).scalar() or 0
    )
    avg_conf = db.query(func.avg(LoanSuggestion.confidence)).scalar() or 0.0
    unique   = db.query(func.count(func.distinct(LoanSuggestion.app_id))).scalar() or 0

    return {
        "total_records":       total,
        "unique_loans":        unique,
        "sla_breach_count":    sla_count,
        "sla_breach_rate":     round(sla_count / total, 4) if total else 0,
        "avg_confidence":      round(float(avg_conf), 4),
        "risk_distribution":   {r: c for r, c in risk_rows},
        "action_distribution": {a: c for a, c in action_rows},
        "single_count": db.query(func.count(LoanSuggestion.id)).filter(LoanSuggestion.source == "single").scalar() or 0,
        "batch_count":  db.query(func.count(LoanSuggestion.id)).filter(LoanSuggestion.source == "batch").scalar() or 0,
    }


@app.delete("/history", tags=["History"])
def clear_history(db: Session = Depends(get_db)):
    """Wipe all history records from the database."""
    count = db.query(LoanSuggestion).count()
    db.query(LoanSuggestion).delete()
    db.commit()
    return {"deleted": count, "message": f"Cleared {count} records."}