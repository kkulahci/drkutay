"""Seed admin user, a demo clinic, demo staff, demo patients and reference data.
All demo clinical/SUT content is placeholder and explicitly marked DEMO.
Idempotent: safe to run on every startup."""
from datetime import datetime, timezone, timedelta
from core.database import db, new_id, now_iso, gen_patient_number, gen_wound_code
from core.config import settings
from core.security import hash_password, verify_password

DEMO_CLINIC_ID = "demo-clinic-0001"


def _ts(days_ago=0, hour=9):
    d = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return d.replace(hour=hour, minute=0, second=0, microsecond=0).isoformat()


async def seed_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id")
    await db.patients.create_index("clinic_id")
    await db.patients.create_index("patient_number")
    await db.password_reset_tokens.create_index("token")
    await db.login_attempts.create_index("identifier")
    await db.audit_logs.create_index([("clinic_id", 1), ("timestamp", -1)])
    await db.user_sessions.create_index("session_token")


async def seed_admin():
    existing = await db.users.find_one({"email": settings.ADMIN_EMAIL.lower()})
    if not existing:
        await db.users.insert_one({
            "id": new_id(), "email": settings.ADMIN_EMAIL.lower(),
            "password_hash": hash_password(settings.ADMIN_PASSWORD),
            "name": "Sistem Yöneticisi", "role": "SUPER_ADMIN", "clinic_id": None,
            "auth_provider": "password", "active": True, "created_at": now_iso(), "deleted_at": None,
        })
    elif not verify_password(settings.ADMIN_PASSWORD, existing.get("password_hash", "")):
        await db.users.update_one({"email": settings.ADMIN_EMAIL.lower()},
                                  {"$set": {"password_hash": hash_password(settings.ADMIN_PASSWORD), "role": "SUPER_ADMIN"}})


async def seed_clinic_and_staff():
    if not await db.clinics.find_one({"id": DEMO_CLINIC_ID}):
        await db.clinics.insert_one({
            "id": DEMO_CLINIC_ID, "name": "Demo HBOT Merkezi", "code": "DEMO-HBOT",
            "phone": "+90 212 000 00 00", "city": "İstanbul", "address": "Demo Mah. Sağlık Cad. No:1",
            "is_demo": True, "created_at": now_iso(), "deleted_at": None,
        })
    staff = [
        ("doktor@demo.com", "Dr. Elif Yılmaz", "DOCTOR", "Hiperbarik Tıp Uzmanı"),
        ("hemsire@demo.com", "Hemşire Ayşe Kaya", "NURSE", "HBOT Hemşiresi"),
        ("sekreter@demo.com", "Sekreter Mert Demir", "SECRETARY", "Hasta Kayıt"),
        ("klinikadmin@demo.com", "Klinik Yöneticisi", "CLINIC_ADMIN", "Yönetici"),
    ]
    for email, name, role, title in staff:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": new_id(), "email": email, "password_hash": hash_password("Demo!2026"),
                "name": name, "role": role, "clinic_id": DEMO_CLINIC_ID, "title": title,
                "auth_provider": "password", "active": True, "is_demo": True,
                "created_at": now_iso(), "deleted_at": None,
            })


async def _doctor():
    d = await db.users.find_one({"email": "doktor@demo.com"}, {"_id": 0})
    return d


