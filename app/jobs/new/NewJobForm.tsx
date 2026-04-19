"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost, ApiError } from "@/lib/api";

export function NewJobForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    company.trim().length > 0 && title.trim().length > 0 && jd.trim().length >= 40 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { id } = await apiPost<{ id: string }>("/api/jobs", {
        url: url.trim() || undefined,
        company: company.trim(),
        title: title.trim(),
        jd_text: jd.trim(),
      });
      router.push(`/jobs/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.hint ? `${err.message} (${err.hint})` : err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to save job");
      }
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Job URL (optional)" hint="workatastartup.com / portfolio.a16z.com / Lever / Greenhouse">
        <input
          className="input"
          type="url"
          placeholder="https://www.workatastartup.com/jobs/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Company *">
          <input
            className="input"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Anthropic"
          />
        </Field>
        <Field label="Role *">
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Software Engineer, Infrastructure"
          />
        </Field>
      </div>
      <Field label="Job description *" hint={`${jd.trim().length} / 40 chars minimum`}>
        <textarea
          className="input min-h-[280px] font-mono text-sm"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the full JD here…"
        />
      </Field>

      {error && (
        <div className="rounded border border-rose-300 bg-rose-50 dark:bg-rose-950 dark:border-rose-800 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Saving…" : "Save job"}
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid rgb(203 213 225 / 1);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          background: transparent;
          outline: none;
        }
        :global(.input:focus) {
          border-color: rgb(59 130 246 / 1);
          box-shadow: 0 0 0 3px rgb(59 130 246 / 0.2);
        }
        @media (prefers-color-scheme: dark) {
          :global(.input) {
            border-color: rgb(51 65 85 / 1);
          }
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
