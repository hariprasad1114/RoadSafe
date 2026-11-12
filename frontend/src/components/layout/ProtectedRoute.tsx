import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/brand/Logo";
import { Spinner } from "@/components/ui/Feedback";
import { Link } from "react-router-dom";

export function FullPageLoading({ label = "Checking your session" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <Logo />
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (profile?.role !== "admin") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-slate-950">
          Admin access required
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Your account is signed in as{" "}
          <span className="font-semibold text-slate-900">
            {profile?.role || "analyst"}
          </span>
          . Dataset uploads and import controls are restricted to administrators.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/app"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
          <Link
            to="/app/profile"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-ink-100 px-3 text-xs font-semibold text-ink-900 transition hover:bg-ink-200"
          >
            View profile
          </Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
