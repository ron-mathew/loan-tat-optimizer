import pandas as pd
from ml.predictor import DelayPredictor

# If ANY of these conditions are true, risk is upgraded to at least this level
# Format: (condition_fn, minimum_risk_int, reason)
RISK_OVERRIDE_RULES = [
    # Credit score below 450 → High (checked first, most severe)
    (lambda row: float(row.get("credit_score", 999)) < 450,        2, "Credit score critically low (< 450)"),
    # Credit score 450–550 → at least Medium (only if not already caught above)
    (lambda row: 450 <= float(row.get("credit_score", 999)) < 550, 1, "Credit score critically low (< 550)"),
    # Past default → at least Medium
    (lambda row: int(row.get("past_default", 0)) == 1,             1, "Past default on record"),
    # Fraud / AML → High
    (lambda row: int(row.get("fraud_flag", 0)) == 1,               2, "Fraud flag active"),
    (lambda row: int(row.get("aml_flag", 0)) == 1,                 2, "AML flag active"),
    # DTI above 0.6 → at least Medium
    (lambda row: float(row.get("dti_ratio", 0)) > 0.6,             1, "Debt-to-income ratio critically high (> 0.6)"),
    # Docs below 50% → at least Medium
    (lambda row: float(row.get("doc_complete_pct", 100)) < 50,     1, "Document completeness critically low (< 50%)"),
    # Loan-to-income ratio above 100x → High (checked first, most severe)
    (lambda row: float(row.get("annual_income", 1)) > 0 and
                 float(row.get("loan_amount", 0)) / float(row.get("annual_income", 1)) > 100,
                 2, "Extreme loan-to-income ratio (> 100x)"),
    # Loan-to-income ratio 20x–100x → at least Medium
    (lambda row: float(row.get("annual_income", 1)) > 0 and
                 20 < float(row.get("loan_amount", 0)) / float(row.get("annual_income", 1)) <= 100,
                 1, "Extreme loan-to-income ratio (> 20x)"),
]

class RiskAgent:
    def __init__(self, verbose=True):
        self.predictor = DelayPredictor()
        self.verbose = verbose
        self.name = "RiskAgent"

    def run(self, row):
        risk_int = self.predictor.predict(row)
        proba    = self.predictor.predict_proba(row)

        risk_labels = {0: "Low", 1: "Medium", 2: "High"}

        # ── Apply override rules ──────────────────────────────────────────
        override_reasons = []
        for condition, min_risk, reason in RISK_OVERRIDE_RULES:
            try:
                if condition(row) and risk_int < min_risk:
                    risk_int = min_risk
                    override_reasons.append(reason)
            except:
                continue

        risk_level = risk_labels[risk_int]
        confidence = float(proba[risk_int])

        probabilities = {
            "Low"    : round(float(proba[0]), 4),
            "Medium" : round(float(proba[1]), 4),
            "High"   : round(float(proba[2]), 4),
        }

        # If ML was overridden, adjust probabilities to reflect the new risk level
        # so the probability bars don't contradict the displayed risk level
        if override_reasons:
            if risk_int == 2:   # High
                probabilities = {"Low": 0.0, "Medium": 0.10, "High": 0.90}
            elif risk_int == 1: # Medium
                probabilities = {"Low": 0.10, "Medium": 0.80, "High": 0.10}
            confidence = probabilities[risk_level]

        # ── Composite risk score (0–100) ──────────────────────────────────
        # Formula: P(Medium)*50 + P(High)*100
        risk_score = round(probabilities["Medium"] * 50.0 + probabilities["High"] * 100.0, 2)

        # ── Risk drivers ──────────────────────────────────────────────────
        risk_drivers  = []
        special_flags = []

        # Add override reasons first (most critical)
        for r in override_reasons:
            risk_drivers.append(f"⚠ Override: {r}")

        try:
            if float(row.get("doc_complete_pct", 100)) < 75:
                risk_drivers.append(f"Incomplete documents ({row['doc_complete_pct']:.0f}%)")
        except: pass
        try:
            if int(row.get("officer_load", 0)) > 22:
                risk_drivers.append(f"High officer workload ({row['officer_load']})")
        except: pass
        try:
            if int(row.get("queue_position", 0)) > 15:
                risk_drivers.append(f"Long queue position ({row['queue_position']})")
        except: pass
        try:
            if float(row.get("dti_ratio", 0)) > 0.5:
                risk_drivers.append(f"High debt-to-income ratio ({row['dti_ratio']:.2f})")
        except: pass
        try:
            cs = float(row.get("credit_score", 999))
            # Only add regular driver if override didn't already flag credit score
            credit_overridden = any("Credit score" in r for r in override_reasons)
            if cs < 600 and not credit_overridden:
                risk_drivers.append(f"Low credit score ({cs:.0f})")
        except: pass
        try:
            if int(row.get("past_default", 0)) == 1:
                default_overridden = any("Past default" in r for r in override_reasons)
                if not default_overridden:
                    risk_drivers.append("Past default on record")
                special_flags.append("PAST_DEFAULT")
        except: pass
        try:
            if int(row.get("policy_deviation", 0)) == 1:
                risk_drivers.append("Policy deviation detected")
                special_flags.append("POLICY_DEVIATION")
        except: pass

        if not risk_drivers:
            risk_drivers.append("No major individual risk drivers identified")

        report = {
            "agent"        : self.name,
            "risk_level"   : risk_level,
            "risk_int"     : risk_int,
            "risk_score"   : risk_score,
            "confidence"   : round(confidence, 4),
            "probabilities": probabilities,
            "risk_drivers" : risk_drivers,
            "special_flags": special_flags,
            "ml_overridden": len(override_reasons) > 0,
        }

        if self.verbose:
            print(f"\n[{self.name}]")
            print(f"  Risk Level   : {risk_level}  (score: {risk_score:.1f}%  confidence: {confidence:.1%})")

            if override_reasons:
                print(f"  ML Overridden: Yes — {', '.join(override_reasons)}")
            print(f"  Probabilities: Low={probabilities['Low']:.1%}  Medium={probabilities['Medium']:.1%}  High={probabilities['High']:.1%}")
            print("  Risk Drivers :")
            for d in risk_drivers:
                print(f"    - {d}")
            if special_flags:
                print(f"  Special Flags: {', '.join(special_flags)}")

        return report