// src/pages/Analyze.jsx — Clean redesign
import { useState, useEffect } from "react";
import { analyzeLoan, getDatasetSample, getDatasetOptions, getLoanById } from "../api";
import {
  Card, SectionTitle, RiskBadge, ActionBadge,
  ProbBar, SLAPill, CardSkeleton, PolicyBox,
  RiskGauge,
  RISK_COLORS, ACTION_COLORS, inputStyle, btnPrimary, btnSecondary, Divider
} from "../components/UI";

const STAGES = [
  "Application Received", "Document Collection", "Credit Appraisal",
  "Risk Assessment", "Underwriting", "Legal & Technical", "Final Approval", "Disbursement"
];

export const DEFAULT_FORM = {
  app_id: "TEST001", current_stage: 1, pending_days: 3,
  credit_score: 720, applicant_age: 35, loan_amount: 500000,
  annual_income: 800000, loan_type: "Home Loan", employment_type: "Salaried",
  doc_complete_pct: 0.85, officer_load: 15, queue_position: 5,
  fraud_flag: 0, aml_flag: 0, past_default: 0,
};

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: "0.68rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
          {label}
        </label>
        {hint && <span style={{ fontSize: "0.70rem", color: "#334155", fontFamily: "monospace" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function FlagToggle({ label, checked, onChange }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
      padding: "9px 12px",
      background: checked ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${checked ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 7, transition: "all 0.15s", flex: 1,
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: 3,
        background: checked ? "#EF4444" : "transparent",
        border: `1.5px solid ${checked ? "#EF4444" : "rgba(255,255,255,0.12)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", flexShrink: 0,
      }}>
        {checked && (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5 8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />
      <span style={{ fontSize: "0.75rem", color: checked ? "#F87171" : "#64748B", fontWeight: checked ? 500 : 400 }}>
        {label}
      </span>
    </label>
  );
}

function LoanPicker({ options, value, onChange, onSelectLoan, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => { setSearch(value); }, [value]);

  const filtered = options.filter(o =>
    (category === "All" || o.delay_risk === category) &&
    (!search || search === value || String(o.app_id).toLowerCase().includes(String(search).toLowerCase()))
  ).slice(0, 50);

  const RISK_DOT = { High: "#F87171", Medium: "#FBBF24", Low: "#34D399" };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{ ...inputStyle, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "text" }}
        disabled={disabled}
        placeholder="Search application ID..."
      />

      {open && options.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#1E293B",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          zIndex: 200, overflow: "hidden",
        }}>
          <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["All", "High", "Medium", "Low"].map(c => (
              <button key={c} type="button" onMouseDown={e => { e.preventDefault(); setCategory(c); }} style={{
                flex: 1, padding: "4px 0", fontSize: "0.62rem", fontWeight: 600,
                borderRadius: 4, cursor: "pointer",
                background: category === c ? "rgba(14,165,233,0.10)" : "transparent",
                color: category === c ? "#38BDF8" : "#475569",
                border: `1px solid ${category === c ? "rgba(14,165,233,0.22)" : "transparent"}`,
                transition: "all 0.12s",
              }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", padding: "4px 0" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: "0.73rem", color: "#475569", textAlign: "center" }}>No loans found</div>
            ) : (
              filtered.map(o => (
                <div key={o.app_id} onMouseDown={e => {
                  e.preventDefault();
                  setSearch(o.app_id); onChange(o.app_id); onSelectLoan(o.app_id); setOpen(false);
                }} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.10s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "#E2E8F0", fontFamily: "monospace" }}>{o.app_id}</div>
                    <div style={{ fontSize: "0.62rem", color: "#475569", marginTop: 1 }}>{o.loan_type} · ₹{o.loan_amount?.toLocaleString("en-IN")}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: RISK_DOT[o.delay_risk] || "#64748B" }} />
                    <span style={{ fontSize: "0.60rem", color: RISK_DOT[o.delay_risk] || "#64748B", fontWeight: 500 }}>{o.delay_risk}</span>
                  </div>
                </div>
              ))
            )}
            {filtered.length === 50 && <div style={{ padding: "6px 0", textAlign: "center", fontSize: "0.60rem", color: "#2D3F55" }}>Showing top 50 results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Analyze({ role, form, setForm, result, setResult }) {
  const isOfficer = role === "officer";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loanOptions, setLoanOptions] = useState([]);

  useEffect(() => {
    getDatasetOptions().then(d => setLoanOptions(d.options || [])).catch(() => { });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSelectLoan = async (appId) => {
    if (!appId) return;
    try {
      const l = await getLoanById(appId);
      const num = (v, fallback) => { const n = parseFloat(v); return isNaN(n) ? fallback : n; };
      const docRaw = num(l.doc_complete_pct, 85);
      setForm({
        app_id: String(l.app_id || appId),
        current_stage: Math.min(8, Math.max(1, Math.round(num(l.current_stage, Math.ceil(Math.random() * 8))))),
        pending_days: Math.max(0, Math.round(num(l.pending_days, Math.floor(Math.random() * 15)))),
        credit_score: Math.min(900, Math.max(300, Math.round(num(l.credit_score, 700)))),
        applicant_age: Math.min(80, Math.max(18, Math.round(num(l.applicant_age || l.age, 35)))),
        loan_amount: Math.max(1, num(l.loan_amount, 500000)),
        annual_income: Math.max(1, num(l.annual_income, 700000)),
        loan_type: String(l.loan_type || "Home Loan"),
        employment_type: String(l.employment_type || "Salaried"),
        doc_complete_pct: docRaw > 1 ? docRaw / 100 : docRaw,
        officer_load: Math.min(35, Math.max(1, Math.round(num(l.officer_load, 15)))),
        queue_position: Math.min(20, Math.max(1, Math.round(num(l.queue_position, 5)))),
        fraud_flag: l.fraud_flag ? 1 : 0, aml_flag: l.aml_flag ? 1 : 0, past_default: l.past_default ? 1 : 0,
      });
      setResult(null); setError(null);
    } catch { setError("Could not load loan details."); }
  };

  const handleRandom = async () => {
    try {
      const data = await getDatasetSample(1);
      if (data.loans?.length) {
        const l = data.loans[0];
        const num = (v, fallback) => { const n = parseFloat(v); return isNaN(n) ? fallback : n; };
        const docRaw = num(l.doc_complete_pct, 85);
        setForm({
          app_id: String(l.app_id || "RAND001"),
          current_stage: Math.min(8, Math.max(1, Math.round(num(l.current_stage, Math.ceil(Math.random() * 8))))),
          pending_days: Math.max(0, Math.round(num(l.pending_days, Math.floor(Math.random() * 15)))),
          credit_score: Math.min(900, Math.max(300, Math.round(num(l.credit_score, 700)))),
          applicant_age: Math.min(80, Math.max(18, Math.round(num(l.applicant_age || l.age, 35)))),
          loan_amount: Math.max(1, num(l.loan_amount, 500000)),
          annual_income: Math.max(1, num(l.annual_income, 700000)),
          loan_type: String(l.loan_type || "Home Loan"),
          employment_type: String(l.employment_type || "Salaried"),
          doc_complete_pct: docRaw > 1 ? docRaw / 100 : docRaw,
          officer_load: Math.min(35, Math.max(1, Math.round(num(l.officer_load, 15)))),
          queue_position: Math.min(20, Math.max(1, Math.round(num(l.queue_position, 5)))),
          fraud_flag: l.fraud_flag ? 1 : 0, aml_flag: l.aml_flag ? 1 : 0, past_default: l.past_default ? 1 : 0,
        });
        setResult(null); setError(null);
      }
    } catch { setError("Could not fetch random loan."); }
  };

  const handleSubmit = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await analyzeLoan(form);
      setResult(res);
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (Array.isArray(detail)) setError(detail.map(d => d.msg || JSON.stringify(d)).join(" · "));
      else setError(typeof detail === "string" ? detail : "Request failed.");
    } finally { setLoading(false); }
  };

  const riskColor = result ? (RISK_COLORS[result.risk_level] || RISK_COLORS.Unknown) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "290px 1fr", gap: 24, alignItems: "start" }}>

      {/* ── Left Panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "sticky", top: 20 }}>

        {isOfficer && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 8, marginBottom: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={{ fontSize: "0.73rem", color: "#818CF8", fontWeight: 400 }}>Read-only — Officer View</span>
          </div>
        )}

        <Card>
          <SectionTitle>Parameters</SectionTitle>

          {!isOfficer && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={handleRandom} style={{ ...btnSecondary, flex: 1, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
                </svg>
                Random
              </button>
              <button onClick={() => { setForm(DEFAULT_FORM); setResult(null); }} style={{ ...btnSecondary, flex: 1, fontSize: "0.75rem" }}>
                Reset
              </button>
            </div>
          )}

          <Field label="Application ID">
            {loanOptions.length > 0 ? (
              <LoanPicker options={loanOptions} value={form.app_id} onChange={val => set("app_id", val)} onSelectLoan={handleSelectLoan} disabled={false} />
            ) : (
              <input value={form.app_id} onChange={e => set("app_id", e.target.value)} style={inputStyle} />
            )}
          </Field>

          <Field label="Stage">
            <select value={form.current_stage} onChange={e => set("current_stage", +e.target.value)} style={{ ...inputStyle, ...(isOfficer ? { opacity: 0.6, cursor: "not-allowed" } : {}) }} disabled={isOfficer}>
              {STAGES.map((s, i) => <option key={i} value={i + 1}>{i + 1}. {s}</option>)}
            </select>
          </Field>

          <Field label="Pending Days" hint={`${form.pending_days}d`}>
            <input type="range" min={0} max={30} value={form.pending_days} onChange={e => set("pending_days", +e.target.value)} disabled={isOfficer} style={{ width: "100%", accentColor: "#0EA5E9", opacity: isOfficer ? 0.5 : 1 }} />
          </Field>

          <Field label="Credit Score" hint={form.credit_score}>
            <input type="range" min={300} max={900} value={form.credit_score} onChange={e => set("credit_score", +e.target.value)} disabled={isOfficer}
              style={{ width: "100%", accentColor: form.credit_score >= 700 ? "#34D399" : form.credit_score >= 550 ? "#FBBF24" : "#F87171", opacity: isOfficer ? 0.5 : 1 }} />
          </Field>

          <Field label="Doc Completeness" hint={`${(form.doc_complete_pct * 100).toFixed(0)}%`}>
            <input type="range" min={0} max={1} step={0.01} value={form.doc_complete_pct} onChange={e => set("doc_complete_pct", +e.target.value)} disabled={isOfficer}
              style={{ width: "100%", accentColor: form.doc_complete_pct >= 0.75 ? "#34D399" : "#F87171", opacity: isOfficer ? 0.5 : 1 }} />
          </Field>

          <Field label="Officer Workload" hint={`${form.officer_load} cases`}>
            <input type="range" min={1} max={35} value={form.officer_load} onChange={e => set("officer_load", +e.target.value)} disabled={isOfficer}
              style={{ width: "100%", accentColor: form.officer_load > 22 ? "#F87171" : "#0EA5E9", opacity: isOfficer ? 0.5 : 1 }} />
          </Field>

          <Divider />

          <Field label="Loan Amount (₹)">
            <input type="number" value={form.loan_amount} onChange={e => set("loan_amount", +e.target.value)} style={{ ...inputStyle, ...(isOfficer ? { opacity: 0.6 } : {}) }} disabled={isOfficer} />
          </Field>

          <Field label="Annual Income (₹)">
            <input type="number" value={form.annual_income} onChange={e => set("annual_income", +e.target.value)} style={{ ...inputStyle, ...(isOfficer ? { opacity: 0.6 } : {}) }} disabled={isOfficer} />
          </Field>

          <Divider />

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, opacity: isOfficer ? 0.5 : 1, pointerEvents: isOfficer ? "none" : "auto" }}>
            <FlagToggle label="Fraud Flag" checked={!!form.fraud_flag} onChange={e => set("fraud_flag", e.target.checked ? 1 : 0)} />
            <FlagToggle label="AML Flag" checked={!!form.aml_flag} onChange={e => set("aml_flag", e.target.checked ? 1 : 0)} />
            <FlagToggle label="Past Default" checked={!!form.past_default} onChange={e => set("past_default", e.target.checked ? 1 : 0)} />
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{
            ...btnPrimary, width: "100%", padding: "10px 0",
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}>
            {loading ? (
              <>
                <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Analyzing...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Run Analysis
              </>
            )}
          </button>

          {error && (
            <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 7, fontSize: "0.75rem", color: "#F87171", lineHeight: 1.5 }}>
              {error}
            </div>
          )}
        </Card>
      </div>

      {/* ── Right Panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Empty state */}
        {!loading && !result && (
          <Card style={{ textAlign: "center", padding: "64px 40px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24, opacity: 0.4 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" />
              </svg>
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#CBD5E1", marginBottom: 8, letterSpacing: "-0.01em" }}>
              Ready to Analyze
            </div>
            <div style={{ fontSize: "0.82rem", color: "#475569", maxWidth: 280, margin: "0 auto", lineHeight: 1.7 }}>
              Configure parameters and click <span style={{ color: "#38BDF8", fontWeight: 500 }}>Run Analysis</span>
            </div>
          </Card>
        )}

        {/* Skeletons */}
        {loading && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              <CardSkeleton rows={2} /><CardSkeleton rows={2} /><CardSkeleton rows={2} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <CardSkeleton rows={4} /><CardSkeleton rows={4} />
            </div>
            <CardSkeleton rows={3} />
          </>
        )}

        {result && !loading && (
          <>
            {/* Blocked */}
            {result.pipeline_status === "blocked" && (
              <div style={{ padding: "12px 16px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 8, color: "#F87171", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                <div><strong>Pipeline Blocked</strong> — {result.blocked_reason}</div>
              </div>
            )}

            {/* Top row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              <Card>
                <SectionTitle>Risk Assessment</SectionTitle>
                <RiskGauge
                  score={result.risk_score ?? ((result.probabilities?.Medium || 0) * 50 + (result.probabilities?.High || 0) * 100)}
                  level={result.risk_level}
                />
              </Card>

              <Card>
                <SectionTitle>Recommended Action</SectionTitle>
                <div style={{ marginBottom: 12 }}>
                  <ActionBadge action={result.action} large />
                </div>
                <div style={{ fontSize: "0.68rem", color: "#334155", fontFamily: "monospace", padding: "3px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 4, display: "inline-block" }}>
                  {result.action_source}
                </div>
              </Card>

              <Card>
                <SectionTitle>SLA Status</SectionTitle>
                <div style={{ marginBottom: 14 }}>
                  <SLAPill breached={result.sla_alert} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.72rem", color: "#475569" }}>Stage</span>
                    <span style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 500 }}>Stage {result.current_stage}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.72rem", color: "#475569" }}>Pending</span>
                    <span style={{ fontSize: "0.72rem", color: "#94A3B8", fontFamily: "monospace" }}>{result.pending_days} days</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Second row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Card>
                <SectionTitle>Probability Breakdown</SectionTitle>
                <ProbBar label="High Risk" value={result.probabilities?.High || 0} color="#F87171" />
                <ProbBar label="Medium Risk" value={result.probabilities?.Medium || 0} color="#FBBF24" />
                <ProbBar label="Low Risk" value={result.probabilities?.Low || 0} color="#34D399" />
              </Card>

              <Card>
                <SectionTitle>Risk Drivers</SectionTitle>
                {(result.risk_drivers || []).length === 0 && (result.flags || []).length === 0 ? (
                  <div style={{ fontSize: "0.78rem", color: "#334155" }}>No significant risk factors detected.</div>
                ) : (
                  <>
                    {(result.risk_drivers || []).map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 10 }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#F87171", marginTop: 6, flexShrink: 0 }} />
                        <span style={{ fontSize: "0.78rem", color: "#64748B", lineHeight: 1.6 }}>{d}</span>
                      </div>
                    ))}
                    {(result.flags || []).map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FBBF24", flexShrink: 0 }} />
                        <span style={{ fontSize: "0.78rem", color: "#FBBF24" }}>{f}</span>
                      </div>
                    ))}
                  </>
                )}
              </Card>
            </div>

            {/* Action reasoning */}
            <Card>
              <SectionTitle>Action Reasoning</SectionTitle>
              <div style={{ fontSize: "0.82rem", lineHeight: 1.8, color: "#64748B", padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 7, borderLeft: "2px solid rgba(14,165,233,0.3)" }}>
                {result.action_reason}
              </div>
            </Card>

            {/* Policy */}
            <Card>
              <SectionTitle>Policy Citation (RAG)</SectionTitle>
              <PolicyBox
                policyId={result.policy_id}
                policyText={result.policy_text}
                explanation={result.policy_explanation}
                relevanceScore={result.rag_relevance_score}
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
