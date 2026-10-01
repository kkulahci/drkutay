"""Pydantic models for structured inputs (auth, clinics, users, patients).
Clinical sub-records use flexible documents so new fields (e.g. new lab parameters)
can be added without code changes."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "SECRETARY"
    clinic_id: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    password: str


class ClinicInput(BaseModel):
    name: str
    code: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_demo: bool = False


class UserCreateInput(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    clinic_id: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None


class UserUpdateInput(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    clinic_id: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None


class PatientInput(BaseModel):
    first_name: str
    last_name: str
    tc_kimlik_no: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_type: Optional[str] = None
    referral_institution: Optional[str] = None
    referral_doctor: Optional[str] = None
    photo_url: Optional[str] = None
    is_demo: bool = False
