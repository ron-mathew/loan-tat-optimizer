// src/pages/Metrics.jsx — Clean redesign
import { useEffect, useState } from "react";
import { getMetrics } from "../api";
import { Card, SectionTitle, CardSkeleton, Empty, CSSBarChart } from "../components/UI";

const RISK_COLORS = { High: "#F87171", Medium: "#FBBF24", Low: "#34D399" };
const STAGE_COLORS = ["#38BDF8", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#60A5FA"];

function KpiTile({ label, value, sub, color = "#E2E8F0", highlight = false }) {
  return (
    <div style={{
      background: highlight ? `${color}06` : "#131B2E",
      border: `1px solid ${highlight ? `${color}20` : "rgba(255,255,255,0.06)"}`,
      borderRadius: 10, padding: "18px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    }}>
      <div style={{ fontSize: "0.62rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 8, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700, color, fontFamily: "monospace", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.68rem", color: "#475569", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function CompareBar({ label, value, max, color, isOurs = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.80rem", color: isOurs ? "#E2E8F0" : "#64748B", fontWeight: isOurs ? 500 : 400 }}>{label}</span>
          {isOurs && <span style={{ fontSize: "0.62rem", color: "#34D399", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>Our System</span>}
        </div>
        <span style={{ fontSize: "0.80rem", fontFamily: "monospace", color: isOurs ? color : "#475569", fontWeight: isOurs ? 600 : 400 }}>{value}d</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 4, height: isOurs ? 28 : 20, overflow: "hidden" }}>
        <div style={{
          width: `${(value / max) * 100}%`, height: "100%",
          background: isOurs ? color : "rgba(255,255,255,0.07)",
          borderRadius: 4, transition: "width 0.8s ease",
          display: "flex", alignItems: "center", paddingLeft: 8, opacity: isOurs ? 0.9 : 1,
        }}>
          {isOurs && <span style={{ fontSize: "0.68rem", color: "rgba(0,0,0,0.8)", fontFamily: "monospace", fontWeight: 700 }}>{value}d</span>}
        </div>
      </div>
    </div>
  );
}

function NoteRow({ label, content, color = "#38BDF8" }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <code style={{ fontSize: "0.68rem", color, background: `${color}08`, border: `1px solid ${color}18`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap", alignSelf: "flex-start", marginTop: 2 }}>
        {label}
      </code>
      <div style={{ fontSize: "0.75rem", color: "#64748B", lineHeight: 1.7 }}>{content}</div>
    </div>
  );
}

export default function Metrics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMetrics().then(setData).catch(() => setError("Could not load metrics.")).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>{[...Array(4)].map((_, i) => <CardSkeleton key={i} rows={2} />)}</div>
      <CardSkeleton rows={6} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}><CardSkeleton rows={5} /><CardSkeleton rows={5} /></div>
    </div>
  );

  if (error) return <Card><div style={{ color: "#F87171", fontSize: "0.82rem" }}>{error}</div></Card>;
  if (!data) return <Card><Empty message="No metrics available." /></Card>;

  const { tat, baselines, improvements, sla_breach_rate, risk_distribution, sla_by_risk, stage_breakdown, loan_type_tat, dataset_size } = data;
  const compareMax = Math.max(...Object.values(baselines)) * 1.15;
  const riskData = Object.entries(risk_distribution || {}).map(([k, v]) => ({ name: k, value: v }));
  const stageData = Object.entries(stage_breakdown || {}).map(([k, v], i) => ({ name: k, value: v, color: STAGE_COLORS[i % STAGE_COLORS.length] }));
  const loanTypeData = Object.entries(loan_type_tat || {}).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <KpiTile label="Dataset Size" value={dataset_size?.toLocaleString()} sub="loan records" />
        <KpiTile label="Average TAT" value={`${tat?.mean}d`} sub={`median ${tat?.median}d`} color="#38BDF8" />
        <KpiTile label="SLA Breach Rate" value={`${sla_breach_rate}%`} sub="of all loans" color="#F87171" />
        <KpiTile label="TAT Range" value={`${tat?.min}–${tat?.max}d`} sub={`±${tat?.std?.toFixed(1)} std`} color="#64748B" />
      </div>

      {/* TAT Comparison */}
      <Card>
        <SectionTitle>TAT Comparison — Baselines</SectionTitle>
        <p style={{ fontSize: "0.75rem", color: "#475569", marginBottom: 24, lineHeight: 1.7 }}>
          Estimated average turnaround time across approaches. Our system uses ML risk prediction, PPO-optimized actions, and rule-based overrides.
        </p>
        <CompareBar label="Random Agent" value={baselines.random_agent} max={compareMax} color="#F87171" />
        <CompareBar label="No Intervention" value={baselines.no_intervention} max={compareMax} color="#64748B" />
        <CompareBar label="Industry Average" value={baselines.industry_avg} max={compareMax} color="#FBBF24" />
        <CompareBar label="Our System (PPO)" value={baselines.our_system} max={compareMax} color="#34D399" isOurs />
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "20px 0" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <KpiTile label="vs Random Agent" value={`${improvements.vs_random}%`} sub="faster" color="#34D399" highlight />
          <KpiTile label="vs No Intervention" value={`${improvements.vs_no_interv}%`} sub="faster" color="#34D399" highlight />
          <KpiTile label="vs Industry Avg" value={`${improvements.vs_industry}%`} sub="faster" color="#34D399" highlight />
        </div>
      </Card>

      {/* SLA + Risk */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle>SLA Breach by Risk Level</SectionTitle>
          <p style={{ fontSize: "0.70rem", color: "#334155", marginBottom: 14 }}>High=5d · Medium=10d · Low=15d</p>
          <CSSBarChart data={Object.entries(sla_by_risk || {}).map(([k, v]) => ({ name: k, value: v }))} colorMap={RISK_COLORS} valueFormatter={v => `${v}%`} />
        </Card>
        <Card>
          <SectionTitle>Risk Distribution</SectionTitle>
          <p style={{ fontSize: "0.70rem", color: "#334155", marginBottom: 14 }}>{dataset_size?.toLocaleString()} loans</p>
          <CSSBarChart data={riskData} colorMap={RISK_COLORS} />
        </Card>
      </div>

      {/* Stage */}
      <Card>
        <SectionTitle>Average Time per Stage</SectionTitle>
        <p style={{ fontSize: "0.70rem", color: "#334155", marginBottom: 14 }}>Where time is spent in the pipeline</p>
        <CSSBarChart data={stageData} valueFormatter={v => `${v}d`} />
      </Card>

      {/* Loan type */}
      {loanTypeData.length > 0 && (
        <Card>
          <SectionTitle>TAT by Loan Type</SectionTitle>
          <CSSBarChart data={loanTypeData} valueFormatter={v => `${v}d`} />
        </Card>
      )}

      {/* Methodology */}
      <Card>
        <SectionTitle>Methodology</SectionTitle>
        <NoteRow label="Our System" color="#34D399" content="Estimated as 15% reduction from dataset mean, based on PPO reward improvement of +12.6 over random agent and conservative action effectiveness assumptions." />
        <NoteRow label="Random Agent" color="#64748B" content="Baseline with +10% overhead from suboptimal action selection using a uniform random policy across all 5 actions." />
        <NoteRow label="No Intervention" color="#475569" content="Baseline where all loans receive the Wait action. TAT equals the dataset mean with no optimization applied." />
        <NoteRow label="Industry Average" color="#FBBF24" content="Indian banking sector average loan TAT of 20 days, based on RBI guidelines and public benchmarking data." />
      </Card>
    </div>
  );
}
