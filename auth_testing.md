# HBOT Clinic Auth Testing Playbook

Dual auth: JWT email/password (httpOnly cookies) + Emergent Google Auth (session_token cookie).

## Credentials (see /app/memory/test_credentials.md)
- SUPER_ADMIN: 7vj48q7cz4@privaterelay.appleid.com / HbotAdmin!2026
- DOCTOR: doktor@demo.com / Demo!2026
- NURSE: hemsire@demo.com / Demo!2026
- SECRETARY: sekreter@demo.com / Demo!2026
- CLINIC_ADMIN: klinikadmin@demo.com / Demo!2026

## API test
```
curl -c cookies.txt -X POST $URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"doktor@demo.com","password":"Demo!2026"}'
curl -b cookies.txt $URL/api/auth/me
curl -b cookies.txt $URL/api/patients
curl -b cookies.txt $URL/api/dashboard/stats
```

## Checks
- bcrypt hash starts with $2b$
- /me returns role + clinic_id
- Non-super-admin only sees own clinic_id patients (clinic isolation)
- SECRETARY cannot write diagnoses/encounters (403)
- audit_logs has no update/delete endpoints
- Google: POST /api/auth/session with X-Session-ID header exchanges session; cannot be tested without a real session_id (frontend flow).
