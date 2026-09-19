import { Link, Navigate, Outlet, useLocation } from "react-router";
import type { JSX } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { useAuth } from "../hooks/useAuth";
import { roleAtLeast } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useCallback, useState } from "react";
import type { StaffUser } from "~/types";

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/register": { title: "Register", subtitle: "F2 search · F8 charge · Esc close" },
  "/shift": { title: "Shift", subtitle: "Open/close float · drawer count · variance" },
  "/dashboard": { title: "Dashboard", subtitle: "Today's performance" },
  "/reports": { title: "Reports", subtitle: "Sales analytics · trends · top products" },
  "/orders": { title: "Orders", subtitle: "Sales history · voids need a manager PIN" },
  "/products": { title: "Products", subtitle: "Catalog · stock · pricing (cents-accurate)" },
  "/customers": { title: "Customers", subtitle: "Search by name or phone" },
  "/settings": { title: "Settings", subtitle: "Store · device · API" },
};

const NAV_ITEMS = [
  "/register",
  "/shift",
  "/orders",
  "/products",
  "/dashboard",
  "/reports",
  "/customers",
  "/settings",
  "/staff-management",
  "/refund",
];

const NAV_LABELS: Record<string, string> = {
  "/register": "Register",
  "/shift": "Shift",
  "/orders": "Orders",
  "/products": "Products",
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/settings": "Settings",
  "/staff-management": "Staff",
  "/refund": "Refund",
};

function canSeeNav(role: StaffUser["role"] | undefined, item: string): boolean {
  // ADMIN sees everything
  if (roleAtLeast(role, "ADMIN")) return true;
  // MANAGER sees everything except staff management & settings
  if (roleAtLeast(role, "MANAGER")) {
    // MANAGER can see all core ops
    return !item.startsWith("/settings") && item !== "/staff-management";
  }
  // CASHIER sees only register + orders (own orders) + customers (walk-in)
  if (!roleAtLeast(role, "MANAGER")) {
    // CASHIER: register, orders (own), customers
    if (item === "/settings" || item === "/products" || item === "/staff-management") return false;
    if (item === "/dashboard" || item === "/reports") return false; // dashboard & reports are manager+
    return true;
  }
  return false;
}

export function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-emerald-700" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export default function MainLayout(): JSX.Element {
  const loc = useLocation();
  const base = `/${loc.pathname.split("/")[1] ?? ""}`;
  const meta = TITLES[base] ?? TITLES["/register"];
  const { user, demoMode } = useAuth();

  // Realtime badges for mobile nav
  const [orderBadge, setOrderBadge] = useState(false);
  const [productBadge, setProductBadge] = useState(false);

  const clearOrderBadge = useCallback(() => setOrderBadge(false), []);
  const clearProductBadge = useCallback(() => setProductBadge(false), []);

  useSocket({
    autoConnect: !demoMode && !!user,
    onOrderCreated: () => {
      setOrderBadge(true);
      setTimeout(clearOrderBadge, 2000);
    },
    onStockLow: () => {
      setProductBadge(true);
      setTimeout(clearProductBadge, 2000);
    },
    onOrderVoided: () => {
      setOrderBadge(true);
      setTimeout(clearOrderBadge, 2000);
    },
  });

  // CartProvider lives in root.tsx above the Outlet — every route shares one cart.
  return (
    <div suppressHydrationWarning className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={meta.title} subtitle={meta.subtitle} />
          {/* Mobile nav — always shows core items for the role */}
          <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 md:hidden" aria-label="Mobile">
            {NAV_ITEMS.filter((item) => canSeeNav(user?.role, item)).map((to) => (
              <Link
                key={to}
                to={to}
                aria-current={base === to ? "page" : undefined}
                className={`relative rounded-md px-3 py-1.5 text-sm ${
                  base === to ? "bg-[var(--color-surface-hover)] font-medium text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {NAV_LABELS[to]}
                {(to === "/orders" && orderBadge) || (to === "/products" && productBadge) ? (
                  <span
                    className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white animate-pulse"
                    aria-label={to === "/orders" ? "New order received" : "Low stock alert"}
                  >
                    •
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
