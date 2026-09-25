import { NavLink, useLocation } from "react-router";
import type { JSX } from "react";
import { useAuth } from "~/shared/hooks/useAuth";
import { useSocket } from "~/shared/hooks/useSocket";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NavMeta } from "~/shared/layouts/MainLayout";

function NavIcon({ route, active }: { route: string; active: boolean }): JSX.Element {
  const cls = `size-5 ${active ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]"}`;
  const paths: Record<string, JSX.Element> = {
    "/register": <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />,
    "/shift": <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    "/dashboard": <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />,
    "/reports": <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    "/orders": <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
    "/products": <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    "/refund": <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a3 3 0 00-3-3H6a3 3 0 00-3 3v4h12v-3zm-9 2h.01M19 8a2 2 0 100-4 2 2 0 000 4zm0 0v11" />,
    "/customers": <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
    "/settings": (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  };
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {paths[route] ?? paths["/orders"]}
    </svg>
  );
}

export function Sidebar({ items }: { items: NavMeta[] }): JSX.Element {
  const { user, signOut, demoMode } = useAuth();
  const loc = useLocation();
  const base = `/${loc.pathname.split("/")[1] ?? ""}`;
  const [collapsed, setCollapsed] = useState(false);

  // Realtime badges state
  const [orderBadge, setOrderBadge] = useState(false);
  const [productBadge, setProductBadge] = useState(false);

  // Clear badges after 2s
  const clearOrderBadge = useCallback(() => setOrderBadge(false), []);
  const clearProductBadge = useCallback(() => setProductBadge(false), []);
  const badgeTimers = useRef<number[]>([]);
  useEffect(() => {
    const timers = badgeTimers.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
    };
  }, []);

  // Listen for realtime events
  useSocket({
    autoConnect: !demoMode && !!user,
    onOrderCreated: () => {
      setOrderBadge(true);
      badgeTimers.current.push(window.setTimeout(clearOrderBadge, 2500));
    },
    onStockLow: () => {
      setProductBadge(true);
      badgeTimers.current.push(window.setTimeout(clearProductBadge, 2500));
    },
    onOrderVoided: () => {
      setOrderBadge(true);
      badgeTimers.current.push(window.setTimeout(clearOrderBadge, 2500));
    },
  });

  const roleName = user?.role ?? "CASHIER";
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "S";

  return (
    <aside className={`flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] ${collapsed ? "w-16" : "w-[240px]"}`} aria-label="Sidebar">
      {/* Brand Header — Apex POS */}
      <div className="flex h-16 items-center gap-3 border-b border-[var(--color-border)] px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white" aria-hidden="true">
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        {collapsed ? null : (
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold tracking-tight text-[var(--color-text)]">Apex POS</h2>
            <p className="truncate text-[11px] font-medium text-[var(--color-text-muted)]">
              {demoMode ? "Offline Demo" : "Store Active"}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav List — items come from MainLayout NAV_META (role-filtered) */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Primary Navigation">
        {collapsed ? null : (
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Terminal Menu
          </div>
        )}
        {items.map((n) => {
          const isActive = base === n.route;
          return (
            <NavLink
              key={n.route}
              to={n.route}
              title={collapsed ? n.label : undefined}
              aria-label={collapsed ? n.label : undefined}
              className={`group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-[var(--color-surface-hover)] text-[var(--color-text)] font-semibold"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active left indicator bar */}
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-[var(--color-primary)]" aria-hidden="true" />
              )}
              <span className="shrink-0"><NavIcon route={n.route} active={isActive} /></span>
              {collapsed ? null : (
                <>
                  <span className="flex-1 truncate">{n.label}</span>
                  <span className={`text-[11px] font-normal ${isActive ? "text-[var(--color-primary)] font-medium" : "text-[var(--color-text-muted)]"}`}>
                    {n.hint}
                  </span>
                </>
              )}
              {/* Live Event Notification Badge */}
              {((n.route === "/orders" && orderBadge) || (n.route === "/products" && productBadge)) && (
                <span
                  className="flex size-2 items-center justify-center rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-success-soft)] animate-pulse"
                  aria-label={n.route === "/orders" ? "New order received" : "Low stock alert"}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Staff Profile Footer */}
      <div className="border-t border-[var(--color-border)] p-3">
        <div className={`flex items-center gap-2.5 rounded-lg p-1.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-neutral-200)] text-xs font-bold text-[var(--color-text)]">
            {userInitial}
          </div>
          {collapsed ? null : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--color-text)]">{user?.name ?? "Cashier Staff"}</p>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-[var(--color-primary)]" />
                <span className="truncate text-[10px] font-medium text-[var(--color-text-muted)]">{roleName}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            title="Sign out of POS"
            aria-label="Sign out"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-danger)]"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
