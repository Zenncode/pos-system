import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Link, useNavigate } from "react-router";
import { listOrders } from "~/lib/api";
import { formatCents, formatDateTime } from "~/lib/format";
import {
  DENOMINATIONS_CENTS,
  expectedCashCents,
  floatCents,
  toCounts,
  VARIANCE_NOTE_MAX_CENTS,
  varianceCents,
} from "~/lib/posRules";
import { useAuth } from "~/shared/hooks/useAuth";
import { useShift } from "~/shared/hooks/useShift";
import { useToast } from "~/shared/hooks/useToast";
import { Button } from "~/shared/components/ui/Button";
import { EmptyState, Spinner } from "~/shared/components/ui/Feedback";
import { Input } from "~/shared/components/ui/Input";
import type { Order, Shift } from "~/types";

export function meta(): { title: string }[] {
  return [{ title: "Shift — Point of Sale" }];
}

function shiftStartIso(s: Shift): string {
  return s.startedAt ?? s.createdAt ?? new Date().toISOString();
}

function FloatGrid({
  values,
  onChange,
}: {
  values: Record<number, number>;
  onChange: (v: Record<number, number>) => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {DENOMINATIONS_CENTS.map((d) => (
        <div
          key={d}
          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/80 p-2.5 shadow-xs transition hover:border-[var(--color-neutral-300)]"
        >
          <span className="text-xs font-semibold tabular-nums text-[var(--color-neutral-700)]">
            {formatCents(d)}
          </span>
          <div className="w-20 shrink-0">
            <Input
              id={`float-${d}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={values[d] ?? ""}
              placeholder="0"
              aria-label={`Count of ${formatCents(d)} bills/coins`}
              onChange={(e) => {
                const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                onChange({ ...values, [d]: n });
              }}
              className="text-center font-mono font-semibold tabular-nums"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function breakdownCentsToCounts(cents: number): Record<number, number> {
  const result: Record<number, number> = {};
  let rem = Math.max(0, cents);
  for (const d of DENOMINATIONS_CENTS) {
    if (rem >= d) {
      const cnt = Math.floor(rem / d);
      result[d] = cnt;
      rem -= cnt * d;
    }
  }
  return result;
}

const DEVICE_LABELS = [
  { key: "scanner", label: "Barcode scanner" },
  { key: "printer", label: "Receipt printer" },
  { key: "reader", label: "Card / QR reader" },
] as const;

function DeviceIcon({ device }: { device: string }): JSX.Element {
  const paths: Record<string, JSX.Element> = {
    scanner: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m14 0h2a2 2 0 012 2v2m0 12v2a2 2 0 01-2 2h-2M5 21H3a2 2 0 01-2-2v-2m18 0H5m0 0V7h14v10H5z" />,
    printer: <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12-3h12v6H6v-6z" />,
    reader: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2m4 0h2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  };
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {paths[device] ?? paths["reader"]}
    </svg>
  );
}

export default function ShiftScreen(): JSX.Element {
  const { shift, loading, error, refresh, open, close } = useShift();
  const { signOut } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [counts, setCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [devices, setDevices] = useState<Record<"scanner" | "printer" | "reader", boolean>>({
    scanner: true,
    printer: true,
    reader: true,
  });
  const [busy, setBusy] = useState(false);

  const floatTotal = useMemo(() => floatCents(toCounts(counts)), [counts]);

  // Close mode: pull this shift's orders for expected-cash math + pending-sale guard (FR-11).
  const openSince = shift && shift.status === "OPEN" ? shiftStartIso(shift) : null;
  const [shiftOrders, setShiftOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const loadShiftOrders = useCallback(async () => {
    if (!openSince) return;
    setOrdersLoading(true);
    try {
      const res = await listOrders({ from: openSince, pageSize: 250 });
      setShiftOrders(res.data);
    } catch {
      setShiftOrders([]);
      push("error", "Couldn't load shift orders — variance will be 0.");
    } finally {
      setOrdersLoading(false);
    }
  }, [openSince, push]);

  useEffect(() => {
    void loadShiftOrders();
  }, [loadShiftOrders]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openingFloatCents = shift ? floatCents(shift.openingFloat) : 0;
  const expected = expectedCashCents(openingFloatCents, shiftOrders);
  const variance = varianceCents(expected, floatTotal);
  const pending = shiftOrders.filter((o) => o.status === "PENDING");
  const sales = shiftOrders
    .filter((o) => o.status === "PAID")
    .reduce((s, o) => s + o.totalCents, 0);
  const varianceNeedsNote = Math.abs(variance) > VARIANCE_NOTE_MAX_CENTS;

  async function doOpen(): Promise<void> {
    if (floatTotal <= 0) {
      push("error", "Enter the opening float (at least one count).");
      return;
    }
    setBusy(true);
    try {
      await open(toCounts(counts), note || undefined);
      push("success", "Shift opened — start selling (F2 to scan, F8 to charge).");
      navigate("/register");
    } catch {
      push("error", "Couldn't open the shift. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function doClose(): Promise<void> {
    if (pending.length > 0) {
      push("error", "Settle or void pending sales first — the shift can't close.");
      return;
    }
    if (varianceNeedsNote && !note.trim()) {
        push("error", "Manager note required when variance exceeds ₱100.");
      return;
    }
    setBusy(true);
    try {
      await close(toCounts(counts), note || undefined);
      push("success", `Shift closed · variance ${formatCents(variance)} — session ended.`);
    } catch {
      push("error", "Couldn't close the shift. Try again.");
      setBusy(false);
      return;
    }
    try {
      await signOut();
    } catch {
      // best effort — logout already clearTokens()s; never block the redirect
    }
    setBusy(false);
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const isOpen = !!shift && shift.status === "OPEN";

  if (!isOpen) {
    // ── Open shift (FR-06/07/08) ──
    if (error) {
      return (
        <div className="p-6">
          <EmptyState title={error} action={<Button onClick={() => void refresh()}>Retry</Button>} />
        </div>
      );
    }
    const faulty = DEVICE_LABELS.filter((d) => !devices[d.key]);
    return (
      <div className="mx-auto h-full max-w-3xl overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--color-text)]">Open shift</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Count the drawer float before your first sale. Sales are blocked until a shift is open.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-[var(--color-warning)] bg-[var(--color-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-text)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
            Shift Closed
          </span>
        </div>

        {/* Float Count Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Opening float</p>
              <p className="text-xs text-[var(--color-text-muted)]">Count physical bills and coins</p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Total float</span>
              <p className={`text-2xl font-bold font-mono tabular-nums ${floatTotal > 0 ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`}>
                {formatCents(floatTotal)}
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-surface)] p-2 text-xs">
            <span className="font-semibold text-[var(--color-text-muted)] pl-1">Quick float:</span>
            <button
              type="button"
              onClick={() => setCounts({ 50000: 1, 20000: 2, 10000: 1 })}
              className="rounded-lg bg-[var(--color-bg)] px-3 py-1 font-medium tabular-nums text-[var(--color-text)] shadow-xs border border-[var(--color-border)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              ₱1,000 Float
            </button>
            <button
              type="button"
              onClick={() => setCounts({ 100000: 1, 50000: 1, 20000: 2, 10000: 1 })}
              className="rounded-lg bg-[var(--color-bg)] px-3 py-1 font-medium tabular-nums text-[var(--color-text)] shadow-xs border border-[var(--color-border)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              ₱2,000 Float
            </button>
            <button
              type="button"
              onClick={() => setCounts({})}
              className="ml-auto rounded-lg px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition"
            >
              Reset
            </button>
          </div>

          <FloatGrid values={counts} onChange={setCounts} />

          {/* FR-07 */}
          {floatTotal === 0 ? (
            <p className="mt-3 text-xs text-[var(--color-danger)] font-medium">Enter at least one denomination count.</p>
          ) : null}
        </div>

        {/* Device Check Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm">
          {/* FR-08 */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Hardware check</p>
              <p className="text-xs text-[var(--color-text-muted)]">Check devices before opening</p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">Select to toggle test result</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEVICE_LABELS.map((d) => (
              <button
                key={d.key}
                type="button"
                aria-pressed={devices[d.key]}
                onClick={() => setDevices((prev) => ({ ...prev, [d.key]: !prev[d.key] }))}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                  devices[d.key]
                    ? "border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-primary-hover)]"
                    : "border-[var(--color-danger)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-danger-hover)]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DeviceIcon device={d.key} />
                  <div>
                    <span className="text-xs font-semibold block">{d.label}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {devices[d.key] ? "Ready" : "Fault"}
                    </span>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  devices[d.key]
                    ? "bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                    : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                }`}>
                  {devices[d.key] ? "OK" : "Fault"}
                </span>
              </button>
            ))}
          </div>
          {faulty.length > 0 ? (
            <p className="mt-3 rounded-lg border border-[var(--color-warning)] bg-[var(--color-bg)] p-2.5 text-xs text-[var(--color-text)]">
              Fault logged: {faulty.map((f) => f.label).join(", ")}. You can still open and sell.
            </p>
          ) : null}
        </div>

        <div>
          <Input
            label="Shift notes (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Drawer sealed, tape number, opening notes"
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          full
          className="mt-2 py-3.5 text-base font-semibold"
          onClick={() => void doOpen()}
          loading={busy}
          disabled={floatTotal <= 0}
        >
          Open shift
        </Button>
      </div>
    );
  }

  // ── Close shift (FR-10/11/12, UC-12) ──
  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text)]">Close shift</h2>
          <p className="mt-1 text-sm tabular-nums text-[var(--color-text-muted)]">
            Started {formatDateTime(openSince ?? "")} · {shiftOrders.length} orders · {formatCents(sales)} sales.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-text)] border border-[var(--color-border)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
          Shift open
        </span>
      </div>

      {/* Financial KPI Cards */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <dt className="text-xs font-medium text-[var(--color-text-muted)]">Opening float</dt>
          <dd className="money mt-1.5 text-lg font-bold tabular-nums text-[var(--color-text)] font-mono">{formatCents(openingFloatCents)}</dd>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <dt className="text-xs font-medium text-[var(--color-text-muted)]">Shift sales</dt>
          <dd className="money mt-1.5 text-lg font-bold tabular-nums text-[var(--color-primary)] font-mono">{formatCents(sales)}</dd>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <dt className="text-xs font-medium text-[var(--color-text-muted)]">Expected cash</dt>
          <dd className="money mt-1.5 text-lg font-bold tabular-nums text-[var(--color-text)] font-mono">
            {ordersLoading ? "…" : formatCents(expected)}
          </dd>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <dt className="text-xs font-medium text-[var(--color-text-muted)]">Variance</dt>
          <dd className={`money mt-1.5 text-lg font-bold tabular-nums font-mono ${variance === 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
            {formatCents(variance)}
          </dd>
        </div>
      </dl>

      {pending.length > 0 ? (
        <div className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-bg)] p-4 text-sm text-[var(--color-text)] flex items-center justify-between">
          <div>
            <span className="font-semibold text-[var(--color-text)]">Pending orders block close:</span>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {pending.length} pending sale{pending.length > 1 ? "s" : ""} must be completed or voided first.
            </p>
          </div>
          <Link
            to="/orders"
            className="rounded-lg bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-border)] shadow-xs hover:border-[var(--color-primary)] transition"
          >
            Review orders
          </Link>
        </div>
      ) : null}

      {/* Closing Cash Count */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Closing count</p>
            <p className="text-xs text-[var(--color-text-muted)]">Count drawer contents at end of shift</p>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Counted total</span>
            <p className="money text-2xl font-bold font-mono tabular-nums text-[var(--color-text)]">
              {formatCents(floatTotal)}
            </p>
          </div>
        </div>

        {/* Quick Helper for Balanced Count */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-surface)] p-2 text-xs">
          <span className="font-semibold text-[var(--color-text-muted)] pl-1">Quick count:</span>
          <button
            type="button"
            onClick={() => setCounts(breakdownCentsToCounts(expected))}
            className="rounded-lg bg-[var(--color-bg)] px-3 py-1 font-medium tabular-nums text-[var(--color-text)] shadow-xs border border-[var(--color-border)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            Match expected ({formatCents(expected)})
          </button>
          <button
            type="button"
            onClick={() => setCounts({})}
            className="ml-auto rounded-lg px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition"
          >
            Reset
          </button>
        </div>

        <FloatGrid values={counts} onChange={setCounts} />

        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3">
          <p className="text-sm text-[var(--color-text-muted)]">Variance (counted minus expected)</p>
          <p className={`money text-base font-bold font-mono tabular-nums ${variance === 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
            {formatCents(variance)} {variance === 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Balanced
              </span>
            ) : ""}
          </p>
        </div>

        {varianceNeedsNote ? (
          <p className="mt-2 text-xs text-[var(--color-warning)] font-medium">
            Variance over ₱100 — a manager note is required.
          </p>
        ) : null}
      </div>

      <div>
        <Input
          label={varianceNeedsNote ? "Manager note (required)" : "Note (optional)"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={varianceNeedsNote ? "Explain the variance" : "Shift note"}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        full
        className="mt-2 py-3.5 text-base font-semibold"
        onClick={() => void doClose()}
        loading={busy}
        disabled={pending.length > 0 || (varianceNeedsNote && !note.trim())}
      >
        Close shift
      </Button>
    </div>
  );
}

