# HBOT CLINIC — Tam Kod Mimarisi ve Kurulum Rehberi

Multi-tenant (clinic_id izolasyonlu) Hiperbarik Oksijen Tedavisi (HBOT) & Kronik Yara hasta yönetim sistemi.
Stack: **React 19 + FastAPI + MongoDB**. Vendor-lock-in yok; tüm sırlar environment variable'da, veritabanı erişimi ayrı katmanda, dosya depolama ve AI adapter arkasında.

---

## 1. ÜST SEVİYE DİZİN YAPISI

```
/app
├── backend/                 # FastAPI + MongoDB (Python)
│   ├── .env                 # SIRLAR — GitHub'a GİTMEZ, elle aktarılır
│   ├── requirements.txt     # Python bağımlılıkları
│   ├── server.py            # Uygulama girişi, router kayıtları, startup (seed + storage init)
│   ├── models.py            # Pydantic modelleri (auth/clinic/user/patient)
│   ├── seed.py              # Admin + demo klinik + 4 personel + 4 DEMO hasta + ICD/SUT demo
│   ├── core/                # Çekirdek servis/altyapı katmanı (taşınabilirlik sınırı)
│   │   ├── config.py        # Env-only ayarlar + RBAC rol listeleri
│   │   ├── database.py      # MongoDB bağlantısı (repository sınırı) + id/sayaç yardımcıları
│   │   ├── security.py      # bcrypt şifre hash + JWT üret/çöz
│   │   ├── deps.py          # get_current_user, require_roles, clinic_filter (yetki + tenant izolasyonu)
│   │   ├── audit.py         # Append-only audit log yazıcı (hassas alan maskeleme)
│   │   ├── crud.py          # Generic clinic-scoped + soft-delete + audit CRUD router fabrikası
│   │   ├── storage.py       # Dosya depolama ABSTRACTION (Emergent object storage adapter)
│   │   └── ai_service.py    # AI servis katmanı (GPT 6 Luna via emergentintegrations)
│   └── routers/             # HTTP uç noktaları (hepsi /api önekli)
│       ├── auth.py          # login/register/me/logout/refresh/forgot/reset + Google session
│       ├── public.py        # Anonim kiosk anamnez uç noktaları
│       ├── portal.py        # Hasta portalı (PATIENT rolü) uç noktaları
│       ├── clinics.py       # Klinik CRUD
│       ├── users.py         # Kullanıcı yönetimi
│       ├── patients.py      # Hasta CRUD + timeline + global search + portal-access
│       ├── dashboard.py     # Dashboard KPI istatistikleri
│       ├── reference.py     # ICD-10 + SUT (versiyonlu, DEMO)
│       ├── files.py         # Dosya yükleme/indirme/listeleme (object storage)
│       ├── ai.py            # AI özet/SOAP uç noktaları (bağlam sunucuda toplanır)
│       └── audit.py         # Audit log okuma (yalnızca-okunur, append-only)
│
├── frontend/                # React 19 + Tailwind + shadcn/ui
│   ├── .env                 # REACT_APP_BACKEND_URL (ortam otomatik set eder)
│   ├── package.json         # JS bağımlılıkları (yarn)
│   ├── tailwind.config.js
│   └── src/
│       ├── index.js / index.css / App.css
│       ├── App.js           # Router: /login, /anamnez/:id, /portal, korumalı panel rotaları
│       ├── i18n.js          # TR/EN sözlük + LangProvider + useLang()
│       ├── context/AuthContext.jsx   # Oturum durumu (cookie tabanlı), login/logout
│       ├── lib/
│       │   ├── api.js        # axios instance (withCredentials) + upload + fileUrl
│       │   └── schemas.js    # Form şemaları (muayene, lab, HBOT, güvenlik soruları, diyabetik ayak...)
│       ├── components/
│       │   ├── Layout.jsx           # Sidebar + üst bar + global search + dil + kullanıcı menüsü
│       │   ├── GlobalSearch.jsx     # Üst menü arama (hasta/yara)
│       │   ├── RecordForm.jsx       # Şemadan dinamik kayıt formu (ICD autocomplete dahil)
│       │   ├── FileUpload.jsx       # Dosya yükleme butonu
│       │   ├── AISummaryButton.jsx  # AI taslak diyaloğu (hekim onayı)
│       │   ├── common.jsx           # DemoBadge, StatusBadge, PageHeader, tarih yardımcıları
│       │   └── patient/             # Hasta profili sekmeleri
│       │       ├── TimelineTab.jsx       # Kronolojik zaman çizelgesi
│       │       ├── AnamnesisTab.jsx      # Anamnez inceleme/onay
│       │       ├── GenericTab.jsx        # Şema tabanlı liste+form (muayene/vital/lab/görüntüleme/randevu)
│       │       ├── SafetyTab.jsx         # HBOT güvenlik taraması + diyabetik ayak + uyarı
│       │       ├── WoundTab.jsx          # Çoklu yara + TIME + iyileşme grafiği + foto karşılaştırma
│       │       ├── HbotTab.jsx           # Tedavi planı + seanslar + advers olay
│       │       ├── ConsentTab.jsx        # Versiyonlu onam + dijital imza pad
│       │       ├── DocumentsTab.jsx      # Belge/dosya galerisi + yükleme
│       │       ├── PortalAccessButton.jsx# Hastaya portal giriş bilgisi oluşturma
│       │       └── SoapReport.js         # Tek-tık poliklinik (SOAP) PDF (yazdırılabilir)
│       └── pages/
│           ├── Login.jsx             # JWT + Google giriş
│           ├── AuthCallback.jsx      # Google OAuth dönüş işleyici
│           ├── Dashboard.jsx         # Tıklanabilir KPI kartları + grafik + son işlemler
│           ├── Patients.jsx          # Hasta listesi + filtre
│           ├── NewPatient.jsx        # Yeni hasta formu
│           ├── PatientDetail.jsx     # Hasta profili (tüm sekmeleri orkestre eder)
│           ├── Appointments.jsx      # Günlük takvim görünümü
│           ├── ModuleList.jsx        # Klinik-geneli modül listeleri (sidebar öğeleri)
│           ├── Users.jsx             # Kullanıcı yönetimi
│           ├── ClinicSettings.jsx    # Klinik ayarları + SUT kuralları
│           ├── AuditLog.jsx          # Audit log görüntüleme
│           ├── AnamnesisWizard.jsx   # 9 adımlı kiosk anamnez sihirbazı (mobil)
│           └── PatientPortal.jsx     # Hasta portalı (PATIENT rolü)
│
└── memory/
    ├── test_credentials.md   # Demo hesaplar
    └── PRD.md                # Ürün gereksinim dokümanı
```

