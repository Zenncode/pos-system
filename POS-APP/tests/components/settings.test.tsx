import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "~/routes/settings";
import type { StaffUser } from "~/types";

const ADMIN: StaffUser = {
  id: "u1",
  email: "admin.test@example.invalid",
  name: "Test Admin",
  role: "ADMIN",
  storeId: null,
  isActive: true,
};

const CASHIER: StaffUser = {
  id: "u2",
  email: "cashier.test@example.invalid",
  name: "Test Cashier",
  role: "CASHIER",
  storeId: null,
  isActive: true,
};

const mocks = vi.hoisted(() => ({
  checkHealth: vi.fn(),
  push: vi.fn(),
  NavigateCapture: vi.fn(),
  currentUser: {
    id: "u1",
    email: "admin.test@example.invalid",
    name: "Test Admin",
    role: "ADMIN",
    storeId: null,
    isActive: true,
  } as StaffUser,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    Navigate: (props: { to: string; replace?: boolean }) => {
      mocks.NavigateCapture(props);
      return null;
    },
  };
});

vi.mock("~/lib/api", () => ({
  checkHealth: (...args: unknown[]) => mocks.checkHealth(...args),
}));

// roleAtLeast stays REAL (spread of importOriginal) so the ADMIN guard is
// genuinely exercised, not mocked away — auth state is controlled via
// mocks.currentUser per test.
vi.mock("~/shared/hooks/useAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/shared/hooks/useAuth")>();
  return {
    ...actual,
    useAuth: () => ({ user: mocks.currentUser, loading: false, demoMode: false }),
  };
});

vi.mock("~/shared/hooks/useToast", () => ({ useToast: () => ({ push: mocks.push }) }));

describe("Settings connection check", () => {
  beforeEach(() => {
    mocks.checkHealth.mockReset();
    mocks.push.mockClear();
    mocks.NavigateCapture.mockClear();
    mocks.currentUser = { ...ADMIN };
  });

  it("shows reachable state on success", async () => {
    mocks.checkHealth.mockResolvedValueOnce({ ok: true, latencyMs: 12 });
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    await waitFor(() => expect(screen.getByText(/API reachable/)).toBeInTheDocument());
    expect(mocks.push).toHaveBeenCalledWith("success", "API is reachable.");
  });

  it("shows offline demo state on ok:false without leaking internals", async () => {
    mocks.checkHealth.mockResolvedValueOnce({ ok: false, latencyMs: 30 });
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    await waitFor(() => expect(screen.getByText(/API offline/)).toBeInTheDocument());
    expect(mocks.push).toHaveBeenCalledWith("info", expect.stringContaining("demo data"));
  });

  it("a rejected checkHealth lands in a safe offline/demo state, never an unhandled rejection", async () => {
    mocks.checkHealth.mockRejectedValueOnce(new Error("ECONNREFUSED 10.0.0.9:3000 stack trace"));
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    await waitFor(() => expect(screen.getByText("API offline — running in demo mode")).toBeInTheDocument());
    expect(mocks.push).toHaveBeenCalledWith("info", "API offline — demo data active.");
    // No raw error text reaches the user.
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
    expect(screen.queryByText(/10\.0\.0\.9/)).not.toBeInTheDocument();
    // Loading resets — the button is usable again.
    expect(await screen.findByRole("button", { name: "Test connection" })).not.toBeDisabled();
  });

  it("redirects a non-ADMIN user to the register via the real role guard", async () => {
    mocks.currentUser = { ...CASHIER };
    render(<Settings />);
    // Real roleAtLeast(CASHIER, ADMIN) is false → <Navigate to="/register" />.
    await waitFor(() =>
      expect(mocks.NavigateCapture).toHaveBeenCalledWith(expect.objectContaining({ to: "/register" })),
    );
    // Guarded page content never renders for non-ADMIN.
    expect(screen.queryByRole("button", { name: "Test connection" })).not.toBeInTheDocument();
    expect(mocks.checkHealth).not.toHaveBeenCalled();
  });
});
