from fastapi import APIRouter, Depends
from core.database import db
from core.deps import clinic_filter, require_roles
from core.ai_service import generate, CAPABILITIES
from fastapi import Request

router = APIRouter()

# Audit log is read-only for users (append-only system). No update/delete endpoints exposed.
audit_router = APIRouter(prefix="/audit")


@audit_router.get("")
async def list_audit(patient_id: str = None, action: str = None, record_type: str = None,
                     user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"))):
    q = {}
    q.update(clinic_filter(user))
    if patient_id:
        q["patient_id"] = patient_id
    if action:
        q["action"] = action
    if record_type:
        q["record_type"] = record_type
    return await db.audit_logs.find(q, {"_id": 0}).sort("timestamp", -1).limit(1000).to_list(1000)


# AI service layer (V1: architecture only, outputs always require clinician verification)
ai_router = APIRouter(prefix="/ai-legacy")


@ai_router.get("/capabilities")
async def ai_capabilities(user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE"))):
    return {"capabilities": CAPABILITIES, "enabled": False}


@ai_router.post("/{capability}")
async def ai_generate(capability: str, request: Request,
                      user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"))):
    body = await request.json()
    return await generate(capability, body)
