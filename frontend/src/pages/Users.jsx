import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["CLINIC_ADMIN", "DOCTOR", "NURSE", "SECRETARY"];

export default function Users() {
  const { t } = useLang();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ role: "DOCTOR" });
  const canManage = ["SUPER_ADMIN", "CLINIC_ADMIN"].includes(user?.role);

  const load = () => api.get("/users").then(setUsers).catch(() => {});
  useEffect(() => { load(); api.get("/clinics").then(setClinics).catch(() => {}); }, []);

  const save = async () => {
    try {
      await api.post("/users", form);
      toast.success("Kullanıcı eklendi"); setOpen(false); setForm({ role: "DOCTOR" }); load();
    } catch (e) { toast.error(e.response?.data?.detail ? String(e.response.data.detail) : "Hata"); }
  };

  return (
    <div>
      <PageHeader title={t("users")}>
        {canManage && <Button data-testid="new-user-btn" onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />{t("new_user")}</Button>}
      </PageHeader>
      <Card className="border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr><th className="text-left px-4 py-3">{t("name")}</th><th className="text-left px-4 py-3">{t("email")}</th>
              <th className="text-left px-4 py-3">{t("role")}</th><th className="text-left px-4 py-3">{t("title")}</th><th className="text-left px-4 py-3">{t("active")}</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3"><Badge className="bg-slate-100 text-slate-700">{u.role}</Badge></td>
                <td className="px-4 py-3 text-slate-600">{u.title || "-"}</td>
                <td className="px-4 py-3">{u.active === false ? "Hayır" : "Evet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <div className="p-6"><EmptyState text={t("no_records")} /></div>}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("new_user")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">{t("name")}</Label><Input data-testid="user-name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">{t("email")}</Label><Input data-testid="user-email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">{t("password")}</Label><Input data-testid="user-password" type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">{t("role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="user-role" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {user?.role === "SUPER_ADMIN" && (
              <div><Label className="text-xs">Klinik</Label>
                <Select value={form.clinic_id || ""} onValueChange={(v) => setForm({ ...form, clinic_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Klinik seçin" /></SelectTrigger>
                  <SelectContent>{clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-xs">{t("title")}</Label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button data-testid="user-save" onClick={save} className="bg-teal-600 hover:bg-teal-700">{t("save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
