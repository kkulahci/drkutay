import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n";
import { DemoBadge, fmtDay } from "@/components/common";
import { generateSoapReport } from "@/components/patient/SoapReport";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GenericTab from "@/components/patient/GenericTab";
import TimelineTab from "@/components/patient/TimelineTab";
import WoundTab from "@/components/patient/WoundTab";
import SafetyTab from "@/components/patient/SafetyTab";
import HbotTab from "@/components/patient/HbotTab";
import ConsentTab from "@/components/patient/ConsentTab";
import AnamnesisTab from "@/components/patient/AnamnesisTab";
import DocumentsTab from "@/components/patient/DocumentsTab";
import AISummaryButton from "@/components/AISummaryButton";
import PortalAccessButton from "@/components/patient/PortalAccessButton";
import { ArrowLeft, FileBarChart, Tablet, Phone, Droplet } from "lucide-react";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [p, setP] = useState(null);

  const canClinical = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE"].includes(user?.role);
  const canMedical = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"].includes(user?.role);
  const canStaff = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE", "SECRETARY"].includes(user?.role);

  useEffect(() => { api.get(`/patients/${id}`).then(setP).catch(() => {}); }, [id]);
  if (!p) return <div className="text-slate-400">{t("loading")}</div>;

  return (
    <div>
      <button onClick={() => navigate("/patients")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-3"><ArrowLeft className="w-4 h-4" /> {t("patients")}</button>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl font-heading font-bold">{p.first_name?.[0]}{p.last_name?.[0]}</div>
          <div>
            <h1 className="text-xl font-heading font-bold flex items-center">{p.first_name} {p.last_name}<DemoBadge item={p} /></h1>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1 flex-wrap">
              <span className="font-mono text-teal-700">{p.patient_number}</span>
              {p.gender && <span>{p.gender}</span>}
              {p.birth_date && <span>{fmtDay(p.birth_date)}</span>}
              {p.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{p.phone}</span>}
              {p.blood_type && <span className="flex items-center gap-1"><Droplet className="w-3.5 h-3.5" />{p.blood_type}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canMedical && <AISummaryButton patientId={id} capability="anamnesis_summary" label="AI Anamnez Özeti" />}
          {canMedical && <AISummaryButton patientId={id} capability="soap_draft" label="AI SOAP Taslağı" />}
          <Button data-testid="open-kiosk-btn" variant="outline" onClick={() => navigate(`/anamnez/${p.id}`)}><Tablet className="w-4 h-4 mr-2" />{t("start_wizard")}</Button>
          {canStaff && <PortalAccessButton patient={p} />}
          <Button data-testid="soap-report-btn" onClick={() => generateSoapReport(p)} className="bg-teal-600 hover:bg-teal-700"><FileBarChart className="w-4 h-4 mr-2" />{t("generate_report")}</Button>
        </div>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList className="flex flex-wrap h-auto bg-white border border-slate-200 p-1 gap-1">
          {[["timeline", t("timeline")], ["anamnesis", t("anamnesis")], ["appointments", t("appointments")], ["encounters", t("encounters")], ["vitals", t("vitals")], ["physexam", "Fizik Muayene"], ["safety", t("safety")], ["wounds", t("wounds")], ["hbot", t("hbot")], ["labs", t("labs")], ["imaging", t("imaging")], ["documents", t("documents")], ["consents", t("consents")]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} data-testid={`tab-${v}`} className="data-[state=active]:bg-teal-600 data-[state=active]:text-white text-sm">{l}</TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="timeline"><TimelineTab patientId={id} /></TabsContent>
          <TabsContent value="anamnesis"><AnamnesisTab patientId={id} canWrite={canClinical} /></TabsContent>
          <TabsContent value="appointments"><GenericTab patientId={id} endpoint="/appointments" schemaKey="appointments" title="Randevu" canWrite={canStaff} columns={[["date", "Tarih", "datetime"], ["reason", "Sebep"], ["doctor_name", "Doktor"], ["status", "Durum", "status"]]} /></TabsContent>
          <TabsContent value="encounters"><GenericTab patientId={id} endpoint="/encounters" schemaKey="encounters" title="Muayene" canWrite={canClinical} columns={[["date", "Tarih", "datetime"], ["chief_complaint", "Şikâyet"], ["doctor_name", "Doktor"]]} /></TabsContent>
          <TabsContent value="vitals"><GenericTab patientId={id} endpoint="/vitals" schemaKey="vitals" title="Vital Bulgu" canWrite={canClinical} columns={[["date", "Tarih", "datetime"], ["ta", "TA"], ["pulse", "Nabız"], ["spo2", "SpO2"], ["weight", "Kilo"]]} /></TabsContent>
          <TabsContent value="physexam"><GenericTab patientId={id} endpoint="/physical-examinations" schemaKey="physical_examinations" title="Fizik Muayene" canWrite={canClinical} columns={[["date", "Tarih", "datetime"], ["general_state", "Genel durum"], ["ent", "KBB"]]} /></TabsContent>
          <TabsContent value="safety"><SafetyTab patientId={id} canWrite={canClinical} /></TabsContent>
          <TabsContent value="wounds"><WoundTab patientId={id} canWrite={canClinical} /></TabsContent>
          <TabsContent value="hbot"><HbotTab patientId={id} canWrite={canClinical} /></TabsContent>
          <TabsContent value="labs"><GenericTab patientId={id} endpoint="/lab-results" schemaKey="lab_results" title="Laboratuvar" canWrite={canClinical} columns={[["date", "Tarih", "datetime"], ["panel", "Panel"], ["glucose", "Glukoz"], ["hba1c", "HbA1c"], ["crp", "CRP"]]} /></TabsContent>
          <TabsContent value="imaging"><GenericTab patientId={id} endpoint="/imaging-records" schemaKey="imaging_records" title="Görüntüleme" canWrite={canClinical} columns={[["date", "Tarih", "datetime"], ["modality", "Modalite"], ["region", "Bölge"]]} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab patientId={id} canWrite={canStaff} /></TabsContent>
          <TabsContent value="consents"><ConsentTab patientId={id} patient={p} canWrite={canClinical} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
