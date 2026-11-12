import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Chrome, Github, Sparkles } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { FullPageLoading } from "@/components/layout/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { FormField, Input, PasswordInput } from "@/components/ui/Field";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { isInsForgeConfigured } from "@/lib/insforge";

export function LoginPage() {
  useDocumentTitle("Sign in");
  const { user, loading, signIn, signInWithOAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const from = state?.from || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <FullPageLoading />;
  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      toast({ title: "Welcome back", description: "Your session is ready." });
      navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAuth(provider: string) {
    setError(null);
    setOauthProvider(provider);
    try {
      await signInWithOAuth(provider);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "OAuth sign in could not be started.",
      );
      setOauthProvider(null);
    }
  }

  function useDemo(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to save prediction history, access analysis and manage datasets."
      footer={
        <>
          New to RoadSafe AI?{" "}
          <Link to="/register" className="font-semibold text-ink-700 hover:text-ink-900">
            Create an account
          </Link>
        </>
      }
    >
      {!isInsForgeConfigured ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          InsForge environment variables are missing. Check{" "}
          <code className="font-mono">frontend/.env.local</code>.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email address" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@organisation.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FormField>

        <FormField label="Password" htmlFor="password" required>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </FormField>

        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-ink-600 hover:text-ink-900"
          >
            Forgot password?
          </Link>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" className="w-full" loading={submitting} size="lg">
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          or continue with
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("google")}
          loading={oauthProvider === "google"}
          disabled={Boolean(oauthProvider)}
        >
          <Chrome className="h-4 w-4" />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("github")}
          loading={oauthProvider === "github"}
          disabled={Boolean(oauthProvider)}
        >
          <Github className="h-4 w-4" />
          GitHub
        </Button>
      </div>

      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-signal-500" />
          <p className="text-xs font-semibold text-slate-800">Demo accounts</p>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          One click to fill the form. Both accounts use the same demo password.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => useDemo(account.email, account.password)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-ink-300 hover:shadow-sm"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-600">
                {account.role}
              </span>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-700">
                {account.email}
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                {account.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
