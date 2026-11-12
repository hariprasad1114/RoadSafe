import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Database,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  LockKeyhole,
  LogOut,
  MapPinned,
  Menu,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useApi } from "@/hooks/useApi";
import { cn, getInitials } from "@/lib/utils";
import {
  DATASET_LABEL,
  DATASET_ROWS,
  MODEL_VERSION,
} from "@/lib/constants";

interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  protected?: boolean;
  admin?: boolean;
  end?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: "Intelligence",
    items: [
      {
        label: "Dashboard",
        to: "/app",
        icon: LayoutDashboard,
        protected: true,
        end: true,
      },
      { label: "Predict severity", to: "/app/predict", icon: Sparkles },
      { label: "Hotspots", to: "/app/hotspots", icon: MapPinned },
      {
        label: "Analysis",
        to: "/app/analysis",
        icon: Gauge,
        protected: true,
      },
      {
        label: "Recommendations",
        to: "/app/recommendations",
        icon: Lightbulb,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Dataset control",
        to: "/app/dataset",
        icon: Database,
        admin: true,
      },
      {
        label: "Profile",
        to: "/app/profile",
        icon: UserRound,
        protected: true,
      },
    ],
  },
];

const allItems = sections.flatMap((section) => section.items);

function navItemLocked(
  item: NavItem,
  signedIn: boolean,
  isAdmin: boolean,
): boolean {
  if (item.admin) return !signedIn || !isAdmin;
  if (item.protected) return !signedIn;
  return false;
}

function HealthBadge() {
  const { data, loading, error } = useApi<{
    status: string;
    model_loaded: boolean;
    data_source: string;
  }>("/health");

  const online = !loading && !error && data?.status === "ok";
  return (
    <Badge
      tone={online ? "emerald" : loading ? "slate" : "amber"}
      dot
      className="hidden sm:inline-flex"
      title={
        online
          ? `API live · data source ${data?.data_source || "unknown"}`
          : error || "Connecting to the RoadSafe API"
      }
    >
      {online ? "API live" : loading ? "Connecting" : "API offline"}
    </Badge>
  );
}

function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className="inline-flex h-9 items-center rounded-xl bg-ink-950 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-900"
        >
          Create account
        </Link>
      </div>
    );
  }

  const name = profile?.full_name || user.email || "RoadSafe user";

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      setOpen(false);
      toast({ title: "Signed out", description: "Your session has ended." });
      navigate("/");
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not sign out",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition hover:border-slate-300"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-950 text-[11px] font-bold text-white">
          {getInitials(profile?.full_name, user.email)}
        </span>
        <span className="hidden max-w-32 truncate text-xs font-semibold text-slate-700 sm:block">
          {name}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift animate-fade-up"
          role="menu"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Badge
                tone={profile?.role === "admin" ? "signal" : "sky"}
                className="capitalize"
              >
                {profile?.role || "analyst"}
              </Badge>
              {profile?.organisation ? (
                <span className="truncate text-[11px] text-slate-400">
                  {profile.organisation}
                </span>
              ) : null}
            </div>
          </div>
          <div className="p-1.5">
            <Link
              to="/app/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              role="menuitem"
            >
              <UserRound className="h-4 w-4 text-slate-400" />
              Profile and history
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();
  const signedIn = Boolean(user);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo to={signedIn ? "/app" : "/"} theme="dark" />
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[11px] font-medium text-slate-300">
          Live road safety intelligence
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {section.label}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const locked = navItemLocked(item, signedIn, isAdmin);
                const isCurrent =
                  location.pathname === item.to ||
                  (item.to !== "/app" && location.pathname.startsWith(`${item.to}/`));
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      isCurrent
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition",
                        isCurrent
                          ? "text-signal-400"
                          : "text-slate-500 group-hover:text-slate-300",
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {locked ? (
                      <LockKeyhole className="h-3.5 w-3.5 text-slate-600" />
                    ) : null}
                    {item.admin && isAdmin ? (
                      <span className="rounded-md bg-signal-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-signal-400">
                        Admin
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Platform
          </p>
          <BadgeCheck className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="mt-2 text-xs font-semibold text-white">
          Model {MODEL_VERSION}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          {DATASET_LABEL} · {DATASET_ROWS.toLocaleString("en-GB")} records
        </p>
        <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-medium text-slate-400">
            InsForge Postgres · live
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const current =
    allItems.find(
      (item) =>
        location.pathname === item.to ||
        (item.to !== "/app" && location.pathname.startsWith(`${item.to}/`)),
    ) || allItems[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col overflow-hidden bg-ink-950 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,127,17,0.14),transparent_45%),radial-gradient(circle_at_120%_80%,rgba(70,118,169,0.16),transparent_45%)]" />
        <div className="relative flex h-full flex-col">
          <SidebarContent />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="relative z-10 h-full w-72 overflow-hidden bg-ink-950 shadow-lift animate-fade-up">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,127,17,0.14),transparent_45%)]" />
            <div className="relative h-full">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Workspace
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {current?.label || "RoadSafe AI"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <HealthBadge />
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
          <footer className="mt-12 flex flex-col gap-1.5 border-t border-slate-200 pt-5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 RoadSafe AI · Decision support, not a substitute for engineering judgement.</p>
            <p>
              UK DfT 2022 collision data · OGL v3.0 · Built on InsForge
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
