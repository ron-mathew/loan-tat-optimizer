import sys
import os
import time
import random
import pandas as pd

random.seed(int(time.time()))
pd.options.mode.chained_assignment = None

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.orchestrator import Orchestrator
from rag.explainer import RAGExplainer
from config import RAW_DATA_PATH

print("=" * 60)
print("  FULL PIPELINE TEST")
print("=" * 60)

df        = pd.read_csv(RAW_DATA_PATH)
orch      = Orchestrator(verbose=False)
explainer = RAGExplainer()

passed  = 0
failed  = 0
blocked = 0
total   = 20

# Use timestamp as seed to guarantee different loans every run
samples = df.sample(total, random_state=int(time.time())).reset_index(drop=True)

for i in range(total):
    row     = samples.iloc[i]
    stage   = random.randint(1, 6)
    pending = random.randint(0, 15)

    result = orch.process(row, current_stage=stage, pending_days=pending)

    if result["pipeline_status"] == "blocked":
        blocked += 1
        print(f"  BLOCKED  | App {row['app_id']} | Reason: {result['blocked_reason'][:50]}")
        continue

    if result["pipeline_status"] == "error":
        failed += 1
        print(f"  ERROR    | App {row['app_id']} | {result['blocked_reason']}")
        continue

    explanation = explainer.explain(
        action_name   = result["final_action"],
        risk_report   = result["risk_report"],
        pending_days  = pending,
        current_stage = stage
    )

    sla_alert = result["monitor_report"] and result["monitor_report"]["sla_alert"]

    print(
        f"  OK       | App {row['app_id']} "
        f"| Risk: {result['risk_report']['risk_level']:<6} "
        f"| Action: {result['final_action']:<22} "
        f"| Policy: {explanation['policy_id']:<8} "
        f"| SLA: {'ALERT' if sla_alert else 'OK'}"
    )
    passed += 1

print()
print("=" * 60)
print("  RESULTS")
print("=" * 60)
print(f"  Total loans tested : {total}")
print(f"  Passed             : {passed}")
print(f"  Blocked            : {blocked}  (fraud/AML flags - expected)")
print(f"  Errors             : {failed}")
print(f"  Success rate       : {100*passed//total}%")