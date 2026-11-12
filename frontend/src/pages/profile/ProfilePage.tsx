import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useApi } from "@/hooks/useApi";
import type {
  PredictionHistoryRecord,
  PredictionHistoryResponse,
  Profile,
} from "@/types";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatPercent, getInitials } from "@/lib/utils";

export function ProfilePage() {
  useDocumentTitle("Profile");
  const { user, profile, isAdmin, updateProfile, signOut } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [organisation, setOrganisation] = useState(profile?.organisation || "");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setOrganisation(profile?.organisation || "");
  }, [profile]);

  const history = useApi<PredictionHistoryResponse>(
    user ? "/api/v1/predict/history?limit=25" : null,
    { enabled: Boolean(user) },
  );

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim() || undefined,
        organisation: organisation.trim() || undefined,
      });
      toast({ title: "Profile updated", description: "Your details are saved." });
    } catch (caught) {
      toast({
        variant: "error",
        title: "Could not update profile",
        description: errorMessage(caught),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      toast({ title: "Signed out", description: "Your session has ended." });
    } catch (caught) {
      toast({
        variant: "error",
        title: "Could not sign out",
        description: errorMessage(caught),
      });
    } finally {
      setSigningOut(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <UserRound className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-slate-950">
          Sign in to view your profile
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Your prediction history and account details are available after sign in.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white transition hover:bg-ink-900"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const records = history.data?.predictions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile and history"
        description="Manage your account details and review saved predictions."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader
            title="Account details"
            description="Update your display name and organisation."
            icon={
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50 text-ink-600">
                <UserRound className="h-4 w-4" />
              </div>
            }
          />
          <CardContent>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-950 text-sm font-bold text-white">
                {getInitials(profile?.full_name, user.email)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {profile?.full_name || user.email}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-700">
                    {profile?.role || "analyst"}
                  </span>
                  {isAdmin ? (
                    <span className="rounded-full bg-signal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-signal-700">
                      Admin
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <FormField label="Full name" htmlFor="full-name">
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Alex Morgan"
                />
              </FormField>
              <FormField label="Organisation" htmlFor="organisation">
                <Input
                  id="organisation"
                  value={organisation}
                  onChange={(event) => setOrganisation(event.target.value)}
                  placeholder="Road safety team"
                />
              </FormField>
              <div className="flex items-center gap-2">
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                  loading={signingOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Prediction history"
            description="Your most recent saved predictions."
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => history.refetch()}
              >
                Refresh
              </Button>
            }
          />
          <CardContent>
            {history.loading ? (
              <LoadingState label="Loading history" />
            ) : history.error ? (
              <ErrorState message={history.error} onRetry={history.refetch} />
            ) : records.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                <Activity className="h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  No saved predictions yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Run a prediction while signed in and it will appear here.
                </p>
                <Link
                  to="/app/predict"
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-3 text-xs font-semibold text-white transition hover:bg-ink-900"
                >
                  Open predictor
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <HistoryRow key={record.id} record={record} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Security"
          description="Session and account security details."
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-semibold text-slate-900">
                  InsForge session
                </p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Your access token is held in memory and refreshed using the
                httpOnly refresh cookie.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-ink-600" />
                <p className="text-xs font-semibold text-slate-900">
                  Password
                </p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Use the forgot password flow to reset your password by email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryRow({ record }: { record: PredictionHistoryRecord }) {
  const severityTone =
    record.predicted_severity === "Fatal"
      ? "rose"
      : record.predicted_severity === "Serious"
        ? "amber"
        : "emerald";

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900">
            {record.input.road_type} · {record.input.weather} ·{" "}
            {record.input.vehicle_type}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatDateTime(record.created_at)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            severityTone === "rose"
              ? "bg-rose-50 text-rose-700"
              : severityTone === "amber"
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {record.predicted_severity}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span>
          Severe {formatPercent(record.probabilities.Serious + record.probabilities.Fatal)}
        </span>
        <span>Fatal {formatPercent(record.probabilities.Fatal)}</span>
        <span>Model {record.model_version}</span>
      </div>
    </div>
  );
}
