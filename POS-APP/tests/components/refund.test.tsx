import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Refund from "~/routes/refund";
import { listOrders, getOrder, requestOverride, voidOrder } from "~/lib/api";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  push: vi.fn(),
  authUser: { id: "u1", role: "MANAGER" } as { id: string; role: string },
  authLoading: false,
  NavigateCapture: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    Navigate: (props: { to: string; replace?: boolean }) => {
      mocks.NavigateCapture(props);
      return null;
    },
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("~/shared/hooks/useAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/shared/hooks/useAuth")>();
  return {
    ...actual,
    useAuth: () => ({
      user: mocks.authUser,
      loading: mocks.authLoading,
      demoMode: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      roleAtLeast: (role: string | undefined, target: string) => {
        const order = ["CASHIER", "MANAGER", "ADMIN"];
        return order.indexOf(role ?? "CASHIER") >= order.indexOf(target);
      },
    }),
  };
});

vi.mock("~/lib/api", () => ({
  listOrders: vi.fn().mockResolvedValue({ data: [] }),
  getOrder: vi.fn().mockResolvedValue({
    id: "order-1",
    orderNumber: "ORD-001",
    totalCents: 1000,
    createdAt: new Date().toISOString(),
    customer: { name: "Walk-in" },
  }),
  requestOverride: vi.fn().mockResolvedValue("override-token"),
  voidOrder: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/shared/hooks/useToast", () => ({
  useToast: () => ({ push: mocks.push }),
}));

