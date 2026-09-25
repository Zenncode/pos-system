import { describe, expect, it } from "vitest";
import { canSeeNav, visibleNav, NAV_META, type NavMeta } from "~/shared/layouts/MainLayout";

const byRoute = (route: string): NavMeta => NAV_META.find((n) => n.route === route)!;

describe("nav parity — demo never displays a route its page guard denies", () => {
  it("demo CASHIER keeps working screens (dashboard/reports) but not guard-denied ones", () => {
    const routes = visibleNav("CASHIER", true).map((n) => n.route);
    expect(routes).toContain("/dashboard");
    expect(routes).toContain("/reports");
    expect(routes).not.toContain("/products"); // products guard: MANAGER, no demo exception
    expect(routes).not.toContain("/refund"); // refund guard: MANAGER, no demo exception
    expect(routes).not.toContain("/settings"); // settings guard: ADMIN
  });

  it("canSeeNav denies refund/products/settings for demo CASHIER", () => {
    expect(canSeeNav("CASHIER", byRoute("/refund"), true)).toBe(false);
    expect(canSeeNav("CASHIER", byRoute("/products"), true)).toBe(false);
    expect(canSeeNav("CASHIER", byRoute("/settings"), true)).toBe(false);
    expect(canSeeNav("CASHIER", byRoute("/dashboard"), true)).toBe(true);
    expect(canSeeNav("CASHIER", byRoute("/reports"), true)).toBe(true);
  });

  it("real MANAGER sees products/refund but not ADMIN-only settings", () => {
    const routes = visibleNav("MANAGER", false).map((n) => n.route);
    expect(routes).toContain("/products");
    expect(routes).toContain("/refund");
    expect(routes).not.toContain("/settings");
  });

  it("ADMIN sees everything including settings", () => {
    const routes = visibleNav("ADMIN", false).map((n) => n.route);
    expect(routes).toContain("/settings");
    expect(routes).toContain("/refund");
    expect(routes).toContain("/products");
  });

  it("CASHIER without demo sees only cashier screens", () => {
    const routes = visibleNav("CASHIER", false).map((n) => n.route);
    expect(routes).toContain("/register");
    expect(routes).not.toContain("/dashboard");
    expect(routes).not.toContain("/refund");
    expect(routes).not.toContain("/settings");
  });
});
