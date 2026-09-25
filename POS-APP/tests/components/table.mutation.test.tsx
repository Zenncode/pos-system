import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Table } from "~/shared/components/ui/Table";

interface Row { id: string; name: string; value: number; }
const columns = [
  { key: "name", header: "Name", render: (r: Row) => r.name },
  { key: "value", header: "Value", render: (r: Row) => r.value, align: "right" as const, sortable: true },
];
const data: Row[] = [
  { id: "1", name: "A", value: 10 },
  { id: "2", name: "B", value: 20 },
];

describe("Table — mutation killers", () => {
  // Kills: renders headers with sortable button when sortable+onSort
  it("renders sortable header button when sortable and onSort provided", () => {
    const onSort = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onSort={onSort} />);
    expect(screen.getByRole("button", { name: "Value" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Name" })).not.toBeInTheDocument();
  });

  // Kills: sort indicator shows asc/desc
  it("shows asc indicator when sortBy matches and sortDir=asc", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} sortBy="value" sortDir="asc" onSort={vi.fn()} />);
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("shows desc indicator when sortBy matches and sortDir=desc", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} sortBy="value" sortDir="desc" onSort={vi.fn()} />);
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  // Kills: onSort called with correct key
  it("calls onSort with column key when header clicked", () => {
    const onSort = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onSort={onSort} />);
    fireEvent.click(screen.getByRole("button", { name: "Value" }));
    expect(onSort).toHaveBeenCalledWith("value");
  });

  // Kills: loading state renders spinner
  it("renders loading spinner when loading=true", () => {
    render(<Table<Row> columns={columns} data={[]} rowKey={r => r.id} loading />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.getByText("Loading…").closest("td")?.querySelector(".animate-spin")).toBeInTheDocument();
  });

  // Kills: empty state renders emptyMessage
  it("renders emptyMessage when data empty and not loading", () => {
    render(<Table<Row> columns={columns} data={[]} rowKey={r => r.id} emptyMessage="No items" />);
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  // Kills: default emptyMessage when not provided
  it("renders default emptyMessage when not provided", () => {
    render(<Table<Row> columns={columns} data={[]} rowKey={r => r.id} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  // Kills: row click calls onRowClick
  it("calls onRowClick with row data when row clicked", () => {
    const onRowClick = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("A"));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  // Kills: Enter key on row calls onRowClick
  it("calls onRowClick on Enter key when row focused", () => {
    const onRowClick = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onRowClick={onRowClick} />);
    const row = screen.getByText("A").closest("tr");
    fireEvent.keyDown(row!, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  // Kills: Space key on row calls onRowClick (e.key === " " -> "")
  it("calls onRowClick on Space key when row focused", () => {
    const onRowClick = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onRowClick={onRowClick} />);
    const row = screen.getByText("A").closest("tr");
    fireEvent.keyDown(row!, { key: " " });
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  // Kills: pagination renders when total > pageSize
  it("renders pagination when total > pageSize", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={50} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByText("Showing 1–10 of 50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prev" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  // Kills: Prev disabled on page 1
  it("Prev button disabled on page 1", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={50} page={1} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
  });

  // Kills: Next disabled on last page
  it("Next button disabled on last page", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={50} page={5} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  // Kills: onPageChange called with correct page
  it("onPageChange called with page-1 for Prev", () => {
    const onPageChange = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={50} page={2} pageSize={10} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  // Kills: column align right/center classes
  it("applies text-right class for align=right", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} />);
    expect(screen.getByText("10").closest("td")).toHaveClass("text-right");
  });

  // Kills: undefined align renders with neither right nor center class
  it("applies no alignment class when align is undefined", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} />);
    const cell = screen.getByText("A").closest("td")!;
    expect(cell).not.toHaveClass("text-right");
    expect(cell).not.toHaveClass("text-center");
    const head = screen.getByText("Name").closest("th")!;
    expect(head).not.toHaveClass("text-right");
    expect(head).not.toHaveClass("text-center");
  });

  // Kills: no pagination chrome at all when total is absent
  it("hides pagination when total is undefined", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} />);
    expect(screen.queryByRole("button", { name: "Prev" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  // Kills: totalPages clamping — page past the last page disables Next
  it("Next button disabled when page exceeds the last page", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={25} page={9} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Prev" })).not.toBeDisabled();
  });

  // Kills: sortable aria-sort state (ascending / none / absent)
  it("exposes ascending aria-sort on the active sortable header", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} sortBy="value" sortDir="asc" onSort={vi.fn()} />);
    expect(screen.getByText("Value").closest("th")).toHaveAttribute("aria-sort", "ascending");
  });

  it("omits aria-sort on plain (non-sortable) headers", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} sortBy="value" sortDir="asc" onSort={vi.fn()} />);
    expect(screen.getByText("Name").closest("th")).not.toHaveAttribute("aria-sort");
  });

  it("exposes none aria-sort on inactive sortable headers", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} sortBy="name" sortDir="desc" onSort={vi.fn()} />);
    expect(screen.getByText("Value").closest("th")).toHaveAttribute("aria-sort", "none");
  });

  it("applies text-center class for align=center", () => {
    const cols = [{ key: "name", header: "Name", render: (r: Row) => r.name, align: "center" as const }];
    render(<Table<Row> columns={cols} data={data} rowKey={r => r.id} />);
    expect(screen.getByText("A").closest("td")).toHaveClass("text-center");
  });

  // Kills: column width style
  it("applies width style when column has width", () => {
    const cols = [{ key: "name", header: "Name", render: (r: Row) => r.name, width: "200px" }];
    render(<Table<Row> columns={cols} data={data} rowKey={r => r.id} />);
    const th = screen.getByText("Name").closest("th");
    expect(th).toHaveStyle({ width: "200px" });
  });

  // Kills: default sortDir=asc + desc aria-sort on the active header
  it("defaults to ascending indicator when sortDir omitted", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} sortBy="value" onSort={vi.fn()} />);
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("exposes descending aria-sort on the active sortable header", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} sortBy="value" sortDir="desc" onSort={vi.fn()} />);
    expect(screen.getByText("Value").closest("th")).toHaveAttribute("aria-sort", "descending");
  });

  // Kills: header-cell alignment + exact default header styling
  it("applies text-right class to the header cell for align=right", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} />);
    expect(screen.getByText("Value").closest("th")).toHaveClass("text-right");
  });

  it("applies text-center class to the header cell for align=center", () => {
    const cols = [{ key: "name", header: "Name", render: (r: Row) => r.name, align: "center" as const }];
    render(<Table<Row> columns={cols} data={data} rowKey={r => r.id} />);
    expect(screen.getByText("Name").closest("th")).toHaveClass("text-center");
  });

  it("keeps the default header cell padding classes", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} />);
    const th = screen.getByText("Name").closest("th")!;
    expect(th).toHaveClass("px-4");
    expect(th).toHaveClass("py-3");
  });

  // Kills: sort indicator must be absent without an active sort
  it("shows no sort indicator when sortBy is absent", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onSort={vi.fn()} />);
    expect(screen.queryByText("↑")).toBeNull();
    expect(screen.queryByText("↓")).toBeNull();
  });

  // Kills: row affordance classes with/without onRowClick
  it("applies cursor-pointer class to rows when onRowClick provided", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onRowClick={vi.fn()} />);
    expect(screen.getByText("A").closest("tr")).toHaveClass("cursor-pointer");
  });

  it("leaves rows class-free without onRowClick", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} />);
    expect(screen.getByText("A").closest("tr")?.getAttribute("class")).toBe("");
  });

  // Kills: row keyboard guard (Enter/Space only) + preventDefault
  it("ignores non-Enter/Space keys on rows", () => {
    const onRowClick = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onRowClick={onRowClick} />);
    fireEvent.keyDown(screen.getByText("A").closest("tr")!, { key: "Tab" });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("Enter on a row prevents default and triggers onRowClick", () => {
    const onRowClick = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} onRowClick={onRowClick} />);
    const row = screen.getByText("A").closest("tr")!;
    expect(fireEvent.keyDown(row, { key: "Enter" })).toBe(false);
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  // Kills: default body-cell padding
  it("keeps the default body cell padding classes", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} />);
    const td = screen.getByText("A").closest("td")!;
    expect(td).toHaveClass("px-4");
    expect(td).toHaveClass("py-3");
  });

  // Kills: pagination boundaries (equal-size hides, page-2 range, Next advances)
  it("hides pagination when total equals pageSize", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={10} pageSize={10} />);
    expect(screen.queryByRole("button", { name: "Prev" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("shows the correct range on page 2", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={50} page={2} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByText("Showing 11–20 of 50")).toBeInTheDocument();
  });

  it("onPageChange called with page+1 for Next", () => {
    const onPageChange = vi.fn();
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={50} page={1} pageSize={10} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  // Kills: totalPages calculation
  it("calculates totalPages correctly", () => {
    render(<Table<Row> columns={columns} data={data} rowKey={r => r.id} total={25} pageSize={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled(); // page 1 of 3
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled(); // page 2 of 3
  });
});