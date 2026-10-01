# HBOT CLINIC — PRD

## Original Problem Statement
Multi-tenant HBOT (Hyperbaric Oxygen Therapy) & chronic wound patient management, anamnesis, safety screening, treatment and outpatient follow-up system. Must be portable (no vendor lock-in), modular, RBAC, clinic_id data isolation, future SaaS-ready. Clinical decision SUPPORT only — never auto-diagnoses or makes final contraindication decisions.

## Architecture
- **Backend** FastAPI + MongoDB (Motor). Modular layers under `/app/backend`:
  - `core/` — config (env-only), database (repository boundary), security (bcrypt+JWT), deps (auth/RBAC/clinic_filter), audit (append-only), storage (file abstraction, placeholder adapter — TODO real object storage), ai_service (architecture-only stub, GPT 6 Luna planned, disabled V1), crud (generic clinic-scoped, soft-delete, audited CRUD factory).
  - `routers/` — auth, public (kiosk), clinics, users, patients (+timeline+search), dashboard, reference (ICD/SUT versioned), audit+ai. Generic CRUD modules registered in `server.py` CRUD_MODULES.
  - `seed.py` — admin + demo clinic + 4 staff + 4 DEMO patients (diabetic foot, sudden hearing loss, osteomyelitis, chronic wound) + ICD/SUT demo reference.
- **Frontend** React + Tailwind + shadcn/ui + recharts. i18n (TR/EN toggle). AuthContext (cookie session). Sidebar layout, global search, role-based nav. Patient detail = tabbed clinical workspace. Kiosk anamnesis wizard uses anonymous `/api/public/*` endpoints.
- **Auth** Dual: JWT email/password (httpOnly cookies) + Emergent Google Auth (`/api/auth/session`). RBAC enforced server-side; clinic_id isolation via `clinic_filter`.

## Roles
SUPER_ADMIN (all clinics), CLINIC_ADMIN, DOCTOR (medical writes), NURSE (clinical writes), SECRETARY (patients/appointments only, no medical notes), PATIENT (kiosk anamnesis only).

## Implemented (2026-10-01)
- Auth (JWT + Google), RBAC, clinic isolation, brute-force lockout, password reset (console link).
- Patients: CRUD, auto number HB-YYYY-NNNNNN, timeline aggregation, global search, soft-delete.
- Anamnesis: 9-step kiosk wizard (mobile), patient-submitted tag, staff review/approve.
- HBOT safety screening: 16 risk questions, warning banner, "Hekim değerlendirmesi gerekli", manual physician outcome. Diabetic foot module.
- Encounters, vitals (BMI fields), physical exam.
- Wounds: multi-wound (W-NNNNN), assessments, TIME model (tissue %=100 check), auto area, healing chart, % change (measurement-only note), photo compare (URL-based, storage deferred).
- HBOT treatment plans, sessions (+pre/post glucose), adverse events with dashboard alert.
- Labs, imaging, documents (metadata), consents (versioned text immutable + signature pad).
- Dashboard with clickable KPIs + alerts + doctor distribution + recent actions.
- Audit log (append-only, read-only, no update/delete endpoints), soft-delete everywhere.
- SOAP/Polyclinic report (one-click printable/PDF).
- Users & Clinic settings management. ICD/SUT versioned reference (all DEMO placeholder).

## Verified
Backend 31/31 pytest pass. Frontend: login all roles, dashboard, patient tabs, wound TIME+chart, kiosk wizard (anonymous, mobile) submit.

## TODO / Backlog (explicitly deferred)
- P0: Real file/object storage adapter (uploads currently metadata-only; wound photos accept URL).
- P1: Activate AI service layer (GPT 6 Luna) for summaries/SOAP drafts — must stay clinician-verified.
- P1: Appointments creation UI from patient profile; standalone module create flows.
- P2: Patient self-login portal (currently kiosk is anonymous-by-link / staff-launched).
- P2: Real ICD-10/SUT datasets & rule engine (current data is DEMO placeholder only — no invented regulations/session limits).
- P2: Notifications UI, medical history/medications/allergies dedicated UI (endpoints exist).
