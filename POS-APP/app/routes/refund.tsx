import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import { Navigate, useNavigate } from "react-router";
import { getOrder, listOrders, requestOverride, voidOrder } from "~/lib/api";
import { formatCents, formatDateTime } from "~/lib/format";
import { useAuth, roleAtLeast } from "~/shared/hooks/useAuth";
import { useToast } from "~/shared/hooks/useToast";
import { Button } from "~/shared/components/ui/Button";
import { Input } from "~/shared/components/ui/Input";
import { EmptyState, Spinner } from "~/shared/components/ui/Feedback";
import type { Order, Role } from "~/types";

export function meta(): { title: string }[] {
  return [{ title: "Refund — Point of Sale" }];
}

function canRefund(role: Role | undefined): boolean {
  return roleAtLeast(role, "MANAGER");
}

export default function Refund(): JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [reason, setReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [voidPin, setVoidPin] = useState("");

  const allowed = canRefund(user?.role);

  useEffect(() => {
    if (!authLoading && !allowed) push("error", "Manager access required.");
  }, [authLoading, allowed, push]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setListError("");
    try {
      const res = await listOrders({ status: "PAID", q: debouncedQ || undefined });
      setOrders(res.data);
    } catch {
      setListError("Failed to load paid orders. Try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    let alive = true;
    if (allowed) {
      void load().finally(() => {
        if (!alive) return;
      });
    }
    return () => {
      alive = false;
    };
  }, [allowed, load]);

  if (authLoading) return <></>;

  if (!allowed) return <Navigate to="/orders" replace />;

  async function openDetail(id: string): Promise<void> {
    setDetailError("");
    try {
      const o = await getOrder(id);
      setOrder(o);
    } catch {
      setDetailError("Failed to open order. Try again.");
    }
  }

  async function doRefund(): Promise<void> {
    if (!order) return;
    if (!reason.trim()) {
      push("error", "Reason is required.");
      return;
    }
    setRefundBusy(true);
    try {
      let overrideToken: string | undefined;
      const needsPin = !roleAtLeast(user?.role, "MANAGER");
      if (needsPin) {
        if (!/^\d{4,8}$/.test(voidPin)) {
          push("error", "Enter the manager PIN (4-8 digits).");
          setRefundBusy(false);
          return;
        }
        overrideToken = await requestOverride(voidPin);
      }
      await voidOrder(order.id, overrideToken);
      push("success", `${formatCents(order.totalCents)} refunded (void) for ${order.orderNumber}`);
      setOrder(null);
      setReason("");
      setVoidPin("");
      navigate("/orders", { replace: true });
    } catch {
      push("error", "Refund failed. Try again.");
    } finally {
      setRefundBusy(false);
    }
  }

  return (
    <div className="min-h-0 bg-[var(--color-surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Refund</h1>
        <Button variant="ghost" onClick={() => navigate("/orders", { replace: true })}>
          Back to Orders
        </Button>
      </div>

      <div className="mb-4">
        <Input
          label="Search paid orders"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Order number…"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : listError ? (
        <EmptyState title={listError} action={<Button onClick={() => void load()}>Retry</Button>} />
      ) : orders.length === 0 ? (
        <EmptyState title="No paid orders found. Voided orders stay in Orders." />
      ) : (
        <ul className="mb-6 divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
          {orders.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => void openDetail(o.id)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-surface)] ${
                  order?.id === o.id ? "bg-[var(--color-success)]/10" : ""
                }`}
              >
                <span className="text-sm font-medium text-[var(--color-text)]">{o.orderNumber}</span>
                <span className="text-sm tabular-nums text-[var(--color-success)]">{formatCents(o.totalCents)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detailError ? <p className="mb-4 text-sm text-[var(--color-danger)]">{detailError}</p> : null}

      {order ? (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <p className="text-sm font-medium text-[var(--color-text)]">Order: {order.orderNumber}</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Date: {formatDateTime(order.createdAt)}</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Customer: {order.customer?.name ?? "Walk-in"}
          </p>
          <p className="mt-1 text-sm tabular-nums text-[var(--color-text)]">Total: {formatCents(order.totalCents)}</p>
          <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
            Full void only — restores stock via void. Partial line-level refunds need a backend
            endpoint (see roadmap).
          </p>

          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void doRefund();
            }}
          >
            <Input
              label="Reason for refund *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for refund"
              required
            />
            {!roleAtLeast(user?.role, "MANAGER") ? (
              <Input
                label="Manager PIN"
                type="password"
                passwordToggle
                inputMode="numeric"
                value={voidPin}
                onChange={(e) => setVoidPin(e.target.value)}
                placeholder="4-8 digits"
              />
            ) : null}
            <Button variant="danger" full type="submit" loading={refundBusy}>
              {`Void + refund ${formatCents(order.totalCents)}`}
            </Button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Select a paid order above to refund it.</p>
      )}
    </div>
  );
}

