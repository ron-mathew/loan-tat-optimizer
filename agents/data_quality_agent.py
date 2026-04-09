import pandas as pd

FIELD_RULES = {
    "doc_complete_pct" : (60,  100),
    "officer_load"     : (5,   30),
    "queue_position"   : (1,   20),
    "credit_score"     : (300, 900),
    "dti_ratio"        : (0,   1),
    "ltv_ratio"        : (0,   1),
    "annual_income"    : (0,   None),
    "loan_amount"      : (0,   None),
    "age"              : (18,  80),
}

REQUIRED_FIELDS = [
    "doc_complete_pct", "officer_load", "queue_position",
    "credit_score", "annual_income", "loan_amount",
    "employment_type", "risk_category"
]

class DataQualityAgent:
    def __init__(self, verbose=True):
        self.verbose = verbose
        self.name = "DataQualityAgent"

    def run(self, row):
        issues = []
        warnings = []
        row = row.copy()

        for field in REQUIRED_FIELDS:
            if field not in row.index or pd.isna(row[field]):
                issues.append(f"Missing required field: '{field}'")

        for field, (lo, hi) in FIELD_RULES.items():
            if field not in row.index or pd.isna(row[field]):
                continue
            val = float(row[field])
            if lo is not None and val < lo:
                if field == "doc_complete_pct":
                    warnings.append(f"'{field}' = {val} below minimum {lo}. Clamping.")
                    row[field] = lo
                else:
                    issues.append(f"'{field}' = {val} is below minimum {lo}.")
            if hi is not None and val > hi:
                if field == "doc_complete_pct":
                    warnings.append(f"'{field}' = {val} exceeds maximum {hi}. Clamping.")
                    row[field] = hi
                else:
                    issues.append(f"'{field}' = {val} exceeds maximum {hi}.")

        try:
            ratio = float(row["loan_amount"]) / float(row["annual_income"])
            if ratio > 10:
                warnings.append(f"Loan-to-income ratio very high ({ratio:.1f}x). Flagged.")
        except:
            pass

        try:
            if int(row.get("fraud_flag", 0)) == 1:
                issues.append("Fraud flag is set. Loan must not be auto-processed.")
        except:
            pass

        try:
            if int(row.get("aml_flag", 0)) == 1:
                issues.append("AML flag is set. Compliance review required.")
        except:
            pass

        passed = len(issues) == 0
        report = {
            "agent"      : self.name,
            "passed"     : passed,
            "issues"     : issues,
            "warnings"   : warnings,
            "cleaned_row": row,
        }

        if self.verbose:
            status = "PASSED" if passed else "FAILED"
            print(f"\n[{self.name}] Status: {status}")
            for i in issues:
                print(f"  [ISSUE]   {i}")
            for w in warnings:
                print(f"  [WARNING] {w}")
            if passed and not warnings:
                print("  No issues found. Data is clean.")

        return report