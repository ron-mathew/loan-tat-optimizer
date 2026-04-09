"""
ml/predictor.py
---------------
DelayPredictor — loads the saved ML model and exposes:
  predict(row)       → int  0/1/2  (Low/Medium/High class)
  predict_proba(row) → np.ndarray [P(Low), P(Medium), P(High)]
  predict_score(row) → float 0–100  (composite risk percentage)

Usage:
    from ml.predictor import DelayPredictor
    predictor = DelayPredictor()
    score = predictor.predict_score(row)  # e.g. 72.4
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
import joblib

from config import MODEL_SAVE_PATH, RISK_LABELS


class DelayPredictor:
    """
    Wraps the trained Logistic Regression model.
    Accepts a raw pandas Series (one row from synthetic_loan_dataset.csv)
    and returns an integer risk level: 0=Low, 1=Medium, 2=High.
    """

    def __init__(self, model_path: str = MODEL_SAVE_PATH):
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model not found at {model_path}.\n"
                "Run  python ml/train_model.py  first."
            )
        artifacts      = joblib.load(model_path)
        self.model     = artifacts["model"]
        self.scaler    = artifacts["scaler"]
        self.feat_cols = artifacts["feature_cols"]
        self.target_le = artifacts["target_le"]
        self.le_map    = artifacts["le_map"]

    # ------------------------------------------------------------------
    def predict(self, row: pd.Series) -> int:
        """
        Parameters
        ----------
        row : pd.Series
            One row from synthetic_loan_dataset.csv (raw, un-scaled).

        Returns
        -------
        int  →  0 (Low) / 1 (Medium) / 2 (High)
        """
        sample = {}

        for col in self.feat_cols:
            if col in row.index:
                val = row[col]
                # Encode if this column was label-encoded during training
                if col in self.le_map:
                    try:
                        val = self.le_map[col].transform([str(val)])[0]
                    except ValueError:
                        val = 0  # unseen category fallback
                sample[col] = val
            else:
                sample[col] = 0  # column not present in raw data

        sample_df     = pd.DataFrame([sample])
        sample_scaled = self.scaler.transform(sample_df)
        prediction    = self.model.predict(sample_scaled)[0]
        return int(prediction)

    # ------------------------------------------------------------------
    def predict_proba(self, row: pd.Series) -> np.ndarray:
        """Returns probability array [P(Low), P(Medium), P(High)]."""
        sample = {}
        for col in self.feat_cols:
            if col in row.index:
                val = row[col]
                if col in self.le_map:
                    try:
                        val = self.le_map[col].transform([str(val)])[0]
                    except ValueError:
                        val = 0
                sample[col] = val
            else:
                sample[col] = 0

        sample_df     = pd.DataFrame([sample])
        sample_scaled = self.scaler.transform(sample_df)
        return self.model.predict_proba(sample_scaled)[0]

    # ------------------------------------------------------------------
    def predict_score(self, row: pd.Series) -> float:
        """
        Returns a composite risk percentage in [0, 100].
        Formula: P(Medium) * 50 + P(High) * 100
        Interpretation: 0% = fully Low, 50% = fully Medium, 100% = fully High.
        """
        proba = self.predict_proba(row)
        score = proba[1] * 50.0 + proba[2] * 100.0
        return round(float(score), 2)

    # ------------------------------------------------------------------
    def risk_label(self, risk_int: int) -> str:
        return RISK_LABELS.get(risk_int, "Unknown")
