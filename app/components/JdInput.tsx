/**
 * Raw Job Description textarea. Phase 3 will POST this to /api/jd/analyze.
 * For now we just capture the text and advance the wizard.
 */
"use client";

import { useStore } from "@/lib/store";

export function JdInput() {
  const { jdRaw, setJd, setStep } = useStore();
  const ready = jdRaw.trim().length >= 80;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h2 className="text-lg font-semibold">3 · Paste the Job Description</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Paste the full JD text. The LLM will extract must-haves, nice-to-haves,
          and seniority signals in Phase 3.
        </p>
      </div>
      <textarea
        value={jdRaw}
        onChange={(e) => setJd(e.target.value)}
        rows={10}
        placeholder="Paste the job description here…"
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-sans text-sm shadow-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
      />
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{jdRaw.length} chars</span>
        <span>{ready ? "Looks good" : "Need at least 80 chars"}</span>
      </div>
      <button
        disabled={!ready}
        onClick={() => setStep("template")}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Continue to Resume Template →
      </button>
    </div>
  );
}
