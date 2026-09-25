// Discount-math unit tests — Vitest runner (Vite resolver handles extensionless lib imports).
// Run: npm run test:unit
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { computeDiscountCents } from "../../app/lib/discount.ts";

describe("computeDiscountCents — cap robustness", () => {
  it("undefined cap → 0", () => assert.equal(computeDiscountCents("10", "PCT", undefined), 0));
  it("null cap → 0", () => assert.equal(computeDiscountCents("10", "PCT", null), 0));
  it("NaN cap → 0", () => assert.equal(computeDiscountCents("10", "PCT", NaN), 0));
  it("Infinity cap → 0", () => assert.equal(computeDiscountCents("10", "PCT", Infinity), 0));
  it("zero/negative cap → 0", () => {
    assert.equal(computeDiscountCents("10", "PCT", 0), 0);
    assert.equal(computeDiscountCents("5.00", "FIX", -100), 0);
  });
});

describe("computeDiscountCents — PCT mode", () => {
  it("10% of ₱100.00 → ₱10.00", () => assert.equal(computeDiscountCents("10", "PCT", 10000), 1000));
  it("empty/garbage input → 0", () => {
    assert.equal(computeDiscountCents("", "PCT", 10000), 0);
    assert.equal(computeDiscountCents("abc", "PCT", 10000), 0);
  });
  it("clamps above 100%", () => assert.equal(computeDiscountCents("250", "PCT", 10000), 10000));
  it("rounds fractional cents", () => assert.equal(computeDiscountCents("10", "PCT", 333), 33));
  it("rejects negative PCT input (\"-10\" is invalid, not +10%)", () => {
    assert.equal(computeDiscountCents("-10", "PCT", 10000), 0);
    assert.equal(computeDiscountCents("-0.5", "PCT", 10000), 0);
    assert.equal(computeDiscountCents(" -10% ", "PCT", 10000), 0);
  });
});

describe("computeDiscountCents — FIX mode", () => {
  it("happy path ₱5.00 off ₱100.00", () => assert.equal(computeDiscountCents("5.00", "FIX", 10000), 500));
  it("clamps to cap", () => assert.equal(computeDiscountCents("9999.00", "FIX", 10000), 10000));
  it("empty → 0", () => assert.equal(computeDiscountCents("", "FIX", 10000), 0));
  it("rejects negative FIX input", () => { assert.equal(computeDiscountCents("-5.00","FIX",10000),0); });
});
