/**
 * Thin Octokit wrapper.
 * `octokit` bundles both REST and GraphQL clients.
 */
import { Octokit } from "octokit";
import { AppError } from "../errors";

export function makeOctokit(pat: string) {
  return new Octokit({
    auth: pat,
    userAgent: "internshippy/0.1",
    // The default retry plugin handles 403 secondary rate limits transparently.
    request: { retries: 2 },
  });
}

/**
 * Validate a PAT by hitting /user. Returns basic user info.
 * Throws AppError("AUTH_INVALID_PAT") on 401.
 */
export async function validatePat(pat: string) {
  const octo = makeOctokit(pat);
  try {
    const { data } = await octo.rest.users.getAuthenticated();
    return {
      login: data.login,
      avatarUrl: data.avatar_url,
      name: data.name ?? data.login,
      publicRepoCount: data.public_repos,
      totalPrivateRepos: (data as { total_private_repos?: number })
        .total_private_repos,
    };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401) {
      throw new AppError(
        "AUTH_INVALID_PAT",
        "GitHub rejected this PAT",
        "Ensure the token has `repo` and `read:user` scopes and hasn't expired.",
        401,
      );
    }
    if (status === 403) {
      throw new AppError(
        "GITHUB_RATE_LIMIT",
        "GitHub rate limit hit",
        "Wait a few minutes or use a different PAT.",
        429,
      );
    }
    throw new AppError(
      "GITHUB_UNAVAILABLE",
      "Could not reach GitHub",
      undefined,
      502,
    );
  }
}
