"""
utils/inference.py
------------------
End-to-end single-loan recommendation pipeline.

    ML predicts risk  →  RL selects action  →  returns structured result

Usage:
    from utils.inference import LoanAdvisor
    advisor = LoanAdvisor()
    result  = advisor.recommend(row, current_stage=3, pending_days=5)
    print(result)
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd

from stable_baselines3 import PPO

from ml.predictor   import DelayPredictor
from rl.environment import LoanSanctionEnvV2
from config import (
    RAW_DATA_PATH, PPO_SAVE_PATH,
    ACTION_NAMES, RISK_LABELS, STAGE_NAMES
)

# Plain-language reasons (Phase 3 RAG will replace these)
_REASONS = {
    0: "No immediate bottleneck; loan can proceed normally.",
    1: "Elevated pending time detected; fast-tracking reduces SLA breach risk.",
    2: "Officer workload is high; reassignment will improve throughput.",
    3: "Document completeness is low; requesting documents will unblock processing.",
    4: "High delay risk and/or stage stall detected; escalation moves the loan forward immediately.",
}


class LoanAdvisor:
    """
    Loads trained ML + RL artifacts and provides per-loan recommendations.
    """

    def __init__(self,
                 model_path: str = PPO_SAVE_PATH,
                 data_path:  str = RAW_DATA_PATH):

        self.predictor = DelayPredictor()

        # Build a dummy env just to satisfy PPO.load()
        df      = pd.read_csv(data_path)
        dummy   = LoanSanctionEnvV2(df, self.predictor.predict)

        ppo_path = model_path + ".zip"
        if not os.path.exists(ppo_path):
            raise FileNotFoundError(
                f"PPO model not found at {ppo_path}.\n"
                "Run  python rl/train_agent.py  first."
            )

        self.ppo = PPO.load(model_path, env=dummy)
        print("LoanAdvisor ready  ✅")

    # ------------------------------------------------------------------
    def recommend(self,
                  row:           pd.Series,
                  current_stage: int = 1,
                  pending_days:  int = 0) -> dict:
        """
        Parameters
        ----------
        row           : raw loan row (pd.Series from synthetic_loan_dataset.csv)
        current_stage : workflow stage 1–8
        pending_days  : days the loan has been sitting at current stage

        Returns
        -------
        dict with keys: App ID, Stage, ML Risk, Risk Probability,
                        Recommended Action, Reason
        """
        ml_risk = self.predictor.predict(row)
        proba   = self.predictor.predict_proba(row)

        docs  = float(row["doc_complete_pct"])
        load  = int(row["officer_load"])
        queue = int(row["queue_position"])

        state = np.array(
            [current_stage, pending_days, ml_risk, docs, load, queue],
            dtype=np.float32
        )

        action, _ = self.ppo.predict(state, deterministic=True)
        action    = int(action)

        return {
            "App ID"              : row.get("app_id", "N/A"),
            "Current Stage"       : STAGE_NAMES.get(current_stage, current_stage),
            "ML Risk Level"       : RISK_LABELS[ml_risk],
            "Risk Probabilities"  : {
                RISK_LABELS[i]: f"{p:.1%}" for i, p in enumerate(proba)
            },
            "Recommended Action"  : ACTION_NAMES[action],
            "Reason"              : _REASONS[action],
            "Officer Load"        : load,
            "Doc Completeness"    : f"{docs:.0f}%",
            "Pending Days"        : pending_days,
        }
