"""HBOT Clinic backend tests. Covers auth, RBAC, clinic isolation, patient CRUD,
timeline, search, dashboard, wounds (TIME + wound_code), HBOT, safety screenings,
labs, imaging, documents, consents, anamnesis wizard, audit append-only, reference."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hbot-patient-portal.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CREDS = {
    "SUPER_ADMIN": ("7vj48q7cz4@privaterelay.appleid.com", "HbotAdmin!2026"),
    "DOCTOR":      ("doktor@demo.com",       "Demo!2026"),
    "NURSE":       ("hemsire@demo.com",      "Demo!2026"),
    "SECRETARY":   ("sekreter@demo.com",     "Demo!2026"),
    "CLINIC_ADMIN":("klinikadmin@demo.com",  "Demo!2026"),
}


def _login(role):
    email, password = CREDS[role]
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"{role} login failed: {r.status_code} {r.text}"
    me = r.json()
    assert me["role"] == role
    return s, me


@pytest.fixture(scope="module")
def doctor():   return _login("DOCTOR")
@pytest.fixture(scope="module")
def nurse():    return _login("NURSE")
@pytest.fixture(scope="module")
def secretary():return _login("SECRETARY")
@pytest.fixture(scope="module")
def admin():    return _login("SUPER_ADMIN")
@pytest.fixture(scope="module")
def clinicadm():return _login("CLINIC_ADMIN")


# ---------- Auth ----------
class TestAuth:
    def test_login_each_role(self):
        for role in CREDS:
            s, me = _login(role)
            assert me["email"].lower() == CREDS[role][0].lower()
            assert me["role"] == role
            # SUPER_ADMIN may have null clinic
            if role != "SUPER_ADMIN":
                assert me.get("clinic_id") == "demo-clinic-0001"
            # cookies set
            assert "access_token" in s.cookies.get_dict()
            assert "refresh_token" in s.cookies.get_dict()

    def test_me_with_cookie(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "DOCTOR"

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": "doktor@demo.com", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_session_endpoint_exists(self):
        # No session_id -> 400 (endpoint reachable)
        r = requests.post(f"{API}/auth/session", json={}, timeout=15)
        assert r.status_code in (400, 401)


# ---------- Clinic isolation + RBAC ----------
class TestRBACIsolation:
    def test_doctor_sees_only_own_clinic(self, doctor):
        s, me = doctor
        r = s.get(f"{API}/patients", timeout=20)
        assert r.status_code == 200
        patients = r.json()
        assert len(patients) >= 1
        for p in patients:
            assert p.get("clinic_id") == me["clinic_id"]

    def test_super_admin_sees_all(self, admin, doctor):
        sa, _ = admin
        sd, _ = doctor
        ra = sa.get(f"{API}/patients", timeout=20).json()
        rd = sd.get(f"{API}/patients", timeout=20).json()
        assert len(ra) >= len(rd)

    def test_secretary_cannot_create_diagnosis(self, secretary, doctor):
        ss, _ = secretary
        sd, _ = doctor
        pid = sd.get(f"{API}/patients", timeout=20).json()[0]["id"]
        r = ss.post(f"{API}/diagnoses", json={"patient_id": pid, "description": "test"}, timeout=15)
        assert r.status_code == 403

    def test_secretary_cannot_create_encounter(self, secretary, doctor):
        ss, _ = secretary
        sd, _ = doctor
        pid = sd.get(f"{API}/patients", timeout=20).json()[0]["id"]
        r = ss.post(f"{API}/encounters", json={"patient_id": pid, "chief_complaint": "x"}, timeout=15)
        assert r.status_code == 403

    def test_doctor_can_create_diagnosis(self, doctor):
        s, _ = doctor
        pid = s.get(f"{API}/patients", timeout=20).json()[0]["id"]
        r = s.post(f"{API}/diagnoses", json={"patient_id": pid, "description": "TEST_dx", "code": "E11.9"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["description"] == "TEST_dx"

    def test_secretary_can_create_patient_and_appointment(self, secretary):
        s, _ = secretary
        payload = {"first_name": "TEST_Sec", "last_name": "Patient", "gender": "Erkek"}
        r = s.post(f"{API}/patients", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        r2 = s.post(f"{API}/appointments", json={"patient_id": pid, "reason": "TEST_appt",
                                                 "date": "2026-02-01T10:00:00Z"}, timeout=15)
        assert r2.status_code == 200, r2.text


# ---------- Patient CRUD ----------
class TestPatient:
    def test_create_and_patient_number(self, doctor):
        s, _ = doctor
        r = s.post(f"{API}/patients", json={"first_name": "TEST_John", "last_name": "Doe", "gender": "Erkek"}, timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["patient_number"].startswith("HB-2026-")
        assert len(p["patient_number"]) >= len("HB-2026-000001")
        TestPatient.pid = p["id"]

    def test_get_patient(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/patients/{TestPatient.pid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["first_name"] == "TEST_John"

    def test_update_patient(self, doctor):
        s, _ = doctor
        r = s.put(f"{API}/patients/{TestPatient.pid}",
                  json={"first_name": "TEST_John2", "last_name": "Doe", "gender": "Erkek"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["first_name"] == "TEST_John2"

    def test_timeline(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/patients/{TestPatient.pid}/timeline", timeout=15)
        assert r.status_code == 200
        events = r.json()
        assert any(e["type"] == "İlk Kayıt" for e in events)

    def test_global_search(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/patients/search", params={"q": "TEST_John2"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "patients" in data and "wounds" in data
        assert any(p["id"] == TestPatient.pid for p in data["patients"])

    def test_soft_delete(self, doctor):
        s, _ = doctor
        r = s.delete(f"{API}/patients/{TestPatient.pid}", timeout=15)
        assert r.status_code == 200
        # Should disappear from list
        lst = s.get(f"{API}/patients", timeout=15).json()
        assert not any(p["id"] == TestPatient.pid for p in lst)
        # And 404 on get
        r2 = s.get(f"{API}/patients/{TestPatient.pid}", timeout=15)
        assert r2.status_code == 404


# ---------- Dashboard ----------
class TestDashboard:
    def test_stats_contains_all_kpis(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for key in ["appointments_today", "hbot_sessions_today", "active_hbot_patients",
                    "new_patients_week", "active_wound_patients", "total_patients",
                    "risk_alerts", "adverse_events_week", "missing_anamnesis",
                    "missing_consents", "recent_actions", "doctor_distribution"]:
            assert key in d, f"missing kpi {key}"


# ---------- Wounds ----------
class TestWound:
    def test_create_wound_autocodes(self, doctor):
        s, _ = doctor
        pid = s.get(f"{API}/patients", timeout=15).json()[0]["id"]
        r = s.post(f"{API}/wounds", json={"patient_id": pid, "location": "TEST_sol_ayak",
                                           "etiology": "Diyabetik"}, timeout=15)
        assert r.status_code == 200, r.text
        w = r.json()
        assert w.get("wound_code", "").startswith("W-")
        TestWound.wid = w["id"]
        TestWound.pid = pid

    def test_wound_assessment_time(self, doctor):
        s, _ = doctor
        payload = {
            "patient_id": TestWound.pid, "wound_id": TestWound.wid,
            "length_cm": 4.0, "width_cm": 2.0, "depth_cm": 0.5,
            "tissue_granulation_pct": 50, "tissue_slough_pct": 30,
            "tissue_necrotic_pct": 10, "tissue_epithelial_pct": 10,
            "exudate": "Orta", "infection": "Yok",
        }
        r = s.post(f"{API}/wound-assessments", json=payload, timeout=15)
        assert r.status_code == 200, r.text


# ---------- HBOT + Safety ----------
class TestHBOT:
    def test_plan_and_session(self, doctor):
        s, _ = doctor
        pid = s.get(f"{API}/patients", timeout=15).json()[0]["id"]
        r = s.post(f"{API}/hbot-treatment-plans", json={"patient_id": pid, "indication": "TEST_dfs",
                                                         "sessions_planned": 20, "status": "Aktif"}, timeout=15)
        assert r.status_code == 200
        r2 = s.post(f"{API}/hbot-sessions", json={"patient_id": pid, "session_number": 1,
                                                   "pressure_ata": 2.4, "duration_min": 90}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["session_number"] == 1

    def test_safety_screening_has_risk(self, nurse):
        s, _ = nurse
        pid = s.get(f"{API}/patients", timeout=15).json()[0]["id"]
        r = s.post(f"{API}/hbot-safety-screenings", json={
            "patient_id": pid, "has_risk": True,
            "answers": {"pneumothorax": True, "copd": False},
            "outcome": "Hekim değerlendirmesi gerekli",
        }, timeout=15)
        assert r.status_code == 200
        rec = r.json()
        assert rec["has_risk"] is True
        assert rec["outcome"] == "Hekim değerlendirmesi gerekli"


# ---------- Lab / Imaging / Documents / Consents ----------
class TestClinical:
    def test_lab_result(self, doctor):
        s, _ = doctor
        pid = s.get(f"{API}/patients", timeout=15).json()[0]["id"]
        r = s.post(f"{API}/lab-results", json={"patient_id": pid, "panel": "TEST_CBC", "results": {}}, timeout=15)
        assert r.status_code == 200

    def test_imaging(self, doctor):
        s, _ = doctor
        pid = s.get(f"{API}/patients", timeout=15).json()[0]["id"]
        r = s.post(f"{API}/imaging-records", json={"patient_id": pid, "modality": "MR",
                                                    "finding": "TEST_fx"}, timeout=15)
        assert r.status_code == 200

    def test_document(self, secretary):
        s, _ = secretary
        pid = s.get(f"{API}/patients", timeout=15).json()[0]["id"]
        r = s.post(f"{API}/documents", json={"patient_id": pid, "filename": "TEST_doc.pdf",
                                              "url": "about:blank"}, timeout=15)
        assert r.status_code == 200

    def test_consent_with_signature(self, doctor):
        s, _ = doctor
        pid = s.get(f"{API}/patients", timeout=15).json()[0]["id"]
        payload = {"patient_id": pid, "consent_type": "TEST_HBOT",
                   "version": "v1", "text": "Onam metni...",
                   "signature_data": "data:image/png;base64,iVBORw0KG=="}
        r = s.post(f"{API}/consents", json=payload, timeout=15)
        assert r.status_code == 200
        c = r.json()
        assert c["signature_data"].startswith("data:image")


# ---------- Anamnesis wizard ----------
class TestAnamnesis:
    def test_patient_submit_and_staff_approve(self, doctor):
        s, _ = doctor
        pid = s.get(f"{API}/patients", timeout=15).json()[0]["id"]
        r = s.post(f"{API}/anamnesis", json={"patient_id": pid,
                                              "source": "Hasta tarafından girildi",
                                              "chronic_diseases": ["DM"]}, timeout=15)
        assert r.status_code == 200
        aid = r.json()["id"]
        r2 = s.put(f"{API}/anamnesis/{aid}", json={"source": "Hasta tarafından girildi",
                                                    "approved_by": "doctor",
                                                    "approved": True}, timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("approved") is True


# ---------- Audit append-only ----------
class TestAudit:
    def test_list_audit(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/audit", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_no_update_delete_endpoints(self, doctor):
        s, _ = doctor
        # Pick an arbitrary audit id if any
        items = s.get(f"{API}/audit", timeout=15).json()
        if not items:
            pytest.skip("no audit records to attempt mutation on")
        aid = items[0].get("id") or "x"
        for method, url in [("put", f"{API}/audit/{aid}"), ("delete", f"{API}/audit/{aid}"),
                            ("post", f"{API}/audit")]:
            r = getattr(s, method)(url, json={}, timeout=10) if method != "delete" else s.delete(url, timeout=10)
            assert r.status_code in (404, 405), f"{method} {url} should not exist, got {r.status_code}"


# ---------- Reference ----------
class TestReference:
    def test_icd_search(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/reference/icd", params={"q": "E11"}, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_sut_rules_versioned(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/reference/sut/rules", timeout=15)
        assert r.status_code == 200
        rules = r.json()
        if rules:
            assert "version" in rules[0]
