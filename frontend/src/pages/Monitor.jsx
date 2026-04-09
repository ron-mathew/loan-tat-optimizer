// ─────────────────────────────────────────────────────────────────────────────
// MONITOR.JSX
// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Monitor.jsx
import { useEffect, useState, useCallback } from "react";
import { getStats, getHealth } from "../api";
import { Card, SectionTitle, StatTile, CardSkeleton, Empty, CSSBarChart, RiskBadge, ActionBadge, SLAPill } from "../components/UI";

const API = "http://localhost:8000";
const RISK_COLORS = { High: "#F87171", Medium: "#FBBF24", Low: "#34D399" };
const ACTION_COLORS = { "Wait": "#64748B", "Fast-track": "#34D399", "Reassign Officer": "#FBBF24", "Request Documents": "#60A5FA", "Escalate Priority": "#F87171" };

function ModelCard({ label, name, detail, color, icon }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}10`, border: `1px solid ${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: "0.62rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#E2E8F0", marginBottom: 3 }}>{name}</div>
          <div style={{ fontSize: "0.72rem", color }}>{detail}</div>
        </div>
      </div>
    </Card>
  );
}

function HistoryTable({ records, loading }) {
  const thStyle = { padding: "8px 14px", textAlign: "left", fontSize: "0.62rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", background: "#0C111D", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" };
  if (loading) return <div style={{ padding: "24px", textAlign: "center", color: "#475569", fontSize: "0.80rem" }}>Loading history…</div>;
  if (!records || records.length === 0) return <div style={{ padding: "32px", textAlign: "center", color: "#334155", fontSize: "0.80rem" }}>No records yet. Run loans from Analyze or Batch pages.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{["#", "Timestamp", "App ID", "Risk", "Confidence", "Action", "SLA", "Policy", "Source"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <td style={{ padding: "8px 14px", fontSize: "0.68rem", color: "#334155", fontFamily: "monospace" }}>{r.id}</td>
              <td style={{ padding: "8px 14px", fontSize: "0.68rem", color: "#334155", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {r.timestamp ? new Date(r.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}
              </td>
              <td style={{ padding: "8px 14px" }}><span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#38BDF8", fontWeight: 500 }}>{r.app_id}</span></td>
              <td style={{ padding: "8px 14px" }}><RiskBadge level={r.risk_level} /></td>
              <td style={{ padding: "8px 14px", fontFamily: "monospace", fontSize: "0.72rem", color: "#64748B" }}>{r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : "—"}</td>
              <td style={{ padding: "8px 14px" }}><ActionBadge action={r.action} /></td>
              <td style={{ padding: "8px 14px" }}><SLAPill breached={r.sla_breached} /></td>
              <td style={{ padding: "8px 14px" }}><span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: r.policy_id ? "#38BDF8" : "#2D3F55" }}>{r.policy_id || "—"}</span></td>
              <td style={{ padding: "8px 14px" }}>
                <span style={{ fontSize: "0.62rem", fontWeight: 500, borderRadius: 4, padding: "2px 7px", color: r.source === "batch" ? "#D97706" : "#2563EB", background: r.source === "batch" ? "rgba(217,119,6,0.08)" : "rgba(37,99,235,0.08)", border: `1px solid ${r.source === "batch" ? "rgba(217,119,6,0.18)" : "rgba(37,99,235,0.18)"}` }}>
                  {r.source}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Monitor() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyLimit] = useState(15);
  const [riskFilter, setRiskFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  const loadSessionData = useCallback(async () => {
    try { const [s, h] = await Promise.all([getStats(), getHealth()]); setStats(s); setHealth(h); }
    catch { setError("Could not load monitoring data. Ensure the backend is running on port 8000."); }
  }, []);

  const loadDbStats = useCallback(async () => {
    try { const res = await fetch(`${API}/history/stats`); if (res.ok) setDbStats(await res.json()); } catch { }
  }, []);

  const loadHistory = useCallback(async (page = 1, risk = "", source = "") => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: historyLimit });
      if (risk) params.append("risk", risk);
      if (source) params.append("source", source);
      const res = await fetch(`${API}/history?${params}`);
      if (res.ok) { const data = await res.json(); setHistory(data.records || []); setHistoryTotal(data.total || 0); setHistoryPages(data.pages || 1); setHistoryPage(page); }
    } catch { } finally { setHistoryLoading(false); }
  }, [historyLimit]);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    await Promise.all([loadSessionData(), loadDbStats(), loadHistory(1, riskFilter, sourceFilter)]);
    setLoading(false);
  }, [loadSessionData, loadDbStats, loadHistory, riskFilter, sourceFilter]);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line
  useEffect(() => { loadHistory(1, riskFilter, sourceFilter); }, [riskFilter, sourceFilter]); // eslint-disable-line

  const handleClearHistory = async () => {
    try { await fetch(`${API}/history`, { method: "DELETE" }); setClearConfirm(false); await Promise.all([loadDbStats(), loadHistory(1, riskFilter, sourceFilter)]); }
    catch { alert("Could not clear history."); }
  };

  const totalLoans = stats?.total_loans || 0;
  const slaAlertCount = stats?.sla_alert_count || 0;
  const slaAlertRate = stats?.sla_alert_rate != null ? (stats.sla_alert_rate * 100).toFixed(1) : null;
  const riskDist = stats?.risk_distribution || {};
  const actionDist = stats?.action_distribution || {};
  const isOnline = health?.orchestrator === "loaded";
  const noData = totalLoans === 0 && (!dbStats || dbStats.total_records === 0);

  const riskData = Object.entries(riskDist).filter(([k]) => ["High", "Medium", "Low"].includes(k)).map(([k, v]) => ({ name: k, value: v }));
  const actionData = Object.entries(actionDist).filter(([k, v]) => k && v > 0).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);
  const dbRiskData = dbStats?.risk_distribution ? Object.entries(dbStats.risk_distribution).map(([k, v]) => ({ name: k, value: v })) : [];
  const dbActionData = dbStats?.action_distribution ? Object.entries(dbStats.action_distribution).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value) : [];

  const fBtn = (active) => ({ background: active ? "rgba(14,165,233,0.08)" : "transparent", color: active ? "#38BDF8" : "#475569", border: `1px solid ${active ? "rgba(14,165,233,0.22)" : "rgba(255,255,255,0.07)"}`, borderRadius: 5, padding: "3px 10px", fontSize: "0.68rem", cursor: "pointer", fontWeight: active ? 500 : 400 });

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>{[...Array(3)].map((_, i) => <CardSkeleton key={i} rows={2} />)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}><CardSkeleton rows={5} /><CardSkeleton rows={5} /></div></div>;

  if (error) return <Card><div style={{ color: "#F87171", fontSize: "0.82rem", marginBottom: 12 }}>{error}</div><button onClick={loadAll} style={{ background: "rgba(20,184,166,0.08)", color: "#34D399", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 7, padding: "7px 16px", cursor: "pointer", fontSize: "0.78rem" }}>Retry</button></Card>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: isOnline ? "rgba(52,211,153,0.04)" : "rgba(248,113,113,0.04)", border: `1px solid ${isOnline ? "rgba(52,211,153,0.14)" : "rgba(248,113,113,0.14)"}`, borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "#34D399" : "#F87171" }} />
          <span style={{ fontSize: "0.78rem", color: "#64748B" }}>
            Backend <strong style={{ color: isOnline ? "#34D399" : "#F87171" }}>{health?.status || "unknown"}</strong>
            {" · "}Orchestrator <strong style={{ color: isOnline ? "#34D399" : "#F87171" }}>{health?.orchestrator || "unknown"}</strong>
            {dbStats?.total_records > 0 && <span style={{ color: "#334155" }}>{" · "}<span style={{ color: "#38BDF8" }}>{dbStats.total_records.toLocaleString()}</span> records in DB</span>}
          </span>
        </div>
        <button onClick={loadAll} style={{ background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "4px 12px", fontSize: "0.72rem", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          Refresh
        </button>
      </div>

      {/* Session KPIs */}
      <div>
        <div style={{ fontSize: "0.60rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>This Session</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <StatTile label="Processed" value={totalLoans.toLocaleString()} />
          <StatTile label="SLA Alerts" value={slaAlertCount} sub={slaAlertRate != null ? `${slaAlertRate}% rate` : null} color="#F87171" />
          <StatTile label="Actions" value={Object.values(actionDist).reduce((a, b) => a + b, 0)} color="#38BDF8" />
        </div>
      </div>

      {/* DB stats */}
      {dbStats && dbStats.total_records > 0 && (
        <div>
          <div style={{ fontSize: "0.60rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>All-Time Database</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { label: "Total Records", value: dbStats.total_records.toLocaleString(), color: "#E2E8F0" },
              { label: "Unique Loans", value: dbStats.unique_loans.toLocaleString(), color: "#E2E8F0" },
              { label: "SLA Breaches", value: dbStats.sla_breach_count, sub: `${(dbStats.sla_breach_rate * 100).toFixed(1)}% rate`, color: "#F87171" },
              { label: "Avg Confidence", value: `${(dbStats.avg_confidence * 100).toFixed(1)}%`, color: "#34D399" },
            ].map(t => <StatTile key={t.label} label={t.label} value={t.value} sub={t.sub} color={t.color} />)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <span style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.14)", borderRadius: 6, padding: "6px 12px", fontSize: "0.70rem", color: "#60A5FA" }}>
              <strong>{dbStats.single_count}</strong> <span style={{ color: "#475569" }}>single</span>
            </span>
            <span style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.14)", borderRadius: 6, padding: "6px 12px", fontSize: "0.70rem", color: "#FBBF24" }}>
              <strong>{dbStats.batch_count}</strong> <span style={{ color: "#475569" }}>batch</span>
            </span>
          </div>
        </div>
      )}

      {/* Charts */}
      {noData ? (
        <Card style={{ textAlign: "center", padding: "44px" }}>
          <div style={{ fontSize: "0.82rem", color: "#334155" }}>No loans processed yet. Run loans from Analyze or Batch pages.</div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card><SectionTitle>Risk Distribution</SectionTitle><CSSBarChart data={dbStats?.total_records > 0 ? dbRiskData : riskData} colorMap={RISK_COLORS} /></Card>
          <Card><SectionTitle>Action Distribution</SectionTitle><CSSBarChart data={dbStats?.total_records > 0 ? dbActionData : actionData} colorMap={ACTION_COLORS} /></Card>
        </div>
      )}

      {/* History Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "#0C111D" }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>Loan History</div>
            <div style={{ fontSize: "0.68rem", color: "#334155", marginTop: 2 }}>{historyTotal > 0 ? `${historyTotal.toLocaleString()} records` : "Persistent across restarts"}</div>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
            {["", "High", "Medium", "Low"].map(r => <button key={r} onClick={() => setRiskFilter(r)} style={fBtn(riskFilter === r)}>{r || "All Risk"}</button>)}
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.07)", margin: "0 2px" }} />
            {["", "single", "batch"].map(s => <button key={s} onClick={() => setSourceFilter(s)} style={fBtn(sourceFilter === s)}>{s || "All Source"}</button>)}
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.07)", margin: "0 2px" }} />
            {!clearConfirm ? (
              <button onClick={() => setClearConfirm(true)} style={{ background: "rgba(220,38,38,0.05)", color: "#EF4444", border: "1px solid rgba(220,38,38,0.14)", borderRadius: 5, padding: "3px 10px", fontSize: "0.68rem", cursor: "pointer" }}>Clear</button>
            ) : (
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <span style={{ fontSize: "0.68rem", color: "#EF4444" }}>Sure?</span>
                <button onClick={handleClearHistory} style={{ background: "#EF4444", color: "white", border: "none", borderRadius: 4, padding: "3px 9px", fontSize: "0.68rem", cursor: "pointer" }}>Yes</button>
                <button onClick={() => setClearConfirm(false)} style={{ background: "rgba(255,255,255,0.05)", color: "#64748B", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "3px 9px", fontSize: "0.68rem", cursor: "pointer" }}>No</button>
              </div>
            )}
          </div>
        </div>
        <HistoryTable records={history} loading={historyLoading} />
        {historyPages > 1 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0C111D" }}>
            <span style={{ fontSize: "0.68rem", color: "#334155" }}>Page {historyPage} of {historyPages}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button disabled={historyPage <= 1} onClick={() => loadHistory(historyPage - 1, riskFilter, sourceFilter)} style={{ ...fBtn(false), opacity: historyPage <= 1 ? 0.4 : 1 }}>← Prev</button>
              {[...Array(Math.min(historyPages, 5))].map((_, i) => { const p = historyPage < 3 ? i + 1 : historyPage - 2 + i; if (p > historyPages) return null; return <button key={p} onClick={() => loadHistory(p, riskFilter, sourceFilter)} style={fBtn(historyPage === p)}>{p}</button>; })}
              <button disabled={historyPage >= historyPages} onClick={() => loadHistory(historyPage + 1, riskFilter, sourceFilter)} style={{ ...fBtn(false), opacity: historyPage >= historyPages ? 0.4 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </Card>

      {/* System Summary */}
      <Card>
        <SectionTitle>Session Summary</SectionTitle>
        {stats && Object.keys(stats).length > 0 && !stats.message ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
            {Object.entries(stats).map(([k, v]) => typeof v !== "object" && (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 11px", background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
                <span style={{ fontSize: "0.70rem", color: "#475569", fontFamily: "monospace" }}>{k}</span>
                <span style={{ fontSize: "0.70rem", color: "#64748B", fontFamily: "monospace" }}>{String(v)}</span>
              </div>
            ))}
          </div>
        ) : <Empty message={stats?.message || "No stats yet."} />}
      </Card>

      {/* Models */}
      <div>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Deployed Models</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <ModelCard label="ML Model" name="Logistic Regression" detail="91% accuracy · Calibrated" color="#34D399" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>} />
          <ModelCard label="RL Agent" name="PPO" detail="100K timesteps · +12.6 reward" color="#38BDF8" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>} />
          <ModelCard label="RAG Model" name="all-MiniLM-L6-v2" detail="60% exact · 100% category" color="#FBBF24" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>} />
        </div>
      </div>
    </div>
  );
}
