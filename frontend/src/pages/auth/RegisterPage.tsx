import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Chrome,
  Github,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { FullPageLoading } from "@/components/layout/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { FormField, Input, PasswordInput } from "@/components/ui/Field";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { isInsForgeConfigured } from "@/lib/insforge";

type Step = "form" | "code" | "link";

export function RegisterPage() {
  useDocumentTitle("Create account");
  const { user, loading, signUp, signInWithOAuth, verifyEmail, resendVerification } =
    useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) return <FullPageLoading />;
  if (user) return <Navigate to="/app" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signUp(name.trim(), email.trim(), password);
      if (!result.requiresVerification) {
        toast({ title: "Account created", description: "You are now signed in." });
        navigate("/app", { replace: true });
        return;
      }
      if (result.verifyMethod === "link") {
        setStep("link");
      } else {
        setStep("code");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Account creation failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyEmail(email.trim(), otp.trim());
      toast({ title: "Email verified", description: "Your account is ready." });
      navigate("/app", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Verification failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await resendVerification(email.trim());
      setNotice("A new verification message has been sent.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not resend the email.",
      );
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

  if (step === "code" || step === "link") {
    return (
      <AuthLayout
        title={step === "code" ? "Verify your email" : "Check your inbox"}
        subtitle={
          step === "code"
            ? `Enter the 6-digit code sent to ${email}.`
            : `We sent a verification link to ${email}. Open it, then sign in.`
        }
        footer={
          <>
            Already verified?{" "}
            <Link to="/login" className="font-semibold text-ink-700 hover:text-ink-900">
              Sign in
            </Link>
          </>
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MailCheck className="h-5 w-5" />
          </div>
          {step === "code" ? (
            <form onSubmit={handleVerify} className="mt-4 space-y-4">
              <FormField label="Verification code" htmlFor="otp" required>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="text-center font-mono text-lg tracking-[0.4em]"
                  required
                />
              </FormField>
              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
              {notice ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                  {notice}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                loading={submitting}
                disabled={otp.length !== 6}
              >
                Verify email
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleResend}
              >
                Resend code
              </Button>
            </form>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                The link expires shortly for security. If it does not arrive,
                check your spam folder or request a new one.
              </p>
              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
              {notice ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                  {notice}
                </p>
              ) : null}
              <Button type="button" variant="outline" className="w-full" onClick={handleResend}>
                Resend verification email
              </Button>
              <Button
                type="button"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Go to sign in
              </Button>
            </div>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Save assessments, review prediction history and collaborate on road safety priorities."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-ink-700 hover:text-ink-900">
            Sign in
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
        <FormField label="Full name" htmlFor="name" required>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Alex Morgan"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </FormField>

        <FormField label="Work email" htmlFor="email" required>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Password"
            htmlFor="password"
            required
            hint="At least 8 characters"
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Confirm password" htmlFor="confirm-password" required>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </FormField>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" className="w-full" loading={submitting} size="lg">
          Create account
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          Accounts are created in InsForge Auth. New users receive the analyst
          role by default; administrators can be promoted in the backend.
        </p>
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
    </AuthLayout>
  );
}
