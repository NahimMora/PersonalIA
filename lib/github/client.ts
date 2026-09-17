import { Octokit } from "@octokit/rest";
import type { Repository } from "@prisma/client";

/**
 * Resolves the Octokit client for a given repository row. The actual token
 * value NEVER lives in the database — only the name of the env var that holds
 * it (`tokenEnvVar`), so multiple repos can share one token or use separate
 * fine-grained PATs per org.
 */
export function getOctokitForRepo(repo: Pick<Repository, "tokenEnvVar">): Octokit {
  const token = process.env[repo.tokenEnvVar];
  if (!token) {
    throw new Error(
      `Falta la variable de entorno "${repo.tokenEnvVar}" con el token de GitHub para este repositorio.`
    );
  }
  return new Octokit({ auth: token });
}

export interface RepoFile {
  path: string;
  sha: string;
}

const DOC_PATTERNS = [
  /^README\.md$/i,
  /^CLAUDE\.md$/i,
  /^AGENTS\.md$/i,
  /^CONTRIBUTING\.md$/i,
  /^docs\/.*\.md$/i,
];

export async function listRepoDocFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<RepoFile[]> {
  const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: refData.object.sha,
    recursive: "true",
  });

  return (tree.tree ?? [])
    .filter((entry) => entry.type === "blob" && entry.path && entry.sha)
    .filter((entry) => DOC_PATTERNS.some((pattern) => pattern.test(entry.path!)))
    .map((entry) => ({ path: entry.path!, sha: entry.sha! }));
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== "file" || !data.content) {
    throw new Error(`No se pudo leer el contenido de ${path}`);
  }
  return Buffer.from(data.content, "base64").toString("utf-8");
}
