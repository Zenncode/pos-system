# POS System — Credentials

> Where all test / seed logins, PINs, DB users, env keys, and provider sandbox
> credentials live. **TEST + SEED DATA ONLY — never production secrets or real PII.**
> Related: `requirement.md` §6 / §19 · `api.md` §1 · `database.md` §5 · `deployment.md` §4 · `user-guide.md`

---

## 1. Rules (read first)

- ❌ NEVER commit real passwords, PINs, `.env`, or provider prod keys to git / chat / email.
- ✅ Prod secrets live in a secrets manager / vault only (see `deployment.md` §4, §8).
- ✅ All values below are **dev / staging / UAT seeds**. Replace every `CHANGE_ME` / `***` before go-live.
- ✅ Individual logins only — no shared PINs (risk table in `requirement.md` §25).
- ✅ Rotate on suspicion of leak: `JWT_SECRET`, DB password, gateway keys, admin PIN.

---

## 2. Seed User Accounts (dev / staging only)

> Source of truth for roles: `requirement.md` §6 matrix.
> Hash with bcrypt/argon2 — never store plaintext (SEC-02). Lockout: 5 fails → 15-min lock (FR-02).

| Role | Name (seed) | Login (seed) | PIN / Password (seed) | Terminal | Notes |
|------|-------------|--------------|------------------------|----------|-------|
| Admin | System Admin | `admin` | `Admin1234!` → `CHANGE_ME` on first boot | any | Create users, reset PINs, settings. Seeded in `database.md` §5 (`secret_hash` = bcrypt of this). |
| Manager | Store Manager | `manager01` | PIN `9999` (test only) | any | Approves over-threshold discounts (FR-28), views all reports REP-01..08, manager note on variance > ₱100. |
| Cashier | Maria (Cashier 01) | `cashier01` | PIN `1234` (matches `api.md` §1 example) | `TERM-01` | Own shift only. Opens/closes shift, sells, voids with reason. |
| Cashier | Jose (Cashier 02) | `cashier02` | PIN `2345` (test only) | `TERM-02` | Second terminal for oversell / reservation testing (FR-21). |

### 2.1 Manager-approval PIN

- Over-threshold discount (> 10% or > ₱500, see `requirement.md` §13.1) requires `managerPin`.
- Seed: `9999` (see `api.md` §4 `POST /sales/:id/discounts` example). Change per store at P-0.

### 2.2 Login examples (matches `api.md`)

```json
// Cashier login
{ "login": "cashier01", "pin": "1234" }

// Manager approval on discount
{ "scope": "sale", "type": "percent", "value": 15, "reason": "senior citizen", "managerPin": "9999" }
```

### 2.3 Seed SQL (hash first, then insert)

```sql
-- Generate hashes in app layer (bcrypt), then insert. NEVER paste plaintext into the DB.
-- Example placeholders — replace secret_hash values with real bcrypt outputs:
INSERT INTO users (name, login, secret_hash, role) VALUES
  ('System Admin',  'admin',     '$2b$12$REPLACE_WITH_REAL_HASH_ADMIN',    'admin'),
  ('Store Manager', 'manager01', '$2b$12$REPLACE_WITH_REAL_HASH_MANAGER',  'manager'),
  ('Maria',         'cashier01', '$2b$12$REPLACE_WITH_REAL_HASH_CASHIER1', 'cashier'),
  ('Jose',          'cashier02', '$2b$12$REPLACE_WITH_REAL_HASH_CASHIER2', 'cashier');
```

---

## 3. Database Credentials (dev / staging)

| Item | Value (seed) | Where set |
|------|--------------|-----------|
| Host / Port | `localhost:5432` | `DATABASE_URL` |
| Database | `posdb` | `CREATE DATABASE posdb OWNER pos_user;` (`deployment.md` §3) |
| App role | `pos_user` / `CHANGE_ME` | `CREATE USER pos_user WITH PASSWORD 'CHANGE_ME';` |
| Connection string | `postgres://pos_user:***@localhost:5432/posdb` | `.env` → `DATABASE_URL` |
| Extensions | `pg_trgm` | `CREATE EXTENSION IF NOT EXISTS pg_trgm;` |

> Prod: strong random password in vault, least-privilege role, no superuser for the app.

---

## 4. App / Env Secrets

> Full variable list: `deployment.md` §4. Copy `.env.example` → `.env`, never commit `.env`.

| Variable | Seed / Test value | Prod rule |
|----------|-------------------|-----------|
| `APP_ENV` | `development` / `staging` | `production` |
| `APP_URL` | `http://localhost:8000` | `https://pos.mystore.com` |
| `PORT` | `8000` | `8000` (behind nginx) |
| `DATABASE_URL` | `postgres://pos_user:***@localhost:5432/posdb` | Vault only |
| `JWT_SECRET` | `<random-32+-dev-only>` | Random 32+ chars, rotate on leak |
| `CURRENCY` / `TAX_RATE` / `TAX_INCLUSIVE` | `PHP` / `0.12` / `true` | Confirm at P-0 (`requirement.md` §13.1) |
| `STORE_TIMEZONE` | `Asia/Manila` | Same |
| `SESSION_TIMEOUT_MIN` | `15` | Same |
| `PRINTER_NAME` / `RECEIPT_WIDTH_MM` | `POS-80` / `80` | Per hardware |

