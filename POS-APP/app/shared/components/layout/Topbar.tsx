import { useEffect, useState } from "react";
import type { JSX } from "react";
import { Link } from "react-router";
import { checkHealth } from "~/lib/api";
import { useAuth } from "~/shared/hooks/useAuth";
import { useShift } from "~/shared/hooks/useShift";
import { useLiveBadges } from "~/shared/hooks/useLiveBadges";

function useClock(): string | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!now) return null;
  return now.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }): JSX.Element {
  const { demoMode } = useAuth();
  const clock = useClock();
  const [online, setOnline] = useState<boolean | null>(null);
  const { ordersDelta, lowStockPulse } = useLiveBadges();
  const { shift, loading: shiftLoading } = useShift();
  const shiftOpen = !!shift && shift.status === "OPEN";

  useEffect(() => {
    let alive = true;
    void checkHealth().then((h) => {
      if (alive) setOnline(h.ok);
    });
    const t = window.setInterval(() => {
      void checkHealth().then((h) => {
        if (alive) setOnline(h.ok);
      });
    }, 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-[var(--color-text)]">{title}</h1>
          </div>
          {subtitle ? (
            <p className="text-xs font-medium text-[var(--color-text-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {/* Realtime clock */}
        <span
          suppressHydrationWarning
          className="hidden rounded-md bg-[var(--color-surface)] px-2.5 py-1 font-mono text-[11px] font-medium tabular-nums text-[var(--color-text-muted)] ring-1 ring-inset ring-[var(--color-border)] md:inline-flex items-center gap-1.5"
        >
          <svg className="size-3 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {clock ?? "..."}
        </span>

        {/* Realtime event alerts */}
        <span role="status" aria-live="polite" className="flex items-center gap-2">
          {ordersDelta > 0 && (
            <span
              aria-label={`${ordersDelta} new order updates`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)] animate-pulse"
            >
              <span className="size-1.5 rounded-full bg-[var(--color-primary)]" />
              {ordersDelta} new {ordersDelta === 1 ? "order" : "orders"}
            </span>
          )}
          {lowStockPulse > 0 && (
            <span
              aria-label={`${lowStockPulse} low-stock alerts`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-danger)] ring-1 ring-inset ring-[var(--color-border)] animate-pulse"
            >
              <span className="size-1.5 rounded-full bg-[var(--color-danger)]" />
              Low Stock
            </span>
          )}
        </span>

        {/* Shift Drawer status */}
        {!shiftLoading && (
          shiftOpen ? (
            <Link
              to="/shift"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <span className="size-2 rounded-full bg-[var(--color-primary)]" />
              <span>Shift Open</span>
            </Link>
          ) : (
            <Link
              to="/shift"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <span className="size-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
              <span>Shift Closed · Open Drawer</span>
            </Link>
          )
        )}

        {/* System Online / Offline Indicator — neutral until the first
            health request resolves; never "Live Server" while unknown. */}
        {demoMode ? (
          <span
            title="Running in local resilient demo mode with sample store data"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] ring-1 ring-inset ring-[var(--color-border)]"
          >
            <span className="size-2 rounded-full bg-[var(--color-neutral-400)]" />
            <span>Demo Mode</span>
          </span>
        ) : online === null ? (
          <span
            role="status"
            title="Checking connection to the API backend"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] ring-1 ring-inset ring-[var(--color-border)]"
          >
            <span className="size-2 animate-pulse rounded-full bg-[var(--color-neutral-400)]" />
            <span>Checking connection</span>
          </span>
        ) : online ? (
          <span
            title="Connected to live API backend"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)]"
          >
            <span className="size-2 rounded-full bg-[var(--color-primary)]" />
            <span>Live Server</span>
          </span>
        ) : (
          <span
            role="status"
            title="API backend unreachable — the register keeps working with local data"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)]"
          >
            <span className="size-2 rounded-full bg-[var(--color-warning)]" />
            <span>Offline</span>
          </span>
        )}
      </div>
    </header>
  );
}
