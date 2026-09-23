import { Octokit } from "https://esm.sh/@octokit/rest@22.0.1";
import { APP } from "./config.js";
import { historyToMarkdown, memoryPayload } from "./storage.js";

export function getGithubConfig() {
  return {
    owner: localStorage.getItem("shc:ghOwner") || "",
    repo: localStorage.getItem("shc:ghRepo") || "",
    branch: localStorage.getItem("shc:ghBranch") || "main",
    token: localStorage.getItem("shc:ghToken") || ""
  };
}

function client() {
  const cfg = getGithubConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) throw new Error("GitHub is not configured.");
  return { cfg, octokit: new Octokit({ auth: cfg.token }) };
}

export async function testGithub() {
  const { cfg, octokit } = client();
  const { data } = await octokit.rest.repos.get({ owner: cfg.owner, repo: cfg.repo });
  return data;
}

async function getFile(path) {
  const { cfg, octokit } = client();
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: cfg.owner, repo: cfg.repo, path, ref: cfg.branch
    });
    if (Array.isArray(data)) throw new Error(`${path} is a directory.`);
    const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
    return { content: decoded, sha: data.sha };
  } catch (err) {
    if (err.status === 404) return { content: null, sha: null };
    throw err;
  }
}

async function putFile(path, content, message, sha = undefined) {
  const { cfg, octokit } = client();
  const body = {
    owner: cfg.owner, repo: cfg.repo, path,
    message, content: btoa(unescape(encodeURIComponent(content))),
    branch: cfg.branch
  };
  if (sha) body.sha = sha;
  return octokit.rest.repos.createOrUpdateFileContents(body);
}

export async function loadMemoryFromGithub() {
  const [p, r, g, h] = await Promise.all([
    getFile(APP.memoryPaths.profile),
    getFile(APP.memoryPaths.routine),
    getFile(APP.memoryPaths.progress),
    getFile(APP.memoryPaths.history)
  ]);
  return {
    profile: p.content ? JSON.parse(p.content) : null,
    routine: r.content ? JSON.parse(r.content) : null,
    progress: g.content ? JSON.parse(g.content) : null,
    historyMarkdown: h.content || ""
  };
}

export async function syncMemory(memory) {
  // Files are written serially to avoid GitHub Contents API update conflicts.
  const payload = memoryPayload(memory);
  const files = [
    [APP.memoryPaths.profile, JSON.stringify(payload.profile, null, 2), "chore: update athlete profile"],
    [APP.memoryPaths.routine, JSON.stringify(payload.routine, null, 2), "chore: update current routine"],
    [APP.memoryPaths.progress, JSON.stringify(payload.progress, null, 2), "chore: update progress"],
    [APP.memoryPaths.history, historyToMarkdown(memory), "chore: update training history"]
  ];
  const results = [];
  for (const [path, content, message] of files) {
    const current = await getFile(path);
    results.push(await putFile(path, content, message, current.sha || undefined));
  }
  return results;
}
