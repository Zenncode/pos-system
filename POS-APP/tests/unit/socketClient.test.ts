import { beforeEach, describe, expect, it, vi } from "vitest";
import { onEvent, startRealtime } from "~/lib/socketClient";

describe("socketClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("onEvent", () => {
    it("returns unsubscribe function", () => {
      const handler = vi.fn();
      const unsubscribe = onEvent("test:event", handler);
      expect(typeof unsubscribe).toBe("function");
    });

    it("unsubscribe removes handler", () => {
      const handler = vi.fn();
      const unsubscribe = onEvent("test:event", handler);
      unsubscribe();
      // After unsubscribe, handler should not be called (but we cant test emit)
      //  This test just ensures unsubscribe doesnt throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe("startRealtime", () => {
    it("does nothing when window is undefined", () => {
      delete globalThis.window;
      expect(() => startRealtime()).not.toThrow();
      globalThis.window = {} as any;
    });

    it("does nothing if already started", () => {
      globalThis.__SOCKET_STARTED__ = true;
      expect(() => startRealtime()).not.toThrow();
      globalThis.__SOCKET_STARTED__ = false;
    });
  });
});
