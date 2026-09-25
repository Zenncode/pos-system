import type { JSX } from "react";
import { Badge } from "./Badge";
import { formatCents } from "~/lib/format";
import type { Product } from "~/types";

interface Props {
  product: Product;
  onAdd: (p: Product) => void;
}

export function ProductTile({ product, onAdd }: Props): JSX.Element {
  const low = product.stock <= product.lowStockThreshold;
  const out = product.stock <= 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={out}
      title={out ? `${product.name} — out of stock` : `Add ${product.name} to cart`}
      className="pos-tile group relative flex h-full min-h-[120px] flex-col justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-left hover:border-[var(--color-primary)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-focus)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div>
        <p className="truncate text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-text)] transition-colors">
          {product.name}
        </p>
        <p className="mt-0.5 text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
          {product.sku}
        </p>
      </div>

      <div className="mt-3 flex items-end justify-between pt-2 border-t border-[var(--color-border-subtle)]">
        <span className="money text-base font-bold tabular-nums text-[var(--color-primary)]">
          {formatCents(product.priceCents)}
        </span>
        {out ? (
          <Badge tone="LOW">Out</Badge>
        ) : low ? (
          <Badge tone="LOW">{product.stock} left</Badge>
        ) : (
          <span className="rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-xs font-medium tabular-nums text-[var(--color-text-muted)] ring-1 ring-inset ring-[var(--color-border)]">
            ×{product.stock}
          </span>
        )}
      </div>
    </button>
  );
}