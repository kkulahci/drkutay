import secrets
from datetime import datetime, timezone, timedelta
import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from core.database import db, new_id, now_iso
from core.config import settings, ROLES
from core.security import (hash_password, verify_password, create_access_token,
                           create_refresh_token, decode_token)
from core.deps import get_current_user
from core.audit import log_action
from models import RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput

router = APIRouter(prefix="/auth")

COOKIE = dict(httponly=True, secure=True, samesite="none", path="/")


def _set_tokens(response: Response, user):
    at = create_access_token(user["id"], user["email"], user["role"], user.get("clinic_id"))
    rt = create_refresh_token(user["id"])
    response.set_cookie("access_token", at, max_age=settings.ACCESS_TOKEN_MINUTES * 60, **COOKIE)
    response.set_cookie("refresh_token", rt, max_age=settings.REFRESH_TOKEN_DAYS * 86400, **COOKIE)
    return at


def _public(user):
    return {k: v for k, v in user.items() if k not in ("password_hash", "_id")}


async def _lockout_check(identifier):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= 5:
        locked_until = rec.get("locked_until")
        if locked_until:
            lu = datetime.fromisoformat(locked_until) if isinstance(locked_until, str) else locked_until
            if lu.tzinfo is None:
                lu = lu.replace(tzinfo=timezone.utc)
            if lu > datetime.now(timezone.utc):
                raise HTTPException(status_code=429, detail="Çok fazla deneme. Lütfen sonra tekrar deneyin.")


async def _record_fail(identifier):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"count": count}
    if count >= 5:
        update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


@router.post("/register")
async def register(data: RegisterInput, request: Request, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    role = data.role if data.role in ROLES else "SECRETARY"
    user = {
        "id": new_id(), "email": email, "password_hash": hash_password(data.password),
        "name": data.name, "role": role, "clinic_id": data.clinic_id,
        "auth_provider": "password", "active": True,
        "created_at": now_iso(), "deleted_at": None,
    }
    await db.users.insert_one(user)
    _set_tokens(response, user)
    await log_action(user, "REGISTER", "user", user["id"], request=request)
    return _public(user)


@router.post("/login")
async def login(data: LoginInput, request: Request, response: Response):
    email = data.email.lower()
    identifier = f"{request.client.host if request.client else '?'}:{email}"
    await _lockout_check(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        await _record_fail(identifier)
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    if user.get("deleted_at") or user.get("active") is False:
        raise HTTPException(status_code=403, detail="Hesap devre dışı")
    await db.login_attempts.delete_one({"identifier": identifier})
    _set_tokens(response, user)
    await log_action(user, "LOGIN", "auth", user["id"], request=request)
    return _public(user)


@router.post("/logout")
async def logout(request: Request, response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_one({"session_token": st})
    await log_action(user, "LOGOUT", "auth", user["id"], request=request)
    return {"status": "ok"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _public(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="Refresh token yok")
    try:
        payload = decode_token(rt)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Geçersiz token")
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    _set_tokens(response, user)
    return {"status": "ok"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordInput):
    user = await db.users.find_one({"email": data.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["id"],
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
        })
        print(f"[PASSWORD RESET] {settings.FRONTEND_URL}/reset-password?token={token}")
    return {"status": "ok", "message": "Kayıtlıysa sıfırlama bağlantısı gönderildi"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordInput):
    rec = await db.password_reset_tokens.find_one({"token": data.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Geçersiz veya kullanılmış bağlantı")
    exp = datetime.fromisoformat(rec["expires_at"])
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Bağlantı süresi doldu")
    await db.users.update_one({"id": rec["user_id"]},
                              {"$set": {"password_hash": hash_password(data.password)}})
    await db.password_reset_tokens.update_one({"token": data.token}, {"$set": {"used": True}})
    return {"status": "ok"}


@router.post("/session")
async def emergent_session(request: Request, response: Response):
    """Emergent Google Auth: exchange session_id (from frontend) for a session_token.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        body = await request.json()
        session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id gerekli")
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(settings.EMERGENT_AUTH_SESSION_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google oturumu doğrulanamadı")
    info = r.json()
    email = info["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {
            "id": new_id(), "email": email, "name": info.get("name", email),
            "picture": info.get("picture"), "role": "SECRETARY", "clinic_id": None,
            "auth_provider": "google", "active": True,
            "created_at": now_iso(), "deleted_at": None,
        }
        await db.users.insert_one(user)
    session_token = info["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user["id"], "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_iso(),
    })
    response.set_cookie("session_token", session_token, max_age=7 * 86400, **COOKIE)
    await log_action(user, "LOGIN_GOOGLE", "auth", user["id"], request=request)
    return _public(user)
