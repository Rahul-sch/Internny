/**
 * POST /api/github/connect
 * Body: { pat: string }
 * Validates the PAT against GitHub, creates a session, returns user info.
 */
import { z } from "zod";
import { validatePat } from "@/lib/github/client";
import { establishSession } from "@/lib/session";
import { fail, ok, withErrorEnvelope } from "@/lib/errors";

export const runtime = "nodejs";

const BodySchema = z.object({
  pat: z.string().min(20, "PAT looks too short"),
});

export async function POST(req: Request) {
  return withErrorEnvelope(async () => {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION", parsed.error.issues[0].message, 400);
    }
    const user = await validatePat(parsed.data.pat);
    await establishSession(parsed.data.pat, {
      login: user.login,
      avatarUrl: user.avatarUrl,
    });
    return ok({
      login: user.login,
      avatarUrl: user.avatarUrl,
      name: user.name,
      publicRepoCount: user.publicRepoCount,
      totalPrivateRepos: user.totalPrivateRepos,
    });
  });
}
