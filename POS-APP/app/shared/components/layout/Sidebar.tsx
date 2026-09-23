import { NavLink, useLocation } from "react-router";
import type { JSX, ReactNode } from "react";
import { useAuth, roleAtLeast } from "~/shared/hooks/useAuth";
import { useSocket } from "~/shared/hooks/useSocket";
import { useCallback, useState } from "react";

interface NavItem {
  to: string;
  label: string;
  hint: string;
  manager?: boolean;
  icon: (active: boolean) => ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/register",
    label: "Register",
    hint: "Sell",
    icon: (active) => (
      <svg className={`size-4.5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: "/shift",
    label: "Shift",
    hint: "Drawer",
    icon: (active) => (
      <svg className={`size-4.5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    hint: "Today",
    manager: true,
    icon: (active) => (
      <svg className={`size-4.5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "Reports",
    hint: "Insights",
    manager: true,
    icon: (active) => (
      <svg className={`size-4.5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: "/orders",
    label: "Orders",
    hint: "History",
    icon: (active) => (
      <svg className={`size-4.5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: "/products",
    label: "Products",
    hint: "Catalog",
    manager: true,
    icon: (active) => (
      <svg className={`size-4.5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    to: "/customers",
    label: "Customers",
    hint: "Loyalty",
    icon: (active) => (
      <svg className={`size-4.5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    hint: "Store",
    icon: (active) => (
      <svg className={`size-4.5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Sidebar(): JSX.Element {
  const { user, signOut, demoMode } = useAuth();
  const loc = useLocation();
  const base = `/${loc.pathname.split("/")[1] ?? ""}`;

  // Realtime badges state
  const [orderBadge, setOrderBadge] = useState(false);
  const [productBadge, setProductBadge] = useState(false);

  // Clear badges after 2s
  const clearOrderBadge = useCallback(() => setOrderBadge(false), []);
  const clearProductBadge = useCallback(() => setProductBadge(false), []);

  // Listen for realtime events
  useSocket({
    autoConnect: !demoMode && !!user,
    onOrderCreated: () => {
      setOrderBadge(true);
      setTimeout(clearOrderBadge, 2500);
    },
    onStockLow: () => {
      setProductBadge(true);
      setTimeout(clearProductBadge, 2500);
    },
    onOrderVoided: () => {
      setOrderBadge(true);
      setTimeout(clearOrderBadge, 2500);
    },
  });

  const roleName = user?.role ?? "CASHIER";
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "S";

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-slate-200/90 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-sm text-white">
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-sm font-bold tracking-tight text-slate-900">Apex POS</h2>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              v2.0
            </span>
          </div>
          <p className="truncate text-[11px] text-slate-500 font-medium">
            {demoMode ? "Offline Demo" : "Store Active"}
          </p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Primary Navigation">
        <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Terminal Menu
        </div>
        {NAV_ITEMS.filter((n) => !("manager" in n && n.manager) || roleAtLeast(user?.role, "MANAGER") || demoMode).map((n) => {
          const isActive = base === n.to;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-emerald-50/80 text-emerald-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active left indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-emerald-600" aria-hidden="true" />
              )}
              <span className="shrink-0">{n.icon(isActive)}</span>
              <span className="flex-1 truncate">{n.label}</span>
              <span className={`text-[11px] font-normal transition-opacity ${isActive ? "text-emerald-700 font-medium" : "text-slate-400 opacity-60 group-hover:opacity-100"}`}>
                {n.hint}
              </span>
              {/* Live Event Notification Badge */}
              {((n.to === "/orders" && orderBadge) || (n.to === "/products" && productBadge)) && (
                <span
                  className="flex size-2 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse"
                  aria-label={n.to === "/orders" ? "New order received" : "Low stock alert"}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Staff Profile Footer */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5 rounded-lg p-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 ring-2 ring-white shadow-xs">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">{user?.name ?? "Cashier Staff"}</p>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              <span className="truncate text-[10px] font-medium text-slate-500">{roleName}</span>
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            title="Sign out of POS"
            aria-label="Sign out"
            className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-600 hover:shadow-xs transition-colors"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
