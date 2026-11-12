import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, KeyRound, Mail } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { FullPageLoading } from "@/components/layout/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { FormField, Input, PasswordInput } from "@/components/ui/Field";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type Step = "email" | "reset";

export function ForgotPasswordPage() {
  useDocumentTitle("Reset password");
  const {
    user,
    loading,
    sendResetEmail,
    exchangeResetCode,
    resetPassword,
  } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <FullPageLoading />;
  if (user) return <Navigate to="/app" replace />;

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendResetEmail(email.trim());
      setStep("reset");
      toast({
        title: "Reset request sent",
        description: "If email delivery is enabled, a code is on its way.",
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not send the reset email.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
      const token = await exchangeResetCode(email.trim(), code.trim());
      await resetPassword(password, token);
      toast({
        title: "Password updated",
        description: "Sign in with your new password.",
      });
      navigate("/login", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not reset the password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={step === "email" ? "Reset your password" : "Choose a new password"}
      subtitle={
        step === "email"
          ? "Enter the email address on your account and we will send a reset code."
          : `Enter the code sent to ${email}, then choose a new password.`
      }
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-ink-700 hover:text-ink-900">
            Back to sign in
          </Link>
        </>
      }
    >
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
        Demo environment: outbound email delivery is disabled. Password reset codes
        cannot be delivered here. Use a demo account or ask an administrator to
        reset the password in InsForge.
      </div>

      {step === "email" ? (
        <form onSubmit={handleSend} className="space-y-4">
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

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button type="submit" className="w-full" loading={submitting} size="lg">
            <Mail className="h-4 w-4" />
            Send reset code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <FormField label="Reset code" htmlFor="code" required>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="text-center font-mono tracking-[0.3em]"
              required
            />
          </FormField>

          <FormField
            label="New password"
            htmlFor="password"
            required
            hint="At least 8 characters"
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </FormField>

          <FormField label="Confirm password" htmlFor="confirm-password" required>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </FormField>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button type="submit" className="w-full" loading={submitting} size="lg">
            <KeyRound className="h-4 w-4" />
            Update password
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
