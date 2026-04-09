import time
from collections import defaultdict
from config import SLA_THRESHOLD

SLA_ALERT_THRESHOLDS = {0: 15, 1: 10, 2: 5}

class MonitoringAgent:
    def __init__(self, verbose=True):
        self.name    = "MonitoringAgent"
        self.verbose = verbose
        self.reset()

    def reset(self):
        self.history       = []
        self.action_counts = defaultdict(int)
        self.risk_counts   = defaultdict(int)
        self.sla_alerts    = []
        self.total_loans   = 0

    def run(self, app_id, risk_report, action_report, pending_days, current_stage):
        risk_int    = risk_report["risk_int"]
        risk_level  = risk_report["risk_level"]
        action_name = action_report["action_name"]

        self.total_loans += 1
        self.action_counts[action_name] += 1
        self.risk_counts[risk_level]    += 1

        record = {
            "app_id"      : app_id,
            "timestamp"   : time.strftime("%Y-%m-%d %H:%M:%S"),
            "stage"       : current_stage,
            "risk_level"  : risk_level,
            "risk_int"    : risk_int,
            "action"      : action_name,
            "pending_days": pending_days,
            "sla_alert"   : False,
            "alerts"      : [],
        }

        threshold = SLA_ALERT_THRESHOLDS.get(risk_int, SLA_THRESHOLD)
        if pending_days >= threshold:
            msg = f"SLA ALERT: App {app_id} pending {pending_days}d (threshold for {risk_level} risk = {threshold}d)"
            record["sla_alert"] = True
            record["alerts"].append(msg)
            self.sla_alerts.append(msg)

        for flag in risk_report.get("special_flags", []):
            record["alerts"].append(f"FLAG ALERT: App {app_id} has active flag: {flag}")

        self.history.append(record)

        if self.verbose:
            alert_str = " [SLA ALERT]" if record["sla_alert"] else ""
            print(f"\n[{self.name}] App {app_id}{alert_str}")
            print(f"  Risk: {risk_level}  |  Action: {action_name}  |  Pending: {pending_days}d")
            for a in record["alerts"]:
                print(f"  *** {a}")

        return record

    def summary(self):
        if self.total_loans == 0:
            return {"message": "No loans processed yet."}

        sla_rate = len(self.sla_alerts) / self.total_loans
        summary = {
            "agent"              : self.name,
            "total_loans"        : self.total_loans,
            "sla_alert_count"    : len(self.sla_alerts),
            "sla_alert_rate"     : round(sla_rate, 4),
            "action_distribution": dict(self.action_counts),
            "risk_distribution"  : dict(self.risk_counts),
        }

        if self.verbose:
            print(f"\n[{self.name}] -- SYSTEM SUMMARY --")
            print(f"  Total loans processed : {summary['total_loans']}")
            print(f"  SLA alerts raised     : {summary['sla_alert_count']}  ({sla_rate:.1%})")
            print(f"  Risk distribution     : {summary['risk_distribution']}")
            print(f"  Action distribution   : {summary['action_distribution']}")

        return summary