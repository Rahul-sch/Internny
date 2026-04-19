"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPatch, apiPost, ApiError } from "@/lib/api";
import type { JobStatus } from "@/lib/db";

const STATUS_CYCLE: JobStatus[] = [
  "new",
  "generated",
  "applied",
  "rejected",
  "archived",
];

export function JobActions({
  id,
  initialStatus,
  hasPdf,
}: {
  id: string;
  initialStatus: JobStatus;
  hasPdf: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<JobStatus>(initialStatus);
  const [busy, setBusy] = useState<null | "generate" | "status">(null);
  const [error, setError] = useState<string | null>(null);
  const [compileWarning, setCompileWarning] = useState<string | null>(null);

  async function generate() {
    setBusy("generate");
    setError(null);
    setCompileWarning(null);
    try {
      const res = await apiPost<{
        pdfPath: string | null;
        compileError: string | null;
      }>(`/api/jobs/${id}/generate`);
      if (res.compileError) setCompileWarning(res.compileError);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.hint ? `${err.message} — ${err.hint}` : err.message);
      } else {
        setError(err instanceof Error ? err.message : "Generation failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function updateStatus(next: JobStatus) {
    setBusy("status");
    try {
      await apiPatch<{ status: JobStatus }>(`/api/jobs/${id}`, { status: next });
      setStatus(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex gap-2 flex-wrap justify-end">
        <button
          onClick={generate}
          disabled={busy !== null}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy === "generate" ? "Generating…" : "Generate"}
        </button>
        <a
          href={`/api/jobs/${id}/download?format=tex`}
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          .tex
        </a>
        <a
          href={`/api/jobs/${id}/download?format=pdf`}
          className={`px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 ${hasPdf ? "" : "opacity-50 pointer-events-none"}`}
        >
          .pdf
        </a>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Status:</span>
        <select
          value={status}
          disabled={busy !== null}
          onChange={(e) => updateStatus(e.target.value as JobStatus)}
          className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm bg-transparent"
        >
          {STATUS_CYCLE.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div className="text-xs text-rose-600 dark:text-rose-400 max-w-xs text-right">
          {error}
        </div>
      )}
      {compileWarning && (
        <div className="text-xs text-amber-700 dark:text-amber-400 max-w-xs text-right">
          {compileWarning}
        </div>
      )}
    </div>
  );
}
