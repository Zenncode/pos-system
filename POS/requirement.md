# POS System — System Requirements Specification (SRS)

> **Project:** Point of Sale (POS) System — End-to-End Sales Process
> **Version:** 2.0 (Expanded)
> **Status:** Draft — for review
> **Source:** POS USER FLOW diagram (Steps 1–18) + `README.md` user flow doc

---

## Table of Contents

1. [Document Control](#1-document-control)
2. [System Overview](#2-system-overview)
3. [Goals, Objectives & Success Metrics](#3-goals-objectives--success-metrics)
4. [Scope](#4-scope)
5. [Stakeholders & RACI](#5-stakeholders--raci)
6. [User Roles & Permissions Matrix](#6-user-roles--permissions-matrix)
7. [Assumptions, Constraints & Dependencies](#7-assumptions-constraints--dependencies)
8. [End-to-End Process Definition (Steps 1–18)](#8-end-to-end-process-definition-steps-118)
9. [Functional Requirements](#9-functional-requirements)
10. [Use Cases (Detailed)](#10-use-cases-detailed)
11. [User Stories & Acceptance Criteria](#11-user-stories--acceptance-criteria)
12. [UI / Screen Requirements](#12-ui--screen-requirements)
13. [Business Rules](#13-business-rules)
14. [Data Requirements & Dictionary](#14-data-requirements--dictionary)
15. [State Machines](#15-state-machines)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Integration Requirements](#17-integration-requirements)
18. [Reporting Requirements](#18-reporting-requirements)
19. [Security Requirements](#19-security-requirements)
20. [Hardware & Environment Requirements](#20-hardware--environment-requirements)
21. [Error Handling & Message Catalog](#21-error-handling--message-catalog)
22. [Test Requirements](#22-test-requirements)
23. [Traceability Matrix](#23-traceability-matrix)
24. [Deployment & Rollout Plan](#24-deployment--rollout-plan)
25. [Risks & Mitigations](#25-risks--mitigations)
26. [Acceptance & Sign-Off Criteria](#26-acceptance--sign-off-criteria)
27. [Glossary](#27-glossary)

---

## 1. Document Control

### 1.1 Version History

| Version | Date | Author | Change Description |
|---------|------|--------|--------------------|
| 1.0 | — | — | Initial requirements from user flow diagram |
| 2.0 | — | — | Expanded to full SRS: use cases, UI specs, data dictionary, NFRs, traceability, rollout |

### 1.2 Approvers

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Store Owner / Sponsor | | | |
| Store Manager | | | |
| System Admin / IT | | | |
| Lead Developer | | | |

### 1.3 Reference Documents

- `README.md` — POS User Flow documentation (18-step flow + mermaid diagram)
- POS USER FLOW diagram image — End-to-End Sales Process
- (Add here: contracts with payment providers, hardware datasheets)

---

## 2. System Overview

### 2.1 Background

Small to mid-size retail stores process dozens to hundreds of walk-in sales per
day across one or more terminals. Manual cash handling without system support
causes slow checkouts, pricing errors, overselling of out-of-stock items, lost
loyalty data, and unreconciled cash drawers at closing time.

### 2.2 Problem Statement

- Checkouts are slow and error-prone when prices, discounts, and change are computed manually.
- Items with zero stock can be sold by mistake, causing customer complaints.
- Walk-in and loyalty customers are served through inconsistent processes.
- Cash, card, wallet, QR, and split payments are tracked in different places.
- Inventory counts, sales reports, and loyalty balances drift out of sync.
- Shift closing has no standard cash-count and variance procedure.

### 2.3 Proposed Solution

A web-based POS System that enforces a single 18-step end-to-end sales process:

1. **Shift startup** — cashier login, shift open (cash float + terminal check), dashboard.
2. **Selling** — new sale, barcode/name/SKU lookup with manual-entry fallback,
   real-time stock check, multi-item cart loop.
3. **Checkout** — cart review (qty, remove, notes, discounts), walk-in or loyalty
   customer attach, multi-method payment (cash, card, wallet, QR, split) with
   verification and failure recovery.
4. **Finalization** — print/email/SMS receipt, automatic inventory deduction,
   sales report update, loyalty accrual, locked completed sale, next-customer loop.
5. **Shift close** — cash count, daily report, variance check, logout.

### 2.4 Key Features (Summary)

| # | Feature | Flow Steps |
|---|---------|------------|
| F-01 | Cashier login + shift open/close with cash accountability | 1, 2, 18 |
| F-02 | Dashboard with shift/daily snapshot + alerts | 3 |
| F-03 | Barcode scan + name/SKU search + manual entry | 5 |
| F-04 | Real-time stock validation + out-of-stock blocking | 6 |
| F-05 | Multi-item cart with notes and discounts | 7, 8 |
| F-06 | Walk-in + loyalty customer handling | 9 |
| F-07 | Cash / card / wallet / QR / split payments + failure recovery | 10, 11 |
| F-08 | Print / email / SMS receipts | 12 |
| F-09 | Auto inventory, sales report, loyalty updates | 13, 14, 15 |
| F-10 | Sale completion lock + next-customer loop | 16, 17 |

---

## 3. Goals, Objectives & Success Metrics

| ID | Goal / Objective | Success Metric (v1.0 target) |
|----|------------------|------------------------------|
| G-01 | Fast, accurate checkout with minimal training | Average sale completion ≤ 90 seconds for ≤ 5 items |
| G-02 | Zero overselling via real-time stock validation | 0 completed sales containing zero-stock items |
| G-03 | One checkout flow for walk-in and loyalty customers | 100% of sales tagged walk-in or member |
| G-04 | Flexible payment acceptance incl. split payments | All 5 methods + split usable; 0 sales finalized on failed payment |
| G-05 | Back-office always in sync per sale | Inventory, report, loyalty updated on 100% of completed sales |
| G-06 | Full shift cash accountability | 100% of shifts closed with count + variance record |
| G-07 | Proof of purchase for every sale | ≥ 1 receipt record per completed sale |

---

## 4. Scope

### 4.1 In Scope (v1.0) — Module Breakdown

| Module | Includes |
|--------|----------|
| M-01 Auth & Session | Cashier login, lockout, session timeout, logout |
| M-02 Shift | Open (float + terminal check), dashboard, close (count + report + variance) |
| M-03 Catalog Lookup | Barcode scan, name/SKU search, manual entry, not-found recovery |
| M-04 Stock | Real-time availability check, out-of-stock block + notice |
| M-05 Cart | Add/loop items, qty update, remove, notes, % / fixed discounts, live totals |
| M-06 Customer | Walk-in guest, member search, new member registration, attach to sale |
| M-07 Payment | Cash (change), card, wallet, QR, split; verify; retry/change-method/cancel |
| M-08 Receipt | Generate + print / email / SMS with full statutory + operational fields |
| M-09 Back-office Sync | Inventory deduct, sales report append, loyalty accrual, completion lock |
| M-10 Loop & Close | Sale completed screen, next customer, shift close procedure |

### 4.2 Out of Scope (v1.0 — planned for v2)

- Returns, refunds, exchanges, post-completion voids/edits
- Layaway / installments / store credit
- Purchase orders, suppliers, stock receiving/transfer
- Multi-branch consolidated reporting
- Payroll, scheduling, commissions
- Accounting/ERP connectors
- Offline mode (v1.0 requires connectivity)
- Customer-facing display / self-checkout kiosk

---

## 5. Stakeholders & RACI

| Stakeholder | Interest | RACI (Requirements → UAT) |
|-------------|----------|---------------------------|
| Store Owner / Sponsor | ROI, loss prevention, reports | A (approves), I |
| Store Manager | Daily ops, variance, stock alerts | R (defines ops rules), A for reports |
| Cashier | Speed, simplicity, clear errors | C (workflow feedback), R (UAT) |
| Loyalty Customer | Points, e-receipts | I |
| System Admin / IT | Setup, users, devices | R (environments, accounts) |
| Developers | Build per SRS | R (implementation) |
| Payment Providers | Gateway/terminal integration | C |

*(R = Responsible, A = Accountable, C = Consulted, I = Informed)*

---

## 6. User Roles & Permissions Matrix

| Capability | Cashier | Manager | Admin |
|------------|:-------:|:-------:|:-----:|
| Login / logout | ✅ | ✅ | ✅ |
| Open / close own shift | ✅ | ✅ | ✅ |
| New sale / cart / checkout | ✅ | ✅ | ❌ |
| Apply discount ≤ threshold | ✅ | ✅ | ❌ |
| Apply discount > threshold | ❌ | ✅ | ❌ |
| Retry / change payment, cancel sale | ✅ | ✅ | ❌ |
| Reprint receipt | ✅ | ✅ | ❌ |
| Register new loyalty member | ✅ | ✅ | ❌ |
| View shift/daily reports | Own shift | All | All |
| Manage products & prices | ❌ | ✅ | ✅ |
| Manage users & roles | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ✅ | ✅ |
| System settings / integrations | ❌ | ❌ | ✅ |

- Discount threshold value is configurable (default: e.g., 10% or fixed cap; set at deployment).
- Cashiers must never access other cashiers' shifts, product master, or settings.

---

## 7. Assumptions, Constraints & Dependencies

### 7.1 Assumptions

- A-01: One cashier operates one terminal per shift.
- A-02: Product master (SKU/barcode, name, price, opening stock) is loaded before go-live.
- A-03: One currency only (no multi-currency in v1.0).
- A-04: Tax treatment is configured once (inclusive or exclusive + rate) before go-live.
- A-05: Loyalty earning rule is configured once (e.g., 1 point per N currency units).
- A-06: Store operates within network coverage of the deployment environment.

### 7.2 Constraints

- C-01: v1.0 is online-only; no offline queue/sync.
- C-02: Email/SMS delivery depends on third-party providers and customer data quality.
- C-03: Card/wallet/QR confirmations depend on provider latency and terminal health.
- C-04: Thermal printer output width constrains receipt layout (typically 58/80 mm).

### 7.3 Dependencies

- D-01: Payment gateway/terminal contracts + sandbox access for card, wallet, QR.
- D-02: Email and SMS provider accounts + sender IDs.
- D-03: Hardware procurement: terminals, scanners, printers, cash drawers.
- D-04: Product catalog + opening stock import file from the store.

---

## 8. End-to-End Process Definition (Steps 1–18)

> Actor actions vs. system actions per flow step. This is the normative
> definition of the sales process; FRs and use cases implement it.

### Phase 1 — Shift Startup

**Step 1. Cashier Login**
- Actor: enters username + PIN/password.
- System: validates, creates session, routes to Open Shift (or Dashboard if shift already open).

**Step 2. Open Shift**
- Actor: enters opening cash float; confirms terminal check (scanner, printer, reader).
- System: records shift (cashier, terminal, start time, float); blocks sales until open.

**Step 3. Dashboard**
- System: shows shift sales so far, today's totals, low-stock alerts, quick action (New Sale).

### Phase 2 — Selling

**Step 4. New Sale**
- Actor: presses New Sale.
- System: creates sale in `open` status with unique transaction ID.

**Step 5. Scan / Search Product**
- Actor: scans barcode OR types name/SKU; OR uses manual entry after a miss.
- System: looks up catalog → decision **Product Found?**
  - No → "Search Again / Manual Entry", stay on Step 5.
  - Yes → Step 6.

**Step 6. Check Stock**
- System: reads live stock for the product/variant → decision **In Stock?**
  - No → "Out of Stock — Notify Cashier", item NOT added.
  - Yes → Step 7.

**Step 7. Add to Cart**
- System: adds line (product, qty = 1 default, unit price) → decision **More Products?**
  - Yes → "Scan Next Item" → back to product lookup.
  - No → Step 8.

**Step 8. Review Cart**
- Actor: updates quantities, removes lines, adds notes, applies discounts.
- System: recalculates subtotal → discount → tax → total live.

### Phase 3 — Checkout

**Step 9. Customer**
- Actor: selects Walk-in OR searches member OR registers new member.
- System: attaches customer (or guest flag) to the sale.

**Step 10. Payment**
- Actor: selects method(s) and tenders amounts.
- Cash: system computes change. Card/wallet/QR: system waits for provider confirmation.
- Split: multiple tenders accumulate until covered.

**Step 11. Payment Successful?**
- System verifies → decision:
  - No → Retry / Change Method / Cancel Sale (void, release stock).
  - Yes → Step 12.

### Phase 4 — Finalization

**Step 12. Receipt** — system generates receipt; delivers via print/email/SMS as chosen.
**Step 13. Update Inventory** — system deducts quantities; raises low/out flags.
**Step 14. Update Sales Report** — system appends transaction to shift/daily aggregates.
**Step 15. Update Loyalty Points** — system accrues points for members.
**Step 16. Sale Completed** — system locks the sale; shows confirmation.

### Phase 5 — Next / Close

**Step 17. Next Customer** — actor starts a fresh sale without re-login.
**Step 18. Close Shift** — actor enters cash count; system produces report,
computes variance, closes shift, logs out.

---

## 9. Functional Requirements

### 9.1 M-01 Authentication & Session

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Login with username + PIN or email + password | Must |
| FR-02 | Lock account after 5 consecutive failed attempts; auto-unlock after 15 min or by admin | Must |
| FR-03 | Show generic "Invalid credentials" message (no user enumeration) | Must |
| FR-04 | End session on logout, idle timeout (default 15 min), or shift close | Must |
| FR-05 | Prevent concurrent logins of the same cashier on two terminals (configurable) | Should |

### 9.2 M-02 Shift Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-06 | Block New Sale when no shift is open for this cashier + terminal | Must |
| FR-07 | Capture on open: cashier, terminal, start timestamp, opening float (> 0, 2-decimal) | Must |
| FR-08 | Terminal checklist on open: scanner, printer, card reader — warn (not block) on failure, log result | Should |
| FR-09 | Dashboard shows: shift sales total, transaction count, per-method totals, low-stock alerts | Should |
| FR-10 | On close: require cash count entry; generate shift report; compute variance; record over/short | Must |
| FR-11 | Prevent closing a shift that has an `open` (unfinished) sale — force complete or void first | Must |
| FR-12 | One open shift max per cashier + terminal combination | Must |

### 9.3 M-03 Product Lookup

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-13 | Barcode scan lookup (exact match) with ≤ 1 s response | Must |
| FR-14 | Name/SKU search with partial matching, ranked results, ≤ 2 s response | Must |
| FR-15 | Manual entry fallback: select product + enter price/qty with manager-approval flag if price overridden | Must |
| FR-16 | Not-found path returns cashier to scan/search with "Search Again" prompt, preserving cart | Must |
| FR-17 | Display for each result: name, SKU, price, available stock | Must |

**Field rules (Search):** query min 2 chars; results paged (20/page); out-of-stock rows visually flagged but selectable for info (cannot add).

### 9.4 M-04 Stock Validation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-18 | Check live stock on every add-to-cart attempt (including qty increases) | Must |
| FR-19 | Block adds exceeding available stock; offer max-available qty shortcut | Must |
| FR-20 | Out-of-stock notice shows product name + "Notify customer" state; nothing added | Must |
| FR-21 | Reserve stock for the open sale (soft hold) so two terminals can't oversell the last unit; release on remove/void/timeout | Should |

### 9.5 M-05 Cart

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-22 | Add in-stock item as cart line (product, qty default 1, unit price snapshot) | Must |
| FR-23 | Merge duplicate scans into one line (qty += n) unless note/discount differs | Should |
| FR-24 | Update line quantity (1 … available stock); qty 0 = remove with confirm | Must |
| FR-25 | Remove line with single confirm; released reservation returns to stock | Must |
| FR-26 | Per-line and per-sale notes (max 500 chars) | Should |
| FR-27 | Discounts: % or fixed, per-line or whole-sale; stacked discounts apply line-first then sale-level | Must |
| FR-28 | Discount above threshold requires manager PIN approval + audit entry | Must |
| FR-29 | Live totals: subtotal − discounts ± tax = total; all money 2-decimal, rounding half-up | Must |
| FR-30 | Multi-item loop: "Scan Next Item" returns to lookup with cart preserved | Must |
| FR-31 | Empty cart cannot proceed to Customer/Payment (Next disabled with hint) | Must |

**Validation rules:** qty integer ≥ 1; % discount 0–100; fixed discount ≤ line/sale amount; total never negative (floor 0.00).

### 9.6 M-06 Customer

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-32 | Walk-in guest checkout with no stored record | Must |
| FR-33 | Member search by name, phone, or member ID (partial match, ≤ 2 s) | Must |
| FR-34 | New member registration mid-sale: name (required), phone (required, unique), email (optional, format-checked) | Must |
| FR-35 | Attach exactly one customer-or-guest to each sale; changeable until payment starts | Must |
| FR-36 | Show member's current points balance at attach time | Should |

### 9.7 M-07 Payment

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-37 | Cash: accept tendered ≥ total; display change; support exact-tender shortcut | Must |
| FR-38 | Card (credit/debit): send charge to terminal/gateway; finalize only on approval code | Must |
| FR-39 | Wallet: same confirm-before-finalize behavior as card | Must |
| FR-40 | QR: generate code/amount, poll/await provider callback with timeout (default 120 s) | Must |
| FR-41 | Split: accept ≥ 2 tenders of any methods; progress bar of remaining balance; block completion while balance > 0 | Must |
| FR-42 | Single source of truth: `paidTotal ≥ total` required; overpay only allowed on cash (as change) | Must |
| FR-43 | On failure/timeout/decline: offer Retry (same method), Change Method (keep cart+customer), Cancel Sale (void + release stock) | Must |
| FR-44 | Every payment attempt logged: method, amount, reference/approval code, status, timestamp | Must |
| FR-45 | Cancel/void requires reason select (customer left, wrong items, payment issue, other) + audit entry | Should |

**Method-specific rules:**
- Cash tendered < total → error "Insufficient tender", stay on payment.
- Card declined → show provider message + Retry/Change/Cancel.
- QR timeout → mark attempt expired; allow Retry (new code) or Change.
- Split math: remaining = total − Σ confirmed tenders; display live.

### 9.8 M-08 Receipt

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-46 | Receipt header: store name, branch, address, contact, transaction ID, date/time, cashier, terminal | Must |
| FR-47 | Receipt body: each line (name, qty × unit price, line discount, line total), notes marker | Must |
| FR-48 | Receipt totals: subtotal, discounts, tax, total, per-method paid amounts, change, loyalty earned/balance | Must |
| FR-49 | Print on 58/80 mm thermal with cut command; reprint allowed (logged as REPRINT) | Must |
| FR-50 | Email receipt to customer email (member or typed at sale); log delivery status | Should |
| FR-51 | SMS receipt (summary + total + TxnID) to customer phone; log delivery status | Should |
| FR-52 | At least one receipt record per completed sale, even if all deliveries fail (system-stored copy) | Must |

### 9.9 M-09 Back-Office Sync (atomic per sale)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-53 | Deduct sold qty per line from product stock in the same transaction as sale completion | Must |
| FR-54 | Raise low-stock alert at ≤ threshold; out-of-stock flag at 0 | Should |
| FR-55 | Append sale to shift + daily aggregates (gross, discount, tax, net, per-method, count) | Must |
| FR-56 | Accrue loyalty points for members per earning rule; show earned + new balance | Must |
| FR-57 | Lock completed sales (immutable); any correction is a future returns feature, not an edit | Must |
| FR-58 | If any sync step fails: roll back all, keep sale completable via explicit Retry Finalize (no half-posted sales) | Must |

### 9.10 M-10 Loop, Reporting Views & Admin

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-59 | Sale Completed screen with TxnID, total, change, receipt actions, and "Next Customer" | Must |
| FR-60 | Next Customer starts a fresh sale under the same open shift (no re-login) | Must |
| FR-61 | Manager shift/daily report view (see §18) | Must |
| FR-62 | Product master CRUD (admin/manager): SKU unique, price ≥ 0, stock ≥ 0 | Must |
| FR-63 | User management (admin): create/deactivate, reset PIN, assign role | Must |
| FR-64 | Audit log view (manager/admin): filter by actor, action, date range | Should |

---

## 10. Use Cases (Detailed)

### UC-01: Open Shift

- **Actor:** Cashier · **Pre:** logged in, no open shift on this terminal.
- **Main flow:**
  1. Cashier opens Open Shift screen.
  2. Enters opening float → confirms terminal checklist.
  3. System validates float > 0 → creates shift → opens Dashboard.
- **Alternate:** A1 — terminal device fails check → warning shown, shift still opens, failure logged.
- **Alternate:** A2 — float invalid → inline error, shift not created.
- **Post:** shift = `open`; sales allowed.

### UC-02: New Sale + Product Lookup

- **Actor:** Cashier · **Pre:** shift open.
- **Main flow:**
  1. Cashier starts New Sale → system creates `open` sale + TxnID.
  2. Cashier scans/searches → system returns match + stock.
- **Alternate:** A1 — no match → "Search Again / Manual Entry", cart preserved.
- **Post:** sale `open` with 0..n lines.

### UC-03: Stock Check + Add to Cart

- **Pre:** product found.
- **Main:** system checks live stock → in stock → line added (qty 1).
- **Alternate:** A1 — out of stock → notice, nothing added.
- **Alternate:** A2 — qty increase beyond stock → blocked, max-qty offered.
- **Post:** cart + reservations updated.

### UC-04: Review Cart

- **Main:** cashier edits qty / removes / notes / discounts; totals recalc live.
- **Alternate:** A1 — discount > threshold → manager PIN required.
- **Alternate:** A2 — cart emptied → forward navigation disabled.
- **Post:** cart finalized, ready for customer step.

### UC-05: Attach Customer

- **Main:** walk-in selected OR member found/registered and attached.
- **Alternate:** A1 — duplicate phone on registration → error, offer search.
- **Post:** sale linked to guest or member.

### UC-06: Pay (Cash)

- **Main:** cashier enters tendered ≥ total → system shows change → payment recorded.
- **Alternate:** A1 — tendered < total → "Insufficient tender" error.
- **Post:** payment `confirmed` (or partial in split).

### UC-07: Pay (Card / Wallet / QR)

- **Main:** system sends charge → approval received → payment `confirmed`.
- **Alternate:** A1 — declined → message + Retry/Change/Cancel.
- **Alternate:** A2 — QR timeout → attempt expired → new code or change method.
- **Post:** confirmed payment(s) sum toward total.

### UC-08: Handle Failed Payment

- **Main:** cashier picks Retry (same method) / Change Method (cart kept) / Cancel Sale (void + release + reason).
- **Post:** sale proceeds to receipt OR returns to payment OR becomes `voided`.

### UC-09: Issue Receipt

- **Main:** system generates receipt → delivers via chosen channel(s) → stores copy.
- **Alternate:** A1 — printer offline → offer email/SMS, queue print retry.
- **Alternate:** A2 — email/SMS fails → log failure, sale still completes (stored copy exists).
- **Post:** ≥ 1 receipt record.

### UC-10: Finalize Sale (atomic sync)

- **Main:** payment verified → inventory deduct → report append → loyalty accrue → sale `completed` + locked.
- **Alternate:** A1 — any sync step fails → full rollback → "Retry Finalize".
- **Post:** back-office in sync; confirmation shown.

### UC-11: Next Customer

- **Main:** cashier presses Next Customer → fresh `open` sale, same shift.
- **Post:** ready for Step 4 loop.

### UC-12: Close Shift

- **Pre:** no `open` sales remain.
- **Main:** cashier enters count → system report → variance computed → shift `closed` → logout.
- **Alternate:** A1 — open sale exists → block with list of open sales.
- **Alternate:** A2 — count differs → record over/short, require manager note if beyond tolerance.
- **Post:** shift closed; reports final for that shift.

---

## 11. User Stories & Acceptance Criteria

### US-01 — Login + open shift
> As a cashier, I want to log in and open my shift with a float so I'm
> accountable for the drawer.
- [ ] Valid login → Open Shift screen.
- [ ] Valid float + checklist → Dashboard with active shift banner.
- [ ] 5 bad PINs → lockout message; admin can unlock.

### US-02 — Multi-item scanning with stock guard
> As a cashier, I want to scan many items fast without overselling.
- [ ] Valid scan → added in ≤ 1 s.
- [ ] Unknown code → Search Again / Manual Entry, cart intact.
- [ ] Zero-stock → blocked + notice; duplicate scans merge qty.

### US-03 — Cart review
> As a cashier, I want to fix the cart before charging.
- [ ] Qty/remove/note/discount recalc totals instantly.
- [ ] Over-threshold discount → manager PIN; all discounts audit-logged.
- [ ] Empty cart → cannot advance.

### US-04 — Walk-in + loyalty
> As a cashier, I want both guest and member checkout.
- [ ] Guest → no record, sale completes.
- [ ] Member search ≤ 2 s; new member registered mid-sale; points balance shown.

### US-05 — All payment methods + split
> As a cashier, I want every payment option incl. split.
- [ ] Cash → change; card/wallet/QR → approval-gated.
- [ ] Split → remaining-balance tracker; cannot finish short.
- [ ] Failures → Retry / Change / Cancel; cancel voids + releases stock with reason.

### US-06 — Receipts + auto sync
> As a cashier, I want receipts and automatic back-office updates.
- [ ] Receipt has all FR-46..48 fields; print + email + SMS available.
- [ ] Stock, reports, loyalty update on 100% of completions; rollback + Retry Finalize on fault.

### US-07 — Next customer loop
> As a cashier, I want the next sale without re-login.
- [ ] Completed screen → Next Customer → fresh sale, same shift.

### US-08 — Shift close with variance
> As a cashier, I want to reconcile cash at logout.
- [ ] Close blocked with open sales; count required; variance recorded; logout ends shift.

### US-09 — Manager reporting
> As a manager, I want shift/daily reports and variance review.
- [ ] Reports match §18 fields; void log and reprint log visible.

### US-10 — Admin master data
> As an admin, I want to manage users and products.
- [ ] Unique SKU/phone enforced; deactivation (not delete) for audit; PIN resets logged.

---

## 12. UI / Screen Requirements

### SCR-01 Login
Fields: username, PIN/password (masked) · Buttons: Login · Links: forgot-PIN (admin reset note) · Errors: invalid credentials, locked account with unlock hint.

### SCR-02 Open Shift
Fields: opening float (numeric, 2-dec) · Checklist: scanner ✅/⚠️, printer, card reader (auto-detect + manual confirm) · Button: Open Shift · Banner: cashier + terminal identity.

### SCR-03 Dashboard
Cards: today's gross / transactions / per-method totals / low-stock count · Shift banner: cashier, opened-at, running total · CTA: New Sale · Alerts: low-stock, failed receipt deliveries.

### SCR-04 POS Sale (scan + cart)
Left: search/scan input + results (name, SKU, price, stock badge) · Center: cart lines (qty stepper, price, discount, note icon, remove) · Right: customer chip, discount control, totals (subtotal/discount/tax/total), Pay button (disabled when empty) · Keyboard: Enter = add first result, F-keys for qty/discount/pay.

### SCR-05 Review Cart
Same cart panel focused: bulk actions (clear with confirm), per-line notes modal, discount modal (%/fixed, reason), manager-PIN modal when over threshold.

### SCR-06 Customer
Tabs: Walk-in | Member · Member search box + results + "Register New" form (name*, phone*, email) · Selected customer card with points balance.

### SCR-07 Payment
Total-due header · Method tabs: Cash | Card | Wallet | QR | Split · Cash: tendered pad + exact/change display · Card/wallet: status spinner → approved/declined · QR: code + countdown + status · Split: tender list + remaining tracker · Footer: Retry / Change Method / Cancel Sale on failure.

### SCR-08 Receipt + Completed
Receipt preview (print layout) · Channel buttons: Print / Email / SMS · Completed banner: TxnID, total, change, loyalty earned · CTA: Next Customer · Reprint logged.

### SCR-09 Close Shift
Summary: expected cash/card/etc. totals · Input: counted cash · Computed: variance + over/short flag · Button: Close Shift (blocked if open sales) · Post: printable shift report + logout.

### Global UI Rules
- All money formatted consistently (2 decimals, currency symbol).
- Every decision/exception state shows the next action (no dead ends).
- Destructive actions (remove line, clear cart, void sale) always confirm.
- Full keyboard operability for the selling loop; touch-friendly targets ≥ 40 px.

---

## 13. Business Rules

- BR-01: No sale without an open shift (FR-06).
- BR-02: Zero-stock items can never enter the cart (FR-20).
- BR-03: No finalization on unverified payment; `paidTotal ≥ total` required (FR-42).
- BR-04: Overpay allowed on cash only (returned as change).
- BR-05: Completed sales immutable; corrections via future returns feature.
- BR-06: Voided sales deduct nothing and accrue nothing (FR-37/UC-08).
- BR-07: Discount math: line discounts first, then sale-level; total floored at 0.00.
- BR-08: Over-threshold discounts need manager PIN + audit (FR-28).
- BR-09: Loyalty accrues on completed member sales only, per configured rule.
- BR-10: Every completed sale keeps ≥ 1 stored receipt copy (FR-52).
- BR-11: Reservations release on remove/void/timeout; never leak holds.
- BR-12: Shift close requires count + zero open sales; variance always recorded.
- BR-13: Reprints are logged and watermarked REPRINT.
- BR-14: Rounding: half-up to 2 decimals at display and persistence.

### 13.1 Configurable Business Defaults (to confirm with owner)

> Lahat ng values below ay **defaults lang** — palitan ng aktwal na patakaran ng store bago mag-go-live. Lahat configurable nang walang code change (NFR-15).

| Config | Default | Notes |
|--------|---------|-------|
| Currency | PHP (₱) | Single currency in v1.0 |
| Tax (VAT) | 12%, **inclusive** in shelf price | Set inclusive/exclusive + rate at P-0 |
| Loyalty earning | 1 point per ₱100 of net sales (rounded down) | Points accrue on completed member sales only |
| Loyalty validity | Points never expire in v1.0 | Redemption = v2 feature |
| Discount threshold | Cashier may discount up to 10% or ₱500 (whichever hit first) without approval | Above threshold → manager PIN (FR-28) |
| Login lockout | 5 failed attempts → 15-min lock | Admin can unlock early |
| Session idle timeout | 15 minutes | Logout on timeout; open sale is preserved as `open` |
| QR payment timeout | 120 seconds per code | Then attempt = `expired` |
| Card/wallet timeout | 60 seconds | Then attempt = `failed` |
| Receipt footer | "Thank you for shopping with us! Returns within 7 days with receipt." | Printed + emailed |
| Low-stock threshold | 10 units per product (global), overridable per product | Alert at ≤ threshold |
| Cash variance tolerance | ₱0.00 — any variance recorded; > ₱100 requires manager note | See UC-12 A2 |
| Receipt width | 80 mm default (fallback 58 mm) | ESC/POS layout |
| Transaction code format | `TXN-YYYYMMDD-####` (resets daily) | Unique per sale |

---

## 14. Data Requirements & Dictionary

### 14.1 Entity Summary

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| User | Cashiers, managers, admins | id, name, login, secretHash, role, active |
| Shift | Work period + cash accountability | id, cashierId, terminalId, openedAt, openingFloat, closedAt, closingCash, variance, status |
| Product | Sellable catalog | id, sku, barcode, name, price, stockQty, lowThreshold, active |
| Sale | Transaction header | id, txnCode, shiftId, cashierId, customerId?, status, subtotal, discount, tax, total |
| SaleItem | Transaction lines | id, saleId, productId, qty, unitPrice, discount, note |
| Customer | Loyalty members | id, name, phone (unique), email?, points |
| Payment | Tenders per sale | id, saleId, method, amount, reference?, status, attemptedAt |
| Receipt | Proof of purchase | id, saleId, channel, destination?, status, sentAt |
| InventoryLog | Stock audit trail | id, productId, saleId?, qtyChange, reason, createdAt |
| AuditLog | Security/ops trail | id, actorId, action, entityRef, detail, createdAt |

### 14.2 Field-Level Rules

- Money: DECIMAL(12,2), ≥ 0; qty: INT ≥ 1; %: 0–100.
- `Product.sku` UNIQUE NOT NULL; `Customer.phone` UNIQUE NOT NULL.
- `Sale.txnCode` UNIQUE human-readable (e.g., `TXN-YYYYMMDD-####`).
- `Sale.status`: open → completed | voided (one-way).
- `Payment.status`: pending → confirmed | failed | expired | voided.
- `Shift.status`: open → closed (one-way).
- Deletes: none for transactional rows — use `active` flags / void statuses.
- Timestamps stored in UTC; displayed in store timezone.

### 14.3 Relationships

- User 1—N Shift · Shift 1—N Sale · Sale 1—N SaleItem/Payment/Receipt.
- Customer 1—N Sale (nullable for guests) · Product 1—N SaleItem + InventoryLog.

---

## 15. State Machines

### 15.1 Sale
`open → completed` (via UC-10) · `open → voided` (via Cancel Sale).
No transitions out of `completed` / `voided`.

### 15.2 Payment Attempt
`pending → confirmed` (approval / cash accept) ·
`pending → failed` (decline/error) · `pending → expired` (QR timeout) ·
any non-confirmed → `voided` on sale cancel.

### 15.3 Shift
`open → closed` (via UC-12 only; blocked while open sales exist).

### 15.4 Stock Reservation (per sale line)
`held → committed` (on finalize) · `held → released` (remove/void/timeout).

---

## 16. Non-Functional Requirements

### 16.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-01 | Scan → cart-add ≤ 1 s (p95, catalog ≤ 50k SKUs) |
| NFR-02 | Search results ≤ 2 s (p95) |
| NFR-03 | Payment confirm → receipt ready ≤ 5 s excluding provider latency |
| NFR-04 | Dashboard load ≤ 3 s; reports ≤ 5 s for one-day range |
| NFR-05 | Support 10 concurrent terminals per store without degradation |

### 16.2 Usability & Accessibility

| ID | Requirement |
|----|-------------|
| NFR-06 | New cashier productive after ≤ 30 min training (UAT task pass ≥ 95%) |
| NFR-07 | Full selling loop keyboard-operable; visible focus states |
| NFR-08 | No dead-end screens — every error states the next action |
| NFR-09 | Contrast + font sizes legible at arm's length on 14"+ terminal screens |

### 16.3 Reliability & Availability

| ID | Requirement |
|----|-------------|
| NFR-10 | Sale completion is atomic (sale + payments + inventory + loyalty) — zero half-posted sales |
| NFR-11 | 99.5% availability during store hours; maintenance windows announced 48 h ahead |
| NFR-12 | RPO ≤ 15 min, RTO ≤ 1 h (daily automated backups + restore drill quarterly) |

### 16.4 Scalability & Maintainability

| ID | Requirement |
|----|-------------|
| NFR-13 | Catalog scales to 100k SKUs; history to 5M sale lines without redesign |
| NFR-14 | Layered code (UI / API / domain / data); lint + code review enforced |
| NFR-15 | Configurable without code: tax, discount threshold, loyalty rule, timeouts, receipt footer |

### 16.5 Compatibility & Localization

| ID | Requirement |
|----|-------------|
| NFR-16 | Chromium-based browsers (latest 2 majors); 1280×720 minimum |
| NFR-17 | Thermal printers 58/80 mm (ESC/POS); USB scanner as keyboard wedge |
| NFR-18 | English UI v1.0; strings externalized for future languages; store timezone + currency configured |

---

## 17. Integration Requirements

| ID | Integration | Contract & Failure Behavior |
|----|-------------|-----------------------------|
| INT-01 | Card terminal/gateway | Charge + approval code; timeout 60 s → `failed`, allow retry |
| INT-02 | Wallet provider | Same as card; idempotency key per attempt |
| INT-03 | QR provider | Code gen + callback poll; 120 s expiry → `expired`, new code on retry |
| INT-04 | Email provider | Async send; retry ×3; persist failure on receipt record |
| INT-05 | SMS provider | Same as email; 160-char-safe summary template |
| INT-06 | Printer (ESC/POS) | Offline → queue one retry + offer email/SMS; log all reprints |

- All provider calls logged (request ref, latency, outcome) without storing full PANs.
- Sandbox credentials required for dev/test; prod keys in secrets manager only.

---

## 18. Reporting Requirements

| ID | Report | Fields / Filters |
|----|--------|------------------|
| REP-01 | Shift summary | Cashier, terminal, open/close time, float, gross, discounts, tax, net, per-method totals, txn count,Void count, expected vs counted cash, variance |
| REP-02 | Daily sales | Same as REP-01 aggregated by day; filter by date range, cashier, method |
| REP-03 | Transaction list | TxnID, time, cashier, customer/guest, items, total, method(s), status; drill to receipt |
| REP-04 | Void log | TxnID, actor, reason, timestamp, released stock lines |
| REP-05 | Variance report | Per-shift expected/counted/over-short; tolerance flag |
| REP-06 | Stock alerts | Low (≤ threshold) + out (= 0) with SKU, name, qty |
| REP-07 | Loyalty activity | Member, earned/redeemed (v2), balance, period filter |
| REP-08 | Discount audit | TxnID, actor, approver, amount, reason |

- Export: CSV + print-friendly; retention: raw data ≥ 3 years (or per local law).

---

## 19. Security Requirements

- SEC-01: Authenticate all users; no anonymous sales; idle timeout 15 min.
- SEC-02: Hash secrets (bcrypt/argon2); PIN min 4–6 digits, passwords min 8 chars (configurable).
- SEC-03: RBAC per §6 matrix; deny-by-default; cashier cannot touch master data/settings.
- SEC-04: Manager PIN for over-threshold discounts; logged.
- SEC-05: Never store full PANs; mask references (last-4 only).
- SEC-06: Audit log: logins, shift events, discounts, voids, reprints, master-data changes.
- SEC-07: Transport encryption (TLS) + encrypted secrets at rest; prod keys in vault.
- SEC-08: Input validation everywhere (qty, money, phone/email formats); server-side recheck.

---

## 20. Hardware & Environment Requirements

| Category | Minimum |
|----------|---------|
| Terminal | Dual-core+, 4 GB RAM, 1280×720 display, Chromium browser |
| Scanner | USB HID keyboard-wedge barcode scanner |
| Printer | 58/80 mm thermal, ESC/POS, auto-cut |
| Cash drawer | RJ11-triggered via printer |
| Card reader | Provider-certified terminal |
| Network | Stable broadband; UPS for terminal + network gear recommended |
| Server (if self-hosted) | 2 vCPU, 4 GB RAM, 50 GB SSD, daily backups; else managed host with same SLA |

---

## 21. Error Handling & Message Catalog

| Code | Situation | User Message | Next Action |
|------|-----------|--------------|-------------|
| E-LOGIN-01 | Bad credentials | "Invalid username or PIN." | Retry / contact admin |
| E-LOGIN-02 | Locked | "Account locked. Try again in 15 minutes or ask admin." | Wait / admin unlock |
| E-SHIFT-01 | Sale w/o shift | "Open a shift before starting a sale." | Go to Open Shift |
| E-SHIFT-02 | Close w/ open sales | "N open sale(s) unfinished. Complete or void them first." | List open sales |
| E-PROD-01 | Not found | "Product not found. Search again or use manual entry." | Search Again / Manual Entry |
| E-STOCK-01 | Out of stock | "{name} is out of stock." | Remove from plan / notify customer |
| E-STOCK-02 | Exceeds stock | "Only N available." | Set qty = N / remove |
| E-CART-01 | Empty cart | "Cart is empty. Scan an item to continue." | Back to scan |
| E-DISC-01 | Over threshold | "Needs manager approval." | Enter manager PIN |
| E-PAY-01 | Cash short | "Tendered is less than total." | Add tender / split |
| E-PAY-02 | Declined | "Card declined: {reason}." | Retry / Change / Cancel |
| E-PAY-03 | QR expired | "QR code expired." | Generate new code / Change |
| E-RCPT-01 | Printer offline | "Printer offline. Email/SMS instead?" | Email / SMS / Retry print |
| E-SYNC-01 | Finalize fault | "Couldn't finalize. Nothing was posted. Retry?" | Retry Finalize |

---

## 22. Test Requirements

### 22.1 Test Levels
Unit → API/integration → end-to-end (happy + exception paths) → UAT with real
cashiers on real hardware → performance smoke (NFR-01..05).

### 22.2 Key Scenarios (must-pass for sign-off)

1. Login → open → dashboard → new sale (T-01).
2. Scan known item → stock ok → added ≤ 1 s (T-02).
3. Unknown code → Search Again / Manual Entry, cart intact (T-03).
4. Zero-stock → blocked + notice (T-04).
5. Multi-item loop incl. merge + qty cap (T-05).
6. Cart review: qty/remove/note/% + fixed discounts + live totals (T-06).
7. Over-threshold discount → manager PIN + audit (T-07).
8. Guest checkout (T-08); member search + mid-sale registration (T-09).
9. Cash exact + over (change) (T-10); card/wallet/QR approval (T-11); split exact (T-12).
10. Decline → Retry/Change/Cancel; cancel voids + releases + reason (T-13).
11. Receipt print + email + SMS; reprint watermark (T-14).
12. Atomic finalize: kill-mid-post → rollback → Retry Finalize, no half-post (T-15).
13. Next Customer loop without re-login (T-16).
14. Close blocked with open sale; count → variance → logout (T-17).
15. Reports REP-01..08 reconcile to test sales (T-18).

---

## 23. Traceability Matrix

| Flow Step | FRs | User Story | Use Case | Tests |
|-----------|-----|------------|----------|-------|
| 1. Cashier Login | FR-01..05 | US-01 | — | T-01 |
| 2. Open Shift | FR-06..08, 12 | US-01 | UC-01 | T-01 |
| 3. Dashboard | FR-09 | US-01 | — | T-01 |
| 4. New Sale | FR-06 (block), §9.10 | US-02 | UC-02 | T-01 |
| 5. Scan/Search | FR-13..17 | US-02 | UC-02 | T-02, T-03 |
| 6. Check Stock | FR-18..21 | US-02 | UC-03 | T-04 |
| 7. Add to Cart | FR-22, 23, 30 | US-02 | UC-03 | T-05 |
| 8. Review Cart | FR-24..31 | US-03 | UC-04 | T-06, T-07 |
| 9. Customer | FR-32..36 | US-04 | UC-05 | T-08, T-09 |
| 10. Payment | FR-37..42, 44 | US-05 | UC-06, UC-07 | T-10..12 |
| 11. Payment check | FR-43..45 | US-05 | UC-08 | T-13 |
| 12. Receipt | FR-46..52 | US-06 | UC-09 | T-14 |
| 13. Inventory | FR-53, 54 | US-06 | UC-10 | T-15 |
| 14. Sales report | FR-55 | US-09 | UC-10 | T-18 |
| 15. Loyalty | FR-56 | US-04/06 | UC-10 | T-09, T-15 |
| 16. Completed | FR-57, 59 | US-06 | UC-10 | T-15 |
| 17. Next Customer | FR-60 | US-07 | UC-11 | T-16 |
| 18. Close Shift | FR-10..12 | US-08 | UC-12 | T-17 |

---

## 24. Deployment & Rollout Plan

| Phase | Activities | Exit Criteria |
|-------|------------|---------------|
| P-0 Prep | Catalog + opening stock import; users/roles; tax, discount threshold, loyalty rule config | Import validated; checklist signed |
| P-1 Pilot | 1 terminal, 1 cashier, sandbox payments; supervised live sales 1 week | All T-01..18 pass; variance = 0 unexplained |
| P-2 Hardening | Fix pilot issues; printer/email/SMS verified; backup/restore drill | Re-test fails; drill RTO met |
| P-3 Rollout | Remaining terminals; all-cashier training (≤ 30 min each) | Every cashier completes US-01..08 solo |
| P-4 Hypercare | 2 weeks on-call; daily variance + sync health review | Zero severity-1 defects 5 days straight |

---

## 25. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Payment gateway downtime | Cannot take non-cash | Cash fallback + clear "card unavailable" banner; retry queue for e-receipts |
| Printer failure mid-rush | No paper receipts | Email/SMS offer + print-retry queue; spare printer on site |
| Oversell on last unit (2 terminals) | Customer complaint | Soft reservations (FR-21) + atomic finalize (FR-58) |
| Catalog/stock import errors | Wrong prices/stock | Staged import with variance report + manager sign-off (P-0) |
| Cashier skips count / forces close | Cash loss | System blocks close (FR-10/11); variance tolerance + manager note |
| Credential sharing | No accountability | Individual PINs; no shared logins (policy) + idle timeout |

---

## 26. Acceptance & Sign-Off Criteria

- [ ] All **Must** FRs demoed end-to-end on production-equivalent terminal + hardware.
- [ ] Full 18-step loop executed live: login → float → multi-item + discount sale →
      member attach → split payment → print/email/SMS receipt → close with variance.
- [ ] All exception paths demoed: E-PROD-01, E-STOCK-01/02, E-PAY-01..03, E-SYNC-01.
- [ ] Post-sale reconciliation: inventory, REP-01..08, and loyalty balances match test sales exactly.
- [ ] Performance smoke: NFR-01..05 measured and recorded.
- [ ] Pilot week: zero unexplained variances; all voids/reprints have reasons/logs.
- [ ] Signatures from all §1.2 approvers.

---

## 27. Glossary

| Term | Definition |
|------|------------|
| **Shift** | Cashier work period on one terminal, open (float) → close (count) |
| **Cash Float** | Starting drawer cash at shift open |
| **Variance** | Expected vs. counted cash at close (over/short) |
| **Split Payment** | One sale paid with ≥ 2 methods |
| **Walk-in** | Guest customer, no stored record |
| **Loyalty Member** | Registered customer earning points |
| **TxnID** | Unique human-readable transaction code |
| **Soft Reservation** | Temporary stock hold for an open sale |
| **Atomic Finalize** | All-or-nothing posting of sale + payments + inventory + loyalty |
| **UAT** | User acceptance testing by real cashiers/managers |

---

*Related: `README.md` — user flow documentation with the 18-step mermaid diagram.*
