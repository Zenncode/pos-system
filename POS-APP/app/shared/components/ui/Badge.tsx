import type { JSX, ReactNode } from "react";
import type { OrderStatus } from "~/types";

// Minimal dot badges — status is carried by a small colored dot + label.
// No pill backgrounds or borders; text stays neutral so dense tables scan clean.
const dots: Record<string, string> = {
  PAID: "bg-[var(--color-primary)]",
  PENDING: "bg-[var(--color-warning)]",
  VOID: "bg-[var(--color-neutral-400)]",
  REFUNDED: "bg-[var(--color-neutral-500)]",
  LOW: "bg-[var(--color-danger)]",
  OK: "bg-[var(--color-primary)]",
  MUTED: "bg-[var(--color-neutral-400)]",
  CASH: "bg-[var(--color-primary)]",
  CARD: "bg-[var(--color-neutral-500)]",
  QR: "bg-[var(--color-neutral-500)]",
  WALLET: "bg-[var(--color-neutral-500)]",
};

export function Badge({ tone, children }: { tone: OrderStatus | string; children: ReactNode }): JSX.Element {
  const dot = dots[tone] ?? dots["MUTED"];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-[var(--color-text-muted)]">
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
