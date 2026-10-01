"""Auth + RBAC + clinic-isolation dependencies. All authorization is enforced
server-side here; the frontend is never trusted."""
from datetime import datetime, timezone
from fastapi import Request, HTTPException, Depends
import jwt
from .database import db
from .security import decode_token
from .config import STAFF_ROLES


def _extract_token(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    return token


async def _user_from_session(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            session_token = auth[7:]
    if not session_token:
        return None
    sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not sess:
        return None
    exp = sess.get("expires_at")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"id": sess["user_id"]}, {"_id": 0})


async def get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    user = None
    if token:
        try:
            payload = decode_token(token)
            if payload.get("type") == "access":
                user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Oturum süresi doldu")
        except jwt.InvalidTokenError:
            user = None
    if not user:
        user = await _user_from_session(request)
    if not user:
        raise HTTPException(status_code=401, detail="Kimlik doğrulanmadı")
    if user.get("deleted_at"):
        raise HTTPException(status_code=401, detail="Hesap devre dışı")
    user.pop("password_hash", None)
    return user


def require_roles(*roles):
    allowed = set(roles) | {"SUPER_ADMIN"}

    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
        return user

    return dep


def require_staff():
    return require_roles(*STAFF_ROLES)


def clinic_filter(user: dict) -> dict:
    """Core tenant-isolation key: every non-super-admin query is scoped to clinic_id."""
    if user.get("role") == "SUPER_ADMIN":
        return {}
    return {"clinic_id": user.get("clinic_id")}
