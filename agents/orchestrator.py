import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pandas as pd
from agents.data_quality_agent  import DataQualityAgent
from agents.risk_agent          import RiskAgent
from agents.optimization_agent  import OptimizationAgent
from agents.monitoring_agent    import MonitoringAgent
from config import PPO_SAVE_PATH, RAW_DATA_PATH, STAGE_NAMES

class Orchestrator:
    def __init__(self, verbose=True):
        self.verbose = verbose
        if verbose:
            print("\nInitializing Agentic AI Pipeline...")

        self.df = pd.read_csv(RAW_DATA_PATH)

        self.data_quality_agent = DataQualityAgent(verbose=verbose)
        self.risk_agent         = RiskAgent(verbose=verbose)
        self.monitoring_agent   = MonitoringAgent(verbose=verbose)
        self.optimization_agent = OptimizationAgent(
            ppo_path     = PPO_SAVE_PATH,
            df           = self.df,
            predictor_fn = self.risk_agent.predictor.predict
        )

        if verbose:
            print("\nAll agents initialized. Orchestrator ready.")

    def process(self, row, current_stage=1, pending_days=0):
        app_id = str(row.get("app_id", "UNKNOWN"))

        if self.verbose:
            print("\n" + "=" * 60)
            print(f"  Processing Loan: {app_id}")
            print(f"  Stage  : {STAGE_NAMES.get(current_stage, current_stage)}")
            print(f"  Pending: {pending_days} days")
            print("=" * 60)

        result = {
            "app_id"         : app_id,
            "current_stage"  : STAGE_NAMES.get(current_stage, current_stage),
            "pending_days"   : pending_days,
            "pipeline_status": "success",
            "blocked_reason" : None,
            "dq_report"      : None,
            "risk_report"    : None,
            "action_report"  : None,
            "monitor_report" : None,
            "final_action"   : None,
            "final_reason"   : None,
        }

        # Step 1: Data Quality
        try:
            dq_report = self.data_quality_agent.run(row)
            result["dq_report"] = dq_report
            if not dq_report["passed"]:
                result["pipeline_status"] = "blocked"
                result["blocked_reason"]  = "Data quality failed: " + "; ".join(dq_report["issues"])
                if self.verbose:
                    print(f"\n  PIPELINE BLOCKED: {result['blocked_reason']}")
                return result
            row = dq_report["cleaned_row"]
        except Exception as e:
            result["pipeline_status"] = "error"
            result["blocked_reason"]  = f"DataQualityAgent error: {e}"
            return result

        # Step 2: Risk
        try:
            risk_report = self.risk_agent.run(row)
            result["risk_report"] = risk_report
        except Exception as e:
            result["pipeline_status"] = "error"
            result["blocked_reason"]  = f"RiskAgent error: {e}"
            return result

        # Step 3: Optimization
        try:
            action_report = self.optimization_agent.run(row, risk_report, current_stage, pending_days)
            result["action_report"] = action_report
        except Exception as e:
            result["pipeline_status"] = "error"
            result["blocked_reason"]  = f"OptimizationAgent error: {e}"
            return result

        # Step 4: Monitoring
        try:
            monitor_report = self.monitoring_agent.run(app_id, risk_report, action_report, pending_days, current_stage)
            result["monitor_report"] = monitor_report
        except Exception as e:
            if self.verbose:
                print(f"  [MonitoringAgent] Non-critical error: {e}")

        result["final_action"] = action_report["action_name"]
        result["final_reason"] = action_report["reason"]

        if self.verbose:
            print(f"\n  FINAL RECOMMENDATION")
            print(f"  Action : {result['final_action']}")
            print(f"  Reason : {result['final_reason']}")
            if result["monitor_report"] and result["monitor_report"]["sla_alert"]:
                print(f"  *** SLA ALERT ACTIVE ***")

        return result

    def get_system_summary(self):
        return self.monitoring_agent.summary()