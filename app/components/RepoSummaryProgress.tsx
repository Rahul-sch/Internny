/**
 * Triggers the /api/github/summarize NDJSON stream and visualizes progress.
 * Populates `repos` (via an initial /repos fetch) then `digests` as they land.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, ApiError, streamNdjson } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { RepoDigest, RepoMeta } from "@/lib/github/types";

type Line =
  | { type: "progress"; completed: number; total: number; fullName: string }
  | { type: "digest"; digest: RepoDigest }
  | { type: "error"; fullName: string; message: string }
  | { type: "done"; total: number };

export function RepoSummaryProgress() {
  const {
    repos,
    digests,
    summaryProgress,
    summaryErrors,
    setRepos,
    addDigest,
    setSummaryProgress,
    addSummaryError,
    setStep,
  } = useStore();
  const [phase, setPhase] = useState<"idle" | "listing" | "summarizing" | "done" | "error">(
    "idle",
  );
  const [listError, setListError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setPhase("listing");
    setListError(null);
    try {
      const { repos: list } = await apiGet<{ repos: RepoMeta[] }>(
        "/api/github/repos",
      );
      setRepos(list);

      setPhase("summarizing");
      setSummaryProgress({ completed: 0, total: list.length });

      await streamNdjson("/api/github/summarize", {}, (raw) => {
        const line = raw as Line;
        if (line.type === "digest") {
          addDigest(line.digest);
        } else if (line.type === "progress") {
          setSummaryProgress({
            completed: line.completed,
            total: line.total,
          });
        } else if (line.type === "error") {
          addSummaryError({
            fullName: line.fullName,
            message: line.message,
          });
        }
      });

      setPhase("done");
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : "Unknown error");
      setPhase("error");
    }
  }, [addDigest, addSummaryError, setRepos, setSummaryProgress]);

  // Kick off automatically when the component mounts.
  useEffect(() => {
    if (phase === "idle") void start();
  }, [phase, start]);

  const pct =
    summaryProgress && summaryProgress.total > 0
      ? Math.round((summaryProgress.completed / summaryProgress.total) * 100)
      : 0;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">2 · Analyze repositories</h2>
        <span className="text-sm text-neutral-500">
          {phase === "listing" && "Fetching repo list…"}
          {phase === "summarizing" &&
            summaryProgress &&
            `${summaryProgress.completed}/${summaryProgress.total}`}
          {phase === "done" && `${Object.keys(digests).length} digests ready`}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full bg-neutral-900 transition-all dark:bg-white"
          style={{ width: `${pct}%` }}
        />
      </div>

      {listError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {listError}
        </p>
      )}

      {repos.length > 0 && (
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {repos.slice(0, 20).map((r) => {
            const done = !!digests[r.fullName];
            const failed = summaryErrors.some(
              (e) => e.fullName === r.fullName,
            );
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <span className="truncate">{r.fullName}</span>
                <span
                  className={
                    failed
                      ? "text-red-500"
                      : done
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-400"
                  }
                >
                  {failed ? "✗" : done ? "✓" : "…"}
                </span>
              </li>
            );
          })}
          {repos.length > 20 && (
            <li className="px-2 text-xs text-neutral-500">
              …and {repos.length - 20} more
            </li>
          )}
        </ul>
      )}

      {phase === "done" && (
        <button
          onClick={() => setStep("jd")}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Continue to Job Description →
        </button>
      )}
    </div>
  );
}
