import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Register from "~/routes/register";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  push: vi.fn(),
  openShift: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("~/lib/api", () => ({
  ApiError: class ApiError extends Error {
    code?: string;
    constructor(code = "UNKNOWN") {
      super(code);
      this.code = code;
    }
  },
  checkout: vi.fn(),
  deliverReceipt: vi.fn(),
  listCategories: vi.fn().mockResolvedValue([]),
  listCustomers: vi.fn().mockResolvedValue({ data: [], page: 1, pageSize: 50, total: 0 }),
  listProducts: vi.fn().mockResolvedValue({ data: [], page: 1, pageSize: 200, total: 0 }),
  lookupBarcode: vi.fn().mockResolvedValue(null),
  requestOverride: vi.fn(),
}));

vi.mock("~/shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Test Cashier", role: "CASHIER" }, loading: false, demoMode: false }),
}));

vi.mock("~/shared/hooks/useCart", () => ({
  useCart: () => ({
    lines: [],
    totals: { subtotalCents: 0, taxCents: 0, discountCents: 0, totalCents: 0 },
    add: vi.fn(),
    inc: vi.fn(),
    dec: vi.fn(),
    setQty: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    setDiscount: vi.fn(),
    pendingSync: false,
    setPendingSync: vi.fn(),
  }),
}));

vi.mock("~/shared/hooks/useShift", () => ({
  useShift: () => ({ shift: { storeId: "s1", status: "OPEN" }, loading: false, open: mocks.openShift }),
}));

vi.mock("~/shared/hooks/useSocket", () => ({ useSocket: vi.fn() }));
vi.mock("~/shared/hooks/useThermalPrint", () => ({
  useThermalPrint: () => ({ printing: false, printOrder: vi.fn() }),
}));
vi.mock("~/shared/hooks/useToast", () => ({ useToast: () => ({ push: mocks.push }) }));

describe("Register semantics + focus targets", () => {
  beforeEach(() => {
    mocks.navigate.mockClear();
    mocks.push.mockClear();
  });

  it("uses group semantics, never fake tablist/tab without tabpanels", () => {
    render(<Register />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByRole("group", { name: "Register view" })).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "Categories" }).length).toBeGreaterThanOrEqual(1);
  });

  it("view-switch buttons expose aria-pressed state", () => {
    render(<Register />);
    expect(screen.getByRole("button", { name: "Catalog" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Cart/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("F3/F4 focus targets (customer, discount) are rendered", () => {
    render(<Register />);
    expect(screen.getByLabelText("Customer")).toBeInTheDocument();
    expect(screen.getByLabelText("Discount")).toBeInTheDocument();
    // Rail + compact search inputs both stay mounted (responsive CSS picks one).
    expect(screen.getAllByLabelText("Search products").length).toBeGreaterThanOrEqual(1);
  });

  it("view-switch drives real mobileView state (catalog ⇄ cart)", () => {
    render(<Register />);
    const catalogBtn = screen.getByRole("button", { name: "Catalog" });
    const cartBtn = screen.getByRole("button", { name: /Cart/ });
    // Initial state: catalog active.
    expect(catalogBtn).toHaveAttribute("aria-pressed", "true");
    expect(cartBtn).toHaveAttribute("aria-pressed", "false");
    // Real state transition: clicking Cart flips aria-pressed on both buttons.
    fireEvent.click(cartBtn);
    expect(catalogBtn).toHaveAttribute("aria-pressed", "false");
    expect(cartBtn).toHaveAttribute("aria-pressed", "true");
    // And back again — proves the switch is live state, not static ARIA.
    fireEvent.click(catalogBtn);
    expect(catalogBtn).toHaveAttribute("aria-pressed", "true");
    expect(cartBtn).toHaveAttribute("aria-pressed", "false");
  });
});
