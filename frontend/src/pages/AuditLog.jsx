import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { PageHeader, fmtDate, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTION_COLOR = {
  CREATE: "bg-emerald-100 text-emerald-700", UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700", VIEW: "bg-slate-100 text-slate-600",
  LOGIN: "bg-teal-100 text-teal-700", LOGOUT: "bg-slate-100 text-slate-600",
  REGISTER: "bg-indigo-100 text-indigo-700", LOGIN_GOOGLE: "bg-teal-100 text-teal-700",
};

export default function AuditLog() {
  const { t } = useLang();
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/audit").then(setLogs).catch(() => {}); }, []);

  return (
    <div>
      <PageHeader title={t("audit_log")} subtitle="Salt-okunur, değiştirilemez kayıt" />
      <Card className="border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr><th className="text-left px-4 py-3">Zaman</th><th className="text-left px-4 py-3">Kullanıcı</th>
                <th className="text-left px-4 py-3">İşlem</th><th className="text-left px-4 py-3">Kayıt Türü</th><th className="text-left px-4 py-3">IP</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} data-testid={`audit-row-${l.id}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(l.timestamp)}</td>
                  <td className="px-4 py-3">{l.user_name || "-"}</td>
                  <td className="px-4 py-3"><Badge className={ACTION_COLOR[l.action] || "bg-slate-100 text-slate-600"}>{l.action}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{l.record_type}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{l.ip || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!logs.length && <div className="p-6"><EmptyState text={t("no_records")} /></div>}
      </Card>
    </div>
  );
}
