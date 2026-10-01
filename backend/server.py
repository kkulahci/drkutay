from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging

from core.config import settings, CLINICAL_WRITE, STAFF_ROLES, MEDICAL_WRITE
from core.database import client
from core.crud import make_crud_router
from routers import auth, clinics, users, patients, dashboard, reference, audit
from seed import run_seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("hbot")

app = FastAPI(title="HBOT Clinic API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "HBOT Clinic API", "status": "ok"}


# Core routers
api.include_router(auth.router)
api.include_router(clinics.router)
api.include_router(users.router)
api.include_router(patients.router)
api.include_router(dashboard.router)
api.include_router(reference.router)
api.include_router(audit.audit_router)
api.include_router(audit.ai_router)

# Generic clinic-scoped, soft-delete, audited CRUD modules.
# (collection, prefix, write_roles, record_type, patient_required, wound_code)
CRUD_MODULES = [
    ("appointments", "/appointments", STAFF_ROLES, "appointment", True, False),
    ("encounters", "/encounters", CLINICAL_WRITE, "encounter", True, False),
    ("vitals", "/vitals", CLINICAL_WRITE, "vitals", True, False),
    ("physical_examinations", "/physical-examinations", CLINICAL_WRITE, "physical_exam", True, False),
    ("diagnoses", "/diagnoses", MEDICAL_WRITE, "diagnosis", True, False),
    ("wounds", "/wounds", CLINICAL_WRITE, "wound", True, True),
    ("wound_assessments", "/wound-assessments", CLINICAL_WRITE, "wound_assessment", True, False),
    ("wound_photos", "/wound-photos", CLINICAL_WRITE, "wound_photo", True, False),
    ("hbot_safety_screenings", "/hbot-safety-screenings", CLINICAL_WRITE, "hbot_safety", True, False),
    ("hbot_treatment_plans", "/hbot-treatment-plans", MEDICAL_WRITE, "hbot_plan", True, False),
    ("hbot_sessions", "/hbot-sessions", CLINICAL_WRITE, "hbot_session", True, False),
    ("adverse_events", "/adverse-events", CLINICAL_WRITE, "adverse_event", True, False),
    ("lab_results", "/lab-results", CLINICAL_WRITE, "lab_result", True, False),
    ("imaging_records", "/imaging-records", CLINICAL_WRITE, "imaging", True, False),
    ("documents", "/documents", STAFF_ROLES, "document", True, False),
    ("consents", "/consents", CLINICAL_WRITE, "consent", True, False),
    ("signatures", "/signatures", CLINICAL_WRITE, "signature", False, False),
    ("patient_anamnesis", "/anamnesis", STAFF_ROLES, "anamnesis", True, False),
    ("patient_medical_history", "/medical-history", CLINICAL_WRITE, "medical_history", True, False),
    ("patient_medications", "/medications", CLINICAL_WRITE, "medication", True, False),
    ("patient_allergies", "/allergies", CLINICAL_WRITE, "allergy", True, False),
    ("patient_contacts", "/patient-contacts", STAFF_ROLES, "patient_contact", True, False),
    ("notifications", "/notifications", STAFF_ROLES, "notification", False, False),
]

for coll, prefix, roles, rtype, p_req, w_code in CRUD_MODULES:
    r = make_crud_router(coll, roles, rtype, patient_required=p_req, wound_code=w_code)
    api.include_router(r, prefix=prefix)

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await run_seed()
        logger.info("Seed complete")
    except Exception as e:
        logger.error(f"Seed error: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
