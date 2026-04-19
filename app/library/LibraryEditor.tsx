"use client";

import { useState } from "react";
import { apiPatch, ApiError } from "@/lib/api";
import type { Profile, Project, Skills } from "@/lib/library";

type Tab = "profile" | "projects" | "skills";

export function LibraryEditor({
  profile,
  projects,
  skills,
}: {
  profile: Profile;
  projects: Project[];
  skills: Skills;
}) {
  const [tab, setTab] = useState<Tab>("projects");
  const [profileText, setProfileText] = useState(JSON.stringify(profile, null, 2));
  const [projectsText, setProjectsText] = useState(JSON.stringify(projects, null, 2));
  const [skillsText, setSkillsText] = useState(JSON.stringify(skills, null, 2));
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      let parsed: { profile?: unknown; projects?: unknown; skills?: unknown } = {};
      if (tab === "profile") parsed = { profile: JSON.parse(profileText) };
      if (tab === "projects") parsed = { projects: JSON.parse(projectsText) };
      if (tab === "skills") parsed = { skills: JSON.parse(skillsText) };
      await apiPatch("/api/library", parsed);
      setMsg({ kind: "ok", text: "Saved." });
    } catch (err) {
      if (err instanceof SyntaxError) {
        setMsg({ kind: "err", text: `Invalid JSON: ${err.message}` });
      } else if (err instanceof ApiError) {
        setMsg({ kind: "err", text: err.message });
      } else {
        setMsg({
          kind: "err",
          text: err instanceof Error ? err.message : "Save failed",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const value = tab === "profile" ? profileText : tab === "projects" ? projectsText : skillsText;
  const setValue =
    tab === "profile" ? setProfileText : tab === "projects" ? setProjectsText : setSkillsText;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(["profile", "projects", "skills"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setMsg(null);
            }}
            className={`px-3 py-2 text-sm border-b-2 ${
              tab === t
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
        className="w-full min-h-[60vh] font-mono text-xs border border-slate-300 dark:border-slate-700 rounded p-3 bg-slate-50 dark:bg-slate-900"
      />

      <div className="flex items-center justify-between">
        <div className="text-xs">
          {msg && (
            <span
              className={
                msg.kind === "ok"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              {msg.text}
            </span>
          )}
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : `Save ${tab}`}
        </button>
      </div>
    </div>
  );
}