async def seed_demo_patients():
    if await db.patients.find_one({"clinic_id": DEMO_CLINIC_ID, "is_demo": True}):
        return
    doc = await _doctor()
    doc_id, doc_name = doc["id"], doc["name"]
    base_meta = lambda: {"clinic_id": DEMO_CLINIC_ID, "created_by": doc_id, "created_by_name": doc_name,
                         "created_at": now_iso(), "updated_at": now_iso(), "deleted_at": None, "deleted_by": None, "is_demo": True}

    patients_spec = [
        {"first_name": "Ahmet", "last_name": "DEMO Diyabetik", "gender": "Erkek", "blood_type": "A Rh+",
         "phone": "+90 532 000 0001", "birth_date": "1958-04-12", "diagnosis": "Diyabetik ayak ülseri",
         "indication": "Diyabetik ayak (DEMO)", "icd": "E11.621", "wound_loc": "Sağ ayak 1. parmak", "wound_side": "Sağ"},
        {"first_name": "Zeynep", "last_name": "DEMO İşitme", "gender": "Kadın", "blood_type": "0 Rh+",
         "phone": "+90 532 000 0002", "birth_date": "1979-09-03", "diagnosis": "Ani işitme kaybı",
         "indication": "Ani sensörinöral işitme kaybı (DEMO)", "icd": "H91.2", "wound_loc": None, "wound_side": None},
        {"first_name": "Mehmet", "last_name": "DEMO Osteomiyelit", "gender": "Erkek", "blood_type": "B Rh-",
         "phone": "+90 532 000 0003", "birth_date": "1965-12-20", "diagnosis": "Kronik osteomiyelit",
         "indication": "Refrakter osteomiyelit (DEMO)", "icd": "M86.60", "wound_loc": "Sol tibia", "wound_side": "Sol"},
        {"first_name": "Fatma", "last_name": "DEMO Kronik Yara", "gender": "Kadın", "blood_type": "AB Rh+",
         "phone": "+90 532 000 0004", "birth_date": "1952-07-18", "diagnosis": "Kronik venöz ülser",
         "indication": "Kronik yara (DEMO)", "icd": "I83.009", "wound_loc": "Sol bacak medial malleol", "wound_side": "Sol"},
    ]

    for idx, spec in enumerate(patients_spec):
        pid = new_id()
        pnum = await gen_patient_number()
        await db.patients.insert_one({
            "id": pid, "patient_number": pnum, "first_name": spec["first_name"], "last_name": spec["last_name"],
            "gender": spec["gender"], "blood_type": spec["blood_type"], "phone": spec["phone"],
            "birth_date": spec["birth_date"], "tc_kimlik_no": None, "email": None,
            "referral_institution": "Demo Hastanesi", "referral_doctor": "Dr. DEMO",
            **base_meta(),
        })
        # anamnesis (patient-submitted)
        await db.patient_anamnesis.insert_one({
            "id": new_id(), "patient_id": pid, "source": "Hasta tarafından girildi",
            "complaint": spec["diagnosis"], "history": "DEMO anamnez verisi.",
            "status": "patient_submitted", "date": _ts(10), **base_meta(),
        })
        # encounter
        await db.encounters.insert_one({
            "id": new_id(), "patient_id": pid, "chief_complaint": spec["diagnosis"],
            "doctor_name": doc_name, "date": _ts(9), "notes": "DEMO muayene notu.", **base_meta(),
        })
        await db.vitals.insert_one({
            "id": new_id(), "patient_id": pid, "ta": "130/80", "pulse": 78, "temp": 36.6,
            "spo2": 97, "weight": 80, "height": 175, "bmi": 26.1, "date": _ts(9), **base_meta(),
        })
        # diagnosis
        await db.diagnoses.insert_one({
            "id": new_id(), "patient_id": pid, "icd_code": spec["icd"], "description": spec["diagnosis"],
            "date": _ts(9), **base_meta(),
        })
        # safety screening
        has_risk = idx in (0, 2)
        await db.hbot_safety_screenings.insert_one({
            "id": new_id(), "patient_id": pid, "answers": {"epilepsy": False, "pneumothorax": False, "copd": has_risk},
            "has_risk": has_risk, "outcome": "Hekim değerlendirmesi gerekli",
            "doctor_outcome": "Uygun", "date": _ts(8), **base_meta(),
        })
        # treatment plan
        await db.hbot_treatment_plans.insert_one({
            "id": new_id(), "patient_id": pid, "indication": spec["indication"], "icd_code": spec["icd"],
            "start_date": _ts(7), "planned_sessions": 30, "protocol": "2.4 ATA", "ata": 2.4,
            "oxygen_minutes": 90, "air_breaks": 2, "frequency": "Günlük (hafta içi)",
            "doctor_name": doc_name, "status": "Aktif", "date": _ts(7), **base_meta(),
        })
        # a few sessions
        for s in range(1, 4):
            await db.hbot_sessions.insert_one({
                "id": new_id(), "patient_id": pid, "session_number": s, "date": _ts(6 - s),
                "chamber": "Kabin 1", "operator": "Hemşire Ayşe Kaya", "doctor_name": doc_name,
                "ata": 2.4, "oxygen_minutes": 90, "air_breaks": 2,
                "pre_vitals": {"ta": "130/80", "pulse": 76}, "post_vitals": {"ta": "128/78", "pulse": 74},
                **base_meta(),
            })
        # wound + assessments for wound patients
        if spec["wound_loc"]:
            wid = new_id()
            wcode = await gen_wound_code()
            await db.wounds.insert_one({
                "id": wid, "wound_code": wcode, "patient_id": pid, "location": spec["wound_loc"],
                "side": spec["wound_side"], "status": "Açık", "onset_date": _ts(30), "date": _ts(9), **base_meta(),
            })
            for a, (day, length, width) in enumerate([(9, 4.0, 3.0), (5, 3.4, 2.6), (1, 2.8, 2.2)]):
                await db.wound_assessments.insert_one({
                    "id": new_id(), "patient_id": pid, "wound_id": wid, "location": spec["wound_loc"],
                    "side": spec["wound_side"], "length": length, "width": width, "depth": 0.5,
                    "area": round(length * width, 2),
                    "tissue": {"granulation": 60, "epithelization": 20, "slough": 15, "necrosis": 5, "bone": 0},
                    "infection": "Hafif", "moisture": "Orta", "edge": "Maserasyon",
                    "exudate": "Orta", "odor": "Yok", "date": _ts(day), **base_meta(),
                })


