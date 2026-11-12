import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  to?: string;
  theme?: "light" | "dark";
  compact?: boolean;
  className?: string;
}

export function Logo({
  to = "/",
  theme = "light",
  compact = false,
  className,
}: LogoProps) {
  return (
    <Link
      to={to}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="RoadSafe AI home"
    >
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-signal-400 to-signal-600 shadow-sm transition group-hover:scale-105">
        <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.2} />
      </span>
      {!compact ? (
        <span className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-display text-lg font-bold tracking-tight",
              theme === "dark" ? "text-white" : "text-slate-950",
            )}
          >
            RoadSafe
          </span>
          <span className="rounded-md bg-signal-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-signal-600">
            AI
          </span>
        </span>
      ) : null}
    </Link>
  );
}
