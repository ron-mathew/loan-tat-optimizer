"""
config.py
---------
Central configuration for the Loan TAT Optimizer project.
Update DATA_DIR if your folder structure is different.
"""

import os

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, "data")
ML_DIR    = os.path.join(BASE_DIR, "ml")
RL_DIR    = os.path.join(BASE_DIR, "rl")

RAW_DATA_PATH     = os.path.join(DATA_DIR, "synthetic_loan_dataset.csv")
ML_READY_PATH     = os.path.join(DATA_DIR, "loan_data_ml_ready.csv")

MODEL_SAVE_PATH   = os.path.join(ML_DIR, "delay_predictor.joblib")
SCALER_SAVE_PATH  = os.path.join(ML_DIR, "scaler.joblib")
PPO_SAVE_PATH     = os.path.join(RL_DIR, "ppo_v2_ml_integrated")

# ── ML Settings ────────────────────────────────────────────────────────
TEST_SIZE         = 0.2
RANDOM_STATE      = 42
TARGET_COL        = "delay_risk"

# Columns to drop before training (IDs / dates)
DROP_COLS         = ["app_id", "application_date"]

# ── RL Settings ────────────────────────────────────────────────────────
MAX_EPISODE_DAYS  = 30
SLA_THRESHOLD     = 18      # days beyond which SLA breach penalty kicks in
N_ENVS            = 4       # parallel environments for PPO training
TOTAL_TIMESTEPS   = 100_000

# ── Action map ─────────────────────────────────────────────────────────
ACTION_NAMES = {
    0: "Wait",
    1: "Fast-track",
    2: "Reassign Officer",
    3: "Request Documents",
    4: "Escalate Priority",
}

# ── Risk map ───────────────────────────────────────────────────────────
RISK_LABELS = {0: "Low", 1: "Medium", 2: "High"}

# ── Stage map ──────────────────────────────────────────────────────────
STAGE_NAMES = {
    1: "Application Intake",
    2: "KYC & Document Verification",
    3: "Credit Appraisal",
    4: "Collateral Evaluation",
    5: "Underwriting",
    6: "Credit Decision & Sanction",
    7: "Agreement Execution",
    8: "Disbursement",
}
