import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/i18n";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import NewPatient from "@/pages/NewPatient";
import PatientDetail from "@/pages/PatientDetail";
import Appointments from "@/pages/Appointments";
import ModuleList from "@/pages/ModuleList";
import Users from "@/pages/Users";
import ClinicSettings from "@/pages/ClinicSettings";
import AuditLog from "@/pages/AuditLog";
import AnamnesisWizard from "@/pages/AnamnesisWizard";
import PatientPortal from "@/pages/PatientPortal";

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready || user === null) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Yükleniyor...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "PATIENT") return <Navigate to="/portal" replace />;
  return children;
}

function PatientProtected({ children }) {
  const { user, ready } = useAuth();
  if (!ready || user === null) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Yükleniyor...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/anamnez/:patientId" element={<AnamnesisWizard />} />
      <Route path="/portal" element={<PatientProtected><PatientPortal /></PatientProtected>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/new" element={<NewPatient />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/encounters" element={<ModuleList moduleKey="encounters" />} />
        <Route path="/hbot-treatments" element={<ModuleList moduleKey="hbot_treatments" />} />
        <Route path="/hbot-sessions" element={<ModuleList moduleKey="hbot_sessions" />} />
        <Route path="/wounds" element={<ModuleList moduleKey="wounds" />} />
        <Route path="/labs" element={<ModuleList moduleKey="labs" />} />
        <Route path="/imaging" element={<ModuleList moduleKey="imaging" />} />
        <Route path="/documents" element={<ModuleList moduleKey="documents" />} />
        <Route path="/reports" element={<ModuleList moduleKey="reports" />} />
        <Route path="/users" element={<Users />} />
        <Route path="/clinic-settings" element={<ClinicSettings />} />
        <Route path="/audit" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}
