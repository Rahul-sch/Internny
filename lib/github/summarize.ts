/**
 * Per-repo digest generator.
 *
 * Token-budget strategy (see plan §2 "Token strategy" column):
 *   1. Pre-trim the README to ~12K chars before sending to the LLM
 *      (cuts 90%+ of oversized READMEs without losing the first-fold signal).
 *   2. Send to Haiku 4.5 — cheapest/fastest; the compression task is easy.
 *   3. Cache the digest in Redis keyed by `{fullName}:{defaultBranchSha}`
 *      so re-runs for the same repo are free unless the user has pushed.
 *
 * Concurrency: callers should wrap this with `p-limit` (we cap at 5 parallel
 * to stay well under GitHub + Anthropic rate limits).
 */
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import type { Octokit } from "octokit";
import { z } from "zod";
import { AppError } from "../errors";
import { redis, SUMMARY_TTL_SECONDS, summaryKey } from "../redis";
import { fetchReadme } from "./graphql";
import type { RepoDigest, RepoMeta } from "./types";

const README_MAX_CHARS = 12_000;

const DigestSchema = z.object({
  oneLiner: z.string().min(5).max(240),
  skills: z.array(z.string()).max(6),
  highlights: z.array(z.string()).max(4),
  scope: z.enum(["toy", "project", "substantial", "flagship"]),
});

function trimReadme(readme: string | null): string {
  if (!readme) return "(no README)";
  return readme.length > README_MAX_CHARS
    ? `${readme.slice(0, README_MAX_CHARS)}\n\n…[truncated]`
    : readme;
}

function buildPrompt(meta: RepoMeta, readme: string) {
  const langs = meta.languages
    .slice(0, 5)
    .map((l) => l.name)
    .join(", ");
  return `You are compressing a GitHub repository into a structured digest for later resume-matching.

Repository: ${meta.fullName}
Description: ${meta.description ?? "(none)"}
Primary language: ${meta.primaryLanguage ?? "unknown"}
Top languages: ${langs || "(none)"}
Stars: ${meta.stargazerCount}
Recent 90d commits: ${meta.commitCountRecent90d}
Pushed: ${meta.pushedAt}
Archived: ${meta.isArchived}  Fork: ${meta.isFork}

README (truncated to ${README_MAX_CHARS} chars):
"""
${readme}
"""

Produce:
- oneLiner: a single sentence describing what the project does and the concrete tech used.
- skills: up to 6 normalized lowercase tags (e.g. "react", "aws-lambda", "pytorch", "postgres"). Prefer specific frameworks/services over generic words like "backend".
- highlights: up to 4 short factual bullets suitable as resume-evidence. Each must be verifiable from the README/metadata (no invention). Include numbers when available (stars, test count, scale).
- scope: one of "toy" (experiment/tutorial), "project" (multi-file real project), "substantial" (non-trivial architecture, 90d active or >50 commits), "flagship" (significant stars, polished docs, or clearly major work).

Be concise. If the README is empty, infer only from description/languages and keep highlights empty.`;
}

/**
 * Generate a digest for one repo. Reads from Redis if a cached digest
 * for the same default-branch SHA exists.
 */
export async function summarizeRepo(
  octo: Octokit,
  meta: RepoMeta,
): Promise<RepoDigest> {
  const sha = meta.defaultBranchSha ?? "no-sha";
  const key = summaryKey(meta.fullName, sha);

  const cached = await redis().get<RepoDigest>(key);
  if (cached) return cached;

  const [owner, repo] = meta.fullName.split("/");
  const readme = await fetchReadme(octo, owner, repo);
  const trimmed = trimReadme(readme);

  let object: z.infer<typeof DigestSchema>;
  try {
    const res = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: DigestSchema,
      prompt: buildPrompt(meta, trimmed),
      maxRetries: 1,
    });
    object = res.object;
  } catch (err) {
    throw new AppError(
      "LLM_SCHEMA_MISMATCH",
      `Digest failed for ${meta.fullName}`,
      err instanceof Error ? err.message : undefined,
      502,
    );
  }

  const digest: RepoDigest = {
    fullName: meta.fullName,
    primaryLanguage: meta.primaryLanguage,
    stars: meta.stargazerCount,
    oneLiner: object.oneLiner,
    skills: object.skills,
    highlights: object.highlights,
    scope: object.scope,
    sourceSha: sha,
    generatedAt: new Date().toISOString(),
  };

  await redis().set(key, digest, { ex: SUMMARY_TTL_SECONDS });
  return digest;
}
