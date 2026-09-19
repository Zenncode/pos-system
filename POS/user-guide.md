# POS System — Cashier User Guide (Manwal ng Kahera/Kahero)

> Step-by-step manual para sa araw-araw na paggamit ng POS.
> Technical specs: `README.md` · Requirements: `requirement.md` · API: `api.md`

---

## 1. Bago Magsimula (Checklist)

- [ ] Bukas ang terminal, nakasaksak ang scanner, printer, at card reader
- [ ] May resibo paper ang printer
- [ ] Alam mo ang username + PIN mo
- [ ] Alam mo ang opening float (panukli) ngayong araw

---

## 2. Login

1. Buksan ang POS sa browser/terminal.
2. Ilagay ang **username** at **PIN**, pindutin **Login**.
3. Mali ang PIN nang 5 beses? Ma-lock ang account ng 15 minuto — tawagin ang admin/manager.

---

## 3. Open Shift (Pagbubukas ng Duty)

1. Ilagay ang **opening float** — ang perang panukli sa drawer (hal. ₱5,000.00).
2. I-check ang devices: scanner ✅, printer ✅, card reader ✅.
   - May ⚠️ warning? Pwede pa rin mag-open, pero i-report agad sa manager.
3. Pindutin **Open Shift** → mapupunta ka sa **Dashboard**.
4. ⚠️ HINDI ka makakagawa ng benta hangga't walang open shift.

---

## 4. Bagong Benta (New Sale)

1. Pindutin **New Sale** sa dashboard.
2. May lalabas na transaction number (hal. `TXN-20260910-0042`) — ito ang resibo ID.

---

## 5. Pag-scan ng Produkto

1. I-scan ang **barcode** ng item, O i-type ang pangalan/SKU sa search box.
2. **Hindi mahanap?** Lalabas ang *"Product not found"*:
   - Ulitin ang scan, O
   - Gamitin ang **Manual Entry** (piliin ang produkto sa listahan).
3. **Out of stock?** Lalabas ang *"out of stock"* — hindi ito madadagdag sa cart. Sabihan ang customer.
4. Paulit-ulit lang mag-scan para sa bawat item (**Scan Next Item**).
5. Doble ang scan ng parehong item? Magsasama ito sa isang linya (dadami ang qty).

---

## 6. Review ng Cart

Bago singilin, ayusin muna ang cart:

| Gagawin | Paano |
|---------|-------|
| Baguhin ang dami | Gamitin ang **+ / −** sa linya (hanggang sa available stock lang) |
| Tanggalin ang item | Pindutin **Remove** → **Confirm** |
| Lagyan ng note | Pindutin ang note icon (hal. "walang yelo", "hiwalay na plastic") |
| Mag-discount | Pindutin **Discount** → piliin % o fixed → ilagay ang dahilan |

- Ang **total** ay automatic nag-a-update sa bawat baguhin.
- Discount na **lagpas sa limit** (10% o ₱500)? Kailangan ng **manager PIN**.
- Walang laman ang cart? Hindi gagana ang Pay — mag-scan muna.

---

## 7. Customer: Walk-in o Loyalty Member

- **Walk-in (guest):** piliin ang **Walk-in** — walang record na kailangan.
- **Loyalty member:**
  1. I-search ang pangalan, cellphone number, o member ID.
  2. Nakita? Piliin — makikita ang points balance niya.
  3. Wala pa? Pindutin **Register New** — kailangan ang **pangalan + cellphone** (email optional).

---

## 8. Pagbabayad (Payment)

### 8.1 Cash

1. Piliin **Cash**, ilagay ang perang ibinigay (hal. ₱100 sa ₱90 na total).
2. Ipapakita ang **sukli** (₱10.00). Ibigay ang sukli + resibo.

### 8.2 Card / Wallet

1. Piliin ang method, ilagay ang amount.
2. Hintayin ang **Approved** sa terminal — HUWAG pipindutin nang paulit-ulit.
3. **Declined?** Piliin ang isa:
   - **Retry** — ulitin ang same method
   - **Change Method** — ibang bayad (cart at customer mananatili)
   - **Cancel Sale** — kanselahin lahat (may dahilan, babalik ang stock)

### 8.3 QR Payment

1. Piliin **QR** — may lalabas na code + countdown (120 seconds).
2. Kapag nag-expire bago mabayaran → **bagong code** o ibang method.

### 8.4 Split Payment (halo-halong bayad)

1. Piliin **Split**, ilagay ang bawat bayad (hal. ₱50 cash + ₱40 card).
2. May **remaining balance tracker** — hindi matatapos hangga't kulang.
3. Sobra lang sa cash ang pwede (ibabalik bilang sukli).

---

## 9. Resibo (Receipt)

Pagkabayad, mamili ng resibo:

- **Print** — ii-print sa thermal printer
- **Email** — sa email ng member o i-type ang email
- **SMS** — summary + total + transaction number sa cellphone

> Offline ang printer? Piliin muna ang Email/SMS, subukan ulit ang print mamaya.
> Ang muling pag-print ay naka-log bilang **REPRINT**.

---

## 10. Tapos ang Benta — Next Customer

1. Lalabas ang **Sale Completed** — TxnID, total, sukli, loyalty points.
2. Pindutin **Next Customer** para sa susunod — hindi na kailangan mag-login ulit.
3. Ulitin mula Step 4 hanggang matapos ang shift.

---

## 11. Close Shift (Pagsasara ng Duty)

1. Siguraduhing **walang naiwang open na benta** (tapusin o i-void muna).
2. Pindutin **Close Shift**.
3. Bilangin ang **physical cash** sa drawer, ilagay ang amount.
4. Lalabas ang report: inaasahan vs. nabilang → **variance** (over/short).
   - May diperensya na lagpas ₱100? Kailangan ng manager note.
5. Pindutin **Close Shift** → automatic **logout**.
6. I-print o i-save ang shift report para sa manager.

---

## 12. Kapag May Problema (Troubleshooting)

| Problema | Gawin |
|----------|-------|
| Hindi maka-login | I-check ang PIN; locked? hintay 15 min o tawag ng admin |
| Hindi makagawa ng sale | Baka walang open shift — mag Open Shift muna |
| Hindi mahanap ang produkto | Search Again / Manual Entry |
| Out of stock | Sabihan ang customer; hindi ito mabebenta |
| Card declined | Retry / Change Method / Cancel Sale |
| QR nag-expire | Bagong code o ibang method |
| Printer offline | Email/SMS muna, retry print mamaya |
| Hindi matapos ang sale | Baka kulang ang bayad (tingnan ang remaining) o may error — basahin ang message |
| Nag-hang | Huwag doblehin ang pindot; tawagin ang manager/IT; walang mawawalang completed sale |

---

*Technical docs: `README.md` · `requirement.md` · `api.md` · `database.md`.*
