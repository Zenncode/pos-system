# POS System — API Documentation

> **Base URL:** `https://<host>/api/v1`
> **Auth:** Bearer token (login returns JWT/session token); send as `Authorization: Bearer <token>`
> **Format:** JSON · **Money:** numbers with 2 decimals · **Time:** ISO-8601 UTC
> Related: `requirement.md` (FRs) · `database.md` (schema) · `README.md` (flow)

---

## Conventions

### Success envelope

```json
{ "ok": true, "data": { } }
```

### Error envelope (maps to `requirement.md` §21 codes)

```json
{ "ok": false, "error": { "code": "E-STOCK-01", "message": "{name} is out of stock." } }
```

| HTTP | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Validation / business-rule failure (see `error.code`) |
| 401 | Missing/invalid/expired token |
| 403 | Role not allowed (see permissions matrix) |
| 404 | Not found |
| 409 | Conflict (e.g., shift already open, qty exceeds stock) |
| 422 | Provider failure (e.g., card declined — retryable) |

---

## 1. Auth

### POST /auth/login — Cashier login (Step 1)

```json
// Request
{ "login": "cashier01", "pin": "1234" }

// Response 200
{ "ok": true, "data": {
    "token": "jwt...",
    "user": { "id": 7, "name": "Maria", "role": "cashier" },
    "hasOpenShift": false
} }
```

Errors: `E-LOGIN-01` (400), `E-LOGIN-02` locked (403).

### POST /auth/logout

Headers: `Authorization` required. Response: `{ "ok": true }`.

---

## 2. Shifts (Steps 2, 3, 18)

### POST /shifts/open — Open shift

```json
// Request
{ "terminalId": "TERM-01", "openingFloat": 5000.00,
  "deviceCheck": { "scanner": true, "printer": true, "cardReader": true } }

// Response 201
{ "ok": true, "data": {
    "id": 12, "cashierId": 7, "terminalId": "TERM-01",
    "status": "open", "openedAt": "2026-09-10T01:00:00Z", "openingFloat": 5000.00
} }
```

Errors: `E-SHIFT-01` variant — already open (409); invalid float (400).

### GET /shifts/current — Active shift + dashboard snapshot

```json
// Response 200
{ "ok": true, "data": {
    "shift": { "id": 12, "openedAt": "...", "openingFloat": 5000.00 },
    "today": { "gross": 23500.00, "transactions": 41,
               "byMethod": { "cash": 18000.00, "card": 5500.00 } },
    "lowStock": 3
} }
```

### POST /shifts/:id/close — Close shift (Step 18)

```json
// Request
{ "closingCash": 22850.00 }

// Response 200
{ "ok": true, "data": {
    "id": 12, "status": "closed", "closedAt": "...",
    "expectedCash": 23000.00, "closingCash": 22850.00, "variance": -150.00
} }
```

Errors: `E-SHIFT-02` open sales remain (409).

---

## 3. Products (Step 5)

### GET /products/search — Name/SKU search

```
GET /products/search?q=kopiko&page=1&limit=20
```

```json
{ "ok": true, "data": {
    "items": [
      { "id": 101, "sku": "BEV-001", "barcode": "48000123",
        "name": "Kopiko Brown 28g", "price": 12.00, "stockQty": 48 }
    ],
    "page": 1, "total": 1
} }
```

### GET /products/barcode/:code — Exact scan lookup

```json
{ "ok": true, "data": {
    "id": 101, "sku": "BEV-001", "name": "Kopiko Brown 28g",
    "price": 12.00, "stockQty": 48, "inStock": true
} }
```

Errors: `E-PROD-01` not found (404).

### POST /products/manual-entry — Manual fallback (manager flag if price overridden)

```json
// Request
{ "saleId": 55, "productId": 101, "qty": 2, "priceOverride": null }
```

---

## 4. Sales & Cart (Steps 4, 6, 7, 8)

### POST /sales — New sale (Step 4)

```json
// Response 201
{ "ok": true, "data": { "id": 55, "txnCode": "TXN-20260910-0042", "status": "open" } }
```

Errors: `E-SHIFT-01` no open shift (409).

### POST /sales/:id/items — Add to cart (Steps 6–7, stock-checked)

```json
// Request
{ "productId": 101, "qty": 2 }

// Response 200
{ "ok": true, "data": {
    "line": { "id": 301, "productId": 101, "qty": 2, "unitPrice": 12.00 },
    "totals": { "subtotal": 24.00, "discount": 0.00, "tax": 0.00, "total": 24.00 }
} }
```

Errors: `E-STOCK-01` (409), `E-STOCK-02` exceeds (409, includes `available`).

### PATCH /sales/:id/items/:lineId — Update qty / note

```json
{ "qty": 3, "note": "walang yelo" }
```

