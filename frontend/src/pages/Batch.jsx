// ─────────────────────────────────────────────────────────────────────────────
// BATCH.JSX — Clean redesign
// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Batch.jsx
import { useState } from "react";
import { getDatasetSample, getDatasetRange, batchAnalyze } from "../api";
import {
  Card, SectionTitle, RiskBadge, ActionBadge, SLAPill,
  StatTile, CardSkeleton, Empty, CSSBarChart,
  inputStyle, btnPrimary, btnSecondary,
} from "../components/UI";

const RISK_COLORS = { High: "#F87171", Medium: "#FBBF24", Low: "#34D399" };
const ACTION_COLORS = {
  "Wait": "#64748B", "Fast-track": "#34D399",
  "Reassign Officer": "#FBBF24", "Request Documents": "#60A5FA", "Escalate Priority": "#F87171",
};

const SORT_KEYS = {
  app_id: (a, b) => String(a.app_id).localeCompare(String(b.app_id)),
  risk_level: (a, b) => { const o = { High: 0, Medium: 1, Low: 2, Unknown: 3 }; return (o[a.risk_level] || 3) - (o[b.risk_level] || 3); },
  confidence: (a, b) => (b.confidence || 0) - (a.confidence || 0),
  action: (a, b) => String(a.action).localeCompare(String(b.action)),
};

function SortIcon({ active, dir }) {
  return (
    <span style={{ opacity: active ? 0.8 : 0.25, marginLeft: 3 }}>
      {active && dir === "desc"
        ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
      }
    </span>
  );
}

