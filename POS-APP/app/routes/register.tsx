import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { useNavigate } from "react-router";
import { ApiError, checkout, deliverReceipt, listCategories, listCustomers, listProducts, lookupBarcode, requestOverride } from "~/lib/api";
import { formatCents, newIdempotencyKey, parseToCents } from "~/lib/format";
import { computeDiscountCents as computeDiscountCentsPure } from "~/lib/discount";
import { cashConfirmLabel, cashDecision, chargeTotalCents, discountOverThreshold, isSplitTenderValid, splitOverpayAllowed, splitRemainingCents, validEmail, validPhone } from "~/lib/posRules";
import { useAuth } from "~/shared/hooks/useAuth";
import { useCart } from "~/shared/hooks/useCart";
import { useShift } from "~/shared/hooks/useShift";
import { useSocket } from "~/shared/hooks/useSocket";
import { useThermalPrint } from "~/shared/hooks/useThermalPrint";
import { useToast } from "~/shared/hooks/useToast";
import { Button } from "~/shared/components/ui/Button";
import { CartLine } from "~/shared/components/ui/CartLine";
import { EmptyState, Spinner } from "~/shared/components/ui/Feedback";
import { Input } from "~/shared/components/ui/Input";
import { Modal } from "~/shared/components/ui/Modal";
import { ProductTile } from "~/shared/components/ui/ProductTile";
import { Select } from "~/shared/components/ui/Select";
import type { Category, Customer, PaymentMethod, Product } from "~/types";

export function meta(): { title: string }[] {
  return [{ title: "Register — Point of Sale" }];
}

const QUICK_CASH = [0, 2000, 5000, 10000];
type PayTab = PaymentMethod | "SPLIT";

interface TenderRow {
  method: PaymentMethod;
  amount: string;
}

