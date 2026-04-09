import os
import sys
import argparse
import random
import pandas as pd

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from config import RAW_DATA_PATH, MODEL_SAVE_PATH, PPO_SAVE_PATH


def run_phase1(retrain=False, eval_only=False, demo_only=False):
    ml_exists  = os.path.exists(MODEL_SAVE_PATH)
    ppo_exists = os.path.exists(PPO_SAVE_PATH + ".zip")

    if not eval_only and not demo_only:
        if retrain or not ml_exists:
            print("\n" + "-" * 60)
            print("  STEP 1 - Training ML Delay Predictor")
            print("-" * 60)
            from ml.train_model import train
            train()
        else:
            print(f"\n  [OK] ML model found. Skipping. (--retrain to force)")

    if not eval_only and not demo_only:
        if retrain or not ppo_exists:
            print("\n" + "-" * 60)
            print("  STEP 2 - Training PPO V2 Agent")
            print("-" * 60)
            from rl.train_agent import train_ppo
            train_ppo()
        else:
            print(f"\n  [OK] PPO model found. Skipping. (--retrain to force)")

    if not demo_only:
        print("\n" + "-" * 60)
        print("  STEP 3 - Evaluation: PPO vs Random Agent")
        print("-" * 60)
        from rl.evaluate import evaluate
        evaluate(n_episodes=30)

    print("\n" + "=" * 60)
    print("  STEP 4 - Phase 1 Inference Demo (5 loans)")
    print("=" * 60)

    from utils.inference import LoanAdvisor
    advisor = LoanAdvisor()
    df      = pd.read_csv(RAW_DATA_PATH)
    samples = df.sample(5, random_state=42)

    for i, (_, row) in enumerate(samples.iterrows(), 1):
        stage   = random.randint(1, 6)
        pending = random.randint(0, 12)
        result  = advisor.recommend(row, current_stage=stage, pending_days=pending)
        print(f"\n  Loan {i}")
        print("  " + "-" * 56)
        for k, v in result.items():
            if isinstance(v, dict):
                print(f"  {k:<22}:")
                for rk, rv in v.items():
                    print(f"      {rk:<10} {rv}")
            else:
                print(f"  {k:<22}: {v}")

    print("\n" + "=" * 60)
    print("  Phase 1 complete [OK]")
    print("=" * 60)


def run_phase2():
    print("\n" + "=" * 60)
    print("  PHASE 2 - Agentic AI Layer")
    print("=" * 60)

    from agents.orchestrator import Orchestrator

    orch = Orchestrator(verbose=True)
    df   = pd.read_csv(RAW_DATA_PATH)

    print("\n" + "-" * 60)
    print("  DEMO 1 - Individual Loan Processing (5 loans)")
    print("-" * 60)
    samples = df.sample(5, random_state=99)
    for _, row in samples.iterrows():
        orch.process(row, current_stage=random.randint(1, 6), pending_days=random.randint(0, 15))

    print("\n" + "-" * 60)
    print("  DEMO 2 - Batch Processing (10 loans)")
    print("-" * 60)
    batch_orch = Orchestrator(verbose=False)
    results = []
    for _, row in df.sample(10, random_state=7).iterrows():
        r = batch_orch.process(row, current_stage=random.randint(1, 6), pending_days=random.randint(0, 20))
        results.append(r)

    print(f"\n  {'App ID':<8} {'Stage':<32} {'Risk':<8} {'Action':<22} {'SLA Alert'}")
    print("  " + "-" * 80)
    for r in results:
        sla    = "*** YES ***" if (r["monitor_report"] and r["monitor_report"].get("sla_alert")) else "No"
        risk   = r["risk_report"]["risk_level"] if r["risk_report"]  else "N/A"
        action = r["final_action"]              if r["final_action"] else "BLOCKED"
        print(f"  {r['app_id']:<8} {r['current_stage']:<32} {risk:<8} {action:<22} {sla}")

    print("\n" + "-" * 60)
    print("  DEMO 3 - System Monitoring Summary")
    print("-" * 60)
    batch_orch.get_system_summary()

    print("\n" + "-" * 60)
    print("  DEMO 4 - Edge Case: Fraud Flag + Incomplete Docs")
    print("-" * 60)
    bad_row = df.sample(1, random_state=5).iloc[0].copy()
    bad_row["fraud_flag"]       = 1
    bad_row["doc_complete_pct"] = 45
    orch.process(bad_row, current_stage=2, pending_days=3)

    print("\n" + "=" * 60)
    print("  Phase 2 complete [OK]")
    print("  Next -> Phase 3: RAG Explainability")
    print("=" * 60)

def run_phase3():
    print("\n" + "=" * 60)
    print("  PHASE 3 - RAG Explainability")
    print("=" * 60)

    import pandas as pd
    from agents.orchestrator import Orchestrator
    from rag.explainer import RAGExplainer

    orch      = Orchestrator(verbose=False)
    explainer = RAGExplainer()
    df        = pd.read_csv(RAW_DATA_PATH)

    print("\n" + "-" * 60)
    print("  DEMO 1 - Explained Recommendations (5 loans)")
    print("-" * 60)

    samples = df.sample(5, random_state=55)
    for _, row in samples.iterrows():
        import random
        stage   = random.randint(1, 6)
        pending = random.randint(0, 15)

        result = orch.process(row, current_stage=stage, pending_days=pending)

        if result["pipeline_status"] != "success":
            print(f"\n  Loan {row['app_id']} — BLOCKED: {result['blocked_reason']}")
            continue

        explanation = explainer.explain(
            action_name   = result["final_action"],
            risk_report   = result["risk_report"],
            pending_days  = pending,
            current_stage = stage
        )

        print(f"\n  Loan {row['app_id']}")
        print("  " + "-" * 56)
        print(f"  Stage          : {result['current_stage']}")
        print(f"  Risk           : {result['risk_report']['risk_level']}  ({result['risk_report']['confidence']:.1%} confidence)")
        print(f"  Action         : {result['final_action']}")
        print(f"  Policy Applied : [{explanation['policy_id']}] {explanation['policy_category']}")
        print(f"  Explanation    :")
        for line in explanation['explanation'].split("\n"):
            print(f"      {line}")

    print("\n" + "-" * 60)
    print("  DEMO 2 - Policy Coverage by Action Type")
    print("-" * 60)

    from rag.knowledge_base import POLICIES
    from collections import Counter
    action_counts = Counter(p["action"] for p in POLICIES)
    for action, count in sorted(action_counts.items()):
        print(f"  {action:<25} : {count} policies")

    print("\n" + "=" * 60)
    print("  Phase 3 complete [OK]")
    print("  Next -> Phase 4: Streamlit Dashboard")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--retrain",     action="store_true")
    parser.add_argument("--eval-only",   action="store_true")
    parser.add_argument("--demo-only",   action="store_true")
    parser.add_argument("--phase1-only", action="store_true")
    parser.add_argument("--phase2-only", action="store_true")
    parser.add_argument("--phase3-only", action="store_true")
    args = parser.parse_args()

    if args.phase3_only:
        run_phase3()
    elif args.phase2_only:
        run_phase2()
    elif args.phase1_only:
        run_phase1(args.retrain, args.eval_only, args.demo_only)
    else:
        run_phase1(args.retrain, args.eval_only, args.demo_only)
        run_phase2()
        run_phase3()

if __name__ == "__main__":
    main()