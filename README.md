# Loan TAT Optimizer — Phase 1: ML + RL Integration

AI-powered loan sanction turnaround time optimization system.

---

## Project Structure

```
loan_tat_optimizer/
│
├── data/
│   ├── synthetic_loan_dataset.csv      ← raw dataset (used by RL env)
│   └── loan_data_ml_ready.csv          ← ML-ready dataset
│
├── ml/
│   ├── train_model.py                  ← trains & saves the ML predictor
│   ├── predictor.py                    ← DelayPredictor inference class
│   └── delay_predictor.joblib          ← saved after training (auto-created)
│
├── rl/
│   ├── environment.py                  ← LoanSanctionEnvV2 (ML-integrated)
│   ├── train_agent.py                  ← trains & saves PPO V2 agent
│   ├── evaluate.py                     ← PPO vs Random + action analysis
│   └── ppo_v2_ml_integrated.zip        ← saved after training (auto-created)
│
├── utils/
│   └── inference.py                    ← LoanAdvisor end-to-end pipeline
│
├── config.py                           ← all paths & constants
├── main.py                             ← single entry point
├── requirements.txt
└── README.md
```

---

## Setup

**1. Create a virtual environment (recommended)**

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

**2. Install dependencies**

```bash
pip install -r requirements.txt
```

---

## Running the Project

### Full pipeline (train ML → train RL → evaluate → demo)

```bash
python main.py
```

### Force retrain both models

```bash
python main.py --retrain
```

### Evaluation only (models must already be trained)

```bash
python main.py --eval-only
```

### Inference demo only

```bash
python main.py --demo-only
```

### Run individual modules

```bash
python ml/train_model.py       # train ML model only
python rl/train_agent.py       # train PPO agent only
python rl/evaluate.py          # evaluate agent only
```

---

## What Phase 1 Does

| Component | Description |
|---|---|
| `DelayPredictor` | Logistic Regression (91% accuracy) predicts delay risk (Low / Medium / High) from raw loan data |
| `LoanSanctionEnvV2` | Gymnasium RL environment where the ML prediction is injected into the state vector |
| Risk-aware rewards | Agent is penalised more for inaction on High-risk loans, rewarded more for correct actions |
| `PPO V2` | Trained on the ML-integrated environment — makes risk-aware workflow decisions |
| `LoanAdvisor` | End-to-end pipeline: raw loan row → ML risk → RL action → plain-English recommendation |

---

## State Vector

```
[stage, pending_days, ML_predicted_risk, doc_completeness, officer_load, queue_position]
  1–8      0–30              0/1/2              60–100           5–30          1–20
```

## Actions

| ID | Action | When most useful |
|---|---|---|
| 0 | Wait | No bottleneck detected |
| 1 | Fast-track | Elevated pending days |
| 2 | Reassign Officer | High officer workload |
| 3 | Request Documents | Low document completeness |
| 4 | Escalate Priority | High delay risk, stage stall |

---

## Next Steps

- **Phase 2** — Agentic AI Layer (Data Quality Agent, Risk Agent, RL Agent, Monitor Agent, Orchestrator)
- **Phase 3** — RAG Explainability (explain WHY each action was chosen using policy documents)
- **Phase 4** — Streamlit Dashboard
- **Phase 5** — Business Metrics Evaluation
