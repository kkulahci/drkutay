import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n";
import { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center"><Activity className="w-6 h-6" /></div>
            <span className="text-2xl font-heading font-extrabold">HBOT Klinik</span>
          </div>
          <p className="text-slate-400">Hiperbarik Oksijen & Kronik Yara Yönetim Sistemi</p>
        </div>
        <img src="https://images.unsplash.com/photo-1765830403209-a5eceac4c198?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
          alt="Hiperbarik oksijen kabini" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="relative z-10 space-y-3 text-slate-300">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-teal-400" /> Rol tabanlı erişim & klinik veri izolasyonu</div>
          <p className="text-xs text-slate-500">Klinik karar destek sistemi — nihai karar yetkili hekime aittir.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex justify-end mb-6">
            <button data-testid="lang-toggle" onClick={() => setLang(lang === "tr" ? "en" : "tr")}
              className="text-xs font-semibold text-slate-500 border border-slate-200 rounded-full px-3 py-1 hover:border-teal-500">
              {lang === "tr" ? "EN" : "TR"}
            </button>
          </div>
          <h1 className="text-2xl font-heading font-bold mb-1">{t("welcome_back")}</h1>
          <p className="text-slate-500 text-sm mb-6">{t("app_name")}</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>{t("email")}</Label>
              <Input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label>{t("password")}</Label>
              <Input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
            </div>
            {error && <p data-testid="login-error" className="text-sm text-red-600">{error}</p>}
            <Button data-testid="login-submit" type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 h-11">
              {loading ? "..." : t("login")}
            </Button>
          </form>
          <div className="flex items-center gap-3 my-5 text-xs text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />{t("or")}<div className="flex-1 h-px bg-slate-200" />
          </div>
          <Button data-testid="google-login" variant="outline" onClick={googleLogin} className="w-full h-11">
            {t("sign_in_google")}
          </Button>
        </div>
      </div>
    </div>
  );
}