---

## 2. MİMARİ KATMANLAR (taşınabilirlik için kritik)

```
İstek → routers/* (HTTP + yetki) → core/deps (auth/RBAC/clinic_filter)
      → core/crud veya özel router mantığı
      → core/database (MongoDB repository sınırı)
      → core/storage (dosya) / core/ai_service (LLM) / core/audit (log)
```

- **İş mantığı frontend'de değil backend'de.** Frontend yalnızca sunum + REACT_APP_BACKEND_URL ile API çağrısı.
- **Veritabanı erişimi** yalnızca `core/database.py` üzerinden (`db` nesnesi). Sağlayıcı değişirse tek dosya değişir.
- **Dosya depolama** `core/storage.py` içindeki `StorageAdapter` arkasında. S3/GCS/kendi sunucu adapter'ı eklemek yeterli.
- **AI** `core/ai_service.py` arkasında; çıktılar her zaman "hekim onayı gerektiren TASLAK".
- **Tüm sırlar** `.env` → `core/config.py`. Koda gömülü sır yok.

---

## 3. ROL TABANLI ERİŞİM (RBAC) + TENANT İZOLASYONU

Roller: `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `NURSE`, `SECRETARY`, `PATIENT`

- `core/deps.py → clinic_filter(user)`: SUPER_ADMIN hariç her sorguya `clinic_id` filtresi ekler → **klinik veri izolasyonu**.
- `require_roles(...)`: uç nokta bazında yazma yetkisi. SECRETARY tıbbi not yazamaz; PATIENT yalnızca kendi portalı.
- Yetki **server-side** zorunlu; frontend kontrolüne güvenilmez.
- `core/audit.py`: görüntüleme/oluşturma/değiştirme/silme/login/logout/PDF/dosya işlemleri loglanır; audit log değiştirilemez (update/delete uç noktası yok).
- Soft-delete: her kayıtta `deleted_at` / `deleted_by`; fiziksel silme yok.

---

## 4. VERİTABANI KOLEKSİYONLARI (MongoDB)

clinics, users, user_sessions, login_attempts, password_reset_tokens, counters,
patients, patient_anamnesis, patient_medical_history, patient_medications, patient_allergies, patient_contacts,
appointments, encounters, vitals, physical_examinations, diagnoses,
wounds, wound_assessments, wound_photos,
hbot_safety_screenings, hbot_treatment_plans, hbot_sessions, adverse_events,
lab_results, imaging_records, documents, files, consents, signatures,
icd_codes, sut_indications, sut_rules, sut_versions, notifications, audit_logs

Otomatik kodlar: hasta `HB-YYYY-NNNNNN`, yara `W-NNNNN` (counters koleksiyonu).

---

## 5. ENVIRONMENT VARIABLES (GitHub'a gitmez — elle aktarın)

### backend/.env
```
MONGO_URL=mongodb://localhost:27017       # ortam sağlar, değiştirmeyin
DB_NAME=test_database                      # ortam sağlar, değiştirmeyin
CORS_ORIGINS=*
JWT_SECRET=<yeni rastgele 64-hex üretin>    # python -c "import secrets;print(secrets.token_hex(32))"
ADMIN_EMAIL=<ilk süper admin e-posta>
ADMIN_PASSWORD=<güçlü şifre>
FRONTEND_URL=<ön yüz URL'si>
EMERGENT_AUTH_SESSION_URL=https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data
EMERGENT_LLM_KEY=<yeni kullanıcının kendi Emergent LLM anahtarı>   # AI + object storage
```
> Yeni kullanıcı AI özet ve dosya depolamayı kullanacaksa **kendi `EMERGENT_LLM_KEY`** değerini girmelidir (kullanım bakiyesi hesap bazlıdır). Anahtar: Profile → Manage plan → Universal Key.

### frontend/.env
```
REACT_APP_BACKEND_URL=<otomatik set edilir>   # tüm API çağrıları bunu kullanır
```

---

## 6. KURULUM (yeni kullanıcı GitHub'dan import ettikten sonra)

```bash
# Backend
cd backend
pip install -r requirements.txt
# (emergentintegrations için gerekirse):
# pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Frontend
cd ../frontend
yarn install            # NPM KULLANMAYIN — yarn