export default function Register(): JSX.Element {
  const { lines, totals, add, inc, dec, setQty, remove, clear, setDiscount, pendingSync, setPendingSync } = useCart();
  const { push } = useToast();
  const { demoMode } = useAuth();
  const { shift, loading: shiftLoading, open: openShift } = useShift();
  const navigate = useNavigate();
  const shiftOpen = !!shift && shift.status === "OPEN";

  async function quickOpenShift(): Promise<void> {
    try {
      await openShift([{ denomination: 100000, count: 1 }], "Quick open from register");
      push("success", "Shift opened with ₱1,000.00 initial float");
    } catch {
      push("error", "Failed to open shift. Open from Shift menu.");
    }
  }

  // Real-time socket for order:created, stock:low, session:revoked
  const storeId = shift?.storeId ?? null;
  useSocket({
    storeId: storeId ?? undefined,
    onStockLow: (data) => {
      push("warning", `⚠️ Low stock: ${data.productName} (${data.currentStock} left)`);
      void load(); // refresh product list
    },
    onOrderCreated: (data) => {
      if (data.itemCount > 0) {
        push("info", `📦 New order: ${data.orderNumber} (${data.itemCount} items)`);
      }
    },
    onSessionRevoked: () => {
      push("error", "Your session was revoked. Please log in again.");
      navigate("/login", { replace: true });
    },
  });

  // Thermal printer support
  const { printing: thermalPrinting, printOrder: thermalPrintOrder } = useThermalPrint();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catId, setCatId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [note, setNote] = useState("");

  // Discount — % or fixed cents; over-threshold needs a manager PIN (FR-27/28).
  const [discValue, setDiscValue] = useState("");
  const [discMode, setDiscMode] = useState<"PCT" | "FIX">("PCT");
  const [approvedDisc, setApprovedDisc] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const pendingDiscRef = useRef(0);
  // Receipt delivery (FR-31) — endpoint pending @api; degrades honestly.
  const [delivTarget, setDelivTarget] = useState("");
  const [delivBusy, setDelivBusy] = useState<"EMAIL" | "SMS" | null>(null);

  // Payment sheet — single method or split across up to 4 tenders (FR-23).
  const [payOpen, setPayOpen] = useState(false);
  const [payTab, setPayTab] = useState<PayTab>("CASH");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [tenders, setTenders] = useState<TenderRow[]>([
    { method: "CASH", amount: "" },
    { method: "CARD", amount: "" },
  ]);
  const [charging, setCharging] = useState(false);
  const chargingRef = useRef(false);
  const [receipt, setReceipt] = useState<{
    orderId: string;
    orderNumber: string;
    changeCents: number;
    totalCents: number;
    memberName: string | null;
    memberPoints: number | null;
    memberEmail: string | null;
    memberPhone: string | null;
  } | null>(null);
  // One idempotency key per cart session — retries reuse it, success regenerates it.
  const idemRef = useRef(newIdempotencyKey());

  const searchRef = useRef<HTMLInputElement>(null);
  const compactSearchRef = useRef<HTMLInputElement>(null);
  const discRef = useRef<HTMLInputElement>(null);
  const custRef = useRef<HTMLSelectElement>(null);
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  // Narrow viewports show Catalog and Cart one at a time (local UI state only).
  const [mobileView, setMobileView] = useState<"catalog" | "cart">("catalog");
  const cartCount = lines.reduce((s, l) => s + l.qty, 0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [cats, prods, custs] = await Promise.all([
        listCategories(),
        listProducts({ q: debouncedQ || undefined, categoryId: catId || undefined, pageSize: 200 }),
        listCustomers().catch(() => ({ data: [], page: 1, pageSize: 50, total: 0 })),
      ]);
      setCategories(cats);
      setProducts(prods.data);
      setCustomers(custs.data);
    } catch {
      setLoadError("Failed to load catalog. Check connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, catId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keyboard: F2 search, F3 customer, F4 discount, F8 charge (open shift only), Esc close (via Modal)
  // F3/F4 live in the cart pane, which is hidden on narrow viewports unless
  // the Cart view is active — switch there first so focus never lands on a
  // hidden input, then focus after the pane renders.
  useEffect(() => {
    const focusSearch = (): void => {
      // Wide layout (xl+) shows the rail search; narrower shows the compact one.
      const wide = window.matchMedia("(min-width: 1280px)").matches;
      const el = wide ? searchRef.current : compactSearchRef.current;
      (el ?? searchRef.current)?.focus();
      (el ?? searchRef.current)?.select();
    };
    const ensureCartVisible = (): boolean => {
      if (window.matchMedia("(min-width: 1024px)").matches) return false;
      // Narrow viewport: the cart pane may be hidden behind the view switch.
      // Always switch (no-op if already there) and defer focus a tick so the
      // pane renders first. No state-updater side effects — the updater stays pure.
      setMobileView("cart");
      return true;
    };
    const focusSoon = (fn: () => void, switched: boolean): void => {
      if (switched) window.setTimeout(fn, 0);
      else fn();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "F2") {
        e.preventDefault();
        focusSearch();
      }
      if (e.key === "F3") {
        e.preventDefault();
        const switched = ensureCartVisible();
        focusSoon(() => custRef.current?.focus(), switched);
      }
      if (e.key === "F4") {
        e.preventDefault();
        const switched = ensureCartVisible();
        focusSoon(() => {
          discRef.current?.focus();
          discRef.current?.select();
        }, switched);
      }
      if (e.key === "F8") {
        e.preventDefault();
        if (lines.length > 0 && shiftOpen && !payOpen && !receipt && !pinOpen) setPayOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lines.length, payOpen, receipt, pinOpen, shiftOpen]);

  function addWithStockCheck(p: Product): void {
    if (p.stock <= 0) {
      push("error", `${p.name} is out of stock`);
      return;
    }
    const existing = lines.find((l) => l.product.id === p.id);
    if (existing && existing.qty >= p.stock) {
      push("error", `Only ${p.stock} × ${p.name} in stock (FR-19).`);
      return;
    }
    add(p);
  }

  async function onSearchEnter(): Promise<void> {
    const code = query.trim();
    if (!code) return;
    // Barcode fast-path: exact SKU/barcode → add immediately (with stock check)
    const direct = await lookupBarcode(code).catch(() => null);
    if (direct) {
      addWithStockCheck(direct);
      setQuery("");
      if (direct.stock > 0) push("success", `${direct.name} added`);
    }
  }

  function computeDiscountCents(cap: number | undefined | null): number {
    return computeDiscountCentsPure(discValue, discMode, cap);
  }

  function commitDiscount(): void {
    const cap = totals.subtotalCents + totals.taxCents;
    const cents = computeDiscountCents(cap);
    if (cents > 0 && discountOverThreshold(cents, cap) && !approvedDisc) {
      pendingDiscRef.current = cents;
      setPinOpen(true);
      return;
    }
    setDiscount(cents);
  }

  async function approvePin(): Promise<void> {
    if (!/^\d{4,8}$/.test(pinValue)) {
      push("error", "Enter the manager PIN (4-8 digits).");
      return;
    }
    setPinBusy(true);
    try {
      // In live mode the server verifies the PIN; demo mode approves locally.
      if (!demoMode) await requestOverride(pinValue);
      setApprovedDisc(true);
      setDiscount(pendingDiscRef.current);
      setPinOpen(false);
      setPinValue("");
      push("success", "Manager approved over-limit discount");
    } catch {
      push("error", "Invalid manager PIN.");
    } finally {
      setPinBusy(false);
    }
  }

  async function deliver(channel: "EMAIL" | "SMS"): Promise<void> {
    if (!receipt || delivBusy) return;
    const target = delivTarget.trim();
    if (channel === "EMAIL" && !validEmail(target)) {
      push("error", "Enter a valid email address.");
      return;
    }
    if (channel === "SMS" && !validPhone(target)) {
      push("error", "Enter a valid phone number (7+ digits).");
      return;
    }
    setDelivBusy(channel);
    try {
      const res = await deliverReceipt(receipt.orderId, channel, target);
      push(
        "success",
        res.demo
          ? `Receipt queued locally (demo) — ${channel.toLowerCase()} → ${target}`
          : `${channel === "EMAIL" ? "Email" : "SMS"} receipt sent to ${target}`,
      );
    } catch (e) {
      if (e instanceof ApiError && e.code === "FEATURE_NOT_LIVE") {
        push("error", `Receipt ${channel.toLowerCase()} isn't available on this server yet.`);
      } else {
        push("error", "Delivery failed. Try again.");
      }
    } finally {
      setDelivBusy(null);
    }
  }

  const tenderedCents = parseToCents(tendered || "0");
  // Fresh-total basis for split validation: the discount input may not have
  // blurred yet, so totals.totalCents can be stale while doCharge() charges
  // finalTotal = cap - pendingDiscount. Validate against the SAME pending
  // total the charge uses. When the input is already committed, pending ==
  // totals.discountCents and chargeTotal == totals.totalCents (no behavior change).
  const chargeCap = totals.subtotalCents + totals.taxCents;
  const pendingDiscCents = computeDiscountCentsPure(discValue, discMode, chargeCap);
  const chargeTotal = chargeTotalCents(chargeCap, pendingDiscCents);
  const splitRows = useMemo(
    () =>
      payTab === "SPLIT"
        ? tenders
            .map((t) => ({ method: t.method, amountCents: parseToCents(t.amount || "0") }))
            .filter((t) => t.amountCents > 0)
        : [],
    [payTab, tenders],
  );
  const splitSum = splitRows.reduce((s, t) => s + t.amountCents, 0);
  const splitRemaining = splitRemainingCents(chargeTotal, splitRows);
  const splitValid = isSplitTenderValid(splitRows, chargeTotal);
  const cash = cashDecision(tenderedCents, chargeTotal);
  const canCharge =
    chargeTotal > 0 &&
    shiftOpen &&
    (payTab === "CASH"
      ? cash.covered
      : payTab === "SPLIT"
        ? splitValid
        : true);

  async function doCharge(): Promise<void> {
    if (chargingRef.current || charging || !shiftOpen) return;
    // Commit discount at charge time (input may not have blurred yet).
    const cap = totals.subtotalCents + totals.taxCents;
    const d = computeDiscountCents(cap);
    if (d > 0 && discountOverThreshold(d, cap) && !approvedDisc) {
      pendingDiscRef.current = d;
      setPinOpen(true);
      return;
    }
    setDiscount(d);
    const finalTotal = Math.max(0, cap - d);

    if (payTab === "SPLIT") {
      if (splitRows.length < 2) {
        push("error", "Split needs at least 2 tenders with amounts.");
        return;
      }
      // Validate against the SAME finalTotal charged below — never the
      // possibly-stale totals.totalCents rendered before this commit.
      const finalRemaining = splitRemainingCents(finalTotal, splitRows);
      if (finalRemaining > 0) {
        push("error", `${formatCents(finalRemaining)} still due.`);
        return;
      }
      if (!splitOverpayAllowed(splitRows, finalTotal)) {
        push("error", "Only cash tenders can overpay (change is returned on cash).");
        return;
      }
    }
    if (payTab === "CASH" && !cashDecision(tenderedCents, finalTotal).covered) return;

    chargingRef.current = true;
    setCharging(true);
    try {
      const { order, changeCents } = await checkout(
        {
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
          payments: payTab === "SPLIT"
            ? splitRows
            : payTab === "CASH"
              ? [{ method: "CASH" as const, amountCents: tenderedCents }]
              : [{ method: payTab as PaymentMethod, amountCents: finalTotal, reference: reference || undefined }],
          customerId: customerId || undefined,
          discountCents: d,
          note: note || undefined,
        },
        idemRef.current,
      );
      const offline = order.id.startsWith("o-local-") || order.orderNumber.startsWith("ORD-LOCAL-");
      await setPendingSync(offline);
      const memEmail = order.customer?.email ?? selectedCustomer?.email ?? null;
      const memPhone = order.customer?.phone ?? selectedCustomer?.phone ?? null;
      setReceipt({
        orderId: order.id,
        orderNumber: order.orderNumber,
        changeCents,
        totalCents: order.totalCents,
        memberName: order.customer?.name ?? selectedCustomer?.name ?? null,
        memberPoints: order.customer?.loyaltyPoints ?? selectedCustomer?.loyaltyPoints ?? null,
        memberEmail: memEmail,
        memberPhone: memPhone,
      });
      setDelivTarget(memEmail ?? memPhone ?? "");
      setPayOpen(false);
      clear();
      idemRef.current = newIdempotencyKey();
      setTendered("");
      setReference("");
      setTenders([
        { method: "CASH", amount: "" },
        { method: "CARD", amount: "" },
      ]);
      setCustomerId("");
      setNote("");
      setDiscValue("");
      setApprovedDisc(false);
      push("success", offline ? `Saved offline (demo) — ${order.orderNumber}` : `Charged ${formatCents(order.totalCents)} · ${order.orderNumber}`);
      void load();
    } catch {
      push("error", "Checkout failed. Try again.");
    } finally {
      chargingRef.current = false;
      setCharging(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 lg:flex-row">
      {/* Catalog/Cart view switch — narrow viewports only; both panes stay
          mounted so cart state, shortcuts and persistence are untouched. */}
      <div className="flex shrink-0 gap-2 border-b border-slate-200/90 bg-white p-2 lg:hidden" role="group" aria-label="Register view">
        {(["catalog", "cart"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={mobileView === v}
            onClick={() => setMobileView(v)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium ${
              mobileView === v
                ? "border-[var(--color-primary)] bg-[var(--color-success)]/10 text-[var(--color-success)]"
                : "border-[var(--color-border)] text-[var(--color-neutral-700)]"
            }`}
          >
            {v === "catalog" ? "Catalog" : "Cart"}
            {v === "cart" && cartCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white" aria-label={`${cartCount} items in cart`}>
                {cartCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Left rail — fixed 240px vertical list on xl+ only */}
      <div className="hidden w-[240px] shrink-0 flex-col border-r border-slate-200/90 bg-white xl:flex">
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Input
              ref={searchRef}
              placeholder="Search SKU or scan… (F2)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSearchEnter();
              }}
              aria-label="Search products"
              autoComplete="off"
              spellCheck={false}
              className="text-xs pr-7"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 space-y-0.5" role="group" aria-label="Categories">
          <button
            type="button"
            onClick={() => setCatId("")}
            aria-current={catId === "" ? "true" : undefined}
            className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
              catId === ""
                ? "bg-emerald-50 text-emerald-900 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span>All items</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-mono">
              {products.length}
            </span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatId(c.id)}
              aria-current={catId === c.id ? "true" : undefined}
              className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                catId === c.id
                  ? "bg-emerald-50 text-emerald-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact category selector — search + horizontal chips below xl */}
      <div className="shrink-0 border-b border-slate-200/90 bg-white xl:hidden">
        <div className="p-2">
          <div className="relative">
            <Input
              ref={compactSearchRef}
              placeholder="Search SKU or scan… (F2)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSearchEnter();
              }}
              aria-label="Search products"
              autoComplete="off"
              spellCheck={false}
              className="pr-10 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-2 pb-2" role="group" aria-label="Categories">
          <button
            type="button"
            onClick={() => setCatId("")}
            aria-current={catId === "" ? "true" : undefined}
            className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-medium ${
              catId === ""
                ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatId(c.id)}
              aria-current={catId === c.id ? "true" : undefined}
              className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-medium ${
                catId === c.id
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Center — product grid (shift-gated) */}
      <div className={`${mobileView === "catalog" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--color-surface)] p-4 lg:flex`}>
        {shiftLoading ? (
          <Spinner />
        ) : !shiftOpen ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="max-w-md w-full rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/60 mb-4">
                <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Shift is Currently Closed</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                To start ringing up sales and track cash drawer balances, open a shift drawer with an initial cash float.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  full
                  onClick={() => void quickOpenShift()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                >
                  ⚡ Quick Open (₱1,000.00 Float)
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  full
                  onClick={() => navigate("/shift")}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Count Custom Cash Float & Open Drawer →
                </Button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <Spinner />
        ) : loadError ? (
          <EmptyState title={loadError} action={<Button onClick={() => void load()}>Retry</Button>} />
        ) : products.length === 0 ? (
          <EmptyState title={catId || debouncedQ ? "No products match" : "No products. Add one in Products"} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((p) => (
              <ProductTile key={p.id} product={p} onAdd={addWithStockCheck} />
            ))}
          </div>
        )}
      </div>

      {/* Right cart — full width on narrow (via view switch), 320px on lg, 380px on xl */}
      <div className={`${mobileView === "cart" ? "flex" : "hidden"} min-h-0 w-full shrink-0 flex-col border-t border-[var(--color-border)] bg-[var(--color-bg)] lg:flex lg:w-[320px] lg:border-l lg:border-t-0 xl:w-[380px]`}>
        <div className="border-b border-[var(--color-border)] p-3">
          <div className="flex gap-2">
            <Select
              ref={custRef}
              value={customerId}
              onChange={setCustomerId}
              placeholder="Walk-in"
              options={[{ value: "", label: "Walk-in" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
              aria-label="Customer"
            />
            <Input
              ref={discRef}
              value={discValue}
              onChange={(e) => setDiscValue(e.target.value)}
              onBlur={commitDiscount}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDiscount();
              }}
              placeholder="% disc"
              className="h-9 w-20 text-sm tabular-nums"
              aria-label="Discount"
            />
            <button
              type="button"
              onClick={() => setDiscMode((m) => (m === "PCT" ? "FIX" : "PCT"))}
              className="flex min-h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              aria-label="Toggle discount mode"
            >
              {discMode === "PCT" ? "%" : "₱"}
            </button>
          </div>
          {selectedCustomer && (
            <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{selectedCustomer.name}</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Cart empty</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]" role="list" aria-label="Cart items">
              {lines.map((l) => (
                <CartLine
                  key={l.product.id}
                  line={l}
                  onInc={inc}
                  onDec={dec}
                  onSetQty={setQty}
                  onRemove={remove}
                />
              ))}
            </ul>
          )}
        </div>

<div className="border-t border-[var(--color-border)] p-4">
          {pendingSync && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-sm text-amber-800" role="status" aria-live="polite">
              <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-white text-xs">⟳</span>
              <span>Pending sync — order saved offline</span>
            </div>
          )}
          <dl className="space-y-1.5 text-xs text-slate-600 tabular-nums">
            <div className="flex justify-between">
              <dt className="text-slate-500 font-medium">Subtotal</dt>
              <dd className="font-semibold text-slate-800">{formatCents(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 font-medium">Tax</dt>
              <dd className="font-semibold text-slate-800">{formatCents(totals.taxCents)}</dd>
            </div>
            {totals.discountCents > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <dt className="font-medium">Discount</dt>
                <dd>−{formatCents(totals.discountCents)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-slate-200/80 pt-2 text-sm font-bold">
              <dt className="text-slate-900 font-bold text-sm">Total Due</dt>
              <dd className="text-2xl font-black text-emerald-600 tabular-nums" aria-live="polite">{formatCents(totals.totalCents)}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <Button
              variant="primary"
              size="lg"
              full
              loading={charging}
              onClick={() => {
                if (!shiftOpen) { navigate("/shift"); return; }
                setPayOpen(true);
              }}
              disabled={lines.length === 0 || !shiftOpen}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base py-3.5 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Charge {formatCents(totals.totalCents)}</span>
              <kbd className="rounded bg-emerald-700/80 px-2 py-0.5 text-xs font-mono font-normal text-emerald-100">F8</kbd>
            </Button>
          </div>
          {/* Quick Shortcuts Bar */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-medium px-1">
            <span><kbd className="font-mono text-[9px] bg-slate-200/80 px-1 py-0.5 rounded text-slate-600">F2</kbd> Search</span>
            <span><kbd className="font-mono text-[9px] bg-slate-200/80 px-1 py-0.5 rounded text-slate-600">F4</kbd> Disc</span>
            <span><kbd className="font-mono text-[9px] bg-slate-200/80 px-1 py-0.5 rounded text-slate-600">F8</kbd> Pay</span>
          </div>
        </div>
      </div>

      {/* Manager PIN for over-threshold discount (FR-28) */}
      {pinOpen ? (
        <Modal title="Manager approval needed" onClose={() => setPinOpen(false)}>
          <Input
            label="Manager PIN"
            type="password"
            passwordToggle
            inputMode="numeric"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void approvePin();
            }}
            placeholder="••••"
            autoFocus
          />
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" full onClick={() => setPinOpen(false)}>Cancel</Button>
            <Button variant="primary" full onClick={() => void approvePin()} loading={pinBusy}>
              {pinBusy ? "Checking…" : "Approve"}
            </Button>
          </div>
        </Modal>
      ) : null}

      {/* Payment sheet */}
      {payOpen ? (
        <Modal title={formatCents(totals.totalCents)} onClose={() => setPayOpen(false)}>
          <div className="mb-3 flex gap-2" role="group" aria-label="Payment method">
            {(["CASH", "CARD", "QR", "SPLIT"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={payTab === m}
                onClick={() => setPayTab(m)}
                className={`min-h-10 flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${payTab === m ? "border-[var(--color-primary)] bg-[var(--color-success)]/10 text-[var(--color-success)]" : "border-[var(--color-border)] text-[var(--color-neutral-700)] hover:bg-[var(--color-surface)]"}`}
              >
                {m}
              </button>
            ))}
          </div>

          {payTab === "CASH" ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Cash Received</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="h-11 w-full rounded-xl border border-slate-300 pl-8 pr-3 text-lg font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Quick Cash Chips */}
              <div className="flex gap-1.5">
                {QUICK_CASH.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTendered(c === 0 ? (chargeTotal / 100).toFixed(2) : (c / 100).toFixed(2))}
                    className="flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {c === 0 ? "Exact" : formatCents(c)}
                  </button>
                ))}
              </div>

              {/* Touch Keypad */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "."].map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={k === "C" ? "Clear tendered amount" : `Enter ${k}`}
                    onClick={() => {
                      if (k === "C") setTendered("");
                      else if (k === "." && tendered.includes(".")) return;
                      else setTendered((prev) => prev + k);
                    }}
                    className={`min-h-10 rounded-lg py-2.5 text-sm font-semibold ${
                      k === "C"
                        ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              {/* Change due / Remaining Banner — fresh charge total, same basis as canCharge/doCharge */}
              {cash.covered ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Change Due to Customer
                  </span>
                  <p className="text-2xl font-black text-emerald-600 tabular-nums">
                    {formatCents(cash.changeCents)}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-center">
                  <span className="text-xs font-medium text-amber-800">
                    Remaining to Pay: <strong className="font-bold">{formatCents(cash.remainingCents)}</strong>
                  </span>
                </div>
              )}
            </div>
          ) : payTab === "SPLIT" ? (
            <div>
              {tenders.map((t, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <Select
                    value={t.method}
                    onChange={(method) => setTenders((prev) => prev.map((row, j) => (j === i ? { ...row, method: method as PaymentMethod } : row)))}
                    options={["CASH", "CARD", "QR"].map((m) => ({ value: m, label: m }))}
                    aria-label={`Tender ${i + 1} method`}
                    className="h-10 w-24 shrink-0"
                  />
                  <Input
                    value={t.amount}
                    onChange={(e) => setTenders((prev) => prev.map((row, j) => (j === i ? { ...row, amount: e.target.value } : row)))}
                    placeholder="0.00"
                    aria-label={`Tender ${i + 1} amount`}
                    className="flex-1"
                  />
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums text-[var(--color-text-muted)]">
                    {formatCents(parseToCents(t.amount || "0"))}
                  </span>
                  {tenders.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setTenders((prev) => prev.filter((_, j) => j !== i))}
                      className="flex min-h-10 min-w-10 shrink-0 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                      aria-label={`Remove tender ${i + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTenders((prev) => [...prev, { method: "QR", amount: "" }])}
                disabled={tenders.length >= 4}
                className="min-h-10 w-full rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-50"
              >
                + Add tender
              </button>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--color-surface-hover)]">
                <span
                  className="block h-full bg-[var(--color-success)] transition-all"
                  style={{ width: `${Math.min(100, chargeTotal > 0 ? (splitSum / chargeTotal) * 100 : 0)}%` }}
                />
              </div>
              <p className="mt-2 text-sm tabular-nums" style={{ color: splitRemaining > 0 ? "var(--color-text-muted)" : splitRemaining < 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                {splitRemaining > 0
                  ? `${formatCents(splitSum)} / ${formatCents(chargeTotal)}`
                  : splitRemaining < 0
                    ? `Change ${formatCents(-splitRemaining)}`
                    : "Covered"}
              </p>
            </div>
          ) : (
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference" autoFocus />
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="ghost" full onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button variant="primary" size="lg" full onClick={() => void doCharge()} loading={charging} disabled={!canCharge}>
              {payTab === "CASH" ? cashConfirmLabel(tenderedCents, chargeTotal) : `Confirm ${formatCents(chargeTotal)}`}
            </Button>
          </div>
        </Modal>
      ) : null}

      {receipt ? (
        <Modal title="Receipt" onClose={() => setReceipt(null)}>
          <div className="receipt-print text-center">
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--color-success)]/10 text-xl text-[var(--color-success)]">✓</span>
            <p className="text-sm tabular-nums text-[var(--color-text-muted)]">{receipt.orderNumber}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text)]">{formatCents(receipt.totalCents)}</p>
            <p className="mt-1 text-sm tabular-nums text-[var(--color-success)] font-semibold">{formatCents(receipt.changeCents)}</p>
          </div>
          <div className="no-print mt-3 p-3">
            <div className="flex gap-2">
              <Input
                value={delivTarget}
                onChange={(e) => setDelivTarget(e.target.value)}
                placeholder="Email or phone"
                className="h-10 min-w-0 flex-1"
                aria-label="Receipt destination"
              />
              <Button size="sm" variant="secondary" onClick={() => void deliver("EMAIL")} disabled={delivBusy !== null} aria-label="Email receipt">
                ✉
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void deliver("SMS")} disabled={delivBusy !== null} aria-label="SMS receipt">
                📱
              </Button>
            </div>
          </div>
          <div className="no-print mt-4 flex gap-2">
            <Button variant="secondary" full onClick={() => window.print()}>
              Print
            </Button>
            <Button
              variant="secondary"
              full
              onClick={() => void thermalPrintOrder(receipt.orderId, { format: "escpos", cutPaper: true })}
              loading={thermalPrinting}
              disabled={thermalPrinting}
            >
              {thermalPrinting ? "Printing…" : "Thermal"}
            </Button>
            <Button variant="primary" full onClick={() => setReceipt(null)}>
              Next
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

