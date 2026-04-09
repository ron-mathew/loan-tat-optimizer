// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [form, setForm]   = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 400)); // slight delay for feel
      login(form.username, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase = {
    width: "100%", background: "#0F1929",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 8, padding: "11px 14px",
    color: "#F1F5F9", fontFamily: "'Inter', sans-serif",
    fontSize: "0.85rem", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0B1120",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Subtle grid */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03, pointerEvents: "none" }}>
        <defs>
          <pattern id="lg" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lg)"/>
      </svg>
      {/* Ambient glow — muted */}
      <div style={{ position: "absolute", top: "18%", left: "12%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "12%", right: "10%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, padding: "0 24px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: "#0EA5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div style={{ fontSize: "1.40rem", fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.02em" }}>LoanOps AI</div>
          <div style={{ fontSize: "0.68rem", color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>TAT Optimizer · Secure Access</div>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "32px 30px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.50)",
        }}>
          <div style={{ marginBottom: 10, fontSize: "1.1rem", fontWeight: 700, color: "#F1F5F9" }}>Sign In</div>
          <div style={{ fontSize: "0.78rem", color: "#475569", marginBottom: 28 }}>Enter your credentials to access the dashboard</div>

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.65rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 7, fontWeight: 600 }}>Username</label>
            <input
              type="text" autoComplete="username" required
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="admin or officer"
              style={inputBase}
              onFocus={e => e.target.style.borderColor = "rgba(14,165,233,0.50)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.10)"}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: "0.65rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 7, fontWeight: 600 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"} autoComplete="current-password" required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={{ ...inputBase, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = "rgba(14,165,233,0.50)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.10)"}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "#4E6680", padding: 4,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPw
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 16, padding: "10px 14px",
              background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 8, fontSize: "0.80rem", color: "#F87171",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px 0",
            background: loading ? "rgba(14,165,233,0.50)" : "#0EA5E9",
            color: "white", border: "none", borderRadius: 8,
            fontSize: "0.88rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.15s, opacity 0.15s",
            letterSpacing: "0.01em",
          }}>
            {loading ? (
              <>
                <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Authenticating...
              </>
            ) : "Sign In →"}
          </button>

          {/* Hint */}
          <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8 }}>
            <div style={{ fontSize: "0.60rem", color: "#334155", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.10em", fontWeight: 600 }}>Demo Credentials</div>
            <div style={{ fontSize: "0.73rem", color: "#475569", lineHeight: 1.8, fontFamily: "'JetBrains Mono', monospace" }}>
              admin / admin123 &nbsp;·&nbsp; Full Access<br/>
              officer / officer123 &nbsp;·&nbsp; Read-Only
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
