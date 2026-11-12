import { useRef, useState } from "react";
import {
  AlertTriangle,
  Database,
  Download,
  FileCheck2,
  FileText,
  Upload,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useApi } from "@/hooks/useApi";
import type {
  DatasetReport,
  DatasetUpload,
  DatasetUploadListResponse,
  DatasetValidationResponse,
} from "@/types";
import { api, errorMessage } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export function DatasetPage() {
  useDocumentTitle("Dataset control");
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validation, setValidation] = useState<DatasetValidationResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const uploads = useApi<DatasetUploadListResponse>("/api/v1/dataset/uploads");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setValidation(null);
    setValidationError(null);
  }

  async function handleValidate() {
    if (!selectedFile) return;
    setValidationError(null);
    setValidating(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await api.upload<DatasetValidationResponse>(
        "/api/v1/dataset/validate",
        formData,
        { auth: true },
      );
      setValidation(response);
      toast({
        title: "Validation complete",
        description: `${formatNumber(response.report.valid_rows)} valid rows found.`,
      });
    } catch (caught) {
      setValidationError(errorMessage(caught));
    } finally {
      setValidating(false);
    }
  }

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await api.upload<any>(
        "/api/v1/dataset/import",
        formData,
        { auth: true },
      );
      toast({
        title: "Import queued",
        description: `Upload ${response.upload_id} is processing in the background.`,
      });
      setValidation(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      uploads.refetch();
    } catch (caught) {
      toast({
        variant: "error",
        title: "Import failed",
        description: errorMessage(caught),
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleTemplate() {
    try {
      const blob = await api.download("/api/v1/dataset/template", undefined, {
        auth: true,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "roadsafe-dataset-template.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      toast({
        variant: "error",
        title: "Template download failed",
        description: errorMessage(caught),
      });
    }
  }

  async function handleExport() {
    try {
      const blob = await api.download("/api/v1/dataset/export", undefined, {
        auth: true,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `roadsafe-export-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      toast({
        variant: "error",
        title: "Export failed",
        description: errorMessage(caught),
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Dataset control"
        description="Validate, import and export RoadSafe accident records. All write operations are restricted to administrators."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTemplate}>
              <FileText className="h-3.5 w-3.5" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader
            title="Upload and validate"
            description="Drop a CSV with the RoadSafe schema. Validation runs locally before any data is written."
            icon={
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-50 text-signal-600">
                <Upload className="h-4 w-4" />
              </div>
            }
          />
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center transition hover:border-ink-300 hover:bg-slate-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ink-500 shadow-sm">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedFile ? selectedFile.name : "Choose a CSV file"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {selectedFile
                    ? `${formatNumber(selectedFile.size)} bytes`
                    : "or drag and drop. Maximum 30 MB."}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                Browse files
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleValidate}
                loading={validating}
                disabled={!selectedFile}
              >
                <FileCheck2 className="h-4 w-4" />
                Validate
              </Button>
              <Button
                variant="signal"
                onClick={handleImport}
                loading={importing}
                disabled={!selectedFile || !validation?.can_import}
              >
                <Upload className="h-4 w-4" />
                Import to InsForge
              </Button>
              {validation ? (
                <Badge tone="emerald" variant="soft">
                  {formatNumber(validation.report.valid_rows)} valid rows
                </Badge>
              ) : null}
            </div>

            {validationError ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Upload history"
            description="Recent dataset uploads and their import status."
          />
          <CardContent>
            {uploads.loading ? (
              <LoadingState label="Loading uploads" />
            ) : uploads.error ? (
              <ErrorState message={uploads.error} onRetry={uploads.refetch} />
            ) : (uploads.data?.uploads || []).length === 0 ? (
              <p className="text-xs leading-relaxed text-slate-500">
                No uploads yet. Validate and import a CSV to create the first
                record.
              </p>
            ) : (
              <div className="space-y-3">
                {(uploads.data?.uploads || []).map((upload) => (
                  <UploadRow key={upload.id} upload={upload} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {validation ? (
        <Card>
          <CardHeader
            title="Validation report"
            description={validation.report.file_name}
          />
          <CardContent>
            <ValidationReport report={validation.report} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function UploadRow({ upload }: { upload: DatasetUpload }) {
  const statusTone =
    upload.status === "imported"
      ? "emerald"
      : upload.status === "failed"
        ? "rose"
        : upload.status === "validating"
          ? "amber"
          : "sky";

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900">
            {upload.file_name}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatNumber(upload.valid_rows)} valid · {formatNumber(upload.invalid_rows)} invalid ·{" "}
            {formatNumber(upload.row_count)} total
          </p>
        </div>
        <Badge tone={statusTone as any} variant="soft" className="capitalize">
          {upload.status}
        </Badge>
      </div>
      {upload.error_message ? (
        <p className="mt-2 text-[11px] leading-relaxed text-rose-600">
          {upload.error_message}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] text-slate-400">
        {new Date(upload.created_at).toLocaleString("en-GB")}
      </p>
    </div>
  );
}

function ValidationReport({ report }: { report: DatasetReport }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Rows", formatNumber(report.row_count)],
            ["Valid", formatNumber(report.valid_rows)],
            ["Invalid", formatNumber(report.invalid_rows)],
            ["Duplicates", formatNumber(report.duplicate_rows)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Severity counts
          </p>
          <div className="mt-2 space-y-1.5 text-xs">
            {Object.entries(report.severity_counts || {}).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-medium text-slate-600">{label}</span>
                <span className="font-semibold text-slate-900">
                  {formatNumber(count)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Date range
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-900">
            {report.date_range.start || "—"} → {report.date_range.end || "—"}
          </p>
        </div>
        {Object.keys(report.invalid_reasons || {}).length ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-600">
              Invalid reasons
            </p>
            <div className="mt-2 space-y-1.5 text-xs">
              {Object.entries(report.invalid_reasons).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="font-medium text-rose-700">{reason}</span>
                  <span className="font-semibold text-rose-700">
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Preview (first 5 valid rows)
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-400">
                  {Object.keys(report.preview?.[0] || {}).slice(0, 6).map((column) => (
                    <th key={column} className="py-1 pr-2 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(report.preview || []).map((row, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    {Object.keys(row).slice(0, 6).map((column) => (
                      <td key={column} className="py-1 pr-2 text-slate-700">
                        {String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {report.extra_columns?.length ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">
              Extra columns (ignored)
            </p>
            <p className="mt-1 text-xs text-amber-700">
              {report.extra_columns.join(", ")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
