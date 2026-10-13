import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "~/routes/login";
import { ApiError } from "~/lib/httpClient";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signIn: vi.fn(),
  authUser: null as { id: string } | null,
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

vi.mock("~/shared/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.authUser,
    loading: mocks.authLoading,
    demoMode: false,
    signIn: mocks.signIn,
    signOut: vi.fn(),
  }),
}));

describe("Login mutation killers", () => {
  beforeEach(() => {
    mocks.navigate.mockClear();
    mocks.signIn.mockReset();
    mocks.authUser = null;
    mocks.authLoading = false;
    mocks.NavigateCapture.mockClear();
  });

  function fillForm(email = "cashier.test@example.invalid", password = "correct-horse"): void {
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
    fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), { target: { value: password } });
  }

  describe("quickFill mutation killers", () => {
    it("quickFill sets email to preset value", () => {
      render(<Login />);
      // Click the Cashier 01 button which calls quickFill("cashier01@example.com")
      fireEvent.click(screen.getByText("Cashier 01"));
      expect(screen.getByLabelText("Email")).toHaveValue("cashier01@example.com");
    });

    it("quickFill clears password to empty string", () => {
      render(<Login />);
      // First fill password
      fillForm("test@test.com", "existing-password");
      expect(screen.getByLabelText("Password", { selector: "input" })).toHaveValue("existing-password");
      
      // Click quickFill - should clear password
      fireEvent.click(screen.getByText("Cashier 01"));
      expect(screen.getByLabelText("Password", { selector: "input" })).toHaveValue("");
    });

    it("quickFill clears error message", () => {
      render(<Login />);
      // Trigger an error first
      fillForm("invalid", "");
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
      
      // Click quickFill - should clear error
      fireEvent.click(screen.getByText("Cashier 01"));
      expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    });

    it("quickFill works for all preset accounts", () => {
      render(<Login />);
      fireEvent.click(screen.getByText("Manager"));
      expect(screen.getByLabelText("Email")).toHaveValue("manager01@example.com");
      
      fireEvent.click(screen.getByText("Administrator"));
      expect(screen.getByLabelText("Email")).toHaveValue("admin@example.com");
    });
  });

  describe("form validation edge cases", () => {
    it("trims email before validation", async () => {
      mocks.signIn.mockResolvedValueOnce(undefined);
      render(<Login />);
      fillForm("  cashier.test@example.invalid  ", "password");
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      await waitFor(() =>
        expect(mocks.signIn).toHaveBeenCalledWith("cashier.test@example.invalid", "password"),
      );
    });

    it("rejects email without @ even with password", () => {
      render(<Login />);
      fillForm("not-an-email", "some-password");
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
      expect(mocks.signIn).not.toHaveBeenCalled();
    });

    it("rejects empty password even with valid email", () => {
      render(<Login />);
      fillForm("valid@email.com", "");
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      expect(screen.getByText("Enter your password.")).toBeInTheDocument();
      expect(mocks.signIn).not.toHaveBeenCalled();
    });
  });

  describe("API error handling mutations", () => {
    it("shows specific error for UNAUTHENTICATED", async () => {
      mocks.signIn.mockRejectedValueOnce(new ApiError(401, "UNAUTHENTICATED", "Invalid credentials"));
      render(<Login />);
      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      await waitFor(() => expect(screen.getByText("Invalid credentials")).toBeInTheDocument());
    });

    it("shows specific error for NETWORK_OFFLINE", async () => {
      mocks.signIn.mockRejectedValueOnce(new ApiError(0, "NETWORK_OFFLINE", "You are offline"));
      render(<Login />);
      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      await waitFor(() => expect(screen.getByText("You are offline")).toBeInTheDocument());
    });

    it("shows generic error for INTERNAL server error", async () => {
      mocks.signIn.mockRejectedValueOnce(new ApiError(500, "INTERNAL", "database connection failed"));
      render(<Login />);
      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      await waitFor(() =>
        expect(screen.getByText("Sign in failed. Check your email and password.")).toBeInTheDocument(),
      );
      expect(screen.queryByText(/database/)).not.toBeInTheDocument();
    });

    it("shows generic error for unknown error codes", async () => {
      mocks.signIn.mockRejectedValueOnce(new ApiError(400, "UNKNOWN_CODE", "some detail"));
      render(<Login />);
      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      await waitFor(() =>
        expect(screen.getByText("Sign in failed. Check your email and password.")).toBeInTheDocument(),
      );
    });
  });

  describe("loading and busy state mutations", () => {
    it("disables submit button while busy", async () => {
      mocks.signIn.mockImplementationOnce(() => new Promise<void>(() => {}));
      render(<Login />);
      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      const pending = await screen.findByRole("button", { name: /signing in/i });
      expect(pending).toBeDisabled();
    });

    it("prevents double submit while busy", async () => {
      mocks.signIn.mockImplementationOnce(() => new Promise<void>(() => {}));
      render(<Login />);
      fillForm();
      const button = screen.getByRole("button", { name: "Sign in" });
      fireEvent.click(button);
      const pending = await screen.findByRole("button", { name: /signing in/i });
      fireEvent.click(pending);
      expect(mocks.signIn).toHaveBeenCalledTimes(1);
    });

    it("re-enables button after error", async () => {
      mocks.signIn.mockRejectedValueOnce(new Error("network error"));
      render(<Login />);
      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      await waitFor(() =>
        expect(screen.getByText("Sign in failed. Check your email and password.")).toBeInTheDocument(),
      );
      const retry = await screen.findByRole("button", { name: "Sign in" });
      expect(retry).not.toBeDisabled();
    });
  });
});
