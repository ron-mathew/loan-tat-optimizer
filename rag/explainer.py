# rag/explainer.py
# Retrieves relevant policy and generates explanation for each action

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sentence_transformers import SentenceTransformer, util
from rag.knowledge_base import POLICIES

class RAGExplainer:
    """
    Given an action and loan context, finds the most relevant
    banking policy and generates a proper explanation.
    """

    def __init__(self):
        self.name  = "RAGExplainer"
        print("Loading RAG model...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

        # Pre-encode all policy texts
        self.policy_texts     = [p["text"] for p in POLICIES]
        self.policy_encodings = self.model.encode(self.policy_texts, convert_to_tensor=True)
        print("RAG model ready.")

    def explain(self, action_name, risk_report, pending_days, current_stage):
        """
        Parameters
        ----------
        action_name   : str   e.g. "Fast-track"
        risk_report   : dict  output from RiskAgent
        pending_days  : int
        current_stage : int

        Returns
        -------
        dict with retrieved policy and full explanation
        """

        risk_level   = risk_report["risk_level"]
        confidence   = risk_report["confidence"]
        risk_drivers = risk_report["risk_drivers"]
        special_flags= risk_report.get("special_flags", [])

        # Build a query from the current loan context
        query = (
            f"Action {action_name} for loan with {risk_level} delay risk "
            f"pending {pending_days} days at stage {current_stage}. "
            f"Risk drivers: {', '.join(risk_drivers)}."
        )

        # Encode query and find most similar policy
        query_encoding = self.model.encode(query, convert_to_tensor=True)
        scores         = util.cos_sim(query_encoding, self.policy_encodings)[0]

        # Filter to policies matching the action first
        action_indices = [
            i for i, p in enumerate(POLICIES)
            if p["action"] == action_name
        ]

        if action_indices:
            best_idx   = max(action_indices, key=lambda i: scores[i].item())
        else:
            best_idx   = scores.argmax().item()

        best_policy    = POLICIES[best_idx]
        best_score     = scores[best_idx].item()

        # Build full explanation
        explanation = self._build_explanation(
            action_name, best_policy, risk_level, confidence,
            pending_days, current_stage, risk_drivers, special_flags
        )

        return {
            "action"          : action_name,
            "policy_id"       : best_policy["id"],
            "policy_category" : best_policy["category"],
            "policy_text"     : best_policy["text"],
            "relevance_score" : round(best_score, 4),
            "explanation"     : explanation,
        }

    def _build_explanation(self, action, policy, risk_level, confidence,
                           pending_days, stage, drivers, flags):
        lines = []
        lines.append(f"ACTION: {action}")
        lines.append(f"POLICY: [{policy['id']}] {policy['text']}")
        lines.append(f"CONTEXT:")
        lines.append(f"  - Delay Risk     : {risk_level} (model confidence: {confidence:.1%})")
        lines.append(f"  - Pending Days   : {pending_days}")
        lines.append(f"  - Current Stage  : {stage}")
        lines.append(f"  - Risk Drivers   : {', '.join(drivers)}")
        if flags:
            lines.append(f"  - Special Flags  : {', '.join(flags)}")
        lines.append(f"CONCLUSION: {action} was selected because {self._conclusion(action, risk_level, pending_days, drivers)}")
        return "\n".join(lines)

    def _conclusion(self, action, risk_level, pending_days, drivers):
        conclusions = {
            "Fast-track"        : f"the loan is {risk_level} risk and has been pending {pending_days} days, requiring accelerated processing to avoid SLA breach.",
            "Escalate Priority" : f"the {risk_level} risk level and specific risk factors ({', '.join(drivers[:2])}) require senior officer intervention.",
            "Reassign Officer"  : f"officer workload is high, which is a primary bottleneck causing the {risk_level} delay risk.",
            "Request Documents" : f"document completeness is critically low, blocking all downstream processing stages.",
            "Wait"              : f"the loan is {risk_level} risk and within acceptable processing thresholds. No intervention needed.",
        }
        return conclusions.get(action, "it was the optimal action selected by the RL policy.")