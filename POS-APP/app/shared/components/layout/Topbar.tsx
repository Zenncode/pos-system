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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/90 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-900">{title}</h1>
          </div>
          {subtitle ? (
            <p className="text-xs font-medium text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {/* Realtime clock */}
        <span
          suppressHydrationWarning
          className="hidden rounded-md bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/70 md:inline-flex items-center gap-1.5"
        >
          <svg className="size-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {clock ?? "..."}
        </span>

        {/* Realtime event alerts */}
        <span role="status" aria-live="polite" className="flex items-center gap-2">
          {ordersDelta > 0 && (
            <span
              aria-label={`${ordersDelta} new order updates`}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 animate-pulse"
            >
              <span className="size-1.5 rounded-full bg-emerald-600" />
              {ordersDelta} new {ordersDelta === 1 ? "order" : "orders"}
            </span>
          )}
          {lowStockPulse > 0 && (
            <span
              aria-label={`${lowStockPulse} low-stock alerts`}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 animate-pulse"
            >
              <span className="size-1.5 rounded-full bg-rose-600" />
              Low Stock
            </span>
          )}
        </span>

        {/* Shift Drawer status */}
        {!shiftLoading && (
          shiftOpen ? (
            <Link
              to="/shift"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100/80 transition-colors"
            >
              <span className="size-2 rounded-full bg-emerald-600" />
              <span>Shift Open</span>
            </Link>
          ) : (
            <Link
              to="/shift"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 transition-colors"
            >
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Shift Closed · Open Drawer</span>
            </Link>
          )
        )}

        {/* System Online / Offline Indicator */}
        {demoMode || online === false ? (
          <span
            title="Running in local resilient demo mode with sample store data"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
          >
            <span className="size-2 rounded-full bg-slate-400" />
            <span>Demo Mode</span>
          </span>
        ) : (
          <span
            title="Connected to live API backend"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
          >
            <span className="size-2 rounded-full bg-emerald-500 shadow-xs" />
            <span>Live Server</span>
          </span>
        )}
      </div>
    </header>
  );
}