# Servisler supervisor ile yönetilir (Emergent ortamı):
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```
- Backend `0.0.0.0:8001`, frontend `3000` portunda (supervisor yönetir — değiştirmeyin).
- Tüm backend rotaları `/api` önekli (Kubernetes ingress bu öneki 8001'e yönlendirir).
- Startup'ta `seed.py` idempotent çalışır: admin + demo klinik + demo hasta + ICD/SUT demo oluşturur.

---

## 7. DEMO HESAPLAR (seed)

| Rol | E-posta | Şifre |
|-----|---------|-------|
| SUPER_ADMIN | (ADMIN_EMAIL değeri) | (ADMIN_PASSWORD değeri) |
| DOCTOR | doktor@demo.com | Demo!2026 |
| NURSE | hemsire@demo.com | Demo!2026 |
| SECRETARY | sekreter@demo.com | Demo!2026 |
| CLINIC_ADMIN | klinikadmin@demo.com | Demo!2026 |

Hasta portalı girişi, hasta profilindeki "Portal Erişimi" ile oluşturulur.

---

## 8. API UÇ NOKTALARI (hepsi /api önekli)

**Auth**: POST login, register, logout, refresh, forgot-password, reset-password, session (Google); GET me
**Public (kiosk)**: GET /public/patient/{id}; POST /public/anamnesis/{id}
**Portal (PATIENT)**: GET /portal/me, /portal/anamnesis, /portal/appointments; POST /portal/anamnesis
**Patients**: GET/POST/PUT/DELETE /patients, GET /patients/{id}/timeline, GET /patients/search, POST /patients/{id}/portal-access
**Dashboard**: GET /dashboard/stats, /dashboard/appointments-today
**Clinics / Users**: CRUD
**Reference**: GET /reference/icd, /reference/sut/indications, /reference/sut/rules, /reference/sut/versions
**Files**: POST /files/upload, GET /files, GET /files/{id}/download
**AI**: GET /ai/capabilities, POST /ai/{capability}  (anamnesis_summary, soap_draft, timeline_summary, wound_change_summary, missing_data_check, encounter_delta_summary)
**Audit**: GET /audit
**Generic CRUD** (clinic-scoped + soft-delete + audit): /appointments, /encounters, /vitals, /physical-examinations, /diagnoses, /wounds, /wound-assessments, /wound-photos, /hbot-safety-screenings, /hbot-treatment-plans, /hbot-sessions, /adverse-events, /lab-results, /imaging-records, /documents, /consents, /signatures, /anamnesis, /medical-history, /medications, /allergies, /patient-contacts, /notifications

---

## 9. ENTEGRASYONLAR
- **JWT auth** (bcrypt, httpOnly cookie) + **Emergent Google Auth** (session_token).
- **Emergent Object Storage** (core/storage.py) — yara foto + belgeler.
- **GPT 6 Luna** (emergentintegrations, EMERGENT_LLM_KEY) — AI özet/SOAP taslağı (yalnızca hekim onaylı taslak).

## 10. TRANSFER NOTLARI
- GitHub push ücretli plan gerektirir; `.env` ve veritabanı GitHub'a gitmez.
- Tam hesap transferi (DB dahil) için: support@emergent.sh
- Yeni ortamda `JWT_SECRET` yeniden üretilmeli, `ADMIN_EMAIL/PASSWORD` ve `EMERGENT_LLM_KEY` yeniden girilmeli.

## 11. ÖNEMLİ KLİNİK KURAL
Bu bir klinik karar DESTEK sistemidir: kendi başına tanı koymaz, otomatik tedavi/kontrendikasyon kararı vermez, uydurma ICD/SUT kuralı üretmez. Tüm ICD/SUT içerikleri DEMO placeholder'dır. Nihai karar yetkili hekime aittir.
```
```
