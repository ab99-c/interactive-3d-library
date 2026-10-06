#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CONFIG_PATH = resolve(ROOT, "tasks/github.json");
const WORKTREE_ROOT = resolve(ROOT, ".agent-worktrees");
const MAX_FILES = 40;
const MAX_FILE_BYTES = 12_000;
const MAX_ATTEMPTS = 3;
const POLL_MS = Number(process.env.AGENT_POLL_MS ?? 60_000);

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const token = process.env.OPENAI_API_KEY;
const apiBase = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
const model = process.env.AGENT_MODEL || "gpt-4o-mini";
const autoMode = process.env.AGENT_AUTO_APPROVE === "true";

function gh(args, cwd = ROOT) {
  return execFileSync("gh", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", GH_FORCE_TTY: "0" },
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).trim();
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function listReadyIssues() {
  const raw = gh(["issue", "list", "--repo", config.repository, "--state", "open", "--label", config.labels.ready, "--limit", "20", "--json", "number,title,body,url,labels,author"]);
  return raw ? JSON.parse(raw) : [];
}

function issueMetadata(issue) {
  const block = issue.body?.match(/<!--\s*agent\s*:\s*([\s\S]*?)-->/i)?.[1] ?? "";
  const values = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^\s*(command|fixCommand)\s*:\s*(.+?)\s*$/i);
    if (match) values[match[1].toLowerCase()] = match[2];
  }
  return values;
}

function fileTree(root) {
  const ignored = new Set([".git", "node_modules", "dist", "build", ".agent-worktrees"]);
  const result = [];
  function walk(dir) {
    if (result.length >= MAX_FILES) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name) || entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else result.push(path.slice(root.length + 1));
      if (result.length >= MAX_FILES) return;
    }
  }
  walk(root);
  return result;
}

function sourceSnapshot(root) {
  return fileTree(root).map((relative) => {
    const path = join(root, relative);
    try {
      const content = readFileSync(path, "utf8");
      return `\n--- ${relative} ---\n${content.slice(0, MAX_FILE_BYTES)}`;
    } catch {
      return "";
    }
  }).join("");
}

