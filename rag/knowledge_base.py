# rag/knowledge_base.py
# Contains all banking policies and SLA rules
# This is the knowledge base that RAG searches through

POLICIES = [
    {
        "id": "SLA-001",
        "category": "SLA",
        "action": "Fast-track",
        "text": "Per SLA Policy SLA-001: Any loan with High delay risk pending more than 5 days must be immediately fast-tracked to prevent SLA breach. Fast-tracking reduces queue position and accelerates stage progression."
    },
    {
        "id": "SLA-002",
        "category": "SLA",
        "action": "Fast-track",
        "text": "Per SLA Policy SLA-002: Medium risk loans pending more than 10 days must be fast-tracked. Prolonged pending time at any stage increases overall turnaround time and risks SLA violation."
    },
    {
        "id": "SLA-003",
        "category": "SLA",
        "action": "Escalate Priority",
        "text": "Per SLA Policy SLA-003: High risk loans that have stalled at any stage beyond the threshold must be escalated to senior processing. Escalation overrides normal queue order and forces immediate stage progression."
    },
    {
        "id": "WF-001",
        "category": "Workflow",
        "action": "Reassign Officer",
        "text": "Per Workflow Policy WF-001: Mandatory officer reassignment is triggered when assigned officer workload exceeds 22 active cases. High officer workload above 22 is a primary cause of processing delays and must be resolved through immediate reassignment."
    },
    {
        "id": "WF-002",
        "category": "Workflow",
        "action": "Reassign Officer",
        "text": "Per Workflow Policy WF-002: Officer reassignment must be initiated when workload is high and loan risk is Medium or High. Reassignment to an officer with lower workload reduces average pending time by up to 40%."
    },
    {
        "id": "DOC-001",
        "category": "Documentation",
        "action": "Request Documents",
        "text": "Per Documentation Policy DOC-001: Loans with document completeness below 70% cannot proceed to Credit Appraisal stage. Document collection must be initiated immediately to avoid downstream delays."
    },
    {
        "id": "DOC-002",
        "category": "Documentation",
        "action": "Request Documents",
        "text": "Per Documentation Policy DOC-002: Critically incomplete documentation (below 65%) is the single largest cause of loan processing delays. Immediate document request is mandatory before any other action is taken."
    },
    {
        "id": "ESC-001",
        "category": "Escalation",
        "action": "Escalate Priority",
        "text": "Per Escalation Policy ESC-001: Loans with past default on record or policy deviation flag must be escalated to senior underwriting for manual review. Past default and policy deviation are critical risk factors that require human intervention beyond standard processing."
    },
    {
        "id": "ESC-002",
        "category": "Escalation",
        "action": "Escalate Priority",
        "text": "Per Escalation Policy ESC-002: When ML-predicted delay risk is High with confidence above 80%, escalation to priority queue is recommended to prevent downstream bottlenecks across all remaining stages."
    },
    {
        "id": "WAIT-001",
        "category": "Standard Processing",
        "action": "Wait",
        "text": "Per Standard Processing Policy WAIT-001: Low risk loans with pending time within acceptable thresholds should follow normal processing order. Unnecessary intervention in low-risk cases wastes operational resources."
    },
    {
        "id": "WAIT-002",
        "category": "Standard Processing",
        "action": "Wait",
        "text": "Per Compliance Policy WAIT-002: Loans with active fraud or AML flags must be held for manual compliance review. No automated action should be taken until the flag is cleared by the compliance team."
    },
    {
        "id": "CRED-001",
        "category": "Credit",
        "action": "Escalate Priority",
        "text": "Per Credit Policy CRED-001: Applicants with credit score below 600 or past default on record require senior credit officer review. Standard processing timelines do not apply to these high-risk applicants."
    },
    {
        "id": "QUEUE-001",
        "category": "Queue Management",
        "action": "Fast-track",
        "text": "Per Queue Management Policy QUEUE-001: Loans in queue position above 15 face significant processing delays due to backlog. Fast-tracking moves the loan ahead in queue and reduces expected wait time substantially."
    },
]