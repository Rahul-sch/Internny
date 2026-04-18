/**
 * POST /api/github/summarize
 * Body: { fullNames?: string[] }  — if omitted, summarizes all repos the
 *                                     viewer has access to (capped at 100).
 *
 * Response: streaming NDJSON (application/x-ndjson).
 * Each line is one of:
 *   { "type": "progress", "completed": n, "total": m, "fullName": "…" }
 *   { "type": "digest",   "digest": RepoDigest }
 *   { "type": "error",    "fullName": "…", "message": "…" }
 *   { "type": "done",     "total": m }
 *
 * Concurrency is capped at 5 via p-limit to stay under GitHub/Anthropic limits.
 */
import pLimit from "p-limit";
import { makeOctokit } from "@/lib/github/client";
import { listAllRepos } from "@/lib/github/graphql";
import { summarizeRepo } from "@/lib/github/summarize";
import type { RepoMeta } from "@/lib/github/types";
import { requireSession, SessionError } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const CONCURRENCY = 5;
const MAX_REPOS = 100;

export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof SessionError) {
      return Response.json(
        {
          ok: false,
          error: { code: err.code, message: err.message },
        },
        { status: 401 },
      );
    }
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const fullNames: string[] | undefined = Array.isArray(body?.fullNames)
    ? body.fullNames
    : undefined;

  const octo = makeOctokit(session.pat);
  const allRepos = await listAllRepos(octo, { maxRepos: MAX_REPOS });
  const targets: RepoMeta[] = fullNames
    ? allRepos.filter((r) => fullNames.includes(r.fullName))
    : allRepos;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (obj: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));

      const total = targets.length;
      let completed = 0;
      const limit = pLimit(CONCURRENCY);

      await Promise.all(
        targets.map((meta) =>
          limit(async () => {
            try {
              const digest = await summarizeRepo(octo, meta);
              write({ type: "digest", digest });
            } catch (err) {
              write({
                type: "error",
                fullName: meta.fullName,
                message: err instanceof Error ? err.message : "unknown",
              });
            } finally {
              completed += 1;
              write({
                type: "progress",
                completed,
                total,
                fullName: meta.fullName,
              });
            }
          }),
        ),
      );

      write({ type: "done", total });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
