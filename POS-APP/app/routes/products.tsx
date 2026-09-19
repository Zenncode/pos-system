import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import {
  adjustStock,
  archiveProduct,
  createProduct,
  listCategories,
  listProducts,
  updateProduct,
} from "~/lib/api";
import { formatCents, parseToCents } from "~/lib/format";
import { useAuth } from "~/shared/hooks/useAuth";
import { useToast } from "~/shared/hooks/useToast";
import { Badge } from "~/shared/components/ui/Badge";
import { Button } from "~/shared/components/ui/Button";
import { Input } from "~/shared/components/ui/Input";
import { Modal } from "~/shared/components/ui/Modal";
import { Select } from "~/shared/components/ui/Select";
import { Table, type Column } from "~/shared/components/ui/Table";
import type { Category, Product, StaffUser } from "~/types";
import { roleAtLeast } from "~/shared/hooks/useAuth";

export function meta(): { title: string }[] {
  return [{ title: "Products — Point of Sale" }];
}

function canManageProducts(role: StaffUser["role"] | undefined): boolean {
  return roleAtLeast(role, "MANAGER");
}

type AdjustReason = "PURCHASE" | "ADJUST" | "REFUND";

const REASON_OPTIONS: { value: AdjustReason; label: string }[] = [
  { value: "PURCHASE", label: "Purchase / Restock" },
  { value: "ADJUST", label: "Adjustment" },
  { value: "REFUND", label: "Return / Refund" },
];