async function askModel(issue, root, diagnostics = "") {
  if (!token) throw new Error("OPENAI_API_KEY غير مضبوط. ضعه في متغيرات بيئة Windows.");
  const prompt = `أنت مهندس إصلاح داخل مستودع GitHub. أعد JSON فقط بلا markdown.
المهمة:
العنوان: ${issue.title}
الوصف:
${issue.body || "(بدون وصف)"}

السجلات/التشخيص:
${diagnostics || "لا توجد سجلات بعد"}

قواعد صارمة:
- اقترح أقل تغيير ممكن.
- لا تعدل .github أو ملفات الأسرار أو lockfiles.
- لا تستعمل shell commands داخل patch.
- أعد diff unified صالحاً لـ git apply.
- tests يجب أن تكون أوامر موجودة في package.json فقط.
- إذا كانت المهمة غير واضحة أعد action=escalate.

الصيغة:
{"action":"fix|escalate","diagnosis":"...","confidence":"high|medium|low","patch":"diff unified أو فارغ","tests":["pnpm check"]}

ملفات المستودع:
${sourceSnapshot(root)}`;
  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`LLM HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("LLM رجّع جواباً فارغاً");
  return JSON.parse(content.replace(/^```json\s*|```$/g, "").trim());
}

function validatePatch(patch) {
  if (!patch || patch.length > 200_000) throw new Error("patch فارغ أو كبير جداً");
  if (/\.github|(^|\n)\+.*\.env|(^|\n)\+.*(api[_-]?key|token|secret)/i.test(patch)) {
    throw new Error("patch مرفوض: يحاول لمس CI أو أسرار");
  }
  if (/^\+\+\+\s+[ab]\/\.env|^\+\+\+\s+[ab]\/.*(key|secret)/im.test(patch)) {
    throw new Error("patch مرفوض: ملف حساس");
  }
}

function run(command, cwd) {
  const result = spawnSync(command, { cwd, shell: true, encoding: "utf8", timeout: 10 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 });
  return { code: result.status ?? 1, output: `${result.stdout || ""}\n${result.stderr || ""}`.trim() };
}

function safeTestCommand(command) {
  if (!command || !/^pnpm (check|lint|test|build)( && pnpm (check|lint|test|build))*$/.test(command)) {
    throw new Error(`أمر اختبار مرفوض: ${command}`);
  }
  return command;
}

function applyPatch(patch, cwd, checkOnly = false) {
  const args = checkOnly ? ["apply", "--check", "-"] : ["apply", "-"];
  const result = spawnSync("git", args, { cwd, input: patch, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return { code: result.status ?? 1, output: `${result.stdout || ""}\n${result.stderr || ""}`.trim() };
}

function createWorktree(issue) {
  mkdirSync(WORKTREE_ROOT, { recursive: true });
  const branch = `agent/issue-${issue.number}`;
  const path = join(WORKTREE_ROOT, branch.replaceAll("/", "-"));
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  git(["fetch", "origin", config.defaultBranch], ROOT);
  git(["worktree", "add", "-B", branch, path, `origin/${config.defaultBranch}`], ROOT);
  return { branch, path };
}

async function executeIssue(issue) {
  const { branch, path } = createWorktree(issue);
  const metadata = issueMetadata(issue);
  let diagnostics = "";
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      log(`Issue #${issue.number}: محاولة ${attempt}/${MAX_ATTEMPTS}`);
      const plan = await askModel(issue, path, diagnostics);
      log(`التشخيص: ${plan.diagnosis} (${plan.confidence})`);
      if (plan.action !== "fix" || plan.confidence !== "high") {
        gh(["issue", "comment", String(issue.number), "--repo", config.repository, "--body", `توقف الوكيل للمراجعة البشرية.\n\nالتشخيص: ${plan.diagnosis}\nالثقة: ${plan.confidence}`]);
        return false;
      }
      if (!autoMode) {
        gh(["issue", "comment", String(issue.number), "--repo", config.repository, "--body", `خطة إصلاح جاهزة، لكن AGENT_AUTO_APPROVE ليس مفعلاً.\n\n${plan.diagnosis}\n\nلتطبيقها محلياً: شغّل الوكيل مع AGENT_AUTO_APPROVE=true.`]);
        return false;
      }
      validatePatch(plan.patch);
      const check = applyPatch(plan.patch, path, true);
      if (check.code !== 0) throw new Error(`patch غير صالح: ${check.output}`);
      const applied = applyPatch(plan.patch, path);
      if (applied.code !== 0) throw new Error(`تعذر تطبيق patch: ${applied.output}`);
      const commands = (plan.tests?.length ? plan.tests : [metadata.command || config.defaultCommand]).map(safeTestCommand);
      const result = run(commands.join(" && "), path);
      if (result.code === 0) {
        git(["config", "user.name", "local-github-agent"], path);
        git(["config", "user.email", "local-github-agent@users.noreply.github.com"], path);
        git(["add", "--all"], path);
        git(["commit", "-m", `agent: fix #${issue.number} ${issue.title}`], path);
        git(["push", "--set-upstream", "origin", branch], path);
        gh(["pr", "create", "--repo", config.repository, "--base", config.defaultBranch, "--head", branch, "--title", `agent: fix #${issue.number} ${issue.title}`, "--body", `Closes #${issue.number}\n\nتم الإصلاح والاختبار بواسطة الوكيل المحلي.`], path);
        gh(["issue", "edit", String(issue.number), "--repo", config.repository, "--add-label", config.labels.done, "--remove-label", config.labels.ready]);
        return true;
      }
      diagnostics = result.output;
      log(`فشل الاختبار: ${diagnostics.slice(-1000)}`);
    }
    gh(["issue", "edit", String(issue.number), "--repo", config.repository, "--add-label", config.labels.blocked, "--remove-label", config.labels.ready]);
    return false;
  } finally {
    try { git(["worktree", "remove", "--force", path], ROOT); } catch {}
  }
}

async function tick() {
  const issues = listReadyIssues();
  if (!issues.length) return;
  for (const issue of issues) {
    try {
      gh(["issue", "edit", String(issue.number), "--repo", config.repository, "--add-label", config.labels.inProgress, "--remove-label", config.labels.ready]);
      await executeIssue(issue);
    } catch (error) {
      log(`Issue #${issue.number} فشلت: ${error.message}`);
      gh(["issue", "comment", String(issue.number), "--repo", config.repository, "--body", `خطأ في الوكيل المحلي: ${error.message}`]);
      gh(["issue", "edit", String(issue.number), "--repo", config.repository, "--add-label", config.labels.blocked, "--remove-label", config.labels.inProgress]);
    }
  }
}

async function main() {
  if (!existsSync(CONFIG_PATH)) throw new Error(`الإعداد غير موجود: ${CONFIG_PATH}`);
  log(`Local GitHub Agent شغال على ${config.repository}; auto=${autoMode}; model=${model}`);
  await tick();
  if (process.argv.includes("--once")) return;
  setInterval(() => tick().catch((error) => log(`خطأ في المراقبة: ${error.message}`)), POLL_MS);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
