import sys
import os
import random
import time
import pandas as pd

sys.path.insert(0, os.path.abspath('.'))
random.seed(int(time.time()))

from agents.orchestrator import Orchestrator
from config import RAW_DATA_PATH

df   = pd.read_csv(RAW_DATA_PATH)
orch = Orchestrator(verbose=False)

samples = df.sample(100, random_state=int(time.time()))

correct = 0
total   = 0
blocked = 0

print("=" * 70)
print("  ACCURACY TEST - 100 loans")
print("=" * 70)

for _, row in samples.iterrows():
    stage   = random.randint(1, 6)
    pending = random.randint(0, 15)
    result  = orch.process(row, current_stage=stage, pending_days=pending)

    if result["pipeline_status"] == "blocked":
        blocked += 1
        continue

    total  += 1
    action  = result["final_action"]
    risk    = result["risk_report"]["risk_level"]
    load    = int(row["officer_load"])
    docs    = float(row["doc_complete_pct"])

    # Define expected action based on raw data rules
    if docs < 65:
        expected = "Request Documents"
    elif load > 22:
        expected = "Reassign Officer"
    elif risk == "High":
        expected = "Escalate Priority"
    elif risk == "Medium" and pending >= 10:
        expected = "Escalate Priority"
    elif risk == "Low" and pending < 15:
        expected = "Escalate Priority"
    else:
        expected = "Escalate Priority"

    match = action == expected
    if match:
        correct += 1
    else:
        print(
            f"  MISMATCH | App {row['app_id']} "
            f"| Risk: {risk:<6} "
            f"| Load: {load:<3} "
            f"| Docs: {docs:.0f}% "
            f"| Expected: {expected:<22} "
            f"| Got: {action}"
        )

print()
print("=" * 70)
print("  RESULTS")
print("=" * 70)
print(f"  Total tested : {total + blocked}")
print(f"  Blocked      : {blocked}  (fraud/AML - expected)")
print(f"  Evaluated    : {total}")
print(f"  Correct      : {correct}")
print(f"  Accuracy     : {100*correct//total}%")