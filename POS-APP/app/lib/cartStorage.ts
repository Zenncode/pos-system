// Offline cart persistence — IndexedDB-backed (replaces localStorage).
// The cart survives reloads / offline blips; server checkout stays source of truth.
// Money stays integer cents; only plain JSON is stored. SSR-safe (guarded).
import type { CartLine } from "~/types";

export const CART_STORAGE_KEY = "pos.cart.v1";
const DB_NAME = "pos-cart-db";
const STORE_NAME = "cart";

export interface StoredCart {
  id: string;
  lines: CartLine[];
  discountCents: number;
  savedAt: string;
  pendingSync: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isValidLine(l: unknown): l is CartLine {
  if (typeof l !== "object" || l === null) return false;
  const o = l as { product?: { id?: unknown; priceCents?: unknown }; qty?: unknown };
  return (
    typeof o.product?.id === "string" &&
    typeof o.product?.priceCents === "number" &&
    typeof o.qty === "number" &&
    Number.isFinite(o.qty)
  );
}

export async function loadStoredCart(): Promise<StoredCart | null> {
  try {
    if (typeof indexedDB === "undefined") return null;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CART_STORAGE_KEY);
      request.onsuccess = () => {
        const result = request.result as StoredCart | undefined;
        if (!result) {
          resolve(null);
          return;
        }
        const lines = (Array.isArray(result.lines) ? result.lines : [])
          .filter(isValidLine)
          .map((l) => ({ product: l.product, qty: Math.max(1, Math.min(1000, Math.floor(l.qty))) }));
        const discountCents =
          typeof result.discountCents === "number" && Number.isFinite(result.discountCents)
            ? Math.max(0, Math.floor(result.discountCents))
            : 0;
        resolve({
          id: CART_STORAGE_KEY,
          lines,
          discountCents,
          savedAt: typeof result.savedAt === "string" ? result.savedAt : "",
          pendingSync: !!result.pendingSync,
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function saveStoredCart(lines: CartLine[], discountCents: number, pendingSync = false): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const payload: StoredCart = {
        id: CART_STORAGE_KEY,
        lines: lines.slice(0, 200),
        discountCents: Math.max(0, Math.floor(discountCents)),
        savedAt: new Date().toISOString(),
        pendingSync,
      };
      const request = store.put(payload);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // storage full / unavailable — cart still works in memory
  }
}

export async function clearStoredCart(): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(CART_STORAGE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // ignore
  }
}

export async function setPendingSync(pending: boolean): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(CART_STORAGE_KEY);
      getRequest.onsuccess = () => {
        const existing = getRequest.result as StoredCart | undefined;
        if (!existing) {
          resolve();
          return;
        }
        const putRequest = store.put({ ...existing, pendingSync: pending });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch {
    // ignore
  }
}