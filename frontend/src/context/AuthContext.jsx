// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const CREDENTIALS = {
  admin:   { password: "admin123",   role: "admin",   name: "Admin" },
  officer: { password: "officer123", role: "officer", name: "Loan Officer" },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("loanops_user")) || null; }
    catch { return null; }
  });

  const login = (username, password) => {
    const entry = CREDENTIALS[username.toLowerCase()];
    if (!entry || entry.password !== password) {
      throw new Error("Invalid username or password.");
    }
    const userData = { username: username.toLowerCase(), role: entry.role, name: entry.name };
    sessionStorage.setItem("loanops_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem("loanops_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
