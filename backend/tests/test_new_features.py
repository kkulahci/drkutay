"""Tests for iteration 2 features: AI endpoints, File upload, Patient Portal, Appointments."""
import os
import io
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hbot-patient-portal.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CREDS = {
    "DOCTOR":    ("doktor@demo.com", "Demo!2026"),
    "NURSE":     ("hemsire@demo.com", "Demo!2026"),
    "SECRETARY": ("sekreter@demo.com", "Demo!2026"),
}

PATIENT_EMAIL = "hasta1@demo.com"
PATIENT_PASSWORD = "Hasta!2026"


def _login(role_or_email, password=None):
    if password is None:
        email, password = CREDS[role_or_email]
    else:
        email = role_or_email
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def doctor():
    return _login("DOCTOR")


@pytest.fixture(scope="module")
def nurse():
    return _login("NURSE")


@pytest.fixture(scope="module")
def secretary():
    return _login("SECRETARY")


@pytest.fixture(scope="module")
def demo_patient_id(doctor):
    s, _ = doctor
    patients = s.get(f"{API}/patients", timeout=20).json()
    # Prefer HB-2026-000004 if it exists, else first demo patient
    for p in patients:
        if p.get("patient_number") == "HB-2026-000004":
            return p["id"]
    return patients[0]["id"]


@pytest.fixture(scope="module")
def patient_session(doctor, demo_patient_id):
    """Login as PATIENT. If credentials fail, (re)create via portal-access."""
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": PATIENT_EMAIL, "password": PATIENT_PASSWORD}, timeout=20)
    if r.status_code != 200:
        # recreate portal access
        sd, _ = doctor
        # Use a unique email on this patient to avoid conflicts if different one is already attached
        payload = {"email": PATIENT_EMAIL, "password": PATIENT_PASSWORD}
        rc = sd.post(f"{API}/patients/{demo_patient_id}/portal-access", json=payload, timeout=20)
        # if duplicate email error on an existing user, just try login
        if rc.status_code not in (200, 400):
            pytest.skip(f"could not create portal access: {rc.status_code} {rc.text}")
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": PATIENT_EMAIL, "password": PATIENT_PASSWORD}, timeout=20)
        if r.status_code != 200:
            pytest.skip(f"patient login failed after recreate: {r.status_code} {r.text}")
    me = r.json()
    assert me["role"] == "PATIENT"
    return s, me