async def seed_reference():
    if not await db.icd_codes.find_one({}):
        await db.icd_codes.insert_many([
            {"id": new_id(), "code": "E11.621", "description": "Tip 2 diyabet, ayak ülseri ile (DEMO)"},
            {"id": new_id(), "code": "H91.2", "description": "Ani idiyopatik işitme kaybı (DEMO)"},
            {"id": new_id(), "code": "M86.60", "description": "Kronik osteomiyelit (DEMO)"},
            {"id": new_id(), "code": "I83.009", "description": "Alt ekstremite varisi, ülserli (DEMO)"},
            {"id": new_id(), "code": "T79.0", "description": "Hava/gaz embolisi (DEMO)"},
            {"id": new_id(), "code": "S00.0", "description": "Yumuşak doku enfeksiyonu (DEMO)"},
        ])
    if not await db.sut_versions.find_one({}):
        vid = new_id()
        await db.sut_versions.insert_one({
            "id": vid, "version": "2026.1-DEMO", "effective_date": _ts(60),
            "note": "DEMO SUT sürümü - gerçek mevzuat değildir.", "created_at": now_iso(),
        })
        inds = [
            ("Diyabetik ayak (DEMO)", "E11.621"),
            ("Ani işitme kaybı (DEMO)", "H91.2"),
            ("Osteomiyelit (DEMO)", "M86.60"),
            ("Kronik yara (DEMO)", "I83.009"),
        ]
        for name, icd in inds:
            iid = new_id()
            await db.sut_indications.insert_one({
                "id": iid, "name": name, "icd_code": icd, "version_id": vid, "is_demo": True, "created_at": now_iso(),
            })
            await db.sut_rules.insert_one({
                "id": new_id(), "indication_id": iid, "indication": name, "icd_code": icd,
                "version": "2026.1-DEMO", "version_id": vid,
                "start_date": _ts(60), "end_date": None,
                "session_rule": "DEMO: seans limiti placeholder (gerçek mevzuat değildir).",
                "source": "DEMO placeholder", "created_at": now_iso(),
            })


async def run_seed():
    await seed_indexes()
    await seed_admin()
    await seed_clinic_and_staff()
    await seed_demo_patients()
    await seed_reference()
