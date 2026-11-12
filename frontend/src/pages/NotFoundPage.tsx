import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-5 text-center">
      <Logo />
      <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-ink-500 shadow-card">
        <Compass className="h-8 w-8" />
      </div>
      <p className="mt-5 font-display text-5xl font-bold tracking-tight text-slate-950">
        404
      </p>
      <h1 className="mt-2 text-lg font-semibold text-slate-900">
        This road leads nowhere
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        The page you are looking for does not exist or has moved. Head back to the
        workspace to continue.
      </p>
      <Link to="/app" className="mt-6">
        <Button>
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Button>
      </Link>
    </div>
  );
}
