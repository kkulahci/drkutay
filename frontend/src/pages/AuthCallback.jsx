import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    (async () => {
      if (!sessionId) { navigate("/login"); return; }
      try {
        const user = await api.post("/auth/session", { session_id: sessionId });
        setUser(user);
        window.history.replaceState({}, document.title, "/");
        navigate("/");
      } catch {
        navigate("/login");
      }
    })();
  }, [navigate, setUser]);

  return <div className="min-h-screen flex items-center justify-center text-slate-500">Giriş yapılıyor...</div>;
}
