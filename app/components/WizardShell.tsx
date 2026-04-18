/**
 * Step-aware wizard. Renders the active panel based on the Zustand `step`.
 * The "review" step is a Phase-2 placeholder showing collected inputs — the
 * actual LLM matching/generation lands in Phase 3.
 */
"use client";

import { useStore, type WizardStep } from "@/lib/store";
import { PatConnect } from "./PatConnect";
import { RepoSummaryProgress } from "./RepoSummaryProgress";
import { JdInput } from "./JdInput";
import { TemplateUpload } from "./TemplateUpload";

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "connect", label: "Connect" },
  { id: "repos", label: "Repos" },
  { id: "jd", label: "JD" },
  { id: "template", label: "Template" },
  { id: "review", label: "Review" },
];

export function WizardShell() {
  const { step, user, repos, digests, jdRaw, templateRaw, setStep } =
    useStore();

  const currentIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">InternShippy</h1>
        <p className="text-sm text-neutral-500">
          Curate a resume that matches a specific JD using your real GitHub work.
        </p>
      </header>

      <nav className="flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              // only allow jumping to already-unlocked steps
              if (i <= currentIdx) setStep(s.id);
            }}
            disabled={i > currentIdx}
            className={
              i === currentIdx
                ? "rounded-full bg-neutral-900 px-3 py-1 font-medium text-white dark:bg-white dark:text-neutral-900"
                : i < currentIdx
                  ? "rounded-full border border-neutral-300 px-3 py-1 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  : "rounded-full border border-dashed border-neutral-300 px-3 py-1 text-neutral-400 dark:border-neutral-700"
            }
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </nav>

      {step === "connect" && <PatConnect />}
      {step === "repos" && user && <RepoSummaryProgress />}
      {step === "jd" && <JdInput />}
      {step === "template" && <TemplateUpload />}
      {step === "review" && (
        <div className="space-y-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm dark:border-neutral-700 dark:bg-neutral-950">
          <p className="font-medium">Phase 2 complete — inputs captured:</p>
          <ul className="list-disc space-y-1 pl-5 text-neutral-600 dark:text-neutral-400">
            <li>
              User: <span className="font-mono">@{user?.login}</span>
            </li>
            <li>
              Repos fetched: <span className="font-mono">{repos.length}</span>
            </li>
            <li>
              Digests cached:{" "}
              <span className="font-mono">{Object.keys(digests).length}</span>
            </li>
            <li>
              JD length: <span className="font-mono">{jdRaw.length}</span> chars
            </li>
            <li>
              Template length:{" "}
              <span className="font-mono">{templateRaw.length}</span> chars
            </li>
          </ul>
          <p className="text-xs text-neutral-500">
            LLM matching + resume generation land in Phase 3. Pause for approval.
          </p>
        </div>
      )}
    </div>
  );
}
