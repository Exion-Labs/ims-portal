"use client";

import React, { useState } from "react";
import {
  apiFetch,
  CommitResult,
  DryRunReport,
  ImportSessionView,
} from "@ims/api-client";
import { CheckCircle2, FileSpreadsheet, Upload, AlertTriangle } from "lucide-react";
import { StatusBadge } from "./primitives";
import { toast, toastApiError } from "./toast";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

export interface TargetFieldSpec {
  key: string;
  label: string;
  required?: boolean;
}

export function ImportWizard({
  targetType,
  targetFields,
  onComplete,
}: {
  targetType: string;
  targetFields: TargetFieldSpec[];
  onComplete?: (res: CommitResult) => void;
}) {
  const [step, setStep] = useState<"UPLOAD" | "MAP" | "DRY_RUN" | "DONE">("UPLOAD");
  const [session, setSession] = useState<ImportSessionView | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [report, setReport] = useState<DryRunReport | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("targetType", targetType);
      formData.append("file", file);

      const created = await apiFetch<ImportSessionView>("/api/v1/imports/sessions", {
        method: "POST",
        body: formData,
      });

      const autoMap: Record<string, string> = {};
      for (const tf of targetFields) {
        const match = created.detectedColumns.find(
          (col) =>
            col.toLowerCase() === tf.key.toLowerCase() ||
            col.toLowerCase() === tf.label.toLowerCase()
        );
        if (match) {
          autoMap[tf.key] = match;
        }
      }
      setSession(created);
      setMapping(autoMap);
      setStep("MAP");
      toast.success("File parsed", {
        description: `${created.totalRows} rows detected in ${created.fileName}`,
      });
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
      toastApiError(e, "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDryRun() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const requiredFields = targetFields.filter((f) => f.required).map((f) => f.key);
      const res = await apiFetch<DryRunReport>(
        `/api/v1/imports/sessions/${session.sessionId}/dry-run`,
        {
          method: "POST",
          body: JSON.stringify({ columnMapping: mapping, requiredFields }),
        }
      );
      setReport(res);
      setStep("DRY_RUN");
      if (res.invalidRows > 0) {
        toast.warning("Validation found issues", {
          description: `${res.invalidRows} row(s) have errors (${res.validRows} valid)`,
        });
      } else {
        toast.success("Validation passed", {
          description: `${res.validRows} rows ready to commit`,
        });
      }
    } catch (e: any) {
      setError(e.message ?? "Dry run validation failed");
      toastApiError(e, "Dry run validation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const requiredFields = targetFields.filter((f) => f.required).map((f) => f.key);
      const res = await apiFetch<CommitResult>(
        `/api/v1/imports/sessions/${session.sessionId}/commit`,
        {
          method: "POST",
          body: JSON.stringify({ columnMapping: mapping, requiredFields }),
        }
      );
      setCommitResult(res);
      setStep("DONE");
      toast.success("Import complete", {
        description: `Committed ${res.committedRows} rows`,
      });
      onComplete?.(res);
    } catch (e: any) {
      setError(e.message ?? "Import commit failed");
      toastApiError(e, "Import commit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <h3 className="text-[15px] font-semibold text-foreground">
            Import {targetType} (CSV / XLSX)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <StatusBadge label={`Step · ${step}`} tone="primary" />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "UPLOAD" && (
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-6 py-10 text-center hover:border-[var(--brand-primary)]">
          <Upload className="h-6 w-6 text-[var(--text-secondary)]" />
          <span className="mt-2 text-[13px] font-medium text-[var(--text-primary)]">
            {busy ? "Parsing file…" : "Click to select a .csv or .xlsx file"}
          </span>
          <span className="mt-1 text-[12px] text-[var(--text-muted)]">
            Max 10 MB · Up to 10,000 rows · Zip-bomb and formula-injection protected
          </span>
          <input
            type="file"
            accept=".csv,.xlsx"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />
        </label>
      )}

      {step === "MAP" && session && (
        <div className="mt-4 space-y-4">
          <div className="text-[13px] text-[var(--text-secondary)]">
            Detected <strong className="font-mono text-[var(--text-primary)]">{session.totalRows}</strong> rows in{" "}
            <span className="font-mono text-[var(--text-primary)]">{session.fileName}</span>. Map columns below:
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {targetFields.map((tf) => (
              <div key={tf.key} className="rounded-[8px] border border-[var(--border-subtle)] p-3">
                <label className="block text-[12px] font-medium text-[var(--text-primary)]">
                  {tf.label}{" "}
                  {tf.required && <span className="text-[var(--status-danger-fg)]">*</span>}
                </label>
                <Select
                  value={mapping[tf.key] || "__none__"}
                  onValueChange={(val) =>
                    setMapping((prev) => ({
                      ...prev,
                      [tf.key]: val === "__none__" ? "" : val,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="— Select source column —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select source column —</SelectItem>
                    {session.detectedColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("UPLOAD")}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={handleDryRun}
            >
              {busy ? "Validating…" : "Run Dry-Run Validation"}
            </Button>
          </div>
        </div>
      )}

      {step === "DRY_RUN" && report && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[8px] border border-[var(--border-subtle)] p-3">
              <div className="text-[12px] text-[var(--text-secondary)]">Total Rows</div>
              <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums">
                {report.totalRows}
              </div>
            </div>
            <div className="rounded-[8px] border border-[var(--border-success)] bg-[var(--status-success-bg)]/40 p-3">
              <div className="text-[12px] text-[var(--status-success-fg)]">Valid Rows</div>
              <div className="mt-1 font-mono text-[18px] font-semibold text-[var(--status-success-fg)] tabular-nums">
                {report.validRows}
              </div>
            </div>
            <div className="rounded-[8px] border border-[var(--border-danger)] bg-[var(--status-danger-bg)]/40 p-3">
              <div className="text-[12px] text-[var(--status-danger-fg)]">Invalid Rows</div>
              <div className="mt-1 font-mono text-[18px] font-semibold text-[var(--status-danger-fg)] tabular-nums">
                {report.invalidRows}
              </div>
            </div>
          </div>

          {report.errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-[8px] border border-[var(--border-danger)] bg-[var(--status-danger-bg)]/30 p-3 text-[12px] text-[var(--status-danger-fg)]">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                <span>Row Validation Errors</span>
              </div>
              <ul className="space-y-1 font-mono">
                {report.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.rowNumber} [{err.field}]: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("MAP")}
            >
              Adjust Mapping
            </Button>
            <Button
              type="button"
              disabled={busy || report.invalidRows > 0}
              onClick={handleCommit}
            >
              {busy ? "Committing…" : `Commit ${report.validRows} Rows`}
            </Button>
          </div>
        </div>
      )}

      {step === "DONE" && commitResult && (
        <div className="mt-4 flex items-center justify-between rounded-[8px] border border-[var(--border-success)] bg-[var(--status-success-bg)]/50 p-4 text-[var(--status-success-fg)]">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <CheckCircle2 className="h-5 w-5" />
            <span>
              Successfully committed{" "}
              <strong className="font-mono">{commitResult.committedRows}</strong> rows.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSession(null);
              setReport(null);
              setCommitResult(null);
              setStep("UPLOAD");
            }}
            className="bg-card text-[var(--status-success-fg)]"
          >
            Import Another File
          </Button>
        </div>
      )}
    </Card>
  );
}
