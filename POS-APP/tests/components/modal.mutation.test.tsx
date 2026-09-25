import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "~/shared/components/ui/Modal";

describe("Modal — mutation killers", () => {
  // Kills: focus trap — Tab on last wraps to first
  it("Tab on last focusable wraps to first", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Pay" onClose={onClose}>
        <button>First</button>
        <button>Last</button>
      </Modal>
    );
    // The close button is first focusable, then First, then Last
    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);
  });

  // Kills: Shift+Tab on first wraps to last
  it("Shift+Tab on first focusable wraps to last", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Pay" onClose={onClose}>
        <button>First</button>
        <button>Last</button>
      </Modal>
    );
    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const last = screen.getByRole("button", { name: "Last" });
    closeBtn.focus();
    fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  // Kills: Escape key calls onClose
  it("Escape key calls onClose", () => {
    const onClose = vi.fn();
    render(<Modal title="Pay" onClose={onClose}><button>Confirm</button></Modal>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Kills: returnFocusOnClose returns focus to trigger
  it("returns focus to trigger on unmount when returnFocusOnClose=true", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<Modal title="Pay" onClose={vi.fn()} returnFocusOnClose={true}><button>Confirm</button></Modal>);
    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  // Kills: returnFocusOnClose=false does NOT return focus
  it("does NOT return focus when returnFocusOnClose=false", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<Modal title="Pay" onClose={vi.fn()} returnFocusOnClose={false}><button>Confirm</button></Modal>);
    unmount();
    expect(document.activeElement).not.toBe(trigger);
    trigger.remove();
  });

  // Kills: initialFocus ref focuses specific element
  it("initialFocus ref focuses that element on open", () => {
    const onClose = vi.fn();
    const inputRef = { current: null };
    render(
      <Modal title="Pay" onClose={onClose} initialFocus={inputRef}>
        <input ref={inputRef} />
      </Modal>
    );
    expect(document.activeElement).toBe(inputRef.current);
  });

  // Kills: wide prop applies max-w-2xl to sheet not backdrop
  it("wide=true applies max-w-2xl class to sheet", () => {
    render(<Modal title="Pay" onClose={vi.fn()} wide><button>Confirm</button></Modal>);
    const sheet = screen.getByRole("dialog").querySelector(".pos-sheet");
    expect(sheet).toHaveClass("max-w-2xl");
  });

  // Kills: close button click calls onClose
  it("close button click calls onClose", () => {
    const onClose = vi.fn();
    render(<Modal title="Pay" onClose={onClose}><button>Confirm</button></Modal>);
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Kills: backdrop click calls onClose
  it("backdrop click calls onClose", () => {
    const onClose = vi.fn();
    render(<Modal title="Pay" onClose={onClose}><button>Confirm</button></Modal>);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Kills: Tab/Shift+Tab wrap preventDefault removal (forward + backward)
  it("Tab and Shift+Tab wraps prevent default browser handling", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Pay" onClose={onClose}>
        <button>First</button>
        <button>Last</button>
      </Modal>
    );
    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    expect(fireEvent.keyDown(last, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(closeBtn);
    closeBtn.focus();
    expect(fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(last);
  });

  // Kills: middle-element Tab must not wrap (forward-guard removal)
  it("Tab from a middle focusable does not move focus", () => {
    render(
      <Modal title="Pay" onClose={vi.fn()}>
        <button>Second</button>
        <button>Last</button>
      </Modal>
    );
    const second = screen.getByRole("button", { name: "Second" });
    second.focus();
    fireEvent.keyDown(second, { key: "Tab" });
    expect(document.activeElement).toBe(second);
  });

  // Kills: middle-element Shift+Tab must not wrap (backward-guard removal)
  it("Shift+Tab from a middle focusable does not move focus", () => {
    render(
      <Modal title="Pay" onClose={vi.fn()}>
        <button>Second</button>
        <button>Last</button>
      </Modal>
    );
    const second = screen.getByRole("button", { name: "Second" });
    second.focus();
    fireEvent.keyDown(second, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(second);
  });

  // Kills: opacity-zero / visibility-hidden buttons excluded from the trap
  it("Tab wrap skips opacity-zero and visibility-hidden buttons", () => {
    render(
      <Modal title="Pay" onClose={vi.fn()}>
        <button>Visible</button>
        <button style={{ opacity: 0 }}>Faded</button>
        <button style={{ visibility: "hidden" }}>Concealed</button>
      </Modal>
    );
    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const visible = screen.getByRole("button", { name: "Visible" });
    visible.focus();
    fireEvent.keyDown(visible, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);
  });

  // Kills: disabled-attribute check removal (empty-string attribute name)
  it("Tab wrap treats a trailing disabled button as non-focusable", () => {
    render(
      <Modal title="Pay" onClose={vi.fn()}>
        <button>Second</button>
        <button disabled>Disabled</button>
      </Modal>
    );
    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const second = screen.getByRole("button", { name: "Second" });
    second.focus();
    fireEvent.keyDown(second, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);
  });

  // Kills: trap keydown cleanup removal (container listener leak)
  it("removes the container keydown listener on unmount", () => {
    const { unmount } = render(
      <Modal title="Pay" onClose={vi.fn()}>
        <button>Confirm</button>
      </Modal>
    );
    const sheetEl = screen.getByRole("dialog").querySelector(".pos-sheet") as HTMLElement;
    const removeSpy = vi.spyOn(sheetEl, "removeEventListener");
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
  });

  // Kills: stale onClose closure (closeRef sync removal)
  it("Escape calls the latest onClose after rerender", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Modal title="Pay" onClose={first}>
        <button>Confirm</button>
      </Modal>
    );
    rerender(
      <Modal title="Pay" onClose={second}>
        <button>Confirm</button>
      </Modal>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  // Kills: Escape-guard removal (every key would close)
  it("non-Escape keys do not call onClose", () => {
    const onClose = vi.fn();
    render(<Modal title="Pay" onClose={onClose}><button>Confirm</button></Modal>);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  // Kills: window Escape-listener cleanup removal (global leak)
  it("removes the window Escape listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <Modal title="Pay" onClose={vi.fn()}>
        <button>Confirm</button>
      </Modal>
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
  });

  // Kills: default (non-wide) sheet width removal
  it("defaults to max-w-md without wide", () => {
    render(<Modal title="Pay" onClose={vi.fn()}><button>Confirm</button></Modal>);
    const sheet = screen.getByRole("dialog").querySelector(".pos-sheet");
    expect(sheet).toHaveClass("max-w-md");
  });

  // Kills: focus trap skips disabled + hidden (display:none) buttons when wrapping
  it("Tab wrap skips disabled and hidden focusables", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Pay" onClose={onClose}>
        <button disabled>Disabled</button>
        <button>Second</button>
        <button style={{ display: "none" }}>Hidden</button>
      </Modal>
    );
    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const second = screen.getByRole("button", { name: "Second" });
    // Disabled + hidden buttons are never focus targets of the trap.
    second.focus();
    fireEvent.keyDown(second, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);
    closeBtn.focus();
    fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(second);
  });

  // Kills: legacy offsetParent fallback branch (no checkVisibility API)
  it("legacy fallback does not steal focus when layout reports nothing visible", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "checkVisibility");
    try {
      // @ts-expect-error — simulate pre-checkVisibility browsers for the fallback branch
      delete Element.prototype.checkVisibility;
      const trigger = document.createElement("button");
      trigger.textContent = "Open";
      document.body.appendChild(trigger);
      trigger.focus();
      render(<Modal title="Pay" onClose={vi.fn()}><button>Confirm</button></Modal>);
      // jsdom has no layout (offsetParent === null) so the trap finds no
      // focusables and leaves focus on the trigger; the flipped (=== null)
      // mutant would wrongly move focus into the dialog.
      expect(document.activeElement).toBe(trigger);
      trigger.remove();
    } finally {
      if (descriptor) Object.defineProperty(Element.prototype, "checkVisibility", descriptor);
    }
  });
});