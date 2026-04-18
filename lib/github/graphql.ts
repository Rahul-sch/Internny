/**
 * GraphQL-powered repo fetching.
 *
 * Why GraphQL: a single request returns all the fields we need per repo
 * (name, languages, default branch SHA, recent commit count, README text),
 * where REST would require 4-5 round trips per repo.
 *
 * We request the README here in the list query so the summarizer rarely
 * needs to make a follow-up call; GitHub's `object(expression:"HEAD:README.md")`
 * short-circuits to null for missing files.
 */
import { Octokit } from "octokit";
import type { RepoMeta } from "./types";

type ViewerReposResponse = {
  viewer: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        id: string;
        nameWithOwner: string;
        name: string;
        description: string | null;
        isPrivate: boolean;
        isFork: boolean;
        isArchived: boolean;
        stargazerCount: number;
        pushedAt: string;
        createdAt: string;
        url: string;
        primaryLanguage: { name: string } | null;
        languages: {
          edges: Array<{ size: number; node: { name: string } }>;
        };
        defaultBranchRef: {
          name: string;
          target:
            | { __typename: "Commit"; oid: string; history: { totalCount: number } }
            | { __typename: string };
        } | null;
      }>;
    };
  };
};

const LIST_REPOS_QUERY = /* GraphQL */ `
  query ListRepos($cursor: String, $since: GitTimestamp!) {
    viewer {
      repositories(
        first: 50
        after: $cursor
        orderBy: { field: PUSHED_AT, direction: DESC }
        ownerAffiliations: [OWNER, COLLABORATOR]
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          nameWithOwner
          name
          description
          isPrivate
          isFork
          isArchived
          stargazerCount
          pushedAt
          createdAt
          url
          primaryLanguage { name }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name } }
          }
          defaultBranchRef {
            name
            target {
              __typename
              ... on Commit {
                oid
                history(since: $since) { totalCount }
              }
            }
          }
        }
      }
    }
  }
`;

/** Fetch every repo the viewer has access to (up to `maxRepos`). */
export async function listAllRepos(
  octo: Octokit,
  opts: { maxRepos?: number } = {},
): Promise<RepoMeta[]> {
  const maxRepos = opts.maxRepos ?? 100;
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const out: RepoMeta[] = [];
  let cursor: string | null = null;

  while (out.length < maxRepos) {
    const resp: ViewerReposResponse = await octo.graphql(LIST_REPOS_QUERY, {
      cursor,
      since,
    });
    const nodes = resp.viewer.repositories.nodes;
    const pageInfo = resp.viewer.repositories.pageInfo;

    for (const n of nodes) {
      const target = n.defaultBranchRef?.target;
      const isCommit =
        target && "__typename" in target && target.__typename === "Commit";
      const commitTarget = isCommit
        ? (target as { oid: string; history: { totalCount: number } })
        : null;
      out.push({
        id: n.id,
        fullName: n.nameWithOwner,
        name: n.name,
        description: n.description,
        isPrivate: n.isPrivate,
        isFork: n.isFork,
        isArchived: n.isArchived,
        stargazerCount: n.stargazerCount,
        primaryLanguage: n.primaryLanguage?.name ?? null,
        languages: n.languages.edges.map((e) => ({
          name: e.node.name,
          bytes: e.size,
        })),
        pushedAt: n.pushedAt,
        createdAt: n.createdAt,
        defaultBranch: n.defaultBranchRef?.name ?? "main",
        defaultBranchSha: commitTarget?.oid ?? null,
        commitCountRecent90d: commitTarget?.history.totalCount ?? 0,
        url: n.url,
      });
      if (out.length >= maxRepos) break;
    }

    if (!pageInfo.hasNextPage || out.length >= maxRepos) break;
    cursor = pageInfo.endCursor;
  }

  return out;
}

/**
 * Fetch raw README (UTF-8). Returns null if the repo has no README.
 * Uses REST because it auto-handles content encoding and the multiple
 * README.* naming conventions (README, README.md, README.rst, etc).
 */
export async function fetchReadme(
  octo: Octokit,
  owner: string,
  repo: string,
): Promise<string | null> {
  try {
    const { data } = await octo.rest.repos.getReadme({
      owner,
      repo,
      mediaType: { format: "raw" },
    });
    return typeof data === "string" ? data : null;
  } catch (err) {
    if ((err as { status?: number })?.status === 404) return null;
    throw err;
  }
}