`.env.example` snippet (commit THIS, not `.env`):

```bash
APP_ENV=development
APP_URL=http://localhost:8000
PORT=8000
DATABASE_URL=postgres://pos_user:CHANGE_ME@localhost:5432/posdb
JWT_SECRET=CHANGE_ME_GENERATE_RANDOM_32_PLUS
CURRENCY=PHP
TAX_RATE=0.12
TAX_INCLUSIVE=true
DISCOUNT_THRESHOLD_PCT=10
DISCOUNT_THRESHOLD_AMT=500
LOYALTY_PER_AMOUNT=100
STORE_TIMEZONE=Asia/Manila
SESSION_TIMEOUT_MIN=15
QR_TIMEOUT_SEC=120
CARD_TIMEOUT_SEC=60
# Provider sandbox keys (staging) — prod keys in vault only:
CARD_GATEWAY_KEY=sb_test_***
WALLET_API_KEY=sb_test_***
QR_API_KEY=sb_test_***
SMTP_HOST=smtp.sandbox.test
SMTP_USER=sb_test_***
SMTP_PASS=sb_test_***
SMS_API_KEY=sb_test_***
SMS_SENDER=POS-TEST
PRINTER_NAME=POS-80
RECEIPT_WIDTH_MM=80
```

---

## 5. Provider Sandbox Keys (staging / UAT)

> Live contracts: `requirement.md` §17 (INT-01..06). Sandbox for dev/test; swap to prod at go-live checklist (`deployment.md` §8).

| Provider | Sandbox credential slot | Notes |
|----------|-------------------------|-------|
| Card gateway | `CARD_GATEWAY_KEY=sb_test_***` | Timeout 60 s → `failed`, retry allowed (E-PAY-02). Test card: use gateway's sandbox PAN, never a real card. |
| Wallet | `WALLET_API_KEY=sb_test_***` | Idempotency key per attempt. |
| QR | `QR_API_KEY=sb_test_***` | 120 s expiry → `expired`, new code on retry (E-PAY-03). |
| Email (SMTP / SendGrid / Mailgun) | `SMTP_HOST/USER/PASS=sb_test_***` | Async, retry ×3; failure logged on receipt row. |
| SMS (Twilio / Semaphore / Vonage) | `SMS_API_KEY=sb_test_***` / `SMS_SENDER=POS-TEST` | 160-char summary template. |
| Printer | `PRINTER_NAME=POS-80` | ESC/POS 58/80 mm; offline → offer email/SMS (E-RCPT-01). |

---

## 6. Terminals & Hardware IDs (seed)

| Terminal | Cashier (seed) | Devices |
|----------|---------------|---------|
| `TERM-01` | `cashier01` / Maria | Scanner + `POS-80` printer + drawer + card reader |
| `TERM-02` | `cashier02` / Jose | Scanner + card reader (no printer — tests email/SMS fallback) |

---

## 7. Test Customers (loyalty, seed only)

| Name | Phone (lookup key) | Email | Points |
|------|-------------------|-------|--------|
| Jose Cruz | `09171234567` | — | 150 (matches `api.md` §5 example) |
| Ana Reyes | `09181234567` | `ana@example.com` | 0 (matches `api.md` §5 register example) |

> Phones are fake `0917/0918` test numbers. No real customer PII in repo or seeds.

---

## 8. Create / Reset Credentials

```bash
# 1. Create user (admin only) — hash happens server-side, never pass plaintext in logs
# POST /users  { "name": "New Cashier", "login": "cashier03", "role": "cashier" }
# → returns one-time PIN setup link (admin hands it to the cashier in person)

# 2. Reset PIN (admin) — logged to audit_logs (FR-63, SEC-06)
# POST /users/:id/reset-pin

# 3. Unlock after lockout (admin or 15-min auto-unlock, FR-02)
# POST /users/:id/unlock

# 4. Rotate JWT / DB / gateway keys
# - Generate new value in vault → update staging/prod env → restart pos.service
# - Verify: login → open shift → ₱1 live test per method (deployment.md §8)
```

---

## 9. Go-Live Rotation Checklist

- [ ] All seed PINs/passwords changed; `admin` has a strong unique password.
- [ ] `JWT_SECRET` + `pos_user` password are vault-generated, not `CHANGE_ME`.
- [ ] Sandbox → prod keys swapped for card / wallet / QR / email / SMS.
- [ ] One live ₱1 charge + one email + one SMS receipt verified, then voided with reason.
- [ ] Old seed credentials deactivated (users `active = FALSE`, old keys revoked).
- [ ] Backup cron uses its own least-privilege credential, not the app login.

---

*Related: `README.md` (flow) · `requirement.md` (roles §6, security §19) · `api.md` (auth §1) · `database.md` (seed §5) · `deployment.md` (env §4, go-live §8) · `user-guide.md` (login §2).*
