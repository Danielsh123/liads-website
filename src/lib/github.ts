/**
 * Minimal client-side GitHub Contents API wrapper used by the Admin Studio to
 * publish content directly from the browser (no backend — this is a static
 * GitHub Pages site). The GitHub REST API supports CORS, so these calls work
 * from a page fetch as long as the caller supplies a token with `repo` write
 * access. The token is never stored anywhere but the admin's own browser
 * (see adminStudio.ts) — this module just uses whatever it's given.
 */

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export class GitHubApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

const API_ROOT = "https://api.github.com";

function headers(cfg: GitHubConfig, extra?: Record<string, string>): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

function contentsUrl(cfg: GitHubConfig, path: string): string {
  return `${API_ROOT}/repos/${cfg.owner}/${cfg.repo}/contents/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** UTF-8 safe base64 encode (handles Hebrew and other non-Latin1 text). */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** UTF-8 safe base64 decode. */
export function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Verify a token can read the repo. Throws GitHubApiError with a friendly message on failure. */
export async function verifyAccess(cfg: GitHubConfig): Promise<void> {
  const res = await fetch(`${API_ROOT}/repos/${cfg.owner}/${cfg.repo}`, { headers: headers(cfg) });
  if (res.status === 401) throw new GitHubApiError("That key was rejected — check it's copied correctly.", 401);
  if (res.status === 404) throw new GitHubApiError("Key doesn't have access to the site's repo.", 404);
  if (!res.ok) throw new GitHubApiError(await parseErrorBody(res), res.status);
}

export interface FetchedFile<T> {
  data: T;
  sha: string;
}

/** Fetch and JSON-parse a file from the repo, along with its blob sha (needed to update it). */
export async function getJsonFile<T>(cfg: GitHubConfig, path: string): Promise<FetchedFile<T>> {
  const res = await fetch(`${contentsUrl(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg),
  });
  if (!res.ok) throw new GitHubApiError(await parseErrorBody(res), res.status);
  const body = await res.json();
  const text = base64ToUtf8(body.content as string);
  return { data: JSON.parse(text) as T, sha: body.sha as string };
}

/** Fetch just the current sha of a file, or null if it doesn't exist yet. */
async function getSha(cfg: GitHubConfig, path: string): Promise<string | null> {
  const res = await fetch(`${contentsUrl(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubApiError(await parseErrorBody(res), res.status);
  const body = await res.json();
  return body.sha as string;
}

async function putContent(
  cfg: GitHubConfig,
  path: string,
  base64Content: string,
  message: string,
  sha: string | null,
): Promise<{ sha: string }> {
  const res = await fetch(contentsUrl(cfg, path), {
    method: "PUT",
    headers: headers(cfg, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      message,
      content: base64Content,
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.status === 409) throw new GitHubApiError("conflict", 409);
  if (!res.ok) throw new GitHubApiError(await parseErrorBody(res), res.status);
  const body = await res.json();
  return { sha: body.content.sha as string };
}

/**
 * Write a JSON file, retrying once on a 409 (someone else changed the file
 * between our read and write) by refetching the sha and re-applying `mutate`
 * to the *latest* data before writing again.
 */
export async function writeJsonFile<T>(
  cfg: GitHubConfig,
  path: string,
  message: string,
  mutate: (current: T | null) => T,
): Promise<void> {
  let current: T | null = null;
  let sha: string | null = null;
  try {
    const fetched = await getJsonFile<T>(cfg, path);
    current = fetched.data;
    sha = fetched.sha;
  } catch (err) {
    if (!(err instanceof GitHubApiError && err.status === 404)) throw err;
  }

  const next = mutate(current);
  const encoded = utf8ToBase64(JSON.stringify(next, null, 2) + "\n");

  try {
    await putContent(cfg, path, encoded, message, sha);
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 409) {
      const retrySha = await getSha(cfg, path);
      const retryFetched = retrySha ? await getJsonFile<T>(cfg, path) : { data: null, sha: null };
      const retryNext = mutate(retryFetched.data);
      const retryEncoded = utf8ToBase64(JSON.stringify(retryNext, null, 2) + "\n");
      await putContent(cfg, path, retryEncoded, message, retrySha);
      return;
    }
    throw err;
  }
}

/** Upload a binary asset (e.g. an image) given its raw bytes as a base64 string (no data: prefix). */
export async function writeBinaryFile(
  cfg: GitHubConfig,
  path: string,
  base64Content: string,
  message: string,
): Promise<string> {
  const existingSha = await getSha(cfg, path);
  const { sha } = await putContent(cfg, path, base64Content, message, existingSha);
  return sha;
}

/** Strip a `data:<mime>;base64,` prefix off a FileReader `readAsDataURL` result. */
export function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}
