"""Append-only audit log for all sensitive actions. Sensitive values are never
logged in plaintext beyond what is required for change tracking."""
from fastapi import Request
from .database import db, new_id, now_iso

SENSITIVE_KEYS = {"password", "password_hash", "signature", "signature_data", "tc_kimlik_no"}


def _redact(data):
    if not isinstance(data, dict):
        return data
    out = {}
    for k, v in data.items():
        out[k] = "***" if k in SENSITIVE_KEYS else v
    return out


async def log_action(user: dict, action: str, record_type: str, record_id=None,
                     patient_id=None, old_value=None, new_value=None, request: Request = None):
    doc = {
        "id": new_id(),
        "user_id": user.get("id") if user else None,
        "user_name": user.get("name") if user else None,
        "clinic_id": user.get("clinic_id") if user else None,
        "patient_id": patient_id,
        "action": action,
        "record_type": record_type,
        "record_id": record_id,
        "old_value": _redact(old_value),
        "new_value": _redact(new_value),
        "ip": request.client.host if request and request.client else None,
        "user_agent": request.headers.get("user-agent") if request else None,
        "timestamp": now_iso(),
    }
    await db.audit_logs.insert_one(doc)
    return doc
