import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n";
import { fmtDate, fmtDay } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ClipboardList, CalendarDays, LogOut, FileText, Globe } from "lucide-react";

export default function PatientPortal() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [forms, setForms] = useState([]);
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    api.get("/portal/me").then(setMe).catch(() => {});
    api.get("/portal/anamnesis").then(setForms).catch(() => {});
    api.get("/portal/appointments").then(setAppts).catch(() => {});
  }, []);

  const doLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-8 gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
        <span className="font-heading font-extrabold text-lg">Hasta Portalı</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setLang(lang === "tr" ? "en" : "tr")} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-full px-3 py-1.5 hover:border-teal-500"><Globe className="w-3.5 h-3.5" />{lang === "tr" ? "EN" : "TR"}</button>
          <Button data-testid="portal-logout" variant="outline" size="sm" onClick={doLogout}><LogOut className="w-4 h-4 mr-1.5" />Çıkış</Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-2xl p-6 mb-6">
          <p className="text-teal-100 text-sm">Hoş geldiniz</p>
          <h1 className="text-2xl font-heading font-bold">{me ? `${me.first_name} ${me.last_name}` : "..."}</h1>
          {me && <p className="text-teal-100 text-sm mt-1 font-mono">{me.patient_number}</p>}
        </div>

        <Card className="p-6 border border-slate-200 mb-5">
          <div className="flex items-center gap-2 mb-2"><ClipboardList className="w-5 h-5 text-teal-600" /><h2 className="font-heading font-semibold text-lg">Anamnez Formu</h2></div>
          <p className="text-slate-500 text-sm mb-4">Sağlık geçmişinizi ve şikâyetlerinizi adım adım doldurun. Bilgileriniz hekiminiz tarafından gözden geçirilecektir.</p>
          <Button data-testid="portal-fill-anamnesis" disabled={!me} onClick={() => navigate(`/anamnez/${me.id}`)} className="bg-teal-600 hover:bg-teal-700 h-12 text-base w-full sm:w-auto px-8">
            Anamnez Formunu Doldur
          </Button>
        </Card>

        <Card className="p-6 border border-slate-200 mb-5">
          <div className="flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-teal-600" /><h2 className="font-heading font-semibold text-lg">Gönderdiğim Formlar</h2></div>
          {forms.length ? forms.map((f) => (
            <div key={f.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
              <span>{f.complaint || "Anamnez"}</span>
              <div className="flex items-center gap-2"><Badge className={f.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>{f.status === "approved" ? "Onaylandı" : "Gönderildi"}</Badge><span className="text-xs text-slate-400">{fmtDay(f.date)}</span></div>
            </div>
          )) : <p className="text-sm text-slate-400">Henüz form göndermediniz.</p>}
        </Card>

        <Card className="p-6 border border-slate-200">
          <div className="flex items-center gap-2 mb-3"><CalendarDays className="w-5 h-5 text-teal-600" /><h2 className="font-heading font-semibold text-lg">Randevularım</h2></div>
          {appts.length ? appts.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
              <span>{a.reason || "Randevu"}</span><span className="text-xs text-slate-400">{fmtDate(a.date)}</span>
            </div>
          )) : <p className="text-sm text-slate-400">Randevu bulunmuyor.</p>}
        </Card>
      </div>
    </div>
  );
}
