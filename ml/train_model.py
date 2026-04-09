"""
ml/train_model.py
-----------------
Trains the ML delay-risk predictor on loan_data_ml_ready.csv.
Uses CalibratedClassifierCV to fix overconfident probabilities.

Run:
    python ml/train_model.py
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
import joblib

from sklearn.linear_model      import LogisticRegression
from sklearn.calibration       import CalibratedClassifierCV
from sklearn.preprocessing     import StandardScaler, LabelEncoder
from sklearn.model_selection   import train_test_split, cross_val_score
from sklearn.metrics           import accuracy_score, classification_report

from config import (
    RAW_DATA_PATH, ML_READY_PATH,
    MODEL_SAVE_PATH, SCALER_SAVE_PATH,
    TARGET_COL, DROP_COLS,
    TEST_SIZE, RANDOM_STATE, ML_DIR
)


# ───────────────────────────────────────────────
# 1. Load raw dataset
# ───────────────────────────────────────────────
def load_and_prepare():
    print("Loading raw dataset...")
    df = pd.read_csv(RAW_DATA_PATH)

    drop = [c for c in DROP_COLS + ["application_date", "total_tat",
                                     "sla_breach", "agreement_days",
                                     "disbursement_days"]
            if c in df.columns]
    df = df.drop(columns=drop)

    cat_cols = df.select_dtypes(include="object").columns.tolist()
    cat_cols = [c for c in cat_cols if c != TARGET_COL]

    le_map = {}
    for col in cat_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        le_map[col] = le

    target_le = LabelEncoder()
    df[TARGET_COL] = target_le.fit_transform(df[TARGET_COL])
    print(f"  Target classes: {list(target_le.classes_)}  →  {list(range(len(target_le.classes_)))}")

    # Enforce correct order: Low=0, Medium=1, High=2
    # LabelEncoder sorts alphabetically: High=0, Low=1, Medium=2 — wrong!
    # We remap to the correct order here.
    correct_order = ["Low", "Medium", "High"]
    old_order = list(target_le.classes_)
    if old_order != correct_order:
        remap = {old_order.index(c): i for i, c in enumerate(correct_order)}
        df[TARGET_COL] = df[TARGET_COL].map(remap)
        target_le.classes_ = np.array(correct_order)
        print(f"  Remapped to: Low=0, Medium=1, High=2")

    return df, target_le, le_map


# ───────────────────────────────────────────────
# 2. Train with calibration
# ───────────────────────────────────────────────
def train():
    df, target_le, le_map = load_and_prepare()

    X = df.drop(columns=[TARGET_COL])
    y = df[TARGET_COL]

    feature_cols = X.columns.tolist()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    print("\nTraining Logistic Regression with probability calibration...")

    # Base model
    base_model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)

    # Wrap with isotonic calibration — fixes overconfident probabilities
    # cv=5 means it uses 5-fold cross-validation internally to fit the calibrator
    model = CalibratedClassifierCV(base_model, method="isotonic", cv=5)
    model.fit(X_train_scaled, y_train)

    # Metrics
    train_acc = model.score(X_train_scaled, y_train)
    test_acc  = accuracy_score(y_test, model.predict(X_test_scaled))

    print(f"\n  Train Accuracy : {train_acc:.4f}")
    print(f"  Test  Accuracy : {test_acc:.4f}")
    print("\n  Classification Report (Test Set):")
    print(classification_report(
        y_test, model.predict(X_test_scaled),
        target_names=target_le.classes_
    ))

    # Show sample probabilities to verify calibration worked
    print("\n  Sample probability outputs (first 5 test rows):")
    sample_probs = model.predict_proba(X_test_scaled[:5])
    for i, p in enumerate(sample_probs):
        pred_label = target_le.classes_[model.predict(X_test_scaled[i:i+1])[0]]
        print(f"    Row {i}: Low={p[0]:.2f}  Medium={p[1]:.2f}  High={p[2]:.2f}  → Predicted: {pred_label}")

    # ── Save artifacts ──
    os.makedirs(ML_DIR, exist_ok=True)
    joblib.dump(
        {"model": model, "scaler": scaler,
         "feature_cols": feature_cols, "target_le": target_le,
         "le_map": le_map},
        MODEL_SAVE_PATH
    )
    print(f"\n  ✅ Calibrated model saved → {MODEL_SAVE_PATH}")

    return model, scaler, feature_cols, target_le


if __name__ == "__main__":
    train()