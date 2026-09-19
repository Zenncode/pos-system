# POS System — Changelog

> Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: SemVer.
> Newest on top. Link each release to its test evidence (UAT sign-off).

---

## [Unreleased]

### Added

- (add new features here)

### Changed

- (add changes here)

### Fixed

- (add fixes here)

---

## [1.0.0] — YYYY-MM-DD (initial release)

### Added

- Shift management: cashier login, open shift (cash float + terminal check), dashboard, close shift (cash count + variance + logout).
- Sales: new sale, barcode scan, name/SKU search, manual entry fallback.
- Stock: real-time availability check, out-of-stock blocking.
- Cart: multi-item loop, quantity update, remove, notes, % / fixed discounts with manager-PIN threshold.
- Customer: walk-in guest + loyalty member search/registration.
- Payments: cash (change), credit/debit card, wallet, QR, split payment; retry / change method / cancel sale.
- Receipts: print (58/80 mm), email, SMS; stored copy per sale.
- Back-office sync: atomic inventory deduction, sales report append, loyalty accrual, completion lock.
- Next-customer loop under the same shift.
- Reports REP-01..08 (shift, daily, transactions, voids, variance, stock alerts, loyalty, discounts).
- Docs: `README.md`, `requirement.md`, `techstack.md`, `database.md`, `api.md`, `user-guide.md`, `architecture.md`, `deployment.md`.

---

## Template for the next release

```md
## [1.1.0] — YYYY-MM-DD

### Added
- Returns / refunds flow (post-completion void with reason + stock return).

### Changed
- Receipt footer text updated per BIR memo.

### Fixed
- QR timeout no longer double-charges on retry (idempotency key).
```

---

*Docs index: `README.md` · `requirement.md` · `techstack.md` · `database.md` · `api.md` · `user-guide.md` · `architecture.md` · `deployment.md`.*