export default function Products(): JSX.Element {
  const { user } = useAuth();
  const role = user?.role as StaffUser["role"] | undefined;
  const { push } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catId, setCatId] = useState("");
  const [q, setQ] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [createForm, setCreateForm] = useState({
    sku: "",
    name: "",
    price: "",
    cost: "",
    taxRate: "0",
    stock: "0",
    lowStockThreshold: "5",
    barcode: "",
    categoryId: "",
    isActive: true,
  });
  const [editForm, setEditForm] = useState({
    sku: "",
    name: "",
    price: "",
    cost: "",
    taxRate: "0",
    stock: "0",
    lowStockThreshold: "5",
    barcode: "",
    categoryId: "",
    isActive: true,
  });
  const [adjustForm, setAdjustForm] = useState({ delta: "", reason: "ADJUST" as AdjustReason });
  const [saving, setSaving] = useState(false);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const editFormRef = useRef<HTMLFormElement>(null);
  const adjustFormRef = useRef<HTMLFormElement>(null);

  const canManage = canManageProducts(role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        listCategories(),
        listProducts({ categoryId: catId || undefined, q: q || undefined, pageSize: 200 }),
      ]);
      setCategories(cats);
      setProducts(prods.data);
      setTotalProducts(prods.total);
    } catch {
      push("error", "Failed to load products. Try again.");
    } finally {
      setLoading(false);
    }
  }, [catId, q, push]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(t);
  }, [load]);

  function openCreate(): void {
    setCreateForm({
      sku: "",
      name: "",
      price: "",
      cost: "",
      taxRate: "0",
      stock: "0",
      lowStockThreshold: "5",
      barcode: "",
      categoryId: catId,
      isActive: true,
    });
    setCreateOpen(true);
  }

  function openEdit(p: Product): void {
    setEditingProduct(p);
    setEditForm({
      sku: p.sku,
      name: p.name,
      price: (p.priceCents / 100).toFixed(2),
      cost: p.costCents ? (p.costCents / 100).toFixed(2) : "",
      taxRate: String(p.taxRateBps),
      stock: String(p.stock),
      lowStockThreshold: String(p.lowStockThreshold),
      barcode: p.barcode ?? "",
      categoryId: p.categoryId ?? "",
      isActive: p.isActive,
    });
    setEditOpen(true);
  }

  function openAdjust(p: Product): void {
    setAdjustingProduct(p);
    setAdjustForm({ delta: "", reason: "ADJUST" });
    setAdjustOpen(true);
  }

  async function onCreate(): Promise<void> {
    if (!createForm.sku.trim() || !createForm.name.trim() || !createForm.price.trim()) {
      push("error", "SKU, name and price are required.");
      return;
    }
    const cents = parseToCents(createForm.price);
    if (!Number.isFinite(cents) || cents <= 0) {
      push("error", "Price must be greater than 0.");
      return;
    }
    const costCents = createForm.cost ? parseToCents(createForm.cost) : null;
    if (costCents !== null && (!Number.isFinite(costCents) || costCents < 0)) {
      push("error", "Cost must be a positive number.");
      return;
    }
    const taxRateBps = Number(createForm.taxRate);
    if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000) {
      push("error", "Tax rate must be 0–10000 basis points.");
      return;
    }
    const st = Number(createForm.stock);
    if (!Number.isInteger(st) || st < 0) {
      push("error", "Stock must be a whole number 0 or more.");
      return;
    }
    const lowThresh = Number(createForm.lowStockThreshold);
    if (!Number.isInteger(lowThresh) || lowThresh < 0 || lowThresh > 100000) {
      push("error", "Low-stock threshold must be 0–100000.");
      return;
    }
    setSaving(true);
    try {
      await createProduct({
        sku: createForm.sku.trim(),
        name: createForm.name.trim(),
        priceCents: cents,
        costCents,
        taxRateBps,
        stock: st,
        lowStockThreshold: lowThresh,
        barcode: createForm.barcode.trim() || undefined,
        categoryId: createForm.categoryId || undefined,
      });
      push("success", `${createForm.name} created`);
      setCreateOpen(false);
      void load();
    } catch {
      push("error", "Create failed. Check SKU and price.");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(): Promise<void> {
    if (!editingProduct) return;
    if (!editForm.sku.trim() || !editForm.name.trim() || !editForm.price.trim()) {
      push("error", "SKU, name and price are required.");
      return;
    }
    const cents = parseToCents(editForm.price);
    if (!Number.isFinite(cents) || cents <= 0) {
      push("error", "Price must be greater than 0.");
      return;
    }
    const costCents = editForm.cost ? parseToCents(editForm.cost) : null;
    if (costCents !== null && (!Number.isFinite(costCents) || costCents < 0)) {
      push("error", "Cost must be a positive number.");
      return;
    }
    const taxRateBps = Number(editForm.taxRate);
    if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000) {
      push("error", "Tax rate must be 0–10000 basis points.");
      return;
    }
    const st = Number(editForm.stock);
    if (!Number.isInteger(st) || st < 0) {
      push("error", "Stock must be a whole number 0 or more.");
      return;
    }
    const lowThresh = Number(editForm.lowStockThreshold);
    if (!Number.isInteger(lowThresh) || lowThresh < 0 || lowThresh > 100000) {
      push("error", "Low-stock threshold must be 0–100000.");
      return;
    }
    setSaving(true);
    try {
      await updateProduct(editingProduct.id, {
        sku: editForm.sku.trim(),
        name: editForm.name.trim(),
        priceCents: cents,
        costCents,
        taxRateBps,
        stock: st,
        lowStockThreshold: lowThresh,
        barcode: editForm.barcode.trim() || null,
        categoryId: editForm.categoryId || null,
        isActive: editForm.isActive,
      });
      push("success", `${editForm.name} updated`);
      setEditOpen(false);
      setEditingProduct(null);
      void load();
    } catch {
      push("error", "Update failed. Check SKU and price.");
    } finally {
      setSaving(false);
    }
  }

  async function onAdjustSubmit(): Promise<void> {
    if (!adjustingProduct) return;
    const delta = Number(adjustForm.delta);
    if (!Number.isInteger(delta) || delta === 0) {
      push("error", "Enter a non-zero whole number for the adjustment.");
      return;
    }
    if (delta < 0 && Math.abs(delta) > adjustingProduct.stock && adjustForm.reason !== "PURCHASE") {
      push("error", `Cannot reduce stock by more than ${adjustingProduct.stock} (current stock).`);
      return;
    }
    setAdjustSaving(true);
    try {
      await adjustStock(adjustingProduct.id, delta, adjustForm.reason);
      push("success", `${adjustingProduct.name} ${delta > 0 ? "+" : ""}${delta} (${adjustForm.reason})`);
      setAdjustOpen(false);
      setAdjustingProduct(null);
      void load();
    } catch {
      push("error", "Stock adjust failed. Manager only in live mode.");
    } finally {
      setAdjustSaving(false);
    }
  }

  async function onArchive(p: Product): Promise<void> {
    if (!window.confirm(`Archive ${p.name}? It will hide from the register.`)) return;
    try {
      await archiveProduct(p.id);
      push("success", `${p.name} archived`);
      void load();
    } catch {
      push("error", "Archive failed. Try again.");
    }
  }

  const visibleProducts = products.filter((product) => {
    if (stockFilter === "out") return product.stock <= 0;
    if (stockFilter === "low") return product.stock > 0 && product.stock <= product.lowStockThreshold;
    return true;
  });

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: "SKU / Name",
      render: (p) => (
        <div>
          <p className="font-medium text-[var(--color-text)]">{p.name}</p>
          <p className="text-xs tabular-nums text-[var(--color-text-muted)]">{p.sku}{p.barcode ? ` · ${p.barcode}` : ""}</p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (p) => <span className="tabular-nums">{formatCents(p.priceCents)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      render: (p) => <span className="tabular-nums text-[var(--color-text-muted)]">{p.costCents ? formatCents(p.costCents) : "—"}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      render: (p) => <span className="tabular-nums">{p.stock}</span>,
    },
    {
      key: "threshold",
      header: "Low @",
      align: "right",
      render: (p) => <span className="tabular-nums text-[var(--color-text-muted)]">{p.lowStockThreshold}</span>,
    },
    {
      key: "tax",
      header: "Tax (bps)",
      align: "right",
      render: (p) => <span className="tabular-nums text-[var(--color-text-muted)]">{p.taxRateBps}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        p.stock <= 0 ? <Badge tone="LOW">Out</Badge> : p.stock <= p.lowStockThreshold ? <Badge tone="LOW">Low</Badge> : <Badge tone="OK">OK</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          {canManage ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>Edit</Button>
              <Button variant="secondary" size="sm" onClick={() => openAdjust(p)}>Adjust Stock</Button>
            </>
          ) : null}
          <Button variant="danger" size="sm" onClick={() => void onArchive(p)}>Archive</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0">
      <div className="w-[220px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)] p-3">
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Categories</p>
        <button onClick={() => setCatId("")} className={`mb-1 w-full rounded-lg border-l-2 px-3 py-2 text-left text-sm ${catId === "" ? "border-emerald-700 bg-[var(--color-surface-hover)] font-medium text-[var(--color-text)]" : "border-transparent text-[var(--color-neutral-700)] hover:bg-[var(--color-surface)]"}`}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCatId(c.id)} className={`mb-1 w-full rounded-lg border-l-2 px-3 py-2 text-left text-sm ${catId === c.id ? "border-emerald-700 bg-[var(--color-surface-hover)] font-medium text-[var(--color-text)]" : "border-transparent text-[var(--color-neutral-700)] hover:bg-[var(--color-surface)]"}`}>
            <span className="block truncate">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex gap-2">
          <div className="max-w-sm flex-1">
            <Input placeholder="Search SKU, name, barcode…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          </div>
          {canManage && (
            <Button variant="primary" onClick={openCreate}>+ Product</Button>
          )}
          {!canManage && (
            <span className="text-[13px] text-[var(--color-text-muted)]">Managers only</span>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Stock filter">
          {([
            ["all", "All stock"],
            ["low", "Low stock"],
            ["out", "Out of stock"],
          ] as const).map(([value, label]) => (
            <Button key={value} variant={stockFilter === value ? "primary" : "secondary"} aria-pressed={stockFilter === value} onClick={() => setStockFilter(value)} aria-label={label}>
              {label}
            </Button>
          ))}
        </div>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]" role="status">
          {loading ? "Loading products…" : `${visibleProducts.length} of ${products.length} loaded products shown`}
        </p>
        {!loading && totalProducts > products.length && (
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            Stock filters apply only to the {products.length} loaded products out of {totalProducts} matches. Narrow your search or category to find more items.
          </p>
        )}
        <Table
          columns={columns}
          data={visibleProducts}
          rowKey={(p) => p.id}
          loading={loading}
          emptyMessage={stockFilter === "all" ? "No products match your search or category." : "No loaded products match this stock filter. Try All stock."}
        />

        {createOpen ? (
          <Modal title="New product" onClose={() => setCreateOpen(false)} wide>
            <div className="flex flex-col gap-3">
              <Input label="SKU *" value={createForm.sku} onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })} placeholder="CF-005" />
              <Input label="Name *" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Mocha" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Price * (₱)" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} placeholder="4.50" inputMode="decimal" />
                <Input label="Cost (₱)" value={createForm.cost} onChange={(e) => setCreateForm({ ...createForm, cost: e.target.value })} placeholder="1.20" inputMode="decimal" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tax rate (bps)" value={createForm.taxRate} onChange={(e) => setCreateForm({ ...createForm, taxRate: e.target.value })} placeholder="1000" inputMode="numeric" max="10000" />
                <Input label="Opening stock" value={createForm.stock} onChange={(e) => setCreateForm({ ...createForm, stock: e.target.value })} inputMode="numeric" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Low-stock threshold" value={createForm.lowStockThreshold} onChange={(e) => setCreateForm({ ...createForm, lowStockThreshold: e.target.value })} inputMode="numeric" max="100000" />
                <Select
                  label="Category"
                  value={createForm.categoryId}
                  onChange={(v) => setCreateForm({ ...createForm, categoryId: v })}
                  placeholder="None"
                  options={[{ value: "", label: "None" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                />
              </div>
              <Input label="Barcode (optional)" value={createForm.barcode} onChange={(e) => setCreateForm({ ...createForm, barcode: e.target.value })} placeholder="100005" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={createForm.isActive} onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })} className="size-4 accent-[var(--color-primary)]" />
                <span>Active</span>
              </label>
              <div className="mt-1 flex gap-2">
                <Button variant="ghost" full onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button variant="primary" full onClick={() => void onCreate()} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
              </div>
            </div>
          </Modal>
        ) : null}

        {editOpen && editingProduct ? (
          <Modal title={`Edit ${editingProduct.name}`} onClose={() => { setEditOpen(false); setEditingProduct(null); }} wide initialFocus={editFormRef}>
            <form ref={editFormRef} className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void onUpdate(); }}>
              <Input label="SKU *" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} placeholder="CF-005" />
              <Input label="Name *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Mocha" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Price * (₱)" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="4.50" inputMode="decimal" />
                <Input label="Cost (₱)" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} placeholder="1.20" inputMode="decimal" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tax rate (bps)" value={editForm.taxRate} onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })} placeholder="1000" inputMode="numeric" max="10000" />
                <Input label="Stock" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} inputMode="numeric" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Low-stock threshold" value={editForm.lowStockThreshold} onChange={(e) => setEditForm({ ...editForm, lowStockThreshold: e.target.value })} inputMode="numeric" max="100000" />
                <Select
                  label="Category"
                  value={editForm.categoryId}
                  onChange={(v) => setEditForm({ ...editForm, categoryId: v })}
                  placeholder="None"
                  options={[{ value: "", label: "None" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                />
              </div>
              <Input label="Barcode (optional)" value={editForm.barcode} onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })} placeholder="100005" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="size-4 accent-[var(--color-primary)]" />
                <span>Active</span>
              </label>
              <div className="mt-1 flex gap-2">
                <Button variant="ghost" full type="button" onClick={() => { setEditOpen(false); setEditingProduct(null); }}>Cancel</Button>
                <Button variant="primary" full type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          </Modal>
        ) : null}

        {adjustOpen && adjustingProduct ? (
          <Modal title={`Adjust stock: ${adjustingProduct.name}`} onClose={() => { setAdjustOpen(false); setAdjustingProduct(null); }} initialFocus={adjustFormRef}>
            <form ref={adjustFormRef} className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void onAdjustSubmit(); }}>
              <p className="text-sm text-[var(--color-text-muted)]">Current stock: <span className="font-medium tabular-nums text-[var(--color-text)]">{adjustingProduct.stock}</span></p>
              <Input label="Delta (whole number, negative to reduce)" value={adjustForm.delta} onChange={(e) => setAdjustForm({ ...adjustForm, delta: e.target.value })} placeholder="e.g. +10 or -2" inputMode="numeric" autoFocus />
              <Select
                label="Reason"
                value={adjustForm.reason}
                onChange={(v) => setAdjustForm({ ...adjustForm, reason: v as AdjustReason })}
                options={REASON_OPTIONS}
              />
              <div className="mt-1 flex gap-2">
                <Button variant="ghost" full type="button" onClick={() => { setAdjustOpen(false); setAdjustingProduct(null); }}>Cancel</Button>
                <Button variant="primary" full type="submit" disabled={adjustSaving}>{adjustSaving ? "Adjusting…" : "Apply"}</Button>
              </div>
            </form>
          </Modal>
        ) : null}
      </div>
    </div>
  );
}