export default function Batch({ summary, setSummary, results, setResults, onSelectLoan }) {
  const [mode, setMode] = useState("random");
  const [batchSize, setBatchSize] = useState(20);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(19);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [sortKey, setSortKey] = useState("risk_level");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  };

  const handleRun = async () => {
    setLoading(true); setError(null); setSummary(null); setResults([]); setPage(0); setFilter("All");
    try {
      const num = (v, fb) => { const n = parseFloat(v); return isNaN(n) ? fb : n; };
      const sample = mode === "range" ? await getDatasetRange(rangeStart, rangeEnd) : await getDatasetSample(batchSize);
      const loans = (sample.loans || []).map(l => ({
        app_id: String(l.app_id || "LOAN"),
        current_stage: Math.min(8, Math.max(1, Math.round(num(l.current_stage, Math.ceil(Math.random() * 8))))),
        pending_days: Math.max(0, Math.round(num(l.pending_days, Math.floor(Math.random() * 15)))),
        credit_score: Math.min(900, Math.max(300, Math.round(num(l.credit_score, 700)))),
        applicant_age: Math.min(80, Math.max(18, Math.round(num(l.applicant_age || l.age, 35)))),
        loan_amount: Math.max(1, num(l.loan_amount, 500000)),
        annual_income: Math.max(1, num(l.annual_income, 700000)),
        loan_type: String(l.loan_type || "Home Loan"),
        employment_type: String(l.employment_type || "Salaried"),
        doc_complete_pct: (() => { const d = num(l.doc_complete_pct, 85); return d > 1 ? d / 100 : d; })(),
        officer_load: Math.min(35, Math.max(1, Math.round(num(l.officer_load, 15)))),
        queue_position: Math.min(20, Math.max(1, Math.round(num(l.queue_position, 5)))),
        fraud_flag: l.fraud_flag ? 1 : 0, aml_flag: l.aml_flag ? 1 : 0, past_default: l.past_default ? 1 : 0,
      }));
      const data = await batchAnalyze(loans);
      setSummary(data.summary); setResults(data.results || []);
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (Array.isArray(detail)) setError(detail.map(d => d.msg || JSON.stringify(d)).join(" · "));
      else setError(typeof detail === "string" ? detail : "Batch request failed.");
    } finally { setLoading(false); }
  };

  const filtered = (filter === "All" ? results : results.filter(r => r.risk_level === filter))
    .slice().sort((a, b) => { const fn = SORT_KEYS[sortKey]; if (!fn) return 0; return sortDir === "asc" ? fn(a, b) : -fn(a, b); });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const riskChartData = summary
    ? Object.entries(summary.risk_distribution).filter(([k]) => ["High", "Medium", "Low"].includes(k)).map(([k, v]) => ({ name: k, value: v }))
    : [];
  const actionChartData = summary
    ? Object.entries(summary.action_distribution).filter(([k, v]) => k && k !== "N/A" && v > 0).map(([k, v]) => ({ name: k, value: v }))
    : [];

  const thStyle = (key) => ({
    padding: "9px 14px", textAlign: "left",
    fontSize: "0.65rem", fontWeight: 600, color: sortKey === key ? "#38BDF8" : "#475569",
    textTransform: "uppercase", letterSpacing: "0.08em",
    cursor: SORT_KEYS[key] ? "pointer" : "default",
    whiteSpace: "nowrap", userSelect: "none",
    background: "#0C111D",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Config */}
      <Card>
        <SectionTitle>Configuration</SectionTitle>

        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {["random", "range"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              ...btnSecondary,
              background: mode === m ? "rgba(14,165,233,0.08)" : "rgba(255,255,255,0.03)",
              color: mode === m ? "#38BDF8" : "#64748B",
              border: `1px solid ${mode === m ? "rgba(14,165,233,0.22)" : "rgba(255,255,255,0.07)"}`,
              fontSize: "0.78rem",
            }}>
              {m === "random" ? "Random Sample" : "Row Range"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          {mode === "random" ? (
            <div style={{ minWidth: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: "0.68rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>Batch Size</label>
                <span style={{ fontSize: "0.70rem", fontFamily: "monospace", color: "#38BDF8" }}>{batchSize}</span>
              </div>
              <input type="range" min={5} max={100} value={batchSize} onChange={e => setBatchSize(+e.target.value)} style={{ width: "100%", accentColor: "#0EA5E9" }} />
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.68rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>From Row</label>
                <input type="number" min={0} max={2999} value={rangeStart} onChange={e => setRangeStart(Math.max(0, +e.target.value))} style={{ ...inputStyle, width: 90 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.68rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>To Row</label>
                <input type="number" min={0} max={2999} value={rangeEnd} onChange={e => setRangeEnd(Math.min(2999, +e.target.value))} style={{ ...inputStyle, width: 90 }} />
              </div>
              <span style={{ fontSize: "0.72rem", color: "#475569", paddingBottom: 8 }}>{Math.max(0, rangeEnd - rangeStart + 1)} loans</span>
            </div>
          )}

          <button onClick={handleRun} disabled={loading} style={{
            ...btnPrimary, display: "flex", alignItems: "center", gap: 7,
            opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? (
              <><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Processing...</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>Run Batch</>
            )}
          </button>

          {summary && !loading && (
            <button onClick={handleRun} style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              Refresh
            </button>
          )}

          {error && <span style={{ color: "#F87171", fontSize: "0.75rem" }}>{error}</span>}
        </div>
      </Card>

      {loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[...Array(4)].map((_, i) => <CardSkeleton key={i} rows={2} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <CardSkeleton rows={4} /><CardSkeleton rows={4} />
          </div>
          <CardSkeleton rows={6} />
        </>
      )}

      {summary && !loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            <StatTile label="Processed" value={summary.total_processed} />
            <StatTile label="SLA Breaches" value={summary.sla_breach_count} sub={`${summary.sla_breach_rate}% rate`} color="#F87171" />
            <StatTile label="High Risk" value={summary.risk_distribution?.High || 0} color="#F87171" />
            <StatTile label="Errors" value={summary.total_errors || 0} color="#FBBF24" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card><SectionTitle>Risk Distribution</SectionTitle><CSSBarChart data={riskChartData} colorMap={RISK_COLORS} /></Card>
            <Card><SectionTitle>Action Distribution</SectionTitle><CSSBarChart data={actionChartData} colorMap={ACTION_COLORS} /></Card>
          </div>

          {/* Table */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Results — {filtered.length} loans
              </span>
              <div style={{ display: "flex", gap: 5 }}>
                {["All", "High", "Medium", "Low"].map(f => (
                  <button key={f} onClick={() => { setFilter(f); setPage(0); }} style={{
                    background: filter === f ? "rgba(14,165,233,0.08)" : "transparent",
                    color: filter === f ? "#38BDF8" : "#475569",
                    border: `1px solid ${filter === f ? "rgba(14,165,233,0.22)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 5, padding: "3px 10px", fontSize: "0.70rem", cursor: "pointer",
                    fontWeight: filter === f ? 500 : 400,
                  }}>{f}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 24 }}><Empty message="No results match the selected filter." /></div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {[
                          { key: "app_id", label: "App ID" },
                          { key: "current_stage", label: "Stage" },
                          { key: "risk_level", label: "Risk" },
                          { key: "confidence", label: "Confidence" },
                          { key: "action", label: "Action" },
                          { key: "action_source", label: "Source" },
                          { key: "sla_alert", label: "SLA" },
                          { key: "policy_id", label: "Policy" },
                          { key: "_arrow", label: "" },
                        ].map(col => (
                          <th key={col.key} style={thStyle(col.key)} onClick={() => SORT_KEYS[col.key] && handleSort(col.key)}>
                            {col.label}{SORT_KEYS[col.key] && <SortIcon active={sortKey === col.key} dir={sortDir} />}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((r, i) => (
                        <tr key={i}
                          onClick={() => onSelectLoan && onSelectLoan(r)}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s", cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "10px 14px" }}><span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#38BDF8" }}>{r.app_id}</span></td>
                          <td style={{ padding: "10px 14px", fontSize: "0.75rem", color: "#475569" }}>{r.current_stage}</td>
                          <td style={{ padding: "10px 14px" }}><RiskBadge level={r.risk_level} /></td>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "0.75rem", color: "#64748B" }}>{((r.confidence || 0) * 100).toFixed(1)}%</td>
                          <td style={{ padding: "10px 14px" }}><ActionBadge action={r.action} /></td>
                          <td style={{ padding: "10px 14px" }}><span style={{ fontSize: "0.68rem", color: "#334155", fontFamily: "monospace" }}>{r.action_source}</span></td>
                          <td style={{ padding: "10px 14px" }}><SLAPill breached={r.sla_alert} /></td>
                          <td style={{ padding: "10px 14px" }}><span style={{ fontFamily: "monospace", fontSize: "0.70rem", color: r.policy_id ? "#38BDF8" : "#334155" }}>{r.policy_id || "—"}</span></td>
                          <td style={{ padding: "10px 14px", color: "#2D3F55" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.68rem", color: "#334155" }}>
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "3px 10px", fontSize: "0.70rem", cursor: "pointer", opacity: page === 0 ? 0.4 : 1 }}>Prev</button>
                      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                        const p = page < 3 ? i : page - 2 + i;
                        if (p >= totalPages) return null;
                        return <button key={p} onClick={() => setPage(p)} style={{ background: page === p ? "rgba(14,165,233,0.10)" : "rgba(255,255,255,0.04)", color: page === p ? "#38BDF8" : "#475569", border: `1px solid ${page === p ? "rgba(14,165,233,0.22)" : "rgba(255,255,255,0.07)"}`, borderRadius: 5, padding: "3px 9px", fontSize: "0.70rem", cursor: "pointer" }}>{p + 1}</button>;
                      })}
                      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "3px 10px", fontSize: "0.70rem", cursor: "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {!loading && !summary && (
        <Card style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ opacity: 0.3, display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#334155" }}>Configure batch parameters and click Run Batch</div>
        </Card>
      )}
    </div>
  );
}
