// Split-tender tests — exercise the PRODUCTION validation chain the register
// consumes: computeDiscountCents (pending discount) → chargeTotalCents (fresh
// charge total) → isSplitTenderValid / splitRemainingCents (posRules).
// The payment sheet must validate split tenders against the FRESH finalTotal =
// cap - pendingDiscount that doCharge() charges — never the stale rendered total.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { computeDiscountCents } from "../../app/lib/discount.ts";
import { chargeTotalCents, isSplitTenderValid, splitRemainingCents } from "../../app/lib/posRules.ts";

describe("split-tender validation uses the fresh charge total", () => {
  it("stale total rejects a split that fully covers the fresh total", () => {
    // Cart ₱100.00, cashier typed 20% off but it has not blurred/committed yet:
    // stale rendered total ₱100.00, fresh charge total ₱80.00.
    const staleTotal = 10000;
    const pending = computeDiscountCents("20", "PCT", 10000);
    assert.equal(pending, 2000);
    const finalTotal = chargeTotalCents(10000, pending);
    assert.equal(finalTotal, 8000);
    // Split tenders sum to ₱90.00 — short against stale, overpay (cash) vs fresh.
    const tenders = [
      { method: "CASH", amountCents: 5000 },
      { method: "CARD", amountCents: 4000 },
    ];
    assert.equal(isSplitTenderValid(tenders, staleTotal), false); // stale says "still due"
    assert.equal(isSplitTenderValid(tenders, finalTotal), true); // fresh says covered + cash overpay ok
  });

  it("stale total accepts a split that leaves the fresh total short", () => {
    // Discount was committed (₱20 off → rendered ₱80) but the cashier cleared
    // the input: stale total ₱80.00, fresh charge total ₱100.00.
    const staleTotal = 8000;
    const pending = computeDiscountCents("", "PCT", 10000);
    assert.equal(pending, 0);
    const finalTotal = chargeTotalCents(10000, pending);
    assert.equal(finalTotal, 10000);
    // Split sums to exactly the stale total — undercharges the fresh total.
    const tenders = [
      { method: "CASH", amountCents: 5000 },
      { method: "CARD", amountCents: 3000 },
    ];
    assert.equal(isSplitTenderValid(tenders, staleTotal), true); // stale says covered
    assert.equal(isSplitTenderValid(tenders, finalTotal), false); // fresh says ₱20 still due
    assert.equal(splitRemainingCents(finalTotal, tenders), 2000);
  });

  it("non-cash overpay of the fresh total is still rejected", () => {
    const pending = computeDiscountCents("10", "PCT", 10000);
    const finalTotal = chargeTotalCents(10000, pending); // ₱90.00
    const tenders = [
      { method: "CARD", amountCents: 5000 },
      { method: "QR", amountCents: 5000 },
    ]; // ₱100.00 — overpay with no cash tender
    assert.equal(splitRemainingCents(finalTotal, tenders), -1000);
    assert.equal(isSplitTenderValid(tenders, finalTotal), false);
  });

  it("exact cover of the fresh total needs no cash tender", () => {
    const pending = computeDiscountCents("10", "PCT", 10000);
    const finalTotal = chargeTotalCents(10000, pending); // ₱90.00
    const tenders = [
      { method: "CARD", amountCents: 5000 },
      { method: "QR", amountCents: 4000 },
    ];
    assert.equal(splitRemainingCents(finalTotal, tenders), 0);
    assert.equal(isSplitTenderValid(tenders, finalTotal), true);
  });
});
