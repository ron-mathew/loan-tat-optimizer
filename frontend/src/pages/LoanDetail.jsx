// src/pages/LoanDetail.jsx
// Full detail view for a single loan result from batch processing
import {
  Card, SectionTitle, RiskGauge, ActionBadge, SLAPill,
  ProbBar, PolicyBox, Divider, RISK_COLORS
} from "../components/UI";

function InfoRow({ label, value, mono = false, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: "0.73rem", color: "#475569" }}>{label}</span>
      <span style={{ fontSize: "0.76rem", color: color || "#CBD5E1", fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit", fontWeight: 500 }}>{value ?? "—"}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </Card>
  );
}

export default function LoanDetail({ loan, onBack }) {
  if (!loan) return null;

  const riskColor = RISK_COLORS[loan.risk_level] || RISK_COLORS.Unknown;
  const fmt = (v) => v != null ? v : "—";
  const fmtMoney = (v) => v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
  const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Back navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 7, padding: "7px 14px", cursor: "pointer",
          fontSize: "0.78rem", color: "#94A3B8",
          transition: "background 0.15s",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Batch Results
        </button>
        <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
          Loan Detail &gt; <span style={{ fontFamily: "monospace", color: "#14B8A6", fontWeight: 600 }}>{loan.app_id}</span>
        </div>
      </div>

      {/* Top KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

        {/* Risk Gauge */}
        <Card style={{ borderColor: riskColor.border }}>
          <SectionTitle>Risk Assessment</SectionTitle>
          <RiskGauge
            score={loan.risk_score ?? ((loan.probabilities?.Medium ?? 0) * 50 + (loan.probabilities?.High ?? 0) * 100)}
            level={loan.risk_level}
          />
        </Card>

        {/* Action */}
        <Card>
          <SectionTitle>Recommended Action</SectionTitle>
          <ActionBadge action={loan.action} large />
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: "0.70rem", color: "#64748B", fontFamily: "monospace", display: "inline-block", padding: "3px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5 }}>
              {loan.action_source}
            </div>
          </div>
          <Divider />
          <div style={{ fontSize: "0.80rem", color: "#94A3B8", lineHeight: 1.7, padding: "10px 13px", background: "rgba(20,184,166,0.05)", borderRadius: 8, borderLeft: "3px solid rgba(20,184,166,0.40)", marginTop: 4 }}>
            {loan.action_reason || "No reasoning provided."}
          </div>
        </Card>

        {/* SLA + Stage */}
        <Card>
          <SectionTitle>SLA & Pipeline Status</SectionTitle>
          <SLAPill breached={loan.sla_alert} />
          <Divider />
          <InfoRow label="Stage" value={fmt(loan.current_stage)} />
          <InfoRow label="Pending Days" value={loan.pending_days != null ? `${loan.pending_days} days` : "—"} mono />
          <InfoRow label="SLA Limit" value={loan.sla_days_limit != null ? `${loan.sla_days_limit} days` : "—"} mono />
          <InfoRow label="SLA Status" value={fmt(loan.sla_status)} />
        </Card>
      </div>

      {/* Probability + Risk Drivers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Section title="Probability Breakdown">
          <ProbBar label="High Risk"   value={loan.probabilities?.High   || 0} color="#EF4444" />
          <ProbBar label="Medium Risk" value={loan.probabilities?.Medium || 0} color="#F59E0B" />
          <ProbBar label="Low Risk"    value={loan.probabilities?.Low    || 0} color="#10B981" />
        </Section>

        <Section title="Risk Drivers">
          {(loan.risk_drivers || []).length === 0 ? (
            <div style={{ fontSize: "0.82rem", color: "#475569" }}>No significant risk factors detected.</div>
          ) : (
            (loan.risk_drivers || []).map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F87171", boxShadow: "0 0 6px #F87171", marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: "0.78rem", color: "#94A3B8", lineHeight: 1.6 }}>{d}</span>
              </div>
            ))
          )}
          {(loan.flags || []).map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              <span style={{ fontSize: "0.78rem", color: "#FBBF24" }}>{f}</span>
            </div>
          ))}
        </Section>
      </div>

      {/* Input Parameters */}
      <Section title="Loan Input Parameters">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
          <div>
            <InfoRow label="Application ID" value={fmt(loan.app_id)} mono />
            <InfoRow label="Loan Type" value={fmt(loan.loan_type)} />
            <InfoRow label="Employment Type" value={fmt(loan.employment_type)} />
            <InfoRow label="Applicant Age" value={loan.applicant_age != null ? `${loan.applicant_age} yrs` : "—"} />
          </div>
          <div>
            <InfoRow label="Loan Amount" value={fmtMoney(loan.loan_amount)} mono />
            <InfoRow label="Annual Income" value={fmtMoney(loan.annual_income)} mono />
            <InfoRow label="Credit Score" value={fmt(loan.credit_score)} mono color={
              loan.credit_score >= 700 ? "#22C55E" : loan.credit_score >= 550 ? "#F59E0B" : "#EF4444"
            } />
            <InfoRow label="Doc Completeness" value={fmtPct(loan.doc_complete_pct)} mono />
          </div>
          <div>
            <InfoRow label="Officer Load" value={loan.officer_load != null ? `${loan.officer_load} cases` : "—"} mono />
            <InfoRow label="Queue Position" value={fmt(loan.queue_position)} mono />
            <InfoRow label="Fraud Flag" value={loan.fraud_flag ? "⚠ Active" : "Clear"} color={loan.fraud_flag ? "#EF4444" : "#22C55E"} />
            <InfoRow label="AML Flag" value={loan.aml_flag ? "⚠ Active" : "Clear"} color={loan.aml_flag ? "#EF4444" : "#22C55E"} />
            <InfoRow label="Past Default" value={loan.past_default ? "⚠ Yes" : "No"} color={loan.past_default ? "#EF4444" : "#22C55E"} />
          </div>
        </div>
      </Section>

      {/* RAG Policy */}
      <Section title="Policy Citation (RAG)">
        <PolicyBox
          policyId={loan.policy_id}
          policyText={loan.policy_text}
          explanation={loan.policy_explanation}
          relevanceScore={loan.rag_relevance_score}
        />
      </Section>
    </div>
  );
}
