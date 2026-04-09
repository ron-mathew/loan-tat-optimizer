import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import pandas as pd
from stable_baselines3 import PPO
from rl.environment import LoanSanctionEnvV2
from config import PPO_SAVE_PATH, ACTION_NAMES

OVERRIDE_RULES = [
    {
        "name"      : "Critical doc shortage",
        "condition" : lambda row, risk: float(row.get("doc_complete_pct", 100)) < 65,
        "action"    : 3,
        "reason"    : "Document completeness is critically low (<65%). Must request documents first."
    },
    {
        "name"      : "Fraud/AML block",
        "condition" : lambda row, risk: int(row.get("fraud_flag", 0)) == 1 or int(row.get("aml_flag", 0)) == 1,
        "action"    : 0,
        "reason"    : "Fraud or AML flag active. Loan held for manual compliance review."
    },
    {
        "name"      : "High officer workload",
        "condition" : lambda row, risk: int(row.get("officer_load", 0)) > 22,
        "action"    : 2,
        "reason"    : "Officer workload exceeds 22 active cases. Mandatory reassignment per Workflow Policy WF-001."
    },
]

class OptimizationAgent:
    def __init__(self, ppo_path, df, predictor_fn):
        self.name = "OptimizationAgent"
        dummy_env = LoanSanctionEnvV2(df, predictor_fn)
        self.ppo  = PPO.load(ppo_path, env=dummy_env)
        self.verbose = True

    def run(self, row, risk_report, current_stage=1, pending_days=0):
        risk_int = risk_report["risk_int"]
        docs     = float(row.get("doc_complete_pct", 80))
        load     = int(row.get("officer_load", 15))
        queue    = int(row.get("queue_position", 10))

        for rule in OVERRIDE_RULES:
            try:
                if rule["condition"](row, risk_int):
                    report = {
                        "agent"      : self.name,
                        "action"     : rule["action"],
                        "action_name": ACTION_NAMES[rule["action"]],
                        "source"     : f"override:{rule['name']}",
                        "reason"     : rule["reason"],
                        "state_used" : [current_stage, pending_days, risk_int, docs, load, queue],
                    }
                    if self.verbose:
                        print(f"\n[{self.name}]")
                        print(f"  Action : {report['action_name']}  (source: {report['source']})")
                        print(f"  Reason : {report['reason']}")
                    return report
            except:
                continue

        state = np.array([current_stage, pending_days, risk_int, docs, load, queue], dtype=np.float32)
        ppo_action, _ = self.ppo.predict(state, deterministic=True)
        action = int(ppo_action)

        # ── Rationality filter ───────────────────────────────────────────────
        # The PPO sometimes collapses to a single dominant action (e.g., always
        # Escalate). These rules correct clearly irrational choices while still
        # deferring to PPO for genuinely ambiguous cases.
        source = "ppo"

        if action == 4:   # PPO said Escalate Priority — check if it makes sense
            if risk_int == 0 and pending_days <= 4:
                # Low risk, fresh loan → Wait
                action, source = 0, "ppo+rationality:wait"
            elif risk_int == 0 and pending_days <= 10:
                # Low risk, moderate delay → Fast-track
                action, source = 1, "ppo+rationality:fast-track"
            elif risk_int == 1 and pending_days <= 2:
                # Medium risk but barely started → Fast-track
                action, source = 1, "ppo+rationality:fast-track"
            # High risk or long wait → keep Escalate (makes sense)
        elif action == 0:  # PPO said Wait — override if clearly urgent
            if risk_int == 2 or pending_days > 10:
                action, source = 1, "ppo+rationality:fast-track"
        # ────────────────────────────────────────────────────────────────────

        risk_labels = {0: "Low", 1: "Medium", 2: "High"}
        reasons = {
            0: f"No critical bottleneck. Risk is {risk_labels[risk_int]} with only {pending_days}d pending; waiting is acceptable.",
            1: f"Risk is {risk_labels[risk_int]} and pending days={pending_days}. Fast-tracking will reduce TAT.",
            2: f"Officer load is {load}/30. Reassigning reduces queue pressure.",
            3: f"Document completeness is {docs:.0f}%. Requesting documents unblocks processing.",
            4: f"Risk is {risk_labels[risk_int]} with {pending_days}d pending. Escalation needed to move loan forward.",
        }

        report = {
            "agent"      : self.name,
            "action"     : action,
            "action_name": ACTION_NAMES[action],
            "source"     : source,
            "reason"     : reasons.get(action, "Action selected by PPO policy."),
            "state_used" : [current_stage, pending_days, risk_int, docs, load, queue],
        }

        if self.verbose:
            print(f"\n[{self.name}]")
            print(f"  Action : {report['action_name']}  (source: {source})")
            print(f"  Reason : {report['reason']}")

        return report