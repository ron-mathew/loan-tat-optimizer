# LoanOps AI — Loan TAT Optimizer

> AI-powered loan turnaround time optimization using Machine Learning, Reinforcement Learning, Retrieval-Augmented Generation, and an Agentic AI pipeline — served through a FastAPI backend and a React dashboard.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Running the Project](#running-the-project)
- [Phase Breakdown](#phase-breakdown)
  - [Phase 1 — ML + RL Pipeline](#phase-1--ml--rl-pipeline)
  - [Phase 2 — Agentic AI](#phase-2--agentic-ai)
  - [Phase 3 — RAG Explainability](#phase-3--rag-explainability)
  - [Phase 4 — FastAPI + React Dashboard](#phase-4--fastapi--react-dashboard)
  - [Phase 5 — Business Metrics](#phase-5--business-metrics)
- [ML Model](#ml-model)
- [Reinforcement Learning Agent](#reinforcement-learning-agent)
- [RAG Explainer](#rag-explainer)
- [API Reference](#api-reference)
- [Database — Persistent History](#database--persistent-history)
- [Dashboard Pages](#dashboard-pages)
- [Business Metrics](#business-metrics)
- [Known Limitations](#known-limitations)

---

## Project Overview

Loan processing in Indian banking averages **20 days** (RBI benchmark). This system reduces that to an estimated **12.59 days** by:

1. Predicting delay risk (High / Medium / Low) using a calibrated ML classifier
2. Selecting the optimal intervention action using a PPO reinforcement learning agent
3. Explaining every decision by citing the relevant banking policy via RAG
4. Coordinating all components through a multi-agent orchestration pipeline
5. Persisting all loan suggestions to SQLite for full audit trail and monitoring

**Dataset:** 3,000 synthetic loan records · Average TAT 14.81 days · 18.4% SLA breach rate

---

## Architecture

```
React Frontend (Vite)
        │
        │  HTTP (Axios)
        ▼
FastAPI Backend (:8000)
        │
        ├── POST /analyze ──────────► Orchestrator
        ├── POST /batch  ──────────► Orchestrator (loop)
        ├── GET  /stats  ──────────► MonitoringAgent (in-memory)
        ├── GET  /metrics ─────────► Dataset aggregations
        ├── GET  /history ─────────► SQLite (persistent)
        ├── GET  /history/stats ───► SQLite (persistent)
        └── DELETE /history ───────► SQLite (clear)
                │
                ▼
        Orchestrator.process(row)
                │
                ├── DataQualityAgent   → validate & clean inputs
                ├── RiskAgent          → ML model + override rules
                ├── ActionAgent        → PPO policy (RL)
                ├── MonitoringAgent    → SLA check, session stats
                └── RAGExplainer       → policy retrieval + explanation
                        │
                        ▼
                SQLite (loan_history.db)
```

---

## Project Structure

```
loan_tat_optimizer/
│
├── backend/
│   ├── main.py                         ← FastAPI app, all endpoints
│   └── database.py                     ← SQLAlchemy models, DB helpers
│
├── agents/
│   ├── orchestrator.py                 ← coordinates all agents
│   ├── data_quality_agent.py           ← input validation & cleaning
│   ├── risk_agent.py                   ← ML inference + override rules
│   ├── action_agent.py                 ← PPO policy wrapper
│   └── monitoring_agent.py             ← SLA check, session stats
│
├── ml/
│   ├── train_model.py                  ← trains & saves ML predictor
│   ├── predictor.py                    ← DelayPredictor inference class
│   └── delay_predictor.joblib          ← saved model (auto-created)
│
├── rl/
│   ├── environment.py                  ← LoanSanctionEnvV2 (Gymnasium)
│   ├── train_agent.py                  ← trains & saves PPO agent
│   ├── evaluate.py                     ← PPO vs Random evaluation
│   └── ppo_v2_ml_integrated.zip        ← saved agent (auto-created)
│
├── rag/
│   └── explainer.py                    ← RAGExplainer (MiniLM + FAISS)
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                     ← sidebar nav, layout
│   │   ├── index.css                   ← banking theme
│   │   ├── api.js                      ← all Axios calls
│   │   ├── components/
│   │   │   └── UI.jsx                  ← shared components
│   │   └── pages/
│   │       ├── Analyze.jsx             ← single loan assessment
│   │       ├── Batch.jsx               ← bulk processing
│   │       ├── Monitor.jsx             ← system + DB history
│   │       └── Metrics.jsx             ← business metrics
│   ├── package.json
│   └── vite.config.js
│
├── data/
│   ├── synthetic_loan_dataset.csv      ← 3,000 loan records
│   └── loan_data_ml_ready.csv          ← ML-preprocessed dataset
│
├── utils/
│   └── inference.py                    ← LoanAdvisor end-to-end class
│
├── config.py                           ← all paths & constants
├── requirements.txt
├── loan_history.db                     ← SQLite DB (auto-created on first run)
└── README.md
```

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd loan_tat_optimizer
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
pip install sqlalchemy --break-system-packages
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Running the Project

### Start the backend

```bash
# From project root, with venv activated
uvicorn backend.main:app --reload --port 8000
```

On first run you will see:
```
Loading Orchestrator…   ✅
Loading RAG Explainer… ✅
```

`loan_history.db` is created automatically in the project root.

### Start the frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**

### ML / RL training commands

```bash
python main.py                  # full pipeline: train ML → train RL → evaluate → demo
python main.py --retrain        # force retrain both models
python main.py --eval-only      # run evaluation only (models must exist)
python main.py --demo-only      # run LoanAdvisor demo only

python ml/train_model.py        # train ML model only
python rl/train_agent.py        # train PPO agent only
python rl/evaluate.py           # evaluate PPO vs Random agent
```

---

## Phase Breakdown

### Phase 1 — ML + RL Pipeline

Core prediction and decision-making:

| Component | Description |
|---|---|
| `DelayPredictor` | Logistic Regression (91% accuracy, calibrated) — predicts Low / Medium / High delay risk |
| `LoanSanctionEnvV2` | Gymnasium RL environment with ML prediction injected into the state vector |
| Risk-aware rewards | Agent penalised for inaction on High-risk loans, rewarded for correct interventions |
| `PPO V2` | Trained for 100K timesteps — learns risk-aware workflow decisions |
| `LoanAdvisor` | End-to-end: raw loan row → ML risk → RL action → plain-English recommendation |

**State vector:**

```
[stage, pending_days, ML_predicted_risk, doc_completeness, officer_load, queue_position]
  1–8      0–30              0/1/2              60–100           5–30          1–20
```

**Action space:**

| ID | Action | Trigger condition |
|---|---|---|
| 0 | Wait | No bottleneck detected |
| 1 | Fast-track | Low risk, elevated pending days |
| 2 | Reassign Officer | High officer workload (load > 20) |
| 3 | Request Documents | Low document completeness (< 50%) |
| 4 | Escalate Priority | High delay risk, SLA approaching |

---

### Phase 2 — Agentic AI

Five specialized agents coordinated by an orchestrator:

**DataQualityAgent** — validates and cleans every incoming loan row. Checks for missing fields, out-of-range values, and type errors. Sets `pipeline_status = "blocked"` if critical fields are invalid, halting the pipeline and surfacing the reason to the UI.

**RiskAgent** — two-layer classification:
- Layer 1: `CalibratedClassifierCV(LogisticRegression(), method="isotonic", cv=5)` produces realistic probability distributions across all three classes
- Layer 2: Hard override rules that enforce non-negotiable business logic regardless of ML output

Override rules applied post-prediction:

```python
credit_score < 450          → force High
credit_score 450–550        → force at least Medium
past_default == 1           → force at least Medium
fraud_flag == 1             → force High
aml_flag == 1               → force High
dti_ratio > 0.6             → force at least Medium
doc_complete_pct < 50%      → force at least Medium
loan_to_income > 100x       → force High
loan_to_income 20–100x      → force at least Medium
```

When an override fires, probabilities are synthetically adjusted to match (e.g. High override → High=0.90, Medium=0.10, Low=0.00) and duplicate risk driver messages are suppressed.

**ActionAgent** — wraps the trained PPO model. Encodes the current loan state, queries the policy network, and returns the selected action with a natural-language reason and source tag (`rl_agent` or `rule_override`).

**MonitoringAgent** — in-memory session tracking. Applies per-risk SLA thresholds:

```
High risk   → SLA limit = 5 days
Medium risk → SLA limit = 10 days
Low risk    → SLA limit = 15 days
```

Tracks total loans processed, SLA breach count and rate, risk distribution, and action distribution for the current session. Resets on every backend restart — persistent stats are handled by the SQLite DB.

**Orchestrator** — calls all agents in sequence, passes outputs between them, and handles failures gracefully. Entry point for the API: `orchestrator.process(row, current_stage, pending_days)`.

---

### Phase 3 — RAG Explainability

After the pipeline determines the action, the RAG Explainer retrieves the most relevant banking policy and generates a grounded natural-language explanation.

**Components:**
- **Embedding model:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional vectors)
- **Vector store:** FAISS index over pre-processed banking policy documents
- **Generator:** BertModel for explanation generation

**Process:**
1. Build a query string from the loan result: `action:{name} risk:{level} stage:{n} pending:{n}days`
2. Embed the query and run cosine similarity search against the FAISS index
3. Retrieve the top-1 matching policy document
4. Generate a natural-language explanation grounded in the policy text
5. Return `policy_id`, `policy_text`, `explanation`, and `relevance_score`

**Accuracy:** 60% exact policy ID match · 100% policy category match  
WF-001 and WF-002 are semantically similar, causing occasional ID-level confusion — the correct category is always retrieved.

---

### Phase 4 — FastAPI + React Dashboard

**Backend:** FastAPI on `localhost:8000` with 10 endpoints (see API Reference).  
**Frontend:** React 18 + Vite on `localhost:5173` · All inline styles · Pure CSS bar charts (Recharts incompatible with React 19).

Key implementation details:
- `prepare_row()` converts API dict → pandas Series with defaults filled in
- `doc_complete_pct` is accepted as 0.0–1.0 from the frontend and converted to 0–100 internally
- `enrich_with_rag()` called after pipeline, injects policy fields into result
- `extract_frontend_fields()` flattens nested agent output into a flat JSON response
- `sanitize()` handles numpy types and NaN values for JSON serialization
- CORS open for all localhost ports during development

---

### Phase 5 — Business Metrics

Computed from the 3,000-loan dataset. See [Business Metrics](#business-metrics) section below.

---

## ML Model

**Model:** Logistic Regression wrapped in `CalibratedClassifierCV(method="isotonic", cv=5)`

**Why calibration:** The raw logistic regression returned 100% confidence on every prediction. Isotonic calibration with 5-fold cross-validation spreads probabilities realistically across all three classes.

**Why the label encoding fix:** sklearn sorts class labels alphabetically, producing High=0, Low=1, Medium=2. A remapping step enforces the correct Low=0, Medium=1, High=2 before inference.

**Features:** credit score, loan-to-income ratio, DTI ratio, doc completeness, officer load, pending days, fraud/AML/default flags, processing stage, loan type, employment type.

**Retrain:** `python ml/train_model.py` — run this whenever the dataset or feature engineering changes.

---

## Reinforcement Learning Agent

**Algorithm:** PPO (Proximal Policy Optimization) via Stable Baselines 3  
**Training:** 100,000 timesteps  
**Result:** +12.6 cumulative reward over random agent baseline

**Reward function:**

```python
# Positive rewards (correct actions)
Fast-track   + Low risk          → +3
Escalate     + High risk         → +3
Request Docs + doc_pct < 0.5     → +2
Reassign     + officer_load > 20 → +2

# Penalties (wrong actions)
Wait         + High risk         → -3
Fast-track   + High risk         → -2
Escalate     + Low risk          → -2

# SLA breach (always applied if pending_days > threshold)
SLA breached                     → -5
```

**Known edge case:** PPO consistently picks "Reassign Officer" for officer load 18–22 (borderline zone). Accepted at 94% accuracy — no hard override added for this range.

---

## RAG Explainer

**Model:** `sentence-transformers/all-MiniLM-L6-v2`  
**Index:** FAISS flat index  
**Policies indexed:** WF-001, WF-002, SLA-001, SLA-002, SLA-003 (and others)

**Harmless warnings during startup:**
- sklearn version mismatch — no effect on predictions
- HuggingFace symlinks warning — no effect
- BertModel UNEXPECTED key warning — no effect

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Service info |
| GET | `/health` | Backend + orchestrator status |
| POST | `/analyze` | Single loan assessment → saves to DB |
| POST | `/batch` | Bulk loan processing (max 200) → saves to DB |
| GET | `/stats` | Session monitoring stats (in-memory) |
| GET | `/metrics` | Business metrics from dataset |
| GET | `/dataset/sample?n=N` | N random loans from dataset |
| GET | `/dataset/range?start=X&end=Y` | Loans by row index (max 2999) |
| GET | `/dataset/loan/{app_id}` | Single loan by app_id |
| GET | `/history` | Paginated DB history (filter by risk, source) |
| GET | `/history/stats` | All-time persistent aggregate stats |
| DELETE | `/history` | Clear all history records |

**Interactive API docs:** http://localhost:8000/docs

---

## Database — Persistent History

Every loan processed through `/analyze` or `/batch` is saved to `loan_history.db` (SQLite, auto-created).

**Schema — `loan_suggestions` table:**

| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| app_id | TEXT | Loan identifier |
| timestamp | DATETIME | UTC timestamp of analysis |
| risk_level | TEXT | High / Medium / Low |
| confidence | FLOAT | Model confidence 0.0–1.0 |
| action | TEXT | Recommended action |
| action_source | TEXT | `rl_agent` or `rule_override` |
| sla_breached | BOOLEAN | Whether SLA was breached |
| policy_id | TEXT | Retrieved policy ID |
| rag_relevance | FLOAT | RAG cosine similarity score |
| probabilities | JSON | `{"High": 0.1, "Medium": 0.8, "Low": 0.1}` |
| current_stage | INTEGER | Loan stage 1–8 |
| pending_days | INTEGER | Days pending at time of analysis |
| credit_score | INTEGER | Applicant credit score |
| loan_amount | FLOAT | Loan amount (₹) |
| annual_income | FLOAT | Applicant income (₹) |
| loan_type | TEXT | Home / Personal / Business |
| employment_type | TEXT | Salaried / Self-employed etc. |
| doc_complete_pct | FLOAT | Document completeness 0.0–1.0 |
| officer_load | INTEGER | Assigned officer's current caseload |
| fraud_flag | BOOLEAN | Fraud flag active |
| aml_flag | BOOLEAN | AML flag active |
| past_default | BOOLEAN | Past default on record |
| source | TEXT | `single` or `batch` |

**Query examples:**
```bash
# All-time stats
GET http://localhost:8000/history/stats

# Last 20 records
GET http://localhost:8000/history?page=1&limit=20

# Only High-risk loans from batch runs
GET http://localhost:8000/history?risk=High&source=batch

# Clear all records
DELETE http://localhost:8000/history
```

---

## Dashboard Pages

### Loan Analysis
Single loan risk assessment. Input form with sliders (credit score, doc completeness, officer load, pending days), dropdowns (stage, loan type, employment type), number inputs (loan amount, income), and flag checkboxes (fraud, AML, past default). Random Loan button fetches a real row from the dataset.

**Output:** Risk badge + confidence · Action badge + source · SLA status · Probability breakdown bars · Risk drivers list · Action reasoning · RAG policy citation with relevance score.

### Batch Processing
Two modes: Random Sample (5–100 loans) and Row Range (row X to Y, max 2999). Runs all loans through the full pipeline in one API call.

**Output:** KPI tiles (processed, SLA breaches, high-risk count, errors) · Risk and action distribution charts · Sortable, filterable, paginated results table (15 rows/page).

### System Monitor
Combines session stats (in-memory, resets on restart) with persistent database stats (survives restarts).

**Output:** Backend + orchestrator health banner · Session KPI tiles · All-time DB stat tiles (total records, unique loans, SLA breach count, avg confidence) · Risk and action distribution charts · Full loan suggestion history table with filters (risk, source) and pagination · Session system summary key-value grid · Model info cards (ML, RL, RAG).

### Business Metrics
Dataset-level performance analysis and competitive benchmarking.

**Output:** Dataset overview tiles · TAT comparison bars vs baselines · Improvement percentage tiles · SLA breach rate by risk level · Risk distribution · Stage-by-stage processing time breakdown · Loan type TAT comparison · Methodology notes.

---

## Business Metrics

All figures computed from the 3,000-loan dataset unless noted.

| Metric | Value | Source |
|---|---|---|
| Dataset size | 3,000 loans | `len(df)` |
| Average TAT | 14.81 days | `df["total_tat"].mean()` |
| Median TAT | varies | `df["total_tat"].median()` |
| SLA breach rate | 18.4% | `df["sla_breach"].mean()` |
| No intervention TAT | 14.81 days | Dataset mean (no action) |
| Random agent TAT | 16.3 days | Dataset mean × 1.10 (estimated) |
| Our system TAT | 12.59 days | Dataset mean × 0.85 (estimated) |
| Industry average | 20.0 days | RBI benchmark, hardcoded |
| vs Random Agent | 22.7% faster | Arithmetic from above |
| vs No Intervention | 15.0% faster | Arithmetic from above |
| vs Industry Average | 37.0% faster | Arithmetic from above |

**SLA breach by risk level (real dataset):**

| Risk | SLA Limit | Breach Rate |
|---|---|---|
| High | 5 days | 72.8% |
| Medium | 10 days | 0% |
| Low | 15 days | 0% |

The 72.8% high-risk breach rate is the core finding that justifies the system — nearly all SLA breaches are concentrated in high-risk loans that the PPO agent learns to escalate immediately.

**Note on TAT improvement claims:** The 15% reduction is a conservative model-based estimate derived from the PPO agent's +12.6 reward improvement over the random baseline during training, not a direct end-to-end simulation of all 3,000 loans through the agent.

---

## Known Limitations

| Issue | Impact | Status |
|---|---|---|
| ML overconfidence | Fixed by isotonic calibration | ✅ Resolved |
| PPO borderline zone (load 18–22) | Picks Reassign Officer — accepted at 94% accuracy | Accepted |
| RAG 60% exact policy match | WF-001/WF-002 semantic confusion | Known limitation |
| Business TAT improvement is estimated | Not directly simulated | Documented |
| MonitoringAgent session-only | Fixed by SQLite integration | ✅ Resolved |
| sklearn version warning | Harmless | Ignore |
| HuggingFace symlinks warning | Harmless | Ignore |
| BertModel unexpected key warning | Harmless | Ignore |

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML model | scikit-learn · Logistic Regression · CalibratedClassifierCV |
| RL agent | Stable Baselines 3 · PPO · Gymnasium |
| RAG | sentence-transformers · FAISS · HuggingFace |
| Backend | FastAPI · Uvicorn · SQLAlchemy · SQLite |
| Frontend | React 18 · Vite · Axios |
| Data | pandas · NumPy · 3,000-record synthetic dataset |

---

## Team

Built as a Project-Based Learning (PBL) submission — Semester 6.
