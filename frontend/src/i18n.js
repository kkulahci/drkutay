// Lightweight i18n (tr default + en). t(key) with fallback to key.
import React, { createContext, useContext, useState, useCallback } from "react";

const DICT = {
  tr: {
    app_name: "HBOT Klinik", login: "Giriş Yap", logout: "Çıkış", email: "E-posta",
    password: "Şifre", welcome_back: "Tekrar hoş geldiniz", sign_in_google: "Google ile Giriş",
    or: "veya", dashboard: "Panel", patients: "Hastalar", new_patient: "Yeni Hasta",
    appointments: "Randevular", encounters: "Muayeneler", hbot_treatments: "HBOT Tedavileri",
    hbot_sessions: "HBOT Seansları", wound_tracking: "Yara Takibi", laboratory: "Laboratuvar",
    imaging: "Görüntüleme", documents: "Belgeler", reports: "Raporlar", users: "Kullanıcılar",
    clinic_settings: "Klinik Ayarları", audit_log: "Audit Log", search_placeholder: "Hasta, numara, telefon, TC, yara ID ara...",
    appts_today: "Bugünkü Randevular", sessions_today: "Bugünkü HBOT Seansları",
    active_hbot: "Aktif HBOT Hastaları", new_patients: "Yeni Hastalar (7g)",
    active_wounds: "Aktif Yara Hastaları", total_patients: "Toplam Hasta",
    risk_alerts: "Risk Uyarıları", adverse_events: "Advers Olaylar (7g)",
    missing_anamnesis: "Eksik Anamnez", missing_consents: "Eksik Onam",
    recent_actions: "Son İşlemler", doctor_distribution: "Doktor Bazında Seans Dağılımı",
    first_name: "Ad", last_name: "Soyad", tc: "T.C. Kimlik No", birth_date: "Doğum Tarihi",
    gender: "Cinsiyet", phone: "Telefon", phone2: "İkinci Telefon", address: "Adres",
    emergency_contact: "Acil Durumda Aranacak", blood_type: "Kan Grubu",
    referral_institution: "Sevk Eden Kurum", referral_doctor: "Sevk Eden Doktor",
    save: "Kaydet", cancel: "İptal", add: "Ekle", edit: "Düzenle", delete: "Arşivle",
    patient_no: "Hasta No", name: "Ad Soyad", actions: "İşlemler", overview: "Genel Bakış",
    timeline: "Zaman Çizelgesi", anamnesis: "Anamnez", wounds: "Yaralar", hbot: "HBOT",
    labs: "Laboratuvar", safety: "Güvenlik Taraması", consents: "Onamlar",
    create_patient: "Hasta Oluştur", no_records: "Kayıt yok", loading: "Yükleniyor...",
    role: "Rol", new_user: "Yeni Kullanıcı", title: "Ünvan", active: "Aktif",
    hbot_safety_warning: "HBOT GÜVENLİK UYARISI", clinician_decision: "Nihai karar yetkili hekim tarafından verilmelidir.",
    doctor_outcome: "Hekim Kararı", generate_report: "Poliklinik Raporu Oluştur",
    sign: "İmzala", clear: "Temizle", start_wizard: "Anamnez Formunu Aç",
    step: "Adım", next: "İleri", back: "Geri", finish: "Gönder",
    demo_badge: "DEMO", patient_submitted: "Hasta tarafından girildi", approve: "Onayla",
    healing_chart: "Yara İyileşme Grafiği", photo_compare: "Fotoğraf Karşılaştırma",
    time_model: "TIME Modeli", diabetic_foot: "Diyabetik Ayak", vitals: "Vital Bulgular",
    add_record: "Kayıt Ekle", view: "Görüntüle", today: "Bugün",
  },
  en: {
    app_name: "HBOT Clinic", login: "Sign In", logout: "Logout", email: "Email",
    password: "Password", welcome_back: "Welcome back", sign_in_google: "Sign in with Google",
    or: "or", dashboard: "Dashboard", patients: "Patients", new_patient: "New Patient",
    appointments: "Appointments", encounters: "Encounters", hbot_treatments: "HBOT Treatments",
    hbot_sessions: "HBOT Sessions", wound_tracking: "Wound Tracking", laboratory: "Laboratory",
    imaging: "Imaging", documents: "Documents", reports: "Reports", users: "Users",
    clinic_settings: "Clinic Settings", audit_log: "Audit Log", search_placeholder: "Search patient, number, phone, ID, wound ID...",
    appts_today: "Today's Appointments", sessions_today: "Today's HBOT Sessions",
    active_hbot: "Active HBOT Patients", new_patients: "New Patients (7d)",
    active_wounds: "Active Wound Patients", total_patients: "Total Patients",
    risk_alerts: "Risk Alerts", adverse_events: "Adverse Events (7d)",
    missing_anamnesis: "Missing Anamnesis", missing_consents: "Missing Consents",
    recent_actions: "Recent Actions", doctor_distribution: "Sessions by Doctor",
    first_name: "First Name", last_name: "Last Name", tc: "National ID", birth_date: "Birth Date",
    gender: "Gender", phone: "Phone", phone2: "Second Phone", address: "Address",
    emergency_contact: "Emergency Contact", blood_type: "Blood Type",
    referral_institution: "Referral Institution", referral_doctor: "Referral Doctor",
    save: "Save", cancel: "Cancel", add: "Add", edit: "Edit", delete: "Archive",
    patient_no: "Patient No", name: "Full Name", actions: "Actions", overview: "Overview",
    timeline: "Timeline", anamnesis: "Anamnesis", wounds: "Wounds", hbot: "HBOT",
    labs: "Laboratory", safety: "Safety Screening", consents: "Consents",
    create_patient: "Create Patient", no_records: "No records", loading: "Loading...",
    role: "Role", new_user: "New User", title: "Title", active: "Active",
    hbot_safety_warning: "HBOT SAFETY WARNING", clinician_decision: "Final decision must be made by an authorized physician.",
    doctor_outcome: "Physician Decision", generate_report: "Generate Polyclinic Report",
    sign: "Sign", clear: "Clear", start_wizard: "Open Anamnesis Form",
    step: "Step", next: "Next", back: "Back", finish: "Submit",
    demo_badge: "DEMO", patient_submitted: "Submitted by patient", approve: "Approve",
    healing_chart: "Wound Healing Chart", photo_compare: "Photo Comparison",
    time_model: "TIME Model", diabetic_foot: "Diabetic Foot", vitals: "Vitals",
    add_record: "Add Record", view: "View", today: "Today",
  },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("hbot_lang") || "tr");
  const change = useCallback((l) => { localStorage.setItem("hbot_lang", l); setLang(l); }, []);
  const t = useCallback((key) => (DICT[lang] && DICT[lang][key]) || (DICT.tr[key]) || key, [lang]);
  return <LangContext.Provider value={{ lang, setLang: change, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
