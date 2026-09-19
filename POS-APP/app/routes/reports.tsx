import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { getDailyReport, getSummary } from "~/lib/api";
import { formatCents, todayISO, subDaysISO } from "~/lib/format";
import { useAuth, roleAtLeast } from "~/shared/hooks/useAuth";
import { useToast } from "~/shared/hooks/useToast";
import { useSocket } from "~/shared/hooks/useSocket";
import { Badge } from "~/shared/components/ui/Badge";
import { Button } from "~/shared/components/ui/Button";
import { EmptyState, Spinner, StatCard } from "~/shared/components/ui/Feedback";
import { Input } from "~/shared/components/ui/Input";
import type { DailyReport, Product } from "~/types";

interface SummaryReport {
  from: string;
  to: string;
  totalCents: number;
  orderCount: number;
  avgTicketCents: number;
}

interface TopProduct {
  productId: string;
  name: string;
  qty: number;
  totalCents: number;
}

export function meta(): { title: string }[] {
  return [{ title: "Reports — Point of Sale" }];
}

function formatDateKey(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getDefaultFrom(): string {
  return subDaysISO(13);
}

export default function Reports(): JSX.Element {
  const { push } = useToast();
  const { user, demoMode } = useAuth();
  const allowed = demoMode || roleAtLeast(user?.role, "MANAGER");

  const [from, setFrom] = useState(getDefaultFrom());
  const [to, setTo] = useState(todayISO());
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const [sum, daily] = await Promise.all([
        getSummary(from, to),
        Promise.all(
          Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const day = d.toISOString().slice(0, 10);
            return getDailyReport(day);
          }).reverse()
        ),
      ]);
      setSummary(sum);
      setDailyReports(daily);

      // Aggregate top 10 products across all days
      const productMap = new Map<string, { name: string; qty: number; totalCents: number }>();
      daily.forEach((r) => {
        (r.topProducts ?? []).forEach((p) => {
          const existing = productMap.get(p.productId) ?? { name: p.name, qty: 0, totalCents: 0 };
          existing.qty += p.qty;
          existing.totalCents += p.totalCents;
          productMap.set(p.productId, existing);
        });
      });
      const sorted = Array.from(productMap.entries())
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.totalCents - a.totalCents)
        .slice(0, 10);
      setTopProducts(sorted);

      // Low stock from latest daily report
      const latest = daily[daily.length - 1];
      setLowStock(latest?.lowStock ?? []);
    } catch {
      setLoadFailed(true);
      push("error", "Failed to load reports. Try again.");
    } finally {
      setLoading(false);
    }
  }, [from, to, push, allowed]);

  useEffect(() => {
    if (!allowed) return;
    void loadData();
  }, [loadData, allowed, reloadKey]);

  // Real-time updates via Socket.IO
  const handleOrderCreated = useCallback(() => {
    if (to === todayISO()) {
      setReloadKey((k) => k + 1);
    }
  }, [to]);

  useSocket({
    autoConnect: allowed,
    onOrderCreated: handleOrderCreated,
  });

  const trendData = useMemo(() => dailyReports, [dailyReports]);
  const maxTrend = useMemo(() => Math.max(1, ...trendData.map((t) => t.totalCents)), [trendData]);
  const maxHour = useMemo(() => Math.max(1, ...((summary ? [] : dailyReports[dailyReports.length - 1]?.byHour ?? [])).map((h) => h.totalCents)), [dailyReports, summary]);

  // Hourly data from the last loaded daily report (today)
  const todaysReport = dailyReports[dailyReports.length - 1];
  const hourlyData = useMemo(() => todaysReport?.byHour ?? [], [todaysReport]);

  if (!allowed) {
    return (
      <div className="h-full overflow-y-auto bg-[var(--color-surface)] p-6" role="main">
        <div className="mx-auto max-w-5xl">
          <EmptyState title="Reports are for managers. Ask a manager to view sales analytics." />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-surface)] p-6" role="main">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="report-from" className="text-xs font-medium text-[var(--color-text-muted)]">From</label>
              <Input
                id="report-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                max={to}
                className="h-10 w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
                aria-label="Report start date"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="report-to" className="text-xs font-medium text-[var(--color-text-muted)]">To</label>
              <Input
                id="report-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from}
                max={todayISO()}
                className="h-10 w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
                aria-label="Report end date"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)} disabled={loading} aria-label="Refresh reports">
              {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : "Refresh"}
            </Button>
            <span className="flex items-center text-[13px] text-[var(--color-text-muted)]">Managers see live data · demo data when offline</span>
          </div>
        </div>

        {loadFailed ? (
          <EmptyState
            title="Couldn't load reports. Check connection and retry."
            action={<Button onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>}
          />
        ) : loading ? (
          <Spinner />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 mb-6" role="region" aria-label="Summary metrics">
              <StatCard label="Revenue" value={formatCents(summary?.totalCents ?? 0)} sub={`${summary?.orderCount ?? 0} orders`} />
              <StatCard label="Orders" value={String(summary?.orderCount ?? 0)} sub="Paid + pending" />
              <StatCard label="Items sold" value={String(topProducts.reduce((s, p) => s + p.qty, 0))} sub="Across period" />
              <StatCard label="Avg ticket" value={formatCents(summary?.avgTicketCents ?? 0)} sub="Per order" />
              <StatCard label="Low stock" value={String(lowStock.length)} sub="Needs restock" />
            </div>

            {/* 14-day Sparkline + Sales by Hour */}
            <div className="grid gap-4 lg:grid-cols-2 mb-6">
              {/* 14-day Revenue Trend */}
              <section aria-labelledby="trend14" className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <h2 id="trend14" className="mb-3 text-sm font-medium text-[var(--color-text)]">14-Day Revenue Trend</h2>
                <div
                  role="img"
                  aria-label={`14-day revenue trend, total ${formatCents(trendData.reduce((s, t) => s + t.totalCents, 0))}`}
                  className="flex h-32 items-end gap-1.5"
                >
                  {trendData.map((t) => (
                    <div
                      key={t.date}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                      title={`${formatDateKey(t.date)} · ${formatCents(t.totalCents)}`}
                    >
                      <div
                        aria-hidden
                        className="w-full rounded-t bg-[var(--color-primary)]/80"
                        style={{ height: `${Math.max(4, (t.totalCents / maxTrend) * 100)}px` }}
                      />
                      <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">{formatDateKey(t.date).slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Total: <span className="tabular-nums font-medium text-[var(--color-text)]">{formatCents(trendData.reduce((s, t) => s + t.totalCents, 0))}</span>
                </p>
              </section>

              {/* Sales by Hour (today) */}
              <section aria-labelledby="byhour" className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <h2 id="byhour" className="mb-3 text-sm font-medium text-[var(--color-text)]">Sales by Hour (Today)</h2>
                <div className="flex h-32 items-end gap-1.5">
                  {hourlyData.length > 0 ? (
                    hourlyData.map((h) => (
                      <div key={h.hour} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${h.hour}:00 · ${formatCents(h.totalCents)}`}>
                        <div
                          className="w-full rounded-t bg-[var(--color-primary)]/90"
                          style={{ height: `${Math.max(4, (h.totalCents / maxHour) * 100)}px` }}
                        />
                        <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">{h.hour}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 text-center text-[var(--color-text-muted)] text-sm py-8">No hourly data for today</div>
                  )}
                </div>
              </section>
            </div>

            {/* Top 10 Products + Low Stock */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Top 10 Products Table */}
              <section aria-labelledby="topproducts" className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <h2 id="topproducts" className="mb-3 text-sm font-medium text-[var(--color-text)]">Top 10 Products</h2>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No sales data in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-left">
                          <th className="pb-2 text-[var(--color-text-muted)]">Product</th>
                          <th className="pb-2 text-right tabular-nums text-[var(--color-text-muted)]">Qty</th>
                          <th className="pb-2 text-right tabular-nums text-[var(--color-text-muted)]">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {topProducts.map((p, i) => (
                          <tr key={p.productId} className="hover:bg-[var(--color-surface-hover)]">
                            <td className="py-2 text-[var(--color-text)]">{i + 1}. {p.name}</td>
                            <td className="py-2 text-right tabular-nums text-[var(--color-text)]">{p.qty}</td>
                            <td className="py-2 text-right tabular-nums text-[var(--color-text)]">{formatCents(p.totalCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Low Stock Table */}
              <section aria-labelledby="lowstock" className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <h2 id="lowstock" className="mb-3 text-sm font-medium text-[var(--color-text)]">Low Stock</h2>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">All stocked. Nice.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-left">
                          <th className="pb-2 text-[var(--color-text-muted)]">Product</th>
                          <th className="pb-2 text-right tabular-nums text-[var(--color-text-muted)]">Stock</th>
                          <th className="pb-2 text-right tabular-nums text-[var(--color-text-muted)]">Threshold</th>
                          <th className="pb-2 text-right text-[var(--color-text-muted)]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {lowStock.map((p) => (
                          <tr key={p.id} className="hover:bg-[var(--color-surface-hover)]">
                            <td className="py-2 text-[var(--color-text)]">{p.name} <span className="text-xs text-[var(--color-text-muted)]">{p.sku}</span></td>
                            <td className="py-2 text-right tabular-nums text-[var(--color-text)]">{p.stock}</td>
                            <td className="py-2 text-right tabular-nums text-[var(--color-text-muted)]">{p.lowStockThreshold}</td>
                            <td className="py-2 text-right">
                              <Badge tone={p.stock === 0 ? "HIGH" : "LOW"}>{p.stock === 0 ? "Out" : "Low"}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}