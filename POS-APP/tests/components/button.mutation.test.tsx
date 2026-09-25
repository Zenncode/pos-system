import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Button } from "~/shared/components/ui/Button";

const mockPush = vi.fn();
vi.mock("~/shared/hooks/useToast", () => ({ useToast: () => ({ push: mockPush }) }));

describe("Button — mutation killers", () => {
  beforeEach(() => mockPush.mockClear());

  // Kills: variant string literal mutants (primary/secondary/ghost/danger)
  it("renders primary variant with correct class", () => {
    render(<Button variant="primary">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("bg-[var(--color-primary)]");
  });

  // Kills: danger variant string literal mutant
  it("renders danger variant with correct class", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-[var(--color-danger)]");
  });

  // Kills: secondary + ghost variant string literal mutants
  it("renders secondary variant with correct class", () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("bg-[var(--color-bg)]");
  });

  it("renders ghost variant with correct class", () => {
    render(<Button variant="ghost">More options</Button>);
    expect(screen.getByRole("button", { name: "More options" })).toHaveClass("text-[var(--color-text-muted)]");
  });

  // Kills: size string literal mutants (sm/md/lg)
  it("renders lg size with correct class", () => {
    render(<Button size="lg">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("h-12");
  });

  // Kills: sm keeps the 40px minimum cashier/touch target (h-10 min-w-10)
  it("renders sm size with 40px touch-target classes", () => {
    render(<Button size="sm">Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("h-10");
    expect(btn).toHaveClass("min-w-10");
    expect(btn).toHaveClass("px-3");
  });

  // Kills: md default size string literal mutant (md: "h-10 px-4 text-sm" -> "")
  it("renders md default size with correct classes", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("h-10");
    expect(btn).toHaveClass("px-4");
  });

  // Kills: loading disables + aria-busy + suppresses icon + spinner decorative
  it("loading=true disables button, sets aria-busy=true, hides icon, shows inline spinner without role=status", () => {
    render(<Button loading icon={<span data-testid="icon">@</span>}>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("icon")).toBeNull();
    expect(btn.querySelector(".animate-spin")).not.toBeNull();
    expect(btn.querySelector('[role="status"]')).toBeNull();
  });

  // Kills: full width class applied
  it("full=true applies w-full class", () => {
    render(<Button full>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("w-full");
  });

  // Kills: iconPosition right renders icon after children
  it("iconPosition=right places icon after children", () => {
    render(<Button icon={<span data-testid="icon">@</span>} iconPosition="right">Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn.childNodes[1]).toHaveTextContent("@");
  });

  // Kills: disabled || loading short-circuit
  it("disabled=true prevents click even when loading=false", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});