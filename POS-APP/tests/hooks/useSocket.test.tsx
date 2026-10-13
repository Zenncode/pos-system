import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSocket } from "~/shared/hooks/useSocket";

const mocks = vi.hoisted(() => ({
  user: { id: "u1", role: "MANAGER" } as { id: string; role: string } | null,
  demoMode: false,
  accessToken: "valid-token",
  apiBase: "http://localhost/api",
  socketEmit: vi.fn(),
  socketOn: vi.fn(),
  socketDisconnect: vi.fn(),
  socketConnected: false,
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: mocks.socketOn,
    emit: mocks.socketEmit,
    disconnect: mocks.socketDisconnect,
    connected: mocks.socketConnected,
  })),
}));

vi.mock("~/shared/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.user,
    demoMode: mocks.demoMode,
    signIn: vi.fn(),
    signOut: vi.fn(),
    roleAtLeast: vi.fn(),
  }),
}));

vi.mock("~/lib/httpClient", () => ({
  getApiBase: () => mocks.apiBase,
  getAccessToken: () => mocks.accessToken,
}));

describe("useSocket", () => {
  let eventHandlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};
    mocks.user = { id: "u1", role: "MANAGER" };
    mocks.demoMode = false;
    mocks.accessToken = "valid-token";
    mocks.apiBase = "http://localhost/api";
    mocks.socketConnected = true;
    mocks.socketOn.mockImplementation((event: string, cb: Function) => {
      eventHandlers[event] = cb;
      if (event === "connect") {
        setTimeout(cb, 0);
      }
    });
    mocks.socketEmit.mockImplementation((event: string, data: any, cb?: Function) => {
      if (cb) cb({ message: "pong", timestamp: new Date().toISOString(), payload: {} });
    });
  });

  it("does not connect in demo mode", () => {
    mocks.demoMode = true;
    const { result } = renderHook(() => useSocket({ autoConnect: true }));
    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
  });

  it("does not connect without user", () => {
    mocks.user = null;
    const { result } = renderHook(() => useSocket({ autoConnect: true }));
    expect(result.current.connected).toBe(false);
  });

  it("does not connect with demo access token", () => {
    mocks.accessToken = "demo.access";
    const { result } = renderHook(() => useSocket({ autoConnect: true }));
    expect(result.current.connected).toBe(false);
  });

  it("connects and emits join:store with storeId or empty string", async () => {
    const { result } = renderHook(() => useSocket({ autoConnect: true, storeId: "store-123" }));
    await waitFor(() => expect(result.current.connecting).toBe(true));
    await waitFor(() => expect(result.current.connected).toBe(true));
    
    // Verify join:store was emitted with storeId
    expect(mocks.socketEmit).toHaveBeenCalledWith("join:store", "store-123");
  });

  it("emits join:store with empty string when storeId is undefined", async () => {
    const { result } = renderHook(() => useSocket({ autoConnect: true, storeId: undefined }));
    await waitFor(() => expect(result.current.connected).toBe(true));
    
    // Mutant: storeIdRef.current ?? "" -> storeIdRef.current ?? "Stryker was here!"
    expect(mocks.socketEmit).toHaveBeenCalledWith("join:store", "");
  });

  it("registers all expected event handlers", async () => {
    renderHook(() => useSocket({ autoConnect: true }));
    await waitFor(() => expect(mocks.socketOn).toHaveBeenCalledWith("connect", expect.any(Function)));
    expect(mocks.socketOn).toHaveBeenCalledWith("disconnect", expect.any(Function));
    expect(mocks.socketOn).toHaveBeenCalledWith("connect_error", expect.any(Function));
    expect(mocks.socketOn).toHaveBeenCalledWith("socket:welcome", expect.any(Function));
    expect(mocks.socketOn).toHaveBeenCalledWith("order:created", expect.any(Function));
    expect(mocks.socketOn).toHaveBeenCalledWith("order:voided", expect.any(Function));
    expect(mocks.socketOn).toHaveBeenCalledWith("order:refunded", expect.any(Function));
    expect(mocks.socketOn).toHaveBeenCalledWith("stock:low", expect.any(Function));
    expect(mocks.socketOn).toHaveBeenCalledWith("session:revoked", expect.any(Function));
  });

  it("calls onOrderCreated callback when event received", async () => {
    const onOrderCreated = vi.fn();
    const { result } = renderHook(() => useSocket({ autoConnect: true, onOrderCreated }));
    await waitFor(() => expect(result.current.connected).toBe(true));
    
    // Find the order:created handler and call it
    const orderCreatedHandler = mocks.socketOn.mock.calls.find(
      (call) => call[0] === "order:created"
    )?.[1];
    expect(orderCreatedHandler).toBeDefined();
    
    act(() => {
      orderCreatedHandler!({ id: "1", orderNumber: "ORD-001", totalCents: 1000, itemCount: 2 });
    });
    expect(onOrderCreated).toHaveBeenCalledWith({ id: "1", orderNumber: "ORD-001", totalCents: 1000, itemCount: 2 });
  });

  it("disconnects on cleanup", async () => {
    const { unmount } = renderHook(() => useSocket({ autoConnect: true }));
    await waitFor(() => expect(mocks.socketConnected).toBe(true));
    unmount();
    expect(mocks.socketDisconnect).toHaveBeenCalled();
  });

  it("exposes connect, disconnect, joinRoom, leaveRoom, ping", async () => {
    const { result } = renderHook(() => useSocket({ autoConnect: false }));
    expect(typeof result.current.connect).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
    expect(typeof result.current.joinRoom).toBe("function");
    expect(typeof result.current.leaveRoom).toBe("function");
    expect(typeof result.current.ping).toBe("function");
  });

  it("ping resolves on pong response", async () => {
    const { result } = renderHook(() => useSocket({ autoConnect: true }));
    await waitFor(() => expect(result.current.connected).toBe(true));
    
    const pingPromise = act(async () => {
      return await result.current.ping();
    });
    
    await expect(pingPromise).resolves.toBeDefined();
  });
});
