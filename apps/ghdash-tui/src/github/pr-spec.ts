// Parse a user-supplied PR target from CLI args.
//
// Accepted forms:
//   https://github.com/OWNER/REPO/pull/NUMBER   (full URL)
//   github.com/OWNER/REPO/pull/NUMBER
//   OWNER/REPO#NUMBER
//   #NUMBER                                      (number only — repo from cwd)
//   NUMBER

export interface PRSpec {
  owner?: string;
  repo?: string;
  number: number;
}

export function parsePrSpec(input: string): PRSpec | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i);
  if (url) {
    return { owner: url[1], repo: url[2], number: Number(url[3]) };
  }

  const ownerRepoNum = trimmed.match(/^([^/\s]+)\/([^/#\s]+)#(\d+)$/);
  if (ownerRepoNum) {
    return {
      owner: ownerRepoNum[1],
      repo: ownerRepoNum[2],
      number: Number(ownerRepoNum[3]),
    };
  }

  const bare = trimmed.match(/^#?(\d+)$/);
  if (bare) {
    return { number: Number(bare[1]) };
  }

  return null;
}
