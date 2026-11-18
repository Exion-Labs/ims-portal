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
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
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
    } catch (e: any) {
      setError(e.message ?? "Dry run validation failed");
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
      onComplete?.(res);
    } catch (e: any) {
      setError(e.message ?? "Import commit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
      <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[#1D4ED8]" />
          <h3 className="text-[15px] font-semibold text-[#18181B]">
            Import {targetType} (CSV / XLSX)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#52525B]">
          <StatusBadge label={`Step · ${step}`} tone="primary" />
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[13px] text-[#991B1B]">
          {error}
        </div>
      )}

      {step === "UPLOAD" && (
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#E4E4E7] bg-[#F7F7F8] px-6 py-10 text-center hover:border-[#1D4ED8]">
          <Upload className="h-6 w-6 text-[#52525B]" />
          <span className="mt-2 text-[13px] font-medium text-[#18181B]">
            {busy ? "Parsing file…" : "Click to select a .csv or .xlsx file"}
          </span>
          <span className="mt-1 text-[12px] text-[#63636B]">
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
          <div className="text-[13px] text-[#52525B]">
            Detected <strong className="font-mono text-[#18181B]">{session.totalRows}</strong> rows in{" "}
            <span className="font-mono text-[#18181B]">{session.fileName}</span>. Map columns below:
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {targetFields.map((tf) => (
              <div key={tf.key} className="rounded-[8px] border border-[#E4E4E7] p-3">
                <label className="block text-[12px] font-medium text-[#18181B]">
                  {tf.label}{" "}
                  {tf.required && <span className="text-[#991B1B]">*</span>}
                </label>
                <select
                  value={mapping[tf.key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [tf.key]: e.target.value }))
                  }
                  className="mt-1.5 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-2.5 text-[13px] text-[#18181B]"
                >
                  <option value="">— Select source column —</option>
                  {session.detectedColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStep("UPLOAD")}
              className="h-9 rounded-[8px] border border-[#E4E4E7] px-3 text-[13px] font-medium text-[#52525B]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDryRun}
              className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
            >
              {busy ? "Validating…" : "Run Dry-Run Validation"}
            </button>
          </div>
        </div>
      )}

      {step === "DRY_RUN" && report && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[8px] border border-[#E4E4E7] p-3">
              <div className="text-[12px] text-[#52525B]">Total Rows</div>
              <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums">
                {report.totalRows}
              </div>
            </div>
            <div className="rounded-[8px] border border-[#BBF7D0] bg-[#DCFCE7]/40 p-3">
              <div className="text-[12px] text-[#166534]">Valid Rows</div>
              <div className="mt-1 font-mono text-[18px] font-semibold text-[#166534] tabular-nums">
                {report.validRows}
              </div>
            </div>
            <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/40 p-3">
              <div className="text-[12px] text-[#991B1B]">Invalid Rows</div>
              <div className="mt-1 font-mono text-[18px] font-semibold text-[#991B1B] tabular-nums">
                {report.invalidRows}
              </div>
            </div>
          </div>

          {report.errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/30 p-3 text-[12px] text-[#991B1B]">
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
            <button
              type="button"
              onClick={() => setStep("MAP")}
              className="h-9 rounded-[8px] border border-[#E4E4E7] px-3 text-[13px] font-medium text-[#52525B]"
            >
              Adjust Mapping
            </button>
            <button
              type="button"
              disabled={busy || report.invalidRows > 0}
              onClick={handleCommit}
              className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-40"
            >
              {busy ? "Committing…" : `Commit ${report.validRows} Rows`}
            </button>
          </div>
        </div>
      )}

      {step === "DONE" && commitResult && (
        <div className="mt-4 flex items-center justify-between rounded-[8px] border border-[#BBF7D0] bg-[#DCFCE7]/50 p-4 text-[#166534]">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <CheckCircle2 className="h-5 w-5" />
            <span>
              Successfully committed{" "}
              <strong className="font-mono">{commitResult.committedRows}</strong> rows.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSession(null);
              setReport(null);
              setCommitResult(null);
              setStep("UPLOAD");
            }}
            className="h-8 rounded-[8px] bg-white px-3 text-[12px] font-medium text-[#166534]"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
