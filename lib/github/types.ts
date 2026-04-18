/** Shared types for repo metadata and digests. */
export type RepoMeta = {
  id: string;
  fullName: string;       // "owner/repo"
  name: string;
  description: string | null;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  stargazerCount: number;
  primaryLanguage: string | null;
  languages: Array<{ name: string; bytes: number }>;
  pushedAt: string;        // ISO
  createdAt: string;
  defaultBranch: string;
  defaultBranchSha: string | null;
  commitCountRecent90d: number;
  url: string;
};

/** Compact digest produced by the summarizer (≤ ~200 tokens). */
export type RepoDigest = {
  fullName: string;
  primaryLanguage: string | null;
  stars: number;
  /** Free-form one-sentence summary of what the repo does. */
  oneLiner: string;
  /** Up to 6 normalized skill tags (e.g. "react", "aws-lambda", "pandas"). */
  skills: string[];
  /** Up to 4 bullet-ready highlights — facts the resume rewriter can use. */
  highlights: string[];
  /** Overall activity & scope signal: "toy" | "project" | "substantial" | "flagship". */
  scope: "toy" | "project" | "substantial" | "flagship";
  /** Cache provenance. */
  sourceSha: string;
  generatedAt: string;
};
