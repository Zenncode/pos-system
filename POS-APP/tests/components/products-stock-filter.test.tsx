import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Products from "~/routes/products";

const mocks = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listProducts: vi.fn(),
  adjustStock: vi.fn(),
  archiveProduct: vi.fn(),
  createProduct: vi.fn(),
  formatCents: () => "₱0.00",
  parseToCents: (s: string) => Number(s),
}));

vi.mock("~/lib/api", () => ({
  listCategories: mocks.listCategories,
  listProducts: mocks.listProducts,
  adjustStock: mocks.adjustStock,
  archiveProduct: mocks.archiveProduct,
  createProduct: mocks.createProduct,
  formatCents: mocks.formatCents,
  parseToCents: mocks.parseToCents,
}));

vi.mock("~/shared/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u-1", name: "Mina", email: "mina@example.invalid", role: "MANAGER" },
    loading: false,
    demoMode: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  roleAtLeast: () => true,
}));

vi.mock("~/shared/hooks/useToast", () => ({
  useToast: () => ({
    push: vi.fn(),
    toasts: [],
    remove: vi.fn(),
  }),
}));

const SEEDED_PRODUCTS = [
  { id: "p-neg1", sku: "CF-010", name: "Out-of-Stock A", stock: -1, lowStockThreshold: 5 },
  { id: "p-zero", sku: "CF-011", name: "Out-of-Stock B", stock: 0, lowStockThreshold: 5 },
  { id: "p-one", sku: "CF-012", name: "Low Stock Item", stock: 1, lowStockThreshold: 5 },
  { id: "p-thresh", sku: "CF-013", name: "At Threshold", stock: 5, lowStockThreshold: 5 },
  { id: "p-above", sku: "CF-014", name: "Above Threshold", stock: 6, lowStockThreshold: 5 },
  { id: "p-high", sku: "CF-015", name: "Well Stocked", stock: 10, lowStockThreshold: 5 },
];

describe("Products — Stock filter", () => {
  beforeEach(async () => {
    mocks.listCategories.mockReset();
    mocks.listProducts.mockReset();
    mocks.adjustStock.mockReset();
    mocks.archiveProduct.mockReset();
    mocks.createProduct.mockReset();
    mocks.listCategories.mockResolvedValue([]);
    mocks.listProducts.mockImplementation(async (params?: { q?: string }) => {
      let filtered = SEEDED_PRODUCTS;
      if (params?.q) {
        const qLower = params.q.toLowerCase();
        filtered = filtered.filter(
          (p) => p.name.toLowerCase().includes(qLower) || p.sku.toLowerCase().includes(qLower)
        );
      }
      return {
        data: filtered,
        page: 1,
        pageSize: 200,
        total: filtered.length,
      };
    });
    await render(<Products />);
  });

  it("renders all products when stock filter is 'all' — happy path", async () => {
    await waitFor(() =>
      expect(screen.getByText(/Out-of-Stock A/)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/Out-of-Stock B/)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/Low Stock Item/)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/At Threshold/)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/Above Threshold/)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/Well Stocked/)).toBeInTheDocument()
    );
    // 1 header row + 6 data rows
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(7);
    expect(screen.getByText(/6 of 6 loaded products shown/i)).toBeInTheDocument();
  });

  it("renders only low-stock products when stock filter is 'low'", async () => {
    fireEvent.click(screen.getByRole("button", { name: /Low stock/i }));
    await waitFor(() =>
      expect(screen.getByText(/Low Stock Item/)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/At Threshold/)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Out-of-Stock A/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Out-of-Stock B/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Above Threshold/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Well Stocked/)).not.toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3); // 1 header + 2 data rows
    expect(screen.getByText(/2 of 6 loaded products shown/i)).toBeInTheDocument();
  });

  it("renders only out-of-stock products when stock filter is 'out'", async () => {
    fireEvent.click(screen.getByRole("button", { name: /Out of stock/i }));
    await waitFor(() =>
      expect(screen.getByText(/Out-of-Stock A/)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText(/Out-of-Stock B/)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Low Stock Item/)).not.toBeInTheDocument();
    expect(screen.queryByText(/At Threshold/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Above Threshold/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Well Stocked/)).not.toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3); // 1 header + 2 data rows
    expect(screen.getByText(/2 of 6 loaded products shown/i)).toBeInTheDocument();
  });

  it("shows correct notice per stock filter — subset notice only when total > data length", async () => {
    fireEvent.click(screen.getByRole("button", { name: /All stock/i }));
    await waitFor(() =>
      expect(screen.getByText(/6 of 6 loaded products shown/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/No products match your search or category./i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Low stock/i }));
    await waitFor(() =>
      expect(screen.getByText(/2 of 6 loaded products shown/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/No loaded products match this stock filter/i)).not.toBeInTheDocument();
  });

  it("applies search query AND stock filter together (intersection)", async () => {
    const searchInput = screen.getByPlaceholderText(/Search SKU, name, barcode/i);
    fireEvent.change(searchInput, { target: { value: "Out-of-Stock A" } });

    await waitFor(() =>
      expect(screen.getByText(/Out-of-Stock A/)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Out-of-Stock B/)).not.toBeInTheDocument();

    // Now clear and filter to low stock with search "Item"
    fireEvent.change(searchInput, { target: { value: "Item" } });
    fireEvent.click(screen.getByRole("button", { name: /Low stock/i }));
    await waitFor(() =>
      expect(screen.getByText(/Low Stock Item/)).toBeInTheDocument()
    );
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2); // 1 header + 1 data row
    expect(screen.getByText(/1 of 1 loaded products shown/i)).toBeInTheDocument();
  });
});