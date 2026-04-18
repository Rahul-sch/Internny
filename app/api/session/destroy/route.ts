/**
 * POST /api/session/destroy
 * Clears the Redis PAT entry and the iron-session cookie. Idempotent.
 */
import { destroySession } from "@/lib/session";
import { ok, withErrorEnvelope } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST() {
  return withErrorEnvelope(async () => {
    await destroySession();
    return ok({ cleared: true });
  });
}
