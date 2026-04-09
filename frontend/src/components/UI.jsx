// src/components/UI.jsx — Clean SaaS Components

export const RISK_COLORS = {
  High: { text: "#F87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.18)" },
  Medium: { text: "#FBBF24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.18)" },
  Low: { text: "#34D399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.18)" },
  Unknown: { text: "#94A3B8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.14)" },
};

export const ACTION_COLORS = {
  "Wait": "#64748B",
  "Fast-track": "#34D399",
  "Reassign Officer": "#FBBF24",
  "Request Documents": "#60A5FA",
  "Escalate Priority": "#F87171",
};

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#131B2E",
        borderRadius: 10,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section title ─────────────────────────────────────────────────────────
export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h2 style={{
        fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "#475569", margin: 0,
      }}>
        {children}
      </h2>
      {action}
    </div>
  );
}

// ── Risk badge ─────────────────────────────────────────────────────────────
export function RiskBadge({ level, large = false }) {
  const c = RISK_COLORS[level] || RISK_COLORS.Unknown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      color: c.text, background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 5,
      fontSize: large ? "0.82rem" : "0.70rem",
      fontWeight: 500,
      padding: large ? "5px 12px" : "2px 8px",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text, display: "inline-block", flexShrink: 0 }} />
      {level}
    </span>
  );
}

// ── Action badge ───────────────────────────────────────────────────────────
export function ActionBadge({ action, large = false }) {
  const color = ACTION_COLORS[action] || "#64748B";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      color, background: `${color}10`, border: `1px solid ${color}22`,
      borderRadius: 5,
      fontSize: large ? "0.82rem" : "0.70rem",
      fontWeight: 500,
      padding: large ? "5px 12px" : "2px 8px",
    }}>
      {action}
    </span>
  );
}

// ── Probability bar ────────────────────────────────────────────────────────
export function ProbBar({ label, value, color }) {
  const pct = ((value || 0) * 100).toFixed(1);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "0.75rem", color: "#64748B" }}>{label}</span>
        <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#94A3B8", fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: "width 0.6s ease",
          opacity: 0.85,
        }} />
      </div>
    </div>
  );
}

// ── Stat tile ──────────────────────────────────────────────────────────────
export function StatTile({ label, value, sub, color = "#F1F5F9", icon }) {
  return (
    <div style={{
      background: "#131B2E",
      borderRadius: 10,
      padding: "20px 22px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.65rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>
            {label}
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color, fontFamily: "monospace", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: "0.70rem", color: "#475569", marginTop: 6 }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", flexShrink: 0 }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SLA pill ───────────────────────────────────────────────────────────────
export function SLAPill({ breached }) {
  if (breached) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#F87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 5, fontSize: "0.70rem", fontWeight: 500, padding: "2px 8px" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      SLA Breached
    </span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#34D399", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 5, fontSize: "0.70rem", fontWeight: 500, padding: "2px 8px" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      On Track
    </span>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 14, style = {} }) {
  return (
    <div style={{
      width, height,
      background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      borderRadius: 4,
      animation: "shimmer 1.8s infinite",
      ...style,
    }} />
  );
}

// ── Card skeleton ──────────────────────────────────────────────────────────
export function CardSkeleton({ rows = 3 }) {
  return (
    <Card>
      <Skeleton height={9} width="35%" style={{ marginBottom: 20 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={11} width={`${55 + (i * 13 % 35)}%`} style={{ marginBottom: 10 }} />
      ))}
    </Card>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
      <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.06)", borderTop: "2px solid #0EA5E9", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
export function Empty({ message = "No data yet.", icon }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 0", color: "#334155" }}>
      {icon && <div style={{ marginBottom: 12, opacity: 0.35 }}>{icon}</div>}
      <div style={{ fontSize: "0.80rem" }}>{message}</div>
    </div>
  );
}

// ── Policy box ─────────────────────────────────────────────────────────────
export function PolicyBox({ policyId, policyText, explanation, relevanceScore }) {
  if (!policyId) return <Empty message="No matching policy found." />;
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code style={{
            background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.18)",
            borderRadius: 4, padding: "2px 8px", fontSize: "0.70rem",
            color: "#38BDF8", fontWeight: 600,
          }}>
            {policyId}
          </code>
          <span style={{ fontSize: "0.68rem", color: "#334155" }}>Banking Policy</span>
        </div>
        {relevanceScore && (
          <span style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#334155" }}>
            {(relevanceScore * 100).toFixed(0)}% match
          </span>
        )}
      </div>
      {policyText && (
        <div style={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.7, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {policyText}
        </div>
      )}
      <pre style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#94A3B8", whiteSpace: "pre-wrap", lineHeight: 1.8, margin: 0 }}>
        {explanation}
      </pre>
    </div>
  );
}

