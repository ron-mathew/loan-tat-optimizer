import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rag.explainer import RAGExplainer

explainer = RAGExplainer()

test_cases = [
    {
        "action"        : "Request Documents",
        "risk_report"   : {"risk_level": "High", "confidence": 0.95, "risk_drivers": ["Incomplete documents (60%)"], "special_flags": []},
        "pending_days"  : 5,
        "current_stage" : 2,
        "expected_policy": "DOC-002"
    },
    {
        "action"        : "Fast-track",
        "risk_report"   : {"risk_level": "High", "confidence": 0.98, "risk_drivers": ["Long queue position (18)"], "special_flags": []},
        "pending_days"  : 8,
        "current_stage" : 3,
        "expected_policy": "SLA-001"
    },
    {
        "action"        : "Reassign Officer",
        "risk_report"   : {"risk_level": "High", "confidence": 0.90, "risk_drivers": ["High officer workload (27)"], "special_flags": []},
        "pending_days"  : 4,
        "current_stage" : 4,
        "expected_policy": "WF-001"
    },
    {
        "action"        : "Escalate Priority",
        "risk_report"   : {"risk_level": "High", "confidence": 0.92, "risk_drivers": ["Past default on record"], "special_flags": ["PAST_DEFAULT"]},
        "pending_days"  : 6,
        "current_stage" : 3,
        "expected_policy": "ESC-001"
    },
    {
        "action"        : "Wait",
        "risk_report"   : {"risk_level": "Low", "confidence": 0.99, "risk_drivers": ["No major individual risk drivers identified"], "special_flags": []},
        "pending_days"  : 2,
        "current_stage" : 1,
        "expected_policy": "WAIT-001"
    },
]

print("RAG Policy Retrieval Test")
print("=" * 60)
correct = 0
for i, tc in enumerate(test_cases, 1):
    result  = explainer.explain(tc["action"], tc["risk_report"], tc["pending_days"], tc["current_stage"])
    match   = result["policy_id"] == tc["expected_policy"]
    correct += 1 if match else 0
    status  = "PASS" if match else "FAIL"
    print(f"  Test {i}: {tc['action']:<22} | Expected: {tc['expected_policy']} | Got: {result['policy_id']} | Score: {result['relevance_score']:.4f} | {status}")

print()
print(f"RAG Accuracy: {correct}/{len(test_cases)} ({100*correct//len(test_cases)}%)")