/**
 * GET /api/github/repos
 * Returns up to 100 of the viewer's repositories, ordered by most-recently-pushed.
 * Private repos are included (PAT scope permitting).
 */
import { makeOctokit } from "@/lib/github/client";
import { listAllRepos } from "@/lib/github/graphql";
import { ok, withErrorEnvelope } from "@/lib/errors";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  return withErrorEnvelope(async () => {
    const { pat } = await requireSession();
    const octo = makeOctokit(pat);
    const repos = await listAllRepos(octo, { maxRepos: 100 });
    return ok({ repos });
  });
}
