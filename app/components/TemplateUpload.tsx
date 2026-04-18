/**
 * Markdown resume template: either paste inline or drop a `.md` file.
 * Slot grammar: `{{slot_name}}` tokens will be extracted + filled in Phase 3+.
 *
 * A minimal sample template is seeded so the wizard is explorable end-to-end
 * without requiring the user to bring their own file.
 */
"use client";

import { useRef } from "react";
import { useStore } from "@/lib/store";

const SAMPLE_TEMPLATE = `# {{full_name}}
{{email}} · {{github_url}} · {{linkedin_url}}

## Summary
{{summary}}

## Selected Projects

### {{project_1.title}} — {{project_1.stack}}
{{project_1.bullet_1}}
{{project_1.bullet_2}}

### {{project_2.title}} — {{project_2.stack}}
{{project_2.bullet_1}}
{{project_2.bullet_2}}

### {{project_3.title}} — {{project_3.stack}}
{{project_3.bullet_1}}
{{project_3.bullet_2}}

## Skills
{{skills_line}}
`;

export function TemplateUpload() {
  const { templateRaw, setTemplate, setStep } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File | null) {
    if (!f) return;
    const text = await f.text();
    setTemplate(text);
  }

  const slotCount = (templateRaw.match(/\{\{[^}]+\}\}/g) ?? []).length;
  const ready = templateRaw.trim().length > 20 && slotCount >= 1;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h2 className="text-lg font-semibold">4 · Base resume template</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Markdown with <code>{"{{slot}}"}</code> placeholders. The LLM will
          fill slots with project-specific, JD-tailored content.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTemplate(SAMPLE_TEMPLATE)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Load sample
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Upload .md
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <textarea
        value={templateRaw}
        onChange={(e) => setTemplate(e.target.value)}
        rows={16}
        spellCheck={false}
        placeholder="# Your Name&#10;{{email}} · {{github_url}}&#10;&#10;## Summary&#10;{{summary}}&#10;…"
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
      />
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{templateRaw.length} chars</span>
        <span>{slotCount} slot(s) detected</span>
      </div>

      <button
        disabled={!ready}
        onClick={() => setStep("review")}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Save template (Phase 3 will generate the resume) →
      </button>
    </div>
  );
}
