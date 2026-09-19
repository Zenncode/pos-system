# POS System — Deployment Guide

> How to deploy: server setup, environment variables, database, backups.
> Related: `techstack.md` · `database.md` §7 · `requirement.md` §24 (rollout P-0..P-4)

---

## 1. Overview

- **Target:** 1 app server per store (+ managed or local PostgreSQL), serving ~10 terminals.
- **Modes:** production (store) / staging (UAT + pilot). Never test on production.
- **Order of work:** server → PostgreSQL → app → catalog import → providers → smoke test → pilot.

---

## 2. Server Setup (Ubuntu 22.04 example)

```bash
# --- base ---
sudo apt update && sudo apt upgrade -y
sudo apt install -y postgresql-14 nginx certbot python3-certbot-nginx

# --- app runtime (pick ONE per techstack.md) ---
# Node.js:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# ...or Python / PHP per stack — see techstack.md

# --- app user (never run as root) ---
sudo useradd -m -s /bin/bash posapp
```

---

## 3. Database Setup (PostgreSQL)

```bash
# --- create role + db ---
sudo -u postgres psql -c "CREATE USER pos_user WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE posdb OWNER pos_user;"
sudo -u postgres psql -d posdb -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# --- apply schema (from database.md §3–4) ---
psql "host=localhost dbname=posdb user=pos_user" -f schema.sql

# --- verify ---
psql "host=localhost dbname=posdb user=pos_user" -c "\dt"
```

---

## 4. Environment Variables

Copy `.env.example` → `.env` (production). **Never commit `.env`.**

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `APP_ENV` | `production` | ✅ | `development` / `staging` / `production` |
| `APP_URL` | `https://pos.mystore.com` | ✅ | Used in receipts/links |
| `PORT` | `8000` | ✅ | API listen port (behind nginx) |
| `DATABASE_URL` | `postgres://pos_user:***@localhost:5432/posdb` | ✅ | Secrets manager in prod |
| `JWT_SECRET` | `<random-32+>` | ✅ | Rotate on leak suspicion |
| `CURRENCY` | `PHP` | ✅ | Single currency v1.0 |
| `TAX_RATE` | `0.12` | ✅ | 12% VAT |
| `TAX_INCLUSIVE` | `true` | ✅ | Shelf price includes tax |
| `DISCOUNT_THRESHOLD_PCT` | `10` | ✅ | Manager PIN above this |
| `DISCOUNT_THRESHOLD_AMT` | `500` | ✅ | …or this fixed amount |
| `LOYALTY_PER_AMOUNT` | `100` | ✅ | 1 pt per ₱100 net |
| `STORE_TIMEZONE` | `Asia/Manila` | ✅ | Display tz (DB stays UTC) |
| `SESSION_TIMEOUT_MIN` | `15` | ✅ | Idle logout |
| `QR_TIMEOUT_SEC` | `120` | ✅ | QR code expiry |
| `CARD_TIMEOUT_SEC` | `60` | ✅ | Card/wallet timeout |
| `CARD_GATEWAY_KEY` | `***` | ✅ | Payment provider credentials |
| `WALLET_API_KEY` | `***` | ✅ | … |
| `QR_API_KEY` | `***` | ✅ | … |
| `SMTP_HOST/USER/PASS` | `***` | ✅ | Email receipts |
| `SMS_API_KEY` / `SMS_SENDER` | `***` | ✅ | SMS receipts |
| `PRINTER_NAME` | `POS-80` | ✅ | Default thermal printer |
| `RECEIPT_WIDTH_MM` | `80` | ❌ | 58 or 80 |

---

## 5. Deploy the App

```bash
# --- as posapp ---
cd /opt/pos
git pull origin main            # or copy release bundle
npm ci --omit=dev               # (or pip/composer equivalent per stack)
npm run migrate                 # DB migrations (must be backward-compatible)
npm run build                   # if frontend needs building
sudo systemctl restart pos      # systemd service below
```

`/etc/systemd/system/pos.service` (example):

```ini
[Unit]
Description=POS API
After=network.target postgresql.service

[Service]
User=posapp
WorkingDirectory=/opt/pos
EnvironmentFile=/opt/pos/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Reverse proxy (nginx) terminates TLS and forwards to `localhost:8000`:

```nginx
server {
  listen 443 ssl;
  server_name pos.mystore.com;
  ssl_certificate     /etc/letsencrypt/live/pos.mystore.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/pos.mystore.com/privkey.pem;
  location / { proxy_pass http://127.0.0.1:8000; proxy_set_header Host $host; }
}
```

---

## 6. Catalog Import (Rollout P-0)

1. Prepare CSV: `sku, barcode, name, price, stock_qty, low_threshold`.
2. Load to staging table, run variance check (duplicates, negative prices).
3. Manager signs off → import to `products` → `ANALYZE products;`.

---

## 7. Backups & Restore

```bash
# Nightly full backup (cron 02:00)
0 2 * * * pg_dump -Fc -U pos_user -h localhost posdb > /backups/posdb_$(date +\%F).dump

# Keep 30 days, sync off-site
find /backups -name 'posdb_*.dump' -mtime +30 -delete
rsync -a /backups/ offsite:/backups/pos/
```

- **Restore drill quarterly** (required before rollout P-2): restore to staging, verify sales count + spot-check receipts.
- Targets: RPO ≤ 15 min (with WAL archiving), RTO ≤ 1 h.

---

## 8. Go-Live Checklist

- [ ] Staging UAT passed (all T-01..18 in `requirement.md` §22).
- [ ] Prod `.env` set; secrets in vault, not in chat/email.
- [ ] Schema + indexes applied; `pg_trgm` enabled.
- [ ] Catalog imported; manager signed variance report.
- [ ] Users created (individual PINs — no sharing); test logins work.
- [ ] Printer test page prints; scanner beeps + adds item; drawer pops.
- [ ] Sandbox→prod keys swapped for card/wallet/QR/email/SMS; one live ₱1 test each.
- [ ] Backup cron running; restore drill done; off-site copy verified.
- [ ] Pilot terminal live 1 week (rollout §24 P-1) before full rollout.

---

*Related: `techstack.md` · `database.md` · `architecture.md` · `requirement.md` §24.*
