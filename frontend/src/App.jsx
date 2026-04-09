// src/App.jsx — Clean SaaS Shell
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Analyze, { DEFAULT_FORM } from "./pages/Analyze";
import Batch from "./pages/Batch";
import Monitor from "./pages/Monitor";
import Metrics from "./pages/Metrics";
import LoanDetail from "./pages/LoanDetail";

const NAV_ALL = [
  {
    id: "analyze", label: "Loan Analysis", desc: "Single loan risk assessment",
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>),
  },
  {
    id: "batch", label: "Batch Processing", desc: "Bulk loan analysis",
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>),
  },
  {
    id: "monitor", label: "System Monitor", desc: "Real-time pipeline metrics", adminOnly: true,
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>),
  },
  {
    id: "metrics", label: "Business Metrics", desc: "Performance & impact",
    icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>),
  },
];

function AppShell() {
  const { user, role, logout } = useAuth();
  const [page, setPage] = useState("analyze");
  const [collapsed, setCollapsed] = useState(false);
  const [backendOk, setBackendOk] = useState(null);

  const [batchSummary, setBatchSummary] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [analyzeForm, setAnalyzeForm] = useState(DEFAULT_FORM);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false));
  }, []);

  const NAV = NAV_ALL.filter(n => !n.adminOnly || role === "admin");
  const navigateTo = (id) => { setSelectedLoan(null); setPage(id); };
  const isDetailPage = page === "batch" && selectedLoan;
  const current = NAV.find(n => n.id === page);
  const pageLabel = isDetailPage ? "Loan Detail" : current?.label;

  const isAdmin = role === "admin";
  const W = collapsed ? 56 : 220;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0C111D", fontFamily: "'Inter', -apple-system, sans-serif", color: "#E2E8F0" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: W,
        background: "#0C111D",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        transition: "width 0.2s ease",
        position: "fixed", top: 0, left: 0, bottom: 0,
        zIndex: 100, overflow: "hidden",
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? "18px 0" : "18px 16px",
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 60, flexShrink: 0,
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 28, height: 28,
                background: "#0EA5E9",
                borderRadius: 7,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#F8FAFC", letterSpacing: "-0.01em" }}>LoanOps AI</div>
                <div style={{ fontSize: "0.6rem", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>TAT Optimizer</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{ width: 28, height: 28, background: "#0EA5E9", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} style={{
            background: "none", border: "none",
            cursor: "pointer", color: "#334155", padding: 4, borderRadius: 5,
            display: "flex", alignItems: "center", flexShrink: 0,
            transition: "color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "#64748B"}
            onMouseLeave={e => e.currentTarget.style.color = "#334155"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto" }}>
          {NAV.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => navigateTo(n.id)} title={collapsed ? n.label : ""} style={{
                width: "100%",
                display: "flex", alignItems: "center",
                gap: 10,
                padding: collapsed ? "9px 0" : "8px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "rgba(14,165,233,0.08)" : "transparent",
                border: "none",
                borderRadius: 7,
                cursor: "pointer", textAlign: "left",
                margin: "2px 0",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ flexShrink: 0, color: active ? "#38BDF8" : "#475569", transition: "color 0.15s" }}>{n.icon}</span>
                {!collapsed && (
                  <span style={{ fontSize: "0.82rem", fontWeight: active ? 500 : 400, color: active ? "#F1F5F9" : "#64748B", transition: "color 0.15s" }}>
                    {n.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        {!collapsed && (
          <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, marginBottom: 4 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "#0EA5E9",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", fontWeight: 700, color: "white", flexShrink: 0,
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "#CBD5E1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
                <div style={{ fontSize: "0.62rem", color: isAdmin ? "#38BDF8" : "#818CF8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{isAdmin ? "Admin" : "Officer"}</div>
              </div>
            </div>
            <button onClick={logout} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none",
              borderRadius: 6, padding: "6px 10px", cursor: "pointer",
              color: "#475569", fontSize: "0.75rem",
              transition: "color 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "#EF4444"}
              onMouseLeave={e => e.currentTarget.style.color = "#475569"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
        {collapsed && (
          <div style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <button onClick={logout} title="Sign Out" style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 6, display: "flex", borderRadius: 5, transition: "color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#EF4444"}
              onMouseLeave={e => e.currentTarget.style.color = "#475569"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}

        {/* API status */}
        <div style={{ padding: collapsed ? "8px 0" : "8px 18px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 6, flexShrink: 0 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: backendOk === true ? "#10B981" : backendOk === false ? "#EF4444" : "#334155" }} />
          {!collapsed && <span style={{ fontSize: "0.62rem", color: "#2D3F55", fontFamily: "monospace" }}>{backendOk === null ? "Connecting…" : backendOk ? "API Connected" : "API Offline"}</span>}
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ marginLeft: W, flex: 1, display: "flex", flexDirection: "column", transition: "margin-left 0.2s ease", minWidth: 0 }}>

        {/* Header */}
        <header style={{
          background: "#0C111D",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 32px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <div>
            <h1 style={{ fontSize: "0.92rem", fontWeight: 600, color: "#F1F5F9", letterSpacing: "-0.01em", margin: 0 }}>{pageLabel}</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981" }} />
              <span style={{ fontSize: "0.65rem", color: "#334155", fontFamily: "monospace" }}>Live</span>
            </div>

            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />

            <span style={{ fontSize: "0.65rem", background: isAdmin ? "rgba(14,165,233,0.10)" : "rgba(99,102,241,0.10)", color: isAdmin ? "#38BDF8" : "#818CF8", borderRadius: 5, padding: "2px 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {isAdmin ? "Admin" : "Officer"}
            </span>

            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0EA5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "white" }}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
          {page === "analyze" && <Analyze role={role} form={analyzeForm} setForm={setAnalyzeForm} result={analyzeResult} setResult={setAnalyzeResult} />}
          {page === "batch" && (
            selectedLoan
              ? <LoanDetail loan={selectedLoan} onBack={() => setSelectedLoan(null)} />
              : <Batch summary={batchSummary} setSummary={setBatchSummary} results={batchResults} setResults={setBatchResults} onSelectLoan={setSelectedLoan} />
          )}
          {page === "monitor" && <Monitor />}
          {page === "metrics" && <Metrics />}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "10px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.62rem", color: "#1E2D44", fontFamily: "monospace" }}>LoanOps AI v1.0 · ML + Agentic AI + RAG</span>
          <span style={{ fontSize: "0.62rem", color: "#1E2D44", fontFamily: "monospace" }}>FastAPI + React · {new Date().getFullYear()}</span>
        </footer>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        select option { background: #1E293B; }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return <AppShell />;
}
