// Pure POS business rules — SRS §13 (Business Rules) + §13.1 defaults.
// Money is cents everywhere. These are UI-side guards; server re-checks (SEC-08).
import type { CashCount, Order } from "../types";
import { formatCents } from "./format";

// Config defaults (SRS §13.1). TODO: read from a /api/config endpoint (contract gap).
export const DISCOUNT_MAX_PCT = 10; // cashier may discount up to 10% …
export const DISCOUNT_MAX_CENTS = 50000; // … or ₱500, whichever hit first, without manager PIN (FR-28)
export const VARIANCE_NOTE_MAX_CENTS = 10000; // |variance| > ₱100 requires manager note (UC-12 A2)

// Philippine cash denominations in centavos.
// Bills: ₱1000/500/200/100/50/20 · Coins: ₱20/10/5/1 · Centavos: 25/10/5/1.
export const DENOMINATIONS_CENTS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 100, 25, 10, 5, 1] as const;

export function floatCents(counts: CashCount[] | null | undefined): number {
  if (!counts) return 0;
  return counts.reduce((s, c) => {
    const d = Math.floor(c.denomination);
    const n = Math.floor(c.count);
    return d > 0 && n > 0 ? s + d * n : s;
  }, 0);
}

export function toCounts(values: Record<number, number>): CashCount[] {
  return Object.entries(values)
    .map(([denom, count]) => ({ denomination: Number(denom), count: Math.max(0, Math.floor(count || 0)) }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.denomination - a.denomination);
}

// Discount is over-threshold when % of total OR absolute cents exceed their caps.
// Zero-total carts never carry a valid discount → treated as over-threshold only if cents > 0.
export function discountOverThreshold(discountCents: number, totalCents: number): boolean {
  if (discountCents <= 0) return false;
  if (discountCents > DISCOUNT_MAX_CENTS) return true;
  if (totalCents <= 0) return false;
  return (discountCents / totalCents) * 100 > DISCOUNT_MAX_PCT;
}

// Split payment: remaining = total − Σ entered tenders (SRS method-rule "Split math").
export function splitRemainingCents(totalCents: number, tenders: { amountCents: number }[]): number {
  return totalCents - tenders.reduce((s, t) => s + t.amountCents, 0);
}

// BR-04: overpay is allowed on cash only (returned as change).
export function splitOverpayAllowed(tenders: { method: string; amountCents: number }[], totalCents: number): boolean {
  const sum = tenders.reduce((s, t) => s + t.amountCents, 0);
  if (sum <= totalCents) return true;
  return tenders.some((t) => t.method === "CASH");
}

// Fresh-total basis for charge validation: the discount input may not have
// blurred yet, so the rendered total can be stale. The charge path commits the
// pending discount first (cap − pendingDiscount) and validates against THAT
// total — never the stale rendered one. Integer cents end-to-end.
export function chargeTotalCents(capCents: number, discountCents: number): number {
  return Math.max(0, capCents - discountCents);
}

// Canonical split-tender validation — the same predicate the register uses for
// the SPLIT affordance (splitValid) and for the doCharge() guard. Tenders must
// cover the (fresh) total across ≥2 rows; overpay needs a cash tender (BR-04).
export function isSplitTenderValid(
  tenders: { method: string; amountCents: number }[],
  totalCents: number,
): boolean {
  const remaining = splitRemainingCents(totalCents, tenders);
  return (
    tenders.length >= 2 &&
    remaining <= 0 &&
    (remaining === 0 || splitOverpayAllowed(tenders, totalCents))
  );
}

export interface CashDecision {
  covered: boolean;
  changeCents: number;
  remainingCents: number;
}

// Canonical cash-tender display/decision — the same predicate the register CASH
// banner, confirm affordance, and doCharge() guard all key off: covered when
// tenderedCents >= charge total; change/remaining derived from the same basis.
export function cashDecision(tenderedCents: number, chargeTotal: number): CashDecision {
  const covered = tenderedCents >= chargeTotal;
  return {
    covered,
    changeCents: covered ? tenderedCents - chargeTotal : 0,
    remainingCents: covered ? 0 : chargeTotal - tenderedCents,
  };
}

// Canonical confirm-button label for the CASH tab — mirrors the register copy
// exactly ("Enter amount" while short, "Confirm <formatted total>" when covered).
export function cashConfirmLabel(tenderedCents: number, chargeTotal: number): string {
  return tenderedCents < chargeTotal ? "Enter amount" : `Confirm ${formatCents(chargeTotal)}`;
}

// Expected drawer at close: float + cash received − cash given back as change, for paid orders.
export function expectedCashCents(openingFloat: number, orders: Order[]): number {
  return orders
    .filter((o) => o.status === "PAID")
    .reduce(
      (drawer, o) =>
        drawer +
        o.payments.filter((p) => p.method === "CASH").reduce((s, p) => s + p.amountCents, 0) -
        (o.changeCents ?? 0),
      openingFloat,
    );
}

export function varianceCents(expected: number, counted: number): number {
  return counted - expected;
}

// Receipt-delivery target validation (FR-31) — lenient format checks, server re-validates.
export function validEmail(s: string): boolean {
  return /^\S+@\S+\.\S+$/.test(s.trim());
}

export function validPhone(s: string): boolean {
  return s.replace(/\D/g, "").length >= 7;
}
