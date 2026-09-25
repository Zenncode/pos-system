// Payment-method contract test — frontend must match the backend Zod contract
// exactly (POS-API/zod/order.schema.ts → paymentInputSchema.method =
// CASH | CARD | QR). A WALLET value would be sent and rejected with 400.
// Run with: npm run test:unit (vitest).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALLOWED_PAYMENT_METHODS } from "../../app/types/index.ts";

describe("payment method contract (CASH | CARD | QR)", () => {
  it("allowed payment methods are exactly the backend contract values", () => {
    expect([...ALLOWED_PAYMENT_METHODS]).toEqual(["CASH", "CARD", "QR"]);
  });

  it("unsupported WALLET is not an allowed payment method", () => {
    expect((ALLOWED_PAYMENT_METHODS as readonly string[])).not.toContain("WALLET");
  });

  it("register checkout UI never offers or submits WALLET", () => {
    // Vitest runs with cwd = POS-APP, so resolve the route source from there.
    const source = readFileSync(join(process.cwd(), "app/routes/register.tsx"), "utf8");
    expect(source).not.toContain("WALLET");
  });
});