describe("Refund", () => {
  beforeEach(() => {
    mocks.navigate.mockClear();
    mocks.push.mockClear();
    mocks.authUser = { id: "u1", role: "MANAGER" };
    mocks.authLoading = false;
    vi.clearAllMocks();
    listOrders.mockResolvedValue({ data: [] });
  });

  it("allows CASHIER and redirects unauthenticated to /orders", async () => {
    mocks.authUser = { id: "u2", role: "CASHIER" };
    const { unmount } = render(<Refund />);
    await waitFor(
      () =>
        expect(
          screen.getByText("No paid orders found. Voided orders stay in Orders."),
        ).toBeInTheDocument(),
      { timeout: 10000 },
    );
    expect(mocks.NavigateCapture).not.toHaveBeenCalled();
    unmount();
    mocks.NavigateCapture.mockClear();
    mocks.push.mockClear();
    mocks.authUser = null as unknown as { id: string; role: string };
    render(<Refund />);
    await waitFor(
      () =>
        expect(mocks.NavigateCapture).toHaveBeenCalledWith(
          expect.objectContaining({ to: "/orders", replace: true }),
        ),
      { timeout: 5000 },
    );
    expect(mocks.push).toHaveBeenCalledWith("error", "Cashier access required.");
  });

  it("shows empty state when no orders", async () => {
    listOrders.mockResolvedValueOnce({ data: [] });
    render(<Refund />);
    await waitFor(
      () =>
        expect(
          screen.getByText("No paid orders found. Voided orders stay in Orders."),
        ).toBeInTheDocument(),
      { timeout: 10000 },
    );
  });

  it("loads orders on mount for managers", async () => {
    listOrders.mockResolvedValueOnce({
      data: [{ id: "order-1", orderNumber: "ORD-001", totalCents: 1000, status: "PAID" }],
    });
    render(<Refund />);
    await waitFor(() => expect(screen.getByText("ORD-001")).toBeInTheDocument(), { timeout: 10000 });
  });

  it("validates manager PIN format (4-8 digits)", async () => {
    mocks.authUser = { id: "u2", role: "CASHIER" };
    listOrders.mockResolvedValueOnce({
      data: [{ id: "order-1", orderNumber: "ORD-001", totalCents: 1000, status: "PAID" }],
    });
    render(<Refund />);
    await waitFor(() => expect(screen.getByText("ORD-001")).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.click(screen.getByText("ORD-001"));
    await waitFor(() => expect(screen.getByLabelText(/Reason for refund/)).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.change(screen.getByLabelText(/Reason for refund/), { target: { value: "Customer request" } });
    
    // Try with invalid PIN (non-digits)
    fireEvent.change(screen.getByLabelText("Manager PIN"), { target: { value: "abcd" } });
    fireEvent.click(screen.getByRole("button", { name: /void/i }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("error", "Enter the manager PIN (4-8 digits)."), { timeout: 5000 });
    
    // Try with invalid PIN (too short)
    mocks.push.mockClear();
    fireEvent.change(screen.getByLabelText("Manager PIN"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /void/i }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("error", "Enter the manager PIN (4-8 digits)."), { timeout: 5000 });
    
    // Try with invalid PIN (too long)
    mocks.push.mockClear();
    fireEvent.change(screen.getByLabelText("Manager PIN"), { target: { value: "123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /void/i }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("error", "Enter the manager PIN (4-8 digits)."), { timeout: 5000 });
    
    // Valid PIN (4 digits)
    mocks.push.mockClear();
    fireEvent.change(screen.getByLabelText("Manager PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /void/i }));
    await waitFor(() => expect(requestOverride).toHaveBeenCalledWith("1234"), { timeout: 5000 });
    await waitFor(() => expect(voidOrder).toHaveBeenCalledWith("order-1", "override-token"), { timeout: 5000 });
  });

  it("skips PIN for MANAGER role and calls voidOrder directly", async () => {
    listOrders.mockResolvedValueOnce({
      data: [{ id: "order-1", orderNumber: "ORD-001", totalCents: 1000, status: "PAID" }],
    });
    render(<Refund />);
    await waitFor(() => expect(screen.getByText("ORD-001")).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.click(screen.getByText("ORD-001"));
    await waitFor(() => expect(screen.getByLabelText(/Reason for refund/)).toBeInTheDocument(), { timeout: 10000 });
    await waitFor(() => expect(getOrder).toHaveBeenCalledWith("order-1"), { timeout: 5000 });
    
    fireEvent.change(screen.getByLabelText(/Reason for refund/), { target: { value: "Customer request" } });
    fireEvent.click(screen.getByRole("button", { name: /void/i }));
    
    await waitFor(() => expect(requestOverride).not.toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(voidOrder).toHaveBeenCalledWith("order-1", undefined), { timeout: 5000 });
  });

  it("requires reason for refund", async () => {
    listOrders.mockResolvedValueOnce({
      data: [{ id: "order-1", orderNumber: "ORD-001", totalCents: 1000, status: "PAID" }],
    });
    render(<Refund />);
    await waitFor(() => expect(screen.getByText("ORD-001")).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.click(screen.getByText("ORD-001"));
    await waitFor(() => expect(screen.getByLabelText(/Reason for refund/)).toBeInTheDocument(), { timeout: 10000 });
    
    const voidButton = screen.getByRole("button", { name: /void/i });
    const form = voidButton.closest("form");
    if (!form) throw new Error("refund form not found");
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("error", "Reason is required."), { timeout: 5000 });
    expect(voidOrder).not.toHaveBeenCalled();
  });

  it("clears form and navigates on successful refund", async () => {
    listOrders.mockResolvedValueOnce({
      data: [{ id: "order-1", orderNumber: "ORD-001", totalCents: 1000, status: "PAID" }],
    });
    render(<Refund />);
    await waitFor(() => expect(screen.getByText("ORD-001")).toBeInTheDocument(), { timeout: 10000 });
    fireEvent.click(screen.getByText("ORD-001"));
    await waitFor(() => expect(screen.getByLabelText(/Reason for refund/)).toBeInTheDocument(), { timeout: 10000 });
    
    fireEvent.change(screen.getByLabelText(/Reason for refund/), { target: { value: "Customer request" } });
    fireEvent.click(screen.getByRole("button", { name: /void/i }));
    
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("success", expect.stringContaining("refunded (void)")), { timeout: 5000 });
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/orders", { replace: true }), { timeout: 5000 });
  });
});
