// Discount math for the register — pure, cents-accurate, defensive.
// Extracted from app/routes/register.tsx so it can be unit-tested directly.
// Money stays integer cents end-to-end; format ONLY at render.
import { parseToCents } from "./format";

export type DiscountMode = "PCT" | "FIX";

/**
 * Compute the discount in cents, clamped to [0, cap].
 * `cap` is expected to be subtotal + tax in cents. Anything that is not a
 * finite positive number (undefined, null, NaN, Infinity, <= 0) yields 0 —
 * an empty cart can never carry a discount.
 */
export function computeDiscountCents(
  discValue: string,
  discMode: DiscountMode,
  cap: number | undefined | null,
): number {
  const safeCap = typeof cap === "number" && Number.isFinite(cap) ? Math.max(0, Math.floor(cap)) : 0;
  if (safeCap <= 0) return 0;
  if (discMode === "PCT") {
    // A leading "-" is not a formatting artifact — it is invalid discount
    // input. The sanitizer below strips non-numeric chars, which would turn
    // "-10" into "10" (a positive discount). Reject negatives explicitly.
    if (/-/.test(discValue)) return 0;
    const pct = Number(discValue.replace(/[^0-9.]/g, ""));
    const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
    if (safePct <= 0) return 0;
    return Math.max(0, Math.min(safeCap, Math.round((safeCap * safePct) / 100)));
  }
  const fixed = parseToCents(discValue || "0");
  if (!Number.isFinite(fixed)) return 0;
  return Math.max(0, Math.min(safeCap, fixed));
}
