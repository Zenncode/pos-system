// Cash-tender display/decision tests — exercise the PRODUCTION helpers the
// register consumes (cashDecision / cashConfirmLabel / chargeTotalCents from
// app/lib/posRules.ts, computeDiscountCents from app/lib/discount.ts).
// The CASH banner + confirm affordance must compare tenderedCents against the
// FRESH chargeTotal/finalTotal = cap - pendingDiscount — the same basis
// canCharge/doCharge validate against — never the stale rendered total.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { computeDiscountCents } from "../../app/lib/discount.ts";
import { cashConfirmLabel, cashDecision, chargeTotalCents } from "../../app/lib/posRules.ts";

describe("cash banner/confirm uses the fresh charge total", () => {
  it("shows change against the fresh total when tender covers fresh but not stale", () => {
    // Cart ₱100.00, cashier typed 20% off not yet committed:
    // stale rendered ₱100.00, fresh charge total ₱80.00. Tender ₱90.00.
    const staleTotal = 10000;
    const pending = computeDiscountCents("20", "PCT", 10000);
    assert.equal(pending, 2000);
    const chargeTotal = chargeTotalCents(10000, pending);
    assert.equal(chargeTotal, 8000);
    const staleView = cashDecision(9000, staleTotal);
    const freshView = cashDecision(9000, chargeTotal);
    assert.equal(staleView.covered, false); // stale banner would say "₱10 still due"
    assert.equal(freshView.covered, true); // fresh banner shows ₱10 change — matches canCharge/doCharge
    assert.equal(freshView.changeCents, 1000);
    assert.equal(freshView.remainingCents, 0);
    assert.equal(cashConfirmLabel(9000, chargeTotal), "Confirm ₱80.00");
  });

  it("shows remaining against the fresh total when tender covers stale but not fresh", () => {
    // Discount committed (₱20 off → rendered ₱80) but cashier cleared input:
    // stale ₱80.00, fresh ₱100.00. Tender ₱80.00.
    const staleTotal = 8000;
    const pending = computeDiscountCents("", "PCT", 10000);
    assert.equal(pending, 0);
    const chargeTotal = chargeTotalCents(10000, pending);
    assert.equal(chargeTotal, 10000);
    const staleView = cashDecision(8000, staleTotal);
    const freshView = cashDecision(8000, chargeTotal);
    assert.equal(staleView.covered, true); // stale banner would show "₱0 change" + Confirm
    assert.equal(freshView.covered, false); // fresh banner shows ₱20 remaining — matches doCharge guard
    assert.equal(freshView.remainingCents, 2000);
    assert.equal(freshView.changeCents, 0);
    assert.equal(cashConfirmLabel(8000, chargeTotal), "Enter amount");
  });

  it("exact tender of the fresh total confirms with zero change", () => {
    const pending = computeDiscountCents("10", "PCT", 10000); // ₱10.00 off
    assert.equal(pending, 1000);
    const chargeTotal = chargeTotalCents(10000, pending); // ₱90.00
    const view = cashDecision(9000, chargeTotal);
    assert.equal(view.covered, true);
    assert.equal(view.changeCents, 0);
    assert.equal(view.remainingCents, 0);
    assert.equal(cashConfirmLabel(9000, chargeTotal), "Confirm ₱90.00");
  });

  it("empty tender always shows remaining + Enter amount", () => {
    const chargeTotal = chargeTotalCents(5000, 0);
    const view = cashDecision(0, chargeTotal);
    assert.equal(view.covered, false);
    assert.equal(view.remainingCents, 5000);
    assert.equal(view.changeCents, 0);
    assert.equal(cashConfirmLabel(0, chargeTotal), "Enter amount");
  });
});
