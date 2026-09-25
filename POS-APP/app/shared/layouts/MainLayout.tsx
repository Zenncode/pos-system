import { Link, Navigate, Outlet, useLocation } from "react-router";
import type { JSX } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { useAuth } from "../hooks/useAuth";
import { roleAtLeast } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StaffUser } from "~/types";

export type NavRole = StaffUser["role"];

/** Single source of truth for shell navigation. Desktop (Sidebar) and
 *  mobile (nav bar below) both render from NAV_META so they can never
 *  disagree. Only routes registered in app/routes.ts appear here —
 *  unregistered pages (e.g. /staff-management) are never exposed. */
export interface NavMeta {
  route: string;
  label: string;
  hint: string;
  title: string;
  subtitle?: string;
  minRole: NavRole;
  showMobile: boolean;
  /** Demo/offline terminal may show this MANAGER-level screen because its
   *  page guard explicitly allows demoMode (dashboard/reports do). Screens
   *  whose guards deny demo (products, refund, settings) stay hidden. */
  allowDemo?: boolean;
}

export const NAV_META: NavMeta[] = [
  { route: "/register", label: "Register", hint: "Sell", title: "Register", subtitle: "F2 search · F8 charge · Esc close", minRole: "CASHIER", showMobile: true },
  { route: "/shift", label: "Shift", hint: "Drawer", title: "Shift", subtitle: "Open/close float · drawer count · variance", minRole: "CASHIER", showMobile: true },
  { route: "/orders", label: "Orders", hint: "History", title: "Orders", subtitle: "Sales history · voids need a manager PIN", minRole: "CASHIER", showMobile: true },
  { route: "/products", label: "Products", hint: "Catalog", title: "Products", subtitle: "Catalog · stock · pricing (cents-accurate)", minRole: "MANAGER", showMobile: true },
  { route: "/dashboard", label: "Dashboard", hint: "Today", title: "Dashboard", subtitle: "Today's performance", minRole: "MANAGER", showMobile: true, allowDemo: true },
  { route: "/reports", label: "Reports", hint: "Insights", title: "Reports", subtitle: "Sales analytics · trends · top products", minRole: "MANAGER", showMobile: true, allowDemo: true },
  { route: "/refund", label: "Refund", hint: "Void", title: "Refund", subtitle: "Void a paid order · manager approval", minRole: "MANAGER", showMobile: true },
  { route: "/customers", label: "Customers", hint: "Loyalty", title: "Customers", subtitle: "Search by name or phone", minRole: "CASHIER", showMobile: true },
  { route: "/settings", label: "Settings", hint: "Store", title: "Settings", subtitle: "Store · device · API", minRole: "ADMIN", showMobile: true },
];

export function canSeeNav(role: NavRole | undefined, item: NavMeta, demoMode = false): boolean {
  // Demo/offline terminal keeps working for the screens whose page guards
  // explicitly allow demoMode (dashboard/reports). Every other screen follows
  // the real role check, so demo can never display a route its page guard
  // would deny (products/refund need MANAGER, settings needs ADMIN).
  if (roleAtLeast(role, item.minRole)) return true;
  if (demoMode && item.allowDemo && item.minRole === "MANAGER") return true;
  return false;
}

export function visibleNav(role: NavRole | undefined, demoMode = false): NavMeta[] {
  return NAV_META.filter((item) => canSeeNav(role, item, demoMode));
}

export function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export default function MainLayout(): JSX.Element {
  const loc = useLocation();
  const base = `/${loc.pathname.split("/")[1] ?? ""}`;
  const fallback = NAV_META[0];
  const meta = NAV_META.find((n) => n.route === base) ?? fallback;
  const { user, demoMode } = useAuth();
  const items = visibleNav(user?.role, demoMode);

  // Realtime badges for mobile nav
  const [orderBadge, setOrderBadge] = useState(false);
  const [productBadge, setProductBadge] = useState(false);

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

  useSocket({
    autoConnect: !demoMode && !!user,
    onOrderCreated: () => {
      setOrderBadge(true);
      badgeTimers.current.push(window.setTimeout(clearOrderBadge, 2000));
    },
    onStockLow: () => {
      setProductBadge(true);
      badgeTimers.current.push(window.setTimeout(clearProductBadge, 2000));
    },
    onOrderVoided: () => {
      setOrderBadge(true);
      badgeTimers.current.push(window.setTimeout(clearOrderBadge, 2000));
    },
  });

  // CartProvider lives in root.tsx above the Outlet — every route shares one cart.
  return (
    <div suppressHydrationWarning className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="hidden md:block">
          <Sidebar items={items} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={meta.title} subtitle={meta.subtitle} />
          {/* Mobile nav — same metadata as the desktop sidebar */}
          <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 md:hidden" aria-label="Mobile">
            {items.filter((item) => item.showMobile).map((item) => (
              <Link
                key={item.route}
                to={item.route}
                aria-current={base === item.route ? "page" : undefined}
                className={`relative min-h-10 rounded-md px-3 py-2 text-sm ${
                  base === item.route ? "bg-[var(--color-surface-hover)] font-medium text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {item.label}
                {(item.route === "/orders" && orderBadge) || (item.route === "/products" && productBadge) ? (
                  <span
                    className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white animate-pulse"
                    aria-label={item.route === "/orders" ? "New order received" : "Low stock alert"}
                  >
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <main className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
  );
}
