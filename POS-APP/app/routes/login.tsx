import { useEffect, useState } from "react";
import type { FormEvent, JSX } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "~/shared/hooks/useAuth";
import { Button } from "~/shared/components/ui/Button";
import { Input } from "~/shared/components/ui/Input";
import { ApiError, getApiBase } from "~/lib/httpClient";
import { checkHealth } from "~/lib/api";

export function meta(): { title: string }[] {
  return [{ title: "Point of Sale — Sign In" }];
}

const GENERIC_SIGNIN_ERROR = "Sign in failed. Check your email and password.";
const NEXT = "/register";
const SAFE = new Set(["NETWORK_OFFLINE", "API_UNREACHABLE", "TOO_MANY_REQUESTS", "UNAUTHENTICATED"]);

type ApiState = "checking" | "live" | "offline";

function useApiReachability(): { state: ApiState; base: string } {
  const [state, setState] = useState<ApiState>("checking");
  const base = getApiBase() || "same origin";
  useEffect(() => {
    let alive = true;
    void checkHealth().then((h) => {
      if (alive) setState(h.ok ? "live" : "offline");
    });
    return () => {
      alive = false;
    };
  }, []);
  return { state, base };
}

export default function Login(): JSX.Element | null {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [busy, setBusy] = useState(false);
  const clean = email.trim();
  const { state: apiState, base: apiBase } = useApiReachability();
  const terminalId = typeof window !== "undefined" && window.location.host ? window.location.host : "local terminal";
  const build = import.meta.env.MODE ?? "production";

  if (loading) return null;
  if (user) return <Navigate to={NEXT} replace />;

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (busy) return;
    setError("");
    setServerUnreachable(false);
    if (!clean.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      await signIn(clean, password);
      navigate(NEXT, { replace: true });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setServerUnreachable(code === "API_UNREACHABLE" || code === "NETWORK_OFFLINE");
      setError(err instanceof ApiError && SAFE.has(err.code) ? err.message : GENERIC_SIGNIN_ERROR);
    } finally {
      setBusy(false);
    }
  }

  function quickFill(presetEmail: string, presetPass: string): void {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-neutral-950)] p-4 sm:p-6">
      <div className="w-full max-w-[880px] overflow-hidden rounded-xl border border-[var(--color-neutral-800)] bg-[var(--color-bg)] md:grid md:grid-cols-12">
        {/* Left: sign-in form */}
        <div className="flex flex-col justify-between p-6 sm:p-8 md:col-span-7 bg-[var(--color-bg)]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-[var(--color-primary)] text-white">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-[var(--color-text)]">Point of Sale</h1>
                <p className="text-xs font-medium text-[var(--color-text-muted)]">Register terminal</p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-bold tracking-tight text-[var(--color-text)]">Sign in</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Use staff email and password. Sales stay blocked until sign-in.
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Demo accounts
                </span>
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Select to fill</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => quickFill("cashier01@example.com", "Cashier1234!")}
                  className="rounded-md bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  Cashier 01
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("manager01@example.com", "Manager1234!")}
                  className="rounded-md bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  Manager
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("admin@example.com", "Admin1234!")}
                  className="rounded-md bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  Administrator
                </button>
              </div>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} noValidate className="mt-4 space-y-4">
              <Input
                label="Email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                placeholder="name@store.com"
                error={error && !serverUnreachable && !clean.includes("@") ? error : undefined}
              />
              <Input
                label="Password"
                type="password"
                passwordToggle
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                error={error && !serverUnreachable && clean.includes("@") ? error : undefined}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[var(--color-text-muted)]">
                  <input type="checkbox" className="size-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]" />
                  <span>Remember this device</span>
                </label>
                <button
                  type="button"
                  className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                  onClick={() => setError("Ask an administrator to reset it.")}
                >
                  Forgot password?
                </button>
              </div>

              {error && serverUnreachable && (
                <div className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-text)]" role="alert">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="size-2 rounded-full bg-[var(--color-warning)]" />
                    <span>API unreachable</span>
                  </div>
                  <p className="mt-1 text-[var(--color-text-muted)]">{error}</p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  full
                  type="submit"
                  disabled={busy}
                  loading={busy}
                >
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </div>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
            Forgot your password? Ask an administrator to reset it.
          </p>
        </div>

        {/* Right: terminal status */}
        <div className="hidden flex-col justify-between border-t border-[var(--color-neutral-800)] bg-[var(--color-neutral-900)] p-6 text-white md:col-span-5 md:flex">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-inset ring-[var(--color-neutral-700)]">
              <span className={`size-1.5 rounded-full ${apiState === "live" ? "bg-[var(--color-success)]" : apiState === "offline" ? "bg-[var(--color-warning)]" : "bg-[var(--color-neutral-400)] animate-pulse"}`} />
              {apiState === "live" ? "API live" : apiState === "offline" ? "API offline" : "Checking API"}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-[var(--color-neutral-400)]">Terminal</span>
          </div>

          <dl className="my-6 space-y-0 rounded-lg border border-[var(--color-neutral-800)] text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-neutral-800)] px-3 py-2.5">
              <dt className="text-[var(--color-neutral-400)]">Terminal</dt>
              <dd className="max-w-[60%] truncate font-mono tabular-nums text-white">{terminalId}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--color-neutral-800)] px-3 py-2.5">
              <dt className="text-[var(--color-neutral-400)]">Build</dt>
              <dd className="font-mono text-white">{build}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--color-neutral-800)] px-3 py-2.5">
              <dt className="text-[var(--color-neutral-400)]">API</dt>
              <dd className="max-w-[60%] truncate font-mono text-white">{apiBase}</dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <dt className="text-[var(--color-neutral-400)]">Shift</dt>
              <dd className="text-white">Sign in to view</dd>
            </div>
          </dl>

          <div>
            <p className="text-xs font-semibold text-white">Before you sell</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[var(--color-neutral-400)]">
              <li className="flex gap-2"><span aria-hidden="true">1.</span>Sign in with staff email.</li>
              <li className="flex gap-2"><span aria-hidden="true">2.</span>Open shift and count the float.</li>
              <li className="flex gap-2"><span aria-hidden="true">3.</span>Scan or search, then charge (F8).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
