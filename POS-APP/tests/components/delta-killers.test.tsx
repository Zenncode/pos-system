import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "~/shared/components/ui/Button";
import { Modal } from "~/shared/components/ui/Modal";
import { ProductTile } from "~/shared/components/ui/ProductTile";
import { Table } from "~/shared/components/ui/Table";
import type { Product } from "~/types";

const base: Product = {
  id: "p1",
  sku: "C-1",
  barcode: null,
  name: "Coffee",
  categoryId: null,
  priceCents: 150,
  costCents: null,
  taxRateBps: 0,
  stock: 10,
  lowStockThreshold: 2,
  isActive: true,
};

interface Row {
  id: string;
  name: string;
  value: number;
}
const columns = [
  { key: "name", header: "Name", render: (r: Row) => r.name },
  { key: "value", header: "Value", render: (r: Row) => r.value, align: "right" as const, sortable: true },
];
const data: Row[] = [
  { id: "1", name: "A", value: 10 },
  { id: "2", name: "B", value: 20 },
];

describe("delta killers — Button", () => {
  it("md size keeps the 40px touch target classes", () => {
    render(<Button size="md">Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("h-10");
    expect(btn).toHaveClass("px-4");
  });

  it("displayName is set for devtools", () => {
    expect(Button.displayName).toBe("Button");
  });
});

describe("delta killers — Modal", () => {
  it("backdrop dismiss button is type=button (never submits forms)", () => {
    render(
      <Modal title="Pay" onClose={vi.fn()}>
        <button>Confirm</button>
      </Modal>,
    );
    expect(screen.getByLabelText("Close")).toHaveAttribute("type", "button");
  });

  it("non-Tab keys inside the dialog do not move focus", () => {
    render(
      <Modal title="Pay" onClose={vi.fn()}>
        <button>First</button>
        <button>Last</button>
      </Modal>,
    );
    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    fireEvent.keyDown(last, { key: "Enter" });
    expect(document.activeElement).toBe(last);
  });
});

describe("delta killers — ProductTile exact boundaries", () => {
  it("stock exactly threshold+1 shows the count, not the low badge", () => {
    render(<ProductTile product={{ ...base, stock: 3, lowStockThreshold: 2 }} onAdd={vi.fn()} />);
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.queryByText("3 left")).toBeNull();
  });

  it("negative stock is disabled with the Out badge", () => {
    render(<ProductTile product={{ ...base, stock: -1 }} onAdd={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Coffee/ })).toBeDisabled();
    expect(screen.getByText("Out")).toBeInTheDocument();
  });
});

describe("delta killers — Table optional-handler branches", () => {
  it("Space key on a row triggers onRowClick like Enter", () => {
    const onRowClick = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    fireEvent.keyDown(screen.getByText("A").closest("tr")!, { key: " " });
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it("hides pagination when total fits on one page", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={(r) => r.id} total={10} pageSize={20} />);
    expect(screen.queryByRole("button", { name: "Prev" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("sortable column without onSort renders plain header text", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.queryByRole("button", { name: "Value" })).toBeNull();
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("page buttons without onPageChange do not throw", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={(r) => r.id} total={50} page={2} pageSize={10} />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: "Next" }))).not.toThrow();
    expect(() => fireEvent.click(screen.getByRole("button", { name: "Prev" }))).not.toThrow();
  });
});
