import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./app.css";
import { AuthProvider } from "./shared/hooks/useAuth";
import { ShiftProvider } from "./shared/hooks/useShift";
import { ToastProvider } from "./shared/hooks/useToast";
import { CartProvider } from "./shared/hooks/useCart";
import { Toaster } from "./shared/components/ui/Toaster";
import { startRealtime } from "./lib/socketClient";
import { useEffect } from "react";
import type { ReactNode } from "react";

export const links: () => { rel: string; href: string; crossOrigin?: string }[] = () => [];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. Bitdefender bis_*)
          inject attributes into <body>/divs before React hydrates. */}
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => {
    startRealtime();
  }, []);
  return (
    <AuthProvider>
      <ToastProvider>
        <ShiftProvider>
          <CartProvider>
            <Outlet />
          </CartProvider>
        </ShiftProvider>
        <Toaster />
      </ToastProvider>
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-16 text-center">
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">{message}</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{details}</p>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left">
          <code className="text-xs text-[var(--color-neutral-700)]">{stack}</code>
        </pre>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          Try again
        </button>
        <div className="flex gap-2">
          <a
            href="/"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
          >
            Go to home
          </a>
          <a
            href="/login"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
          >
            Go to sign-in
          </a>
        </div>
      </div>
    </main>
  );
}
