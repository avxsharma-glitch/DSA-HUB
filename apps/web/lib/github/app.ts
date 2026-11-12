import "server-only";

import { createSign } from "node:crypto";

const API_ROOT = "https://api.github.com";
const API_VERSION = "2026-03-10";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(name + " is not configured.");
  return value;
}

export function isGithubAppConfigured(): boolean {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function createAppJwt(): string {
  const appId = requiredEnv("GITHUB_APP_ID");
  const privateKey = requiredEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iat: now - 30, exp: now + 8 * 60, iss: appId }));
  const unsigned = header + "." + payload;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return unsigned + "." + signer.sign(privateKey).toString("base64url");
}

async function githubRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_ROOT + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": API_VERSION,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers
    },
    cache: "no-store"
  });

  const raw = await response.text();
  let data: unknown = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "message" in data
      ? String((data as { message: unknown }).message)
      : "GitHub API request failed with status " + response.status;
    throw new Error(message);
  }
  return data as T;
}

export type GithubInstallationInfo = {
  id: number;
  app_id: number;
  app_slug?: string;
  account: { id: number; login: string; type: "User" | "Organization" };
};

export type GithubRepositoryInfo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
};

export async function getGithubInstallation(installationId: number): Promise<GithubInstallationInfo> {
  const jwt = createAppJwt();
  return githubRequest<GithubInstallationInfo>("/app/installations/" + installationId, jwt);
}

export async function getInstallationToken(installationId: number, repositoryIds?: number[]): Promise<string> {
  const jwt = createAppJwt();
  const body: Record<string, unknown> = {
    permissions: { contents: "write" }
  };
  if (repositoryIds?.length) body.repository_ids = repositoryIds;

  const result = await githubRequest<{ token: string }>(
    "/app/installations/" + installationId + "/access_tokens",
    jwt,
    { method: "POST", body: JSON.stringify(body) }
  );
  return result.token;
}

export async function listInstallationRepositories(installationId: number): Promise<GithubRepositoryInfo[]> {
  const token = await getInstallationToken(installationId);
  const result = await githubRequest<{ repositories: GithubRepositoryInfo[] }>(
    "/installation/repositories?per_page=100&page=1",
    token
  );
  return result.repositories;
}

export async function writeGithubFile(args: {
  installationId: number;
  repositoryId: number;
  owner: string;
  repository: string;
  path: string;
  branch: string;
  content: string;
  message: string;
  existingFileSha?: string;
}): Promise<{ html_url: string; commit: { sha: string } }> {
  const token = await getInstallationToken(args.installationId, [args.repositoryId]);
  const encodedPath = args.path.split("/").map(encodeURIComponent).join("/");
  const result = await githubRequest<{ content: { html_url: string }; commit: { sha: string } }>(
    "/repos/" + encodeURIComponent(args.owner) + "/" + encodeURIComponent(args.repository) + "/contents/" + encodedPath,
    token,
    {
      method: "PUT",
      body: JSON.stringify({
        message: args.message,
        content: Buffer.from(args.content, "utf8").toString("base64"),
        branch: args.branch,
        ...(args.existingFileSha ? { sha: args.existingFileSha } : {})
      })
    }
  );
  return { html_url: result.content.html_url, commit: result.commit };
}

export async function getGithubFileSha(args: {
  installationId: number;
  repositoryId: number;
  owner: string;
  repository: string;
  path: string;
  branch: string;
}): Promise<string | null> {
  const token = await getInstallationToken(args.installationId, [args.repositoryId]);
  const encodedPath = args.path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    API_ROOT + "/repos/" + encodeURIComponent(args.owner) + "/" + encodeURIComponent(args.repository) +
      "/contents/" + encodedPath + "?ref=" + encodeURIComponent(args.branch),
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": API_VERSION
      },
      cache: "no-store"
    }
  );
  if (response.status === 404) return null;
  const raw = await response.text();
  if (!response.ok) throw new Error("Could not inspect the target GitHub file (HTTP " + response.status + ").");
  const data = JSON.parse(raw) as { sha?: string; type?: string };
  if (data.type !== "file" || !data.sha) throw new Error("The target GitHub path is not a regular file.");
  return data.sha;
}
