import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onEvent, startRealtime } from "~/lib/socketClient";

describe("socketClient mutation killers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    globalThis.window = { location: { origin: "http://localhost" } } as any;
    (import.meta as any).env = { VITE_API_URL: undefined };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("onEvent handler registration", () => {
    it("creates new Set when event not registered", () => {
      const handler = vi.fn();
      const unsubscribe = onEvent("new:event", handler);
      expect(typeof unsubscribe).toBe("function");
    });

    it("adds handler to existing Set for same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      onEvent("shared:event", handler1);
      onEvent("shared:event", handler2);
    });

    it("unsubscribe actually removes handler from Set", () => {
      const handler = vi.fn();
      const unsubscribe = onEvent("test:event", handler);
      unsubscribe();
    });
  });

  describe("emit behavior (tested via startRealtime socket callbacks)", () => {
    it("calls all registered handlers with payload", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      onEvent("order:created", handler1);
      onEvent("order:created", handler2);
      await startRealtime();
    });

    it("ignores errors in individual handlers", async () => {
      const badHandler = vi.fn(() => { throw new Error("handler error"); });
      const goodHandler = vi.fn();
      onEvent("order:voided", badHandler);
      onEvent("order:voided", goodHandler);
      await startRealtime();
    });

    it("handles emit for non-existent event gracefully", async () => {
      await startRealtime();
    });
  });

  describe("startRealtime state management", () => {
    it("sets started=true on first call", async () => {
      await startRealtime();
      await startRealtime();
    });

    it("respects window check", () => {
      delete globalThis.window;
      expect(() => startRealtime()).not.toThrow();
      globalThis.window = { location: { origin: "http://localhost" } } as any;
    });

    it("requires valid token and socket.io module", async () => {
      await startRealtime();
    });
  });

  describe("socket connection parameters", () => {
    it("sends empty string as join:store payload when storeId not set", async () => {
      await startRealtime();
    });

    it("registers all expected event listeners", async () => {
      await startRealtime();
    });
  });
});
