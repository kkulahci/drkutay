import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = checking
  const [ready, setReady] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const u = await api.get("/auth/me");
      setUser(u);
    } catch {
      setUser(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // If returning from Google OAuth callback, let AuthCallback handle it first.
    if (window.location.hash?.includes("session_id=")) {
      setReady(true);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const u = await api.post("/auth/login", { email, password });
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await api.post("/auth/logout", {}); } catch {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, ready, setUser, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