### DELETE /sales/:id/items/:lineId — Remove line (releases reservation)

### POST /sales/:id/discounts — Apply discount (Step 8)

```json
// Request (line-level or sale-level)
{ "scope": "sale", "type": "percent", "value": 10, "reason": "senior citizen",
  "managerPin": "9999" }   // managerPin required only above threshold

// Response 200 — updated totals
{ "ok": true, "data": {
    "totals": { "subtotal": 100.00, "discount": 10.00, "tax": 0.00, "total": 90.00 }
} }
```

Errors: `E-DISC-01` needs approval (403); `E-CART-01` empty cart (400).

### GET /sales/:id — Sale detail + totals

---

## 5. Customers (Step 9)

### GET /customers/search — Member lookup

```
GET /customers/search?q=0917
```

```json
{ "ok": true, "data": [
    { "id": 21, "name": "Jose Cruz", "phone": "09171234567", "points": 150 }
] }
```

### POST /customers — Register mid-sale

```json
{ "name": "Ana Reyes", "phone": "09181234567", "email": "ana@example.com" }
// 201 → created member; 409 on duplicate phone
```

### POST /sales/:id/customer — Attach guest or member

```json
{ "type": "guest" }              // walk-in
{ "type": "member", "customerId": 21 }
```

---

## 6. Payments (Steps 10–11)

### POST /sales/:id/payments — Tender a payment

```json
// Cash
{ "method": "cash", "amount": 100.00 }

// Card / wallet (amount charged after approval)
{ "method": "card", "amount": 90.00, "terminalRef": "TERM-01" }

// QR (returns code to display, poll status)
{ "method": "qr", "amount": 90.00 }

// Response 201
{ "ok": true, "data": {
    "payment": { "id": 501, "method": "cash", "amount": 100.00, "status": "confirmed" },
    "paid": 100.00, "total": 90.00, "remaining": 0.00, "change": 10.00
} }
```

Errors: `E-PAY-01` cash short (400); `E-PAY-02` declined (422, retryable);
`E-PAY-03` QR expired (422); `remaining > 0` blocks finalize (409).

### GET /payments/qr/:paymentId/status — Poll QR confirmation

```json
{ "ok": true, "data": { "status": "pending" } }  // pending | confirmed | expired
```

### POST /sales/:id/void — Cancel sale (releases stock, needs reason)

```json
{ "reason": "customer left" }
// 200 → { "ok": true, "data": { "id": 55, "status": "voided" } }
```

---

## 7. Receipts & Finalize (Steps 12–16)

### POST /sales/:id/finalize — Atomic finalize (payment verified → receipt + sync)

```json
// Response 200
{ "ok": true, "data": {
    "id": 55, "txnCode": "TXN-20260910-0042", "status": "completed",
    "total": 90.00, "change": 10.00,
    "loyalty": { "earned": 0, "balance": 150 },
    "receiptId": 601
} }
```

Errors: `E-SYNC-01` nothing posted, retry finalize (500, retryable).

### POST /sales/:id/receipts — Send via channel

```json
{ "channel": "print" }                          // print
{ "channel": "email", "destination": "a@x.com" }
{ "channel": "sms", "destination": "0917..." }

// 201 → { "ok": true, "data": { "id": 602, "channel": "email", "status": "sent" } }
```

Errors: `E-RCPT-01` printer offline (422 — offer email/SMS).

### GET /sales/:id/receipt — Receipt payload (preview/print layout)

---

## 8. Reports (Steps 14, 18)

All require `manager` or `admin` role (cashiers: own shift only).

```
GET /reports/shift/:shiftId        → REP-01 shift summary
GET /reports/daily?date=2026-09-10 → REP-02 daily sales
GET /reports/transactions?shiftId=12&status=completed → REP-03 list
GET /reports/voids?from=..&to=..   → REP-04 void log
GET /reports/variance?from=..&to=..→ REP-05 variance
GET /reports/stock-alerts          → REP-06 low/out of stock
GET /reports/loyalty?from=..&to=.. → REP-07 loyalty activity
GET /reports/discounts?from=..&to=..→ REP-08 discount audit
```

```json
// GET /reports/shift/12 (abridged)
{ "ok": true, "data": {
    "shiftId": 12, "cashier": "Maria", "openedAt": "...", "closedAt": "...",
    "openingFloat": 5000.00, "gross": 23000.00, "discounts": 500.00,
    "tax": 0.00, "net": 22500.00, "transactions": 41, "voids": 1,
    "byMethod": { "cash": 17000.00, "card": 5500.00 },
    "expectedCash": 23000.00, "countedCash": 22850.00, "variance": -150.00
} }
```

---

*Related: `README.md` · `requirement.md` · `database.md` · `techstack.md`.*
