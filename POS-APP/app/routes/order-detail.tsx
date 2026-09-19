import { useEffect, useState } from "react";
import type { JSX } from "react";
import { Link, useParams } from "react-router";
import { getOrder } from "~/lib/api";
import { formatCents, formatDateTime } from "~/lib/format";
import { Badge } from "~/shared/components/ui/Badge";
import { Spinner } from "~/shared/components/ui/Feedback";
import type { Order } from "~/types";

export function meta(): { title: string }[] {
  return [{ title: "Order detail — Point of Sale" }];
}

export default function OrderDetail(): JSX.Element {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then(setOrder)
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <div className="p-6">
        <Link to="/orders" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">← Orders</Link>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Order not found.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-surface)] p-6">
      <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
        <Link to="/orders" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">← Orders</Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <p className="font-mono text-sm text-[var(--color-text-muted)]">{order.orderNumber}</p>
            <h1 className="text-xl font-semibold tabular-nums text-[var(--color-text)]">{formatCents(order.totalCents)}</h1>
            <p className="text-[13px] text-[var(--color-text-muted)]">{formatDateTime(order.createdAt)} · {order.cashier?.name ?? "—"} · Customer: {order.customer?.name ?? "—"}</p>
          </div>
          <Badge tone={order.status}>{order.status}</Badge>
        </div>
        <h2 className="mb-2 mt-6 text-sm font-medium text-[var(--color-text)]">Items</h2>
        <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between px-3 py-2 text-sm">
              <span className="text-[var(--color-text)]">{it.quantity}× {it.nameSnapshot} <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{it.skuSnapshot}</span></span>
              <span className="tabular-nums text-[var(--color-text)]">{formatCents(it.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 text-sm tabular-nums text-[var(--color-text-muted)]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{formatCents(order.taxCents)}</dd></div>
          <div className="flex justify-between"><dt>Discount</dt><dd>{formatCents(order.discountCents)}</dd></div>
          <div className="flex justify-between"><dt>Paid</dt><dd>{formatCents(order.paidCents)}</dd></div>
          <div className="flex justify-between"><dt>Change</dt><dd>{formatCents(order.changeCents)}</dd></div>
        </dl>
        <h2 className="mb-2 mt-6 text-sm font-medium text-[var(--color-text)]">Payments</h2>
        <div className="flex flex-wrap gap-2">
          {order.payments.map((p) => (
            <Badge key={p.id} tone={p.method}>{p.method} · {formatCents(p.amountCents)}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

