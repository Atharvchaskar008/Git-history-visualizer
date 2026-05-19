/**
 * GitHub REST API data fetcher — replaces socket.io + git clone
 * Enables pure frontend deployment on Vercel (no server needed for data)
 */

export interface GitHubCommit {
  hash: string;
  author: string;
  email: string;
  timestamp: number;
  subject: string;
  filesChanged: { status: string; path: string }[];
  branch?: string;
}

export interface FetchProgress {
  loaded: number;
  total: number;
  message: string;
  phase: 'fetching' | 'parsing' | 'done' | 'error';
}

interface GHCommitResponse {
  sha: string;
  commit: {
    author: { name: string; email: string; date: string };
    message: string;
  };
  files?: { filename: string; status: string }[];
}

interface GHBranchResponse {
  name: string;
  commit: { sha: string };
}

/**
 * Parse "owner/repo" from various GitHub URL formats
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  // "owner/repo"
  const simple = input.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (simple) return { owner: simple[1], repo: simple[2] };

  // Full URL
  const urlMatch = input.match(/github\.com[/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };

  return null;
}

/**
 * Fetch all branches for a repo
 */
export async function fetchBranches(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`,
      { headers: getHeaders() }
    );
    if (!res.ok) return ['main'];
    const data: GHBranchResponse[] = await res.json();
    return data.map((b) => b.name);
  } catch {
    return ['main'];
  }
}

/**
 * Fetch commits from GitHub API with pagination & file details
 */
export async function fetchCommits(
  owner: string,
  repo: string,
  options: {
    branch?: string;
    maxCommits?: number;
    onProgress?: (p: FetchProgress) => void;
  } = {}
): Promise<GitHubCommit[]> {
  const { branch = 'main', maxCommits = 500, onProgress } = options;
  const commits: GitHubCommit[] = [];
  let page = 1;
  const perPage = 100;

  onProgress?.({
    loaded: 0,
    total: maxCommits,
    message: `⏳ Fetching commits from ${owner}/${repo}...`,
    phase: 'fetching',
  });

  try {
    // Phase 1: Fetch commit list (fast, no file details)
    while (commits.length < maxCommits) {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?` +
          new URLSearchParams({
            sha: branch,
            per_page: String(perPage),
            page: String(page),
          }),
        { headers: getHeaders() }
      );

      if (!res.ok) {
        if (res.status === 403) {
          onProgress?.({
            loaded: commits.length,
            total: maxCommits,
            message: '⚠️ GitHub API rate limit reached. Showing available data.',
            phase: 'done',
          });
          break;
        }
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
      }

      const data: GHCommitResponse[] = await res.json();
      if (data.length === 0) break;

      for (const item of data) {
        if (commits.length >= maxCommits) break;
        commits.push({
          hash: item.sha,
          author: item.commit.author.name,
          email: item.commit.author.email,
          timestamp: Math.floor(new Date(item.commit.author.date).getTime() / 1000),
          subject: item.commit.message.split('\n')[0],
          filesChanged: [],
          branch,
        });
      }

      onProgress?.({
        loaded: commits.length,
        total: maxCommits,
        message: `📥 Fetched ${commits.length} commits...`,
        phase: 'fetching',
      });

      if (data.length < perPage) break;
      page++;

      // Small delay to respect rate limits
      await delay(50);
    }

    // Phase 2: Fetch file details for commits (batched, with rate limiting)
    onProgress?.({
      loaded: 0,
      total: commits.length,
      message: '🔍 Fetching file change details...',
      phase: 'parsing',
    });

    // Fetch file details in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    for (let i = 0; i < commits.length; i += BATCH_SIZE) {
      const batch = commits.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((c) =>
          fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits/${c.hash}`,
            { headers: getHeaders() }
          ).then((r) => r.ok ? r.json() : null)
        )
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'fulfilled' && result.value) {
          const detail = result.value as GHCommitResponse;
          if (detail.files) {
            commits[i + j].filesChanged = detail.files.map((f) => ({
              status: mapGHStatus(f.status),
              path: f.filename,
            }));
          }
        }
      }

      onProgress?.({
        loaded: Math.min(i + BATCH_SIZE, commits.length),
        total: commits.length,
        message: `🔍 Fetching file details... ${Math.min(i + BATCH_SIZE, commits.length)}/${commits.length}`,
        phase: 'parsing',
      });

      if (i + BATCH_SIZE < commits.length) {
        await delay(100);
      }
    }

    // Sort by timestamp ascending (oldest first) for replay
    commits.sort((a, b) => a.timestamp - b.timestamp);

    onProgress?.({
      loaded: commits.length,
      total: commits.length,
      message: `✅ Loaded ${commits.length} commits with file details`,
      phase: 'done',
    });

    return commits;
  } catch (err: any) {
    onProgress?.({
      loaded: commits.length,
      total: maxCommits,
      message: `❌ ${err.message}`,
      phase: 'error',
    });
    // Return whatever we've fetched so far
    commits.sort((a, b) => a.timestamp - b.timestamp);
    return commits;
  }
}

function mapGHStatus(status: string): string {
  switch (status) {
    case 'added': return 'A';
    case 'removed': return 'D';
    case 'modified': return 'M';
    case 'renamed': return 'R';
    case 'copied': return 'C';
    default: return 'M';
  }
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  // Check for token in localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('gh_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Compute analytics from commit data
 */
export interface RepoAnalytics {
  fileChurnMap: Map<string, number>;  // file path → number of changes
  authorMatrix: Map<string, { commits: number; files: number; additions: number; deletions: number }>;
  hotModules: { path: string; churn: number }[];
  timelineRange: { start: number; end: number };
  contributorLinks: { source: string; target: string; weight: number }[];
}

export function computeAnalytics(commits: GitHubCommit[]): RepoAnalytics {
  const fileChurnMap = new Map<string, number>();
  const authorMatrix = new Map<string, { commits: number; files: number; additions: number; deletions: number }>();
  const fileAuthors = new Map<string, Set<string>>();

  for (const c of commits) {
    // Author stats
    const existing = authorMatrix.get(c.author) ?? { commits: 0, files: 0, additions: 0, deletions: 0 };
    existing.commits++;
    existing.files += c.filesChanged.length;
    for (const f of c.filesChanged) {
      if (f.status === 'A') existing.additions++;
      if (f.status === 'D') existing.deletions++;
    }
    authorMatrix.set(c.author, existing);

    // File churn
    for (const f of c.filesChanged) {
      fileChurnMap.set(f.path, (fileChurnMap.get(f.path) ?? 0) + 1);
      // Track which authors touched which files
      if (!fileAuthors.has(f.path)) fileAuthors.set(f.path, new Set());
      fileAuthors.get(f.path)!.add(c.author);
    }
  }

  // Hot modules (most changed files)
  const hotModules = Array.from(fileChurnMap.entries())
    .map(([path, churn]) => ({ path, churn }))
    .sort((a, b) => b.churn - a.churn)
    .slice(0, 20);

  // Contributor collaboration network (authors who touched same files)
  const collabMap = new Map<string, number>();
  for (const [, authors] of fileAuthors) {
    const authorList = Array.from(authors);
    for (let i = 0; i < authorList.length; i++) {
      for (let j = i + 1; j < authorList.length; j++) {
        const key = [authorList[i], authorList[j]].sort().join('|||');
        collabMap.set(key, (collabMap.get(key) ?? 0) + 1);
      }
    }
  }
  const contributorLinks = Array.from(collabMap.entries())
    .map(([key, weight]) => {
      const [source, target] = key.split('|||');
      return { source, target, weight };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 50);

  const timestamps = commits.map((c) => c.timestamp);
  const timelineRange = {
    start: Math.min(...timestamps),
    end: Math.max(...timestamps),
  };

  return { fileChurnMap, authorMatrix, hotModules, timelineRange, contributorLinks };
}
