import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type JobRow } from "@/lib/db";
import { JobActions } from "./JobActions";

export default async function JobDetail(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const job = db().prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as
    | JobRow
    | undefined;
  if (!job) notFound();

  const latest = db()
    .prepare(
      `SELECT id, created_at, model, tailored_json FROM generations
       WHERE job_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(id) as
    | { id: string; created_at: string; model: string; tailored_json: string }
    | undefined;

  const tailored = latest ? JSON.parse(latest.tailored_json) : null;

  return (
    <main className="mx-auto max-w-6xl w-full px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold mt-1">
            {job.company} · {job.title}
          </h1>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              {job.url}
            </a>
          )}
        </div>
        <JobActions id={job.id} initialStatus={job.status} hasPdf={!!job.pdf_path} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Job description
          </h2>
          <pre className="whitespace-pre-wrap text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 font-mono max-h-[75vh] overflow-auto">
            {job.jd_text}
          </pre>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Tailored output
          </h2>

          {!tailored ? (
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded p-6 text-sm text-slate-500">
              No generation yet. Click <b>Generate</b> above — takes ~15-40s.
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Summary</div>
                <p className="italic mt-1">{tailored.summary}</p>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">
                  Projects (in order)
                </div>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  {tailored.project_ids.map((id: string) => (
                    <li key={id}>
                      <span className="font-medium">{id}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">
                  Skill order
                </div>
                <p className="mt-1 text-slate-700 dark:text-slate-300">
                  {tailored.skill_order.join(" → ")}
                </p>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">
                  Rationale
                </div>
                <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {tailored.rationale}
                </p>
              </div>
              <div className="text-xs text-slate-400">
                {latest?.model} · {latest?.created_at}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