// ── CSS bar chart ──────────────────────────────────────────────────────────
export function CSSBarChart({ data, colorMap, valueFormatter }) {
  if (!data || data.length === 0) return <Empty message="No data to display." />;
  const max = Math.max(...data.map(d => d.value ?? d.count ?? 0), 1);
  const fmt = valueFormatter || (v => v);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => {
        const val = d.value ?? d.count ?? 0;
        const color = colorMap?.[d.name] || d.color || "#0EA5E9";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 112, fontSize: "0.72rem", color: "#64748B", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>
              {d.name}
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 3, height: 18, overflow: "hidden" }}>
              <div style={{
                width: `${(val / max) * 100}%`, height: "100%",
                background: color, borderRadius: 3,
                transition: "width 0.6s ease",
                minWidth: val > 0 ? 3 : 0,
                opacity: 0.8,
              }} />
            </div>
            <div style={{ width: 44, textAlign: "right", fontSize: "0.72rem", fontFamily: "monospace", color: "#94A3B8", fontWeight: 600, flexShrink: 0 }}>
              {fmt(val)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────
export function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />;
}

// ── Risk Gauge ─────────────────────────────────────────────────────────────
export function RiskGauge({ score, level }) {
  const safeScore = typeof score === "number" ? Math.min(100, Math.max(0, score)) : 0;
  const pct = safeScore.toFixed(1);
  const gaugeColor =
    safeScore < 35 ? "#34D399" :
      safeScore < 60 ? "#FBBF24" :
        safeScore < 80 ? "#F87171" : "#EF4444";
  const labelColor = RISK_COLORS[level]?.text || "#94A3B8";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 12 }}>
        <span style={{ fontSize: "2.6rem", fontWeight: 700, fontFamily: "monospace", color: gaugeColor, lineHeight: 1, letterSpacing: "-0.03em" }}>
          {pct}
        </span>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: gaugeColor }}>%</span>
      </div>

      <div style={{ height: 4, borderRadius: 4, overflow: "visible", background: "linear-gradient(90deg, #34D399 0%, #FBBF24 50%, #F87171 100%)", position: "relative", marginBottom: 8 }}>
        <div style={{
          position: "absolute", top: "50%", left: `${safeScore}%`,
          transform: "translate(-50%, -50%)",
          width: 12, height: 12, borderRadius: "50%",
          background: "#131B2E",
          border: `2px solid ${gaugeColor}`,
          transition: "left 0.8s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: "0.58rem", color: "#34D399" }}>Low</span>
        <span style={{ fontSize: "0.58rem", color: "#FBBF24" }}>Medium</span>
        <span style={{ fontSize: "0.58rem", color: "#F87171" }}>High</span>
      </div>

      {level && (
        <span style={{ fontSize: "0.70rem", fontWeight: 500, color: labelColor, background: `${labelColor}10`, border: `1px solid ${labelColor}20`, borderRadius: 4, padding: "3px 10px" }}>
          {level} Risk
        </span>
      )}
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────
export const inputStyle = {
  width: "100%",
  background: "#0C111D",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 7,
  padding: "8px 11px",
  color: "#E2E8F0",
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.82rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export const btnPrimary = {
  background: "#0EA5E9",
  color: "white",
  border: "none",
  borderRadius: 7,
  padding: "9px 18px",
  fontSize: "0.82rem",
  fontWeight: 500,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

export const btnSecondary = {
  background: "rgba(255,255,255,0.05)",
  color: "#64748B",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 7,
  padding: "7px 14px",
  fontSize: "0.80rem",
  fontWeight: 400,
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
};

// ── Banking illustrations (kept from original) ─────────────────────────────
export function BankingIllustration({ type = "analyze" }) {
  const s = "rgba(255,255,255,0.04)";
  const b = "rgba(255,255,255,0.08)";
  if (type === "analyze") {
    return (
      <svg width="130" height="95" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="10" width="48" height="60" rx="4" fill={s} stroke={b} strokeWidth="1.5" />
        <rect x="28" y="22" width="32" height="2" rx="1" fill="rgba(255,255,255,0.10)" />
        <rect x="28" y="29" width="24" height="2" rx="1" fill="rgba(255,255,255,0.06)" />
        <rect x="28" y="36" width="28" height="2" rx="1" fill="rgba(255,255,255,0.06)" />
        <rect x="28" y="43" width="20" height="2" rx="1" fill="rgba(255,255,255,0.06)" />
        <circle cx="52" cy="58" r="9" fill={s} stroke="rgba(14,165,233,0.30)" strokeWidth="1.5" strokeDasharray="2 1.5" />
        <polyline points="48,58 51,61 57,55" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="92" cy="46" r="20" fill={s} stroke={b} strokeWidth="1.5" />
        <circle cx="92" cy="46" r="13" fill="none" stroke="rgba(14,165,233,0.25)" strokeWidth="1.8" />
        <line x1="101" y1="56" x2="112" y2="68" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="85" y="50" width="5" height="7" rx="1" fill="#0EA5E9" opacity="0.3" />
        <rect x="91.5" y="45" width="5" height="12" rx="1" fill="#0EA5E9" opacity="0.55" />
        <rect x="98" y="48" width="5" height="9" rx="1" fill="#0EA5E9" opacity="0.4" />
      </svg>
    );
  }
  return null;
}
