import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import { getOrder, listOrders, listCustomers, listUsers, requestOverride, voidOrder } from "~/lib/api";
import { formatCents, formatDateTime } from "~/lib/format";
import { useToast } from "~/shared/hooks/useToast";
import { useAuth, roleAtLeast } from "~/shared/hooks/useAuth";
import { Badge } from "~/shared/components/ui/Badge";
import { Button } from "~/shared/components/ui/Button";
import { EmptyState, Spinner } from "~/shared/components/ui/Feedback";
import { Input } from "~/shared/components/ui/Input";
import { Modal } from "~/shared/components/ui/Modal";
import { Select } from "~/shared/components/ui/Select";
import { Table, type Column } from "~/shared/components/ui/Table";
import type { Order, StaffUser, Customer } from "~/types";

export function meta(): { title: string }[] {
  return [{ title: "Orders — Point of Sale" }];
}

type OrderSortKey = "orderNumber" | "createdAt" | "customer" | "totalCents" | "status";

export default function Orders(): JSX.Element {
  const { push } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [sortBy, setSortBy] = useState<OrderSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [voidPin, setVoidPin] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidBusy, setVoidBusy] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashiers, setCashiers] = useState<StaffUser[]>([]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await listCustomers();
      setCustomers(res.data);
    } catch {
      // silent
    }
  }, []);

  const loadCashiers = useCallback(async () => {
    try {
      const res = await listUsers();
      setCashiers(res.users.filter((u) => u.role === "CASHIER" || u.role === "MANAGER"));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadCashiers();
  }, [loadCustomers, loadCashiers]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listOrders({
        page,
        pageSize,
        status: status || undefined,
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        customerId: customerId || undefined,
        cashierId: cashierId || undefined,
      });
      setOrders(res.data);
      setTotal(res.total);
    } catch {
      push("error", "Failed to load orders. Try again.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, q, from, to, customerId, cashierId, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key as OrderSortKey);
      setSortDir("asc");
    }
  }, [sortBy]);

  async function openDetail(order: Order): Promise<void> {
    try {
      const o = await getOrder(order.id);
      setSelected(o);
    } catch {
      push("error", "Failed to open order. Try again.");
    }
  }

  async function doVoid(): Promise<void> {
    if (!selected || voidBusy) return;
    setVoidBusy(true);
    try {
      let overrideToken: string | undefined;
      const needsPin = !roleAtLeast(user?.role, "MANAGER");
      if (needsPin) {
        if (!/^\d{4,8}$/.test(voidPin)) {
          push("error", "Enter the manager PIN (4-8 digits).");
          setVoidBusy(false);
          return;
        }
        overrideToken = await requestOverride(voidPin);
      }
      const updated = await voidOrder(selected.id, overrideToken);
      setSelected(updated);
      push("success", `${updated.orderNumber} voided · stock restored`);
      setVoidOpen(false);
      setVoidPin("");
      void load();
    } catch {
      push("error", "Void failed. Try again.");
    } finally {
      setVoidBusy(false);
    }
  }

  const getCustomerName = (id: string | null) => {
    if (!id) return "—";
    const c = customers.find((c) => c.id === id);
    return c?.name ?? "—";
  };

  const getCashierName = (id: string) => {
    const c = cashiers.find((c) => c.id === id);
    return c?.name ?? "—";
  };

  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: "Order #",
      sortable: true,
      render: (o) => <span className="font-medium tabular-nums text-[var(--color-text)]">{o.orderNumber}</span>,
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (o) => <span className="text-[var(--color-text-muted)]">{formatDateTime(o.createdAt)}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      render: (o) => <span className="text-[var(--color-text)]">{getCustomerName(o.customerId)}</span>,
    },
    {
      key: "totalCents",
      header: "Total",
      sortable: true,
      align: "right",
      render: (o) => <span className="tabular-nums text-[var(--color-text)]">{formatCents(o.totalCents)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (o) => <Badge tone={o.status}>{o.status}</Badge>,
    },
  ];

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-full flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] md:w-[480px]">
        <div className="border-b border-[var(--color-border)] p-3">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Input placeholder="Search order #…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
            </div>
            <Select
              value={status}
              onChange={setStatus}
              placeholder="All"
              options={[
                { value: "", label: "All" },
                { value: "PAID", label: "Paid" },
                { value: "PENDING", label: "Pending" },
                { value: "VOID", label: "Void" },
                { value: "REFUNDED", label: "Refunded" },
              ]}
              aria-label="Status filter"
              className="shrink-0 w-[120px]"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              type="date"
              label="From"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-[140px]"
            />
            <Input
              type="date"
              label="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-[140px]"
            />
            <Select
              value={customerId}
              onChange={setCustomerId}
              placeholder="Customer"
              options={[{ value: "", label: "All" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
              aria-label="Customer filter"
              className="flex-1 min-w-[120px]"
            />
            <Select
              value={cashierId}
              onChange={setCashierId}
              placeholder="Cashier"
              options={[{ value: "", label: "All" }, ...cashiers.map((c) => ({ value: c.id, label: c.name }))]}
              aria-label="Cashier filter"
              className="flex-1 min-w-[120px]"
            />
            <Select
              value={String(pageSize)}
              onChange={(v) => setPageSize(Number(v))}
              options={[
                { value: "10", label: "10" },
                { value: "20", label: "20" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
              aria-label="Page size"
              className="w-[80px]"
            />
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{total} orders</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <Spinner />
          ) : orders.length === 0 ? (
            <div className="p-4"><EmptyState title="No orders found. Make a sale in Register" /></div>
          ) : (
            <Table
              columns={columns}
              data={orders}
              rowKey={(o) => o.id}
              loading={loading}
              emptyMessage="No orders match your filters."
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onRowClick={openDetail}
            />
          )}
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 overflow-y-auto bg-[var(--color-surface)] p-6 md:block">
        {!selected ? (
          <div className="mx-auto max-w-md pt-10"><EmptyState title="Select an order to see items, payments and void action." /></div>
        ) : (
          <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm tabular-nums text-[var(--color-text-muted)]">{selected.orderNumber}</p>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">{formatCents(selected.totalCents)}</h2>
                <p className="text-[13px] text-[var(--color-text-muted)]">{formatDateTime(selected.createdAt)} · {getCashierName(selected.cashierId)} · Customer: {getCustomerName(selected.customerId)}</p>
              </div>
              <Badge tone={selected.status}>{selected.status}</Badge>
            </div>

            <h3 className="mb-2 mt-6 text-sm font-medium text-[var(--color-text)]">Items</h3>
            <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
              {selected.items.map((it) => (
                <li key={it.id} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-[var(--color-text)]">{it.quantity}× {it.nameSnapshot} <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{it.skuSnapshot}</span></span>
                  <span className="tabular-nums text-[var(--color-text)]">{formatCents(it.lineTotalCents)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1 text-sm tabular-nums text-[var(--color-text-muted)]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(selected.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>Tax</dt><dd>{formatCents(selected.taxCents)}</dd></div>
              <div className="flex justify-between"><dt>Discount</dt><dd>{formatCents(selected.discountCents)}</dd></div>
              <div className="flex justify-between"><dt>Paid</dt><dd>{formatCents(selected.paidCents)}</dd></div>
              <div className="flex justify-between"><dt>Change</dt><dd>{formatCents(selected.changeCents)}</dd></div>
            </dl>

            <h3 className="mb-2 mt-6 text-sm font-medium text-[var(--color-text)]">Payments</h3>
            <div className="flex flex-wrap gap-2">
              {selected.payments.map((p) => (
                <Badge key={p.id} tone={p.method}>{p.method} · {formatCents(p.amountCents)}</Badge>
              ))}
            </div>

            {selected.status !== "VOID" ? (
              <div className="mt-6">
                <Button variant="danger" onClick={() => setVoidOpen(true)}>Void order…</Button>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {roleAtLeast(user?.role, "MANAGER") ? "Manager: direct void, stock is restored." : "Cashier: needs manager PIN approval."}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {voidOpen && selected ? (
        <Modal title={`Void ${selected.orderNumber}?`} onClose={() => setVoidOpen(false)}>
          <p className="text-sm text-[var(--color-text-muted)]">Stock will be restored. This cannot be undone.</p>
          {!roleAtLeast(user?.role, "MANAGER") ? (
            <div className="mt-3">
              <Input label="Manager PIN" type="password" passwordToggle inputMode="numeric" value={voidPin} onChange={(e) => setVoidPin(e.target.value)} placeholder="4-8 digits" autoFocus />
            </div>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" full onClick={() => setVoidOpen(false)}>Keep order</Button>
            <Button variant="danger" full onClick={() => void doVoid()} disabled={voidBusy}>{voidBusy ? "Voiding…" : "Void + restore stock"}</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

