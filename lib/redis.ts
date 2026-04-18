/**
 * Upstash Redis singleton.
 * Used for:
 *   - `pat:{hash}`         → encrypted GitHub PAT, TTL = SESSION_TTL_SECONDS
 *   - `summary:{repo}:{sha}` → repo digest JSON, TTL = 12h
 *   - rate-limit buckets (@upstash/ratelimit)
 */
import { Redis } from "@upstash/redis";
import { env } from "./env";

let client: Redis | null = null;

export function redis(): Redis {
  if (client) return client;
  const e = env();
  client = new Redis({
    url: e.UPSTASH_REDIS_REST_URL,
    token: e.UPSTASH_REDIS_REST_TOKEN,
  });
  return client;
}

export const SUMMARY_TTL_SECONDS = 60 * 60 * 12; // 12h

export function summaryKey(fullName: string, sha: string) {
  return `summary:${fullName}:${sha}`;
}

export function patKey(hash: string) {
  return `pat:${hash}`;
}
