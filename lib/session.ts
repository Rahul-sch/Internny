/**
 * Session layer.
 *
 * Security model (see plan §6):
 *   1. User submits PAT to POST /api/github/connect over HTTPS.
 *   2. We hash the PAT (SHA-256, hex) → `patHash`.
 *   3. We write the PAT itself to Redis at `pat:{patHash}` with TTL.
 *      The PAT never touches the cookie.
 *   4. We set an iron-session encrypted cookie containing `{ patHash, login }`.
 *   5. Subsequent API routes call `requireSession(req)` → it decrypts the
 *      cookie, pulls PAT from Redis, and returns it to the handler.
 *   6. /api/session/destroy deletes both the Redis entry and the cookie.
 *
 * If the Redis entry TTLs out, the cookie is still present but `requireSession`
 * returns 401 AUTH_EXPIRED — the client re-prompts for a fresh PAT.
 */
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { env } from "./env";
import { patKey, redis } from "./redis";

export type SessionData = {
  patHash?: string;
  login?: string;
  avatarUrl?: string;
  createdAt?: number;
};

const COOKIE_NAME = "internshippy_session";

function sessionOptions(): SessionOptions {
  return {
    password: env().SESSION_SECRET,
    cookieName: COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: env().SESSION_TTL_SECONDS,
      path: "/",
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}

/** SHA-256 hash of the raw PAT, hex-encoded. Deterministic, never reversible. */
export function hashPat(pat: string): string {
  return createHash("sha256").update(pat).digest("hex");
}

/**
 * Persist a fresh PAT: writes to Redis with TTL and mints the session cookie.
 * Returns the computed patHash.
 */
export async function establishSession(
  pat: string,
  user: { login: string; avatarUrl: string },
): Promise<string> {
  const patHash = hashPat(pat);
  const ttl = env().SESSION_TTL_SECONDS;
  await redis().set(patKey(patHash), pat, { ex: ttl });

  const session = await getSession();
  session.patHash = patHash;
  session.login = user.login;
  session.avatarUrl = user.avatarUrl;
  session.createdAt = Date.now();
  await session.save();

  return patHash;
}

/** Clears Redis PAT + cookie. Idempotent. */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  if (session.patHash) {
    await redis().del(patKey(session.patHash));
  }
  session.destroy();
}

export class SessionError extends Error {
  constructor(
    public code: "AUTH_MISSING" | "AUTH_EXPIRED",
    message: string,
  ) {
    super(message);
    this.name = "SessionError";
  }
}

/**
 * For use inside authenticated API routes.
 * Throws SessionError if the cookie is missing or the Redis PAT has TTL'd out.
 */
export async function requireSession(): Promise<{
  pat: string;
  patHash: string;
  login: string;
  avatarUrl?: string;
}> {
  const session = await getSession();
  if (!session.patHash || !session.login) {
    throw new SessionError("AUTH_MISSING", "No active session");
  }
  const pat = await redis().get<string>(patKey(session.patHash));
  if (!pat) {
    session.destroy();
    throw new SessionError("AUTH_EXPIRED", "Session expired; reconnect PAT");
  }
  return {
    pat,
    patHash: session.patHash,
    login: session.login,
    avatarUrl: session.avatarUrl,
  };
}

/** Opaque session id derived from patHash + random salt, used for cache keys. */
export function deriveCacheSalt(patHash: string) {
  return createHash("sha256")
    .update(patHash)
    .update(randomBytes(8))
    .digest("hex")
    .slice(0, 16);
}
