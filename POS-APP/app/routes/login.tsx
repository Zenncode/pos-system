import { useEffect, useState } from "react";
import type { FormEvent, JSX } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "~/shared/hooks/useAuth";
import { Button } from "~/shared/components/ui/Button";
import { Input } from "~/shared/components/ui/Input";
import { ApiError } from "~/lib/httpClient";

export function meta(): { title: string }[] {
  return [{ title: "Point of Sale — Sign In" }];
}

const GENERIC_SIGNIN_ERROR = "Sign in failed. Check your email and password.";
const NEXT = "/register";
const SAFE = new Set(["NETWORK_OFFLINE", "API_UNREACHABLE", "TOO_MANY_REQUESTS", "UNAUTHENTICATED"]);

interface FeatureSlide {
  tag: string;
  badge: string;
  title: string;
  description: string;
}

const SLIDES: FeatureSlide[] = [
  {
    tag: "TERMINAL SPEED",
    badge: "0.2s Ring-Up",
    title: "High-Velocity Register",
    description: "Lightning-fast barcode lookup, quick tender keypad, and keyboard shortcuts designed for busy rush hours.",
  },
  {
    tag: "FAULT TOLERANCE",
    badge: "100% Uptime",
    title: "Offline-First Resilience",
    description: "Keep ringing up sales even during internet outages with local transaction cache and automated sync.",
  },
  {
    tag: "LIVE INVENTORY",
    badge: "Realtime Alerts",
    title: "Automated Stock Tracking",
    description: "Guarded inventory decrements, low-stock threshold triggers, and full audited movement ledger.",
  },
];

export default function Login(): JSX.Element | null {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const clean = email.trim();

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
    return () => window.clearInterval(id);
  }, [paused]);

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[940px] overflow-hidden rounded-2xl border border-slate-800 bg-white shadow-2xl md:grid md:grid-cols-12">
        {/* Left Side: Login Form */}
        <div className="flex flex-col justify-between p-8 sm:p-10 md:col-span-7 bg-white">
          <div>
            {/* Brand Header */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">Point of Sale</h1>
                <p className="text-xs font-medium text-emerald-600">Enterprise Terminal</p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Staff Sign In</h2>
              <p className="mt-1.5 text-xs text-slate-500">
                Enter your staff credentials to open or unlock this register terminal.
              </p>
            </div>

            {/* One-Click Demo Credentials Preset */}
            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Quick Demo Accounts
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">1-Click Fill</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => quickFill("cashier01@example.com", "Cashier1234!")}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs ring-1 ring-slate-200/80 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  Cashier 01
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("manager01@example.com", "Manager1234!")}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs ring-1 ring-slate-200/80 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  Manager
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("admin@example.com", "Admin1234!")}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs ring-1 ring-slate-200/80 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  Administrator
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={(e) => void onSubmit(e)} noValidate className="mt-5 space-y-4">
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
                placeholder="••••••••"
                error={error && !serverUnreachable && clean.includes("@") ? error : undefined}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
                  <input type="checkbox" className="size-4 rounded border-slate-300 text-emerald-600 accent-emerald-600" />
                  <span>Remember this device</span>
                </label>
                <button
                  type="button"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                  onClick={() => setError("Ask an administrator to reset it.")}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Status Alert */}
              {error && serverUnreachable && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" role="alert">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>API Server Unreachable</span>
                  </div>
                  <p className="mt-1 text-amber-700">{error}</p>
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all font-semibold"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </div>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Forgot your password? Ask an administrator to reset it.
          </p>
        </div>

        {/* Right Side: Hero Brand Showcase */}
        <div
          className="hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 text-white md:col-span-5 md:flex border-l border-slate-800/80"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* Top terminal badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Terminal Ready
            </span>
            <span className="font-mono text-[11px] text-slate-400">REG-01</span>
          </div>

          {/* Realistic Terminal Preview Card */}
          <div className="my-8 rounded-xl border border-slate-700/60 bg-slate-800/60 p-5 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <span className="text-xs font-semibold text-slate-300">Live Register Demo</span>
              <span className="text-xs font-mono font-bold text-emerald-400">₱48,250.00</span>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Transactions Today</span>
                <span className="font-semibold text-slate-200">142</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Average Ticket</span>
                <span className="font-semibold text-slate-200">₱339.80</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Drawer Status</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-400" /> Balanced
                </span>
              </div>
            </div>
          </div>

          {/* Carousel Feature Slide */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {SLIDES[slide].tag}
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                {SLIDES[slide].badge}
              </span>
            </div>
            <h3 className="text-base font-bold text-white transition-all">
              {SLIDES[slide].title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400 transition-all">
              {SLIDES[slide].description}
            </p>

            {/* Slide Indicators */}
            <div className="mt-4 flex gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    slide === i ? "w-6 bg-emerald-400" : "w-2 bg-slate-700 hover:bg-slate-600"
                  }`}
                  aria-label={`Show slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