# =============== AI ===============
class TestAI:
    def test_capabilities(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/ai/capabilities", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("enabled") is True
        caps = d.get("capabilities", {})
        assert "anamnesis_summary" in caps
        assert "soap_draft" in caps

    def test_anamnesis_summary_doctor(self, doctor, demo_patient_id):
        s, _ = doctor
        r = s.post(f"{API}/ai/anamnesis_summary", json={"patient_id": demo_patient_id}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("status") == "ok", f"AI not ok: {d}"
        assert d.get("requires_clinician_verification") is True
        assert isinstance(d.get("draft"), str) and len(d["draft"].strip()) > 0

    def test_soap_draft_doctor(self, doctor, demo_patient_id):
        s, _ = doctor
        r = s.post(f"{API}/ai/soap_draft", json={"patient_id": demo_patient_id}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("status") == "ok", f"AI not ok: {d}"
        assert d.get("requires_clinician_verification") is True
        assert isinstance(d.get("draft"), str) and len(d["draft"].strip()) > 0

    def test_nurse_forbidden(self, nurse, demo_patient_id):
        s, _ = nurse
        r = s.post(f"{API}/ai/anamnesis_summary", json={"patient_id": demo_patient_id}, timeout=30)
        assert r.status_code == 403

    def test_secretary_forbidden(self, secretary, demo_patient_id):
        s, _ = secretary
        r = s.post(f"{API}/ai/soap_draft", json={"patient_id": demo_patient_id}, timeout=30)
        assert r.status_code == 403


# =============== File upload ===============
PNG_BYTES = (b"\x89PNG\r\n\x1a\n" + b"\x00" * 64)  # minimal, invalid-but-accepted-by-extension payload


class TestFiles:
    def test_upload_document_as_secretary(self, secretary, demo_patient_id):
        s, _ = secretary
        files = {"file": ("TEST_doc.png", io.BytesIO(PNG_BYTES), "image/png")}
        data = {"patient_id": demo_patient_id, "category": "Rapor", "kind": "document"}
        r = s.post(f"{API}/files/upload", files=files, data=data, timeout=60)
        assert r.status_code == 200, r.text
        rec = r.json()
        assert rec["filename"] == "TEST_doc.png"
        assert "/api/files/" in rec["download_url"]
        TestFiles.doc_id = rec["id"]

    def test_download_document(self, secretary):
        s, _ = secretary
        r = s.get(f"{API}/files/{TestFiles.doc_id}/download", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 0

    def test_list_files_for_patient(self, secretary, demo_patient_id):
        s, _ = secretary
        r = s.get(f"{API}/files", params={"patient_id": demo_patient_id}, timeout=20)
        assert r.status_code == 200
        lst = r.json()
        assert any(f["id"] == TestFiles.doc_id for f in lst)

    def test_upload_wound_photo_as_nurse(self, nurse, doctor, demo_patient_id):
        # need a wound_id - create one via doctor
        sd, _ = doctor
        wr = sd.post(f"{API}/wounds", json={"patient_id": demo_patient_id, "location": "TEST_file_wound",
                                             "etiology": "Diyabetik"}, timeout=15)
        assert wr.status_code == 200
        wid = wr.json()["id"]

        s, _ = nurse
        files = {"file": ("TEST_wound.jpg", io.BytesIO(PNG_BYTES), "image/jpeg")}
        data = {"patient_id": demo_patient_id, "wound_id": wid, "kind": "wound_photo", "category": "Yara"}
        r = s.post(f"{API}/files/upload", files=files, data=data, timeout=60)
        assert r.status_code == 200, r.text

    def test_download_unauthenticated_401(self):
        if not getattr(TestFiles, "doc_id", None):
            pytest.skip("no doc uploaded")
        r = requests.get(f"{API}/files/{TestFiles.doc_id}/download", timeout=15)
        assert r.status_code == 401


# =============== Portal ===============
class TestPortal:
    def test_portal_me(self, patient_session):
        s, _ = patient_session
        r = s.get(f"{API}/portal/me", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "first_name" in d and "last_name" in d

    def test_portal_anamnesis_list(self, patient_session):
        s, _ = patient_session
        r = s.get(f"{API}/portal/anamnesis", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_portal_appointments(self, patient_session):
        s, _ = patient_session
        r = s.get(f"{API}/portal/appointments", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_patient_cannot_list_patients(self, patient_session):
        s, _ = patient_session
        r = s.get(f"{API}/patients", timeout=15)
        assert r.status_code == 403

    def test_patient_cannot_hit_ai(self, patient_session, demo_patient_id):
        s, _ = patient_session
        r = s.post(f"{API}/ai/soap_draft", json={"patient_id": demo_patient_id}, timeout=15)
        assert r.status_code == 403

    def test_portal_submit_anamnesis(self, patient_session):
        s, _ = patient_session
        payload = {"complaint": "TEST_portal complaint", "chronic_diseases": ["DM"]}
        r = s.post(f"{API}/portal/anamnesis", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "ok"

    def test_staff_cannot_access_portal_endpoints(self, doctor):
        s, _ = doctor
        r = s.get(f"{API}/portal/me", timeout=15)
        assert r.status_code == 403


# =============== Appointments regression (daily list) ===============
class TestAppointments:
    def test_create_appointment_and_list(self, doctor, demo_patient_id):
        s, _ = doctor
        payload = {"patient_id": demo_patient_id, "reason": "TEST_calendar",
                   "date": "2026-02-05T10:00:00Z"}
        r = s.post(f"{API}/appointments", json=payload, timeout=15)
        assert r.status_code == 200
        aid = r.json()["id"]
        r2 = s.get(f"{API}/appointments", timeout=15)
        assert r2.status_code == 200
        assert any(a["id"] == aid for a in r2.json())
