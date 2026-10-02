// Derive the GitHub repo + branch for the current git worktree.

import { $ } from "bun";
import type { RepoContext } from "./types";

export class RepoContextError extends Error {}

// Parse an `origin` remote URL into { owner, repo }. Handles the common forms:
//   git@github.com:owner/repo.git
//   ssh://git@github.com/owner/repo.git
//   https://github.com/owner/repo.git
//   https://github.com/owner/repo
export function parseRemoteUrl(
  url: string,
): { owner: string; repo: string } | null {
  const trimmed = url.trim();

  // scp-like syntax: git@host:owner/repo(.git)
  const scp = trimmed.match(/^[^@]+@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/);
  if (scp) {
    return { owner: scp[1], repo: scp[2] };
  }

  // URL syntax: (ssh|https|git)://host[:port]/owner/repo(.git)
  const proto = trimmed.match(
    /^(?:ssh|https?|git):\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/,
  );
  if (proto) {
    return { owner: proto[1], repo: proto[2] };
  }

  return null;
}

export async function getRepoContext(cwd?: string): Promise<RepoContext> {
  const dir = cwd ?? process.cwd();
  const sh = $.cwd(dir).nothrow();

  const branchResult = await sh`git rev-parse --abbrev-ref HEAD`.quiet();
  if (branchResult.exitCode !== 0) {
    throw new RepoContextError(
      `Not a git repository (or git failed) at ${dir}`,
    );
  }
  const branch = branchResult.stdout.toString().trim();
  if (!branch || branch === "HEAD") {
    throw new RepoContextError(
      "Detached HEAD — check out a branch with an open PR",
    );
  }

  const remoteResult = await sh`git remote get-url origin`.quiet();
  if (remoteResult.exitCode !== 0) {
    throw new RepoContextError("No `origin` remote configured");
  }
  const remoteUrl = remoteResult.stdout.toString().trim();
  const parsed = parseRemoteUrl(remoteUrl);
  if (!parsed) {
    throw new RepoContextError(
      `Could not parse GitHub owner/repo from origin: ${remoteUrl}`,
    );
  }

  return { owner: parsed.owner, repo: parsed.repo, branch };
}
