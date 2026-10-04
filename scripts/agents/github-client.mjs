import { execFileSync } from "node:child_process";

function gh(args, options = {}) {
  try {
    return execFileSync("gh", args, {
      cwd: options.cwd,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1", GH_FORCE_TTY: "0" },
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["ignore", "pipe", options.quiet ? "ignore" : "pipe"],
    }).trim();
  } catch (error) {
    const details = error.stderr?.toString().trim() || error.message;
    throw new Error(`gh ${args.join(" ")} فشل: ${details}`);
  }
}

function git(args, root) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const details = error.stderr?.toString().trim() || error.message;
    throw new Error(`git ${args.join(" ")} فشل: ${details}`);
  }
}

export function listReadyIssues(config) {
  const output = gh([
    "issue",
    "list",
    "--repo",
    config.repository,
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,body,url,labels,state",
  ]);
  const issues = output ? JSON.parse(output) : [];
  const agentLabels = new Set(Object.values(config.labels).filter(Boolean));
  return issues.filter((issue) => issue.labels.some((label) => agentLabels.has(label.name)));
}

export function issueUrl(config, issueNumber) {
  return `https://github.com/${config.repository}/issues/${issueNumber}`;
}

export function updateIssueLabels(config, issueNumber, { add = [], remove = [] } = {}) {
  const args = ["issue", "edit", String(issueNumber), "--repo", config.repository];
  for (const label of add.filter(Boolean)) args.push("--add-label", label);
  for (const label of remove.filter(Boolean)) args.push("--remove-label", label);
  if (add.length || remove.length) gh(args);
}

export function commentIssue(config, issueNumber, body) {
  gh(["issue", "comment", String(issueNumber), "--repo", config.repository, "--body", body]);
}

export function addIssueToProject(config, issueNumber, projectNumber) {
  if (!projectNumber) return false;
  try {
    gh([
      "project",
      "item-add",
      String(projectNumber),
      "--owner",
      config.repository.split("/")[0],
      "--url",
      issueUrl(config, issueNumber),
    ]);
    return true;
  } catch (error) {
    if (/already exists|already added|duplicate/i.test(error.message)) return false;
    throw error;
  }
}

export function createOrReuseBranch(root, branchName, baseBranch) {
  const current = git(["branch", "--show-current"], root);
  if (current === branchName) return { created: false, current };
  const existing = git(["branch", "--list", branchName], root);
  if (existing) {
    git(["switch", branchName], root);
    return { created: false, current: branchName };
  }
  git(["switch", "-c", branchName, baseBranch], root);
  return { created: true, current: branchName };
}

export function gitSummary(root) {
  return git(["status", "--short"], root);
}

export function commitChanges(root, message) {
  const status = gitSummary(root);
  if (!status) return false;
  git(["add", "--all"], root);
  git(["commit", "-m", message], root);
  return true;
}

export function pushBranch(root, branchName) {
  git(["push", "--set-upstream", "origin", branchName], root);
}

export function createPullRequest(config, branchName, issue) {
  return gh([
    "pr",
    "create",
    "--repo",
    config.repository,
    "--base",
    config.defaultBranch,
    "--head",
    branchName,
    "--title",
    `agent: ${issue.title}`,
    "--body",
    `Closes #${issue.number}\n\nتم إنشاء هذا الـ PR بواسطة GitHub Agents بعد نجاح الفحوصات.`,
  ]);
}

export function parseAgentMetadata(body = "") {
  const metadataBlock = body.match(/<!--\s*agent\s*:\s*([\s\S]*?)-->/i)?.[1] ?? "";
  const values = {};
  for (const line of metadataBlock.split("\n")) {
    const match = line.match(/^\s*(command|fixCommand)\s*:\s*(.+?)\s*$/i);
    if (match) values[match[1].toLowerCase()] = match[2];
  }
  return {
    command: values.command ?? null,
    fixCommand: values.fixcommand ?? null,
  };
}
