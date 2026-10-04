#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  addIssueToProject,
  commentIssue,
  commitChanges,
  createOrReuseBranch,
  createPullRequest,
  listReadyIssues,
  parseAgentMetadata,
  pushBranch,
  updateIssueLabels,
} from "./agents/github-client.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const STATE_PATH = resolve(ROOT, "tasks/state.yml");
const GITHUB_CONFIG_PATH = resolve(ROOT, "tasks/github.json");
const LOG_DIR = resolve(ROOT, "tasks/logs");
const MAX_ATTEMPTS = 3;

function now() {
  return new Date().toISOString();
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`تعذر قراءة ${label}: ${error.message}`);
  }
}

function readState() {
  if (!existsSync(STATE_PATH)) throw new Error(`ملف الحالة غير موجود: ${STATE_PATH}`);
  return readJson(STATE_PATH, STATE_PATH);
}

function readGithubConfig() {
  return readJson(GITHUB_CONFIG_PATH, GITHUB_CONFIG_PATH);
}

function writeState(state) {
  state.updatedAt = now();
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function logPathFor(taskId) {
  return resolve(LOG_DIR, `${taskId}.log`);
}

function logFor(taskId, message) {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(logPathFor(taskId), `[${now()}] ${message}\n`, "utf8");
}

function diagnose(result) {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (!output) return "فشل الأمر بدون سجل؛ يلزم فحص الأمر أو بيئة التشغيل.";
  if (/command not found|not recognized/i.test(output)) return "الأمر المطلوب غير متاح في بيئة التشغيل.";
  if (/permission denied|EACCES/i.test(output)) return "صلاحيات غير كافية لتنفيذ الأمر أو الوصول إلى ملف.";
  if (/timeout|timed out/i.test(output)) return "انتهت مهلة التنفيذ قبل إكمال المهمة.";
  return output.split("\n").filter(Boolean).slice(-3).join(" | ");
}

function executeCommand(command, extraEnv = {}) {
  const result = spawnSync(command, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    shell: true,
    timeout: 10 * 60 * 1000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error?.message ?? ""),
  };
}

function printStatus(state) {
  if (state.tasks.length === 0) {
    console.log("لا توجد مهام. استعمل pnpm agent github sync لمزامنة GitHub.");
    return;
  }
  for (const task of state.tasks) {
    const source = task.issueNumber ? ` issue=#${task.issueNumber}` : " local";
    const fixer = task.fixCommand ? " fixer=enabled" : " fixer=disabled";
    console.log(`${task.id}\t${task.status}\tattempts=${task.attempts ?? 0}${source}${fixer}\t${task.title}`);
  }
}

function addTask(state, [id, title, ...parts]) {
  const fixIndex = parts.indexOf("--fix");
  const commandParts = fixIndex === -1 ? parts : parts.slice(0, fixIndex);
  const fixCommand = fixIndex === -1 ? null : parts.slice(fixIndex + 1).join(" ");
  const command = commandParts.join(" ");
  if (!id || !title || !command || (fixIndex !== -1 && !fixCommand)) {
    throw new Error("الاستعمال: add <id> <title> <command> [--fix <fixCommand>]");
  }
  if (state.tasks.some((task) => task.id === id)) throw new Error(`المهمة موجودة مسبقاً: ${id}`);
  state.tasks.push({
    id,
    title,
    command,
    fixCommand,
    status: "ready",
    attempts: 0,
    dependsOn: [],
    lastError: null,
    updatedAt: now(),
  });
  writeState(state);
  console.log(`تمت إضافة ${id}${fixCommand ? " مع مصلح تلقائي" : ""}.`);
}

function dependenciesPassed(task, state) {
  return (task.dependsOn ?? []).every((dependencyId) =>
    state.tasks.some((candidate) => candidate.id === dependencyId && candidate.status === "passed"),
  );
}

function nextReadyTask(state, requestedId) {
  const candidates = requestedId
    ? state.tasks.filter((task) => task.id === requestedId)
    : state.tasks;
  const task = candidates.find(
    (candidate) => ["ready", "running"].includes(candidate.status) && dependenciesPassed(candidate, state),
  );
  if (requestedId && !task && candidates.length === 0) throw new Error(`المهمة غير موجودة: ${requestedId}`);
  return task;
}

function runFixer(task, diagnosis) {
  if (!task.fixCommand) {
    logFor(task.id, "FIXER skipped: no fixCommand configured.");
    return { status: 0, skipped: true };
  }
  logFor(task.id, `FIXER start: ${task.fixCommand}`);
  const result = executeCommand(task.fixCommand, {
    AGENT_TASK_ID: task.id,
    AGENT_DIAGNOSIS: diagnosis,
    AGENT_LOG_PATH: logPathFor(task.id),
  });
  logFor(task.id, `FIXER stdout:\n${result.stdout}`);
  logFor(task.id, `FIXER stderr:\n${result.stderr}`);
  if (result.status !== 0) logFor(task.id, `FIXER failed: ${diagnose(result)}`);
  else logFor(task.id, "FIXER completed; executor will retry the task.");
  return { ...result, skipped: false };
}

function runTask(state, requestedId) {
  const task = nextReadyTask(state, requestedId);
  if (!task) {
    console.log("لا توجد مهمة جاهزة للتنفيذ.");
    return 0;
  }

  while (task.attempts < MAX_ATTEMPTS) {
    task.status = "running";
    task.attempts += 1;
    task.updatedAt = now();
    writeState(state);
    logFor(task.id, `EXECUTOR start attempt=${task.attempts}: ${task.command}`);

    const result = executeCommand(task.command);
    logFor(task.id, `EXECUTOR stdout:\n${result.stdout}`);
    logFor(task.id, `EXECUTOR stderr:\n${result.stderr}`);
    if (result.status === 0) {
      task.status = "passed";
      task.lastError = null;
      task.updatedAt = now();
      writeState(state);
      logFor(task.id, "BUILDER success; task passed.");
      console.log(`نجحت ${task.id}: ${task.title}`);
      return 0;
    }

    task.lastError = diagnose(result);
    logFor(task.id, `DIAGNOSER: ${task.lastError}`);
    const fixResult = runFixer(task, task.lastError);
    if (fixResult.status !== 0 && !fixResult.skipped) task.lastError = `فشل المصلح: ${diagnose(fixResult)}`;
    task.status = task.attempts >= MAX_ATTEMPTS ? "blocked" : "ready";
    task.updatedAt = now();
    writeState(state);

    if (task.status === "blocked") {
      logFor(task.id, "FIXER escalation after 3 attempts.");
      console.error(`توقفت ${task.id} بعد ${MAX_ATTEMPTS} محاولات: ${task.lastError}`);
      return result.status;
    }
    logFor(task.id, "FIXER completed; retrying executor automatically.");
  }
  return 1;
}

function issueLabelNames(issue) {
  return new Set((issue.labels ?? []).map((label) => label.name));
}

function syncGithub(state, config) {
  const issues = listReadyIssues(config);
  for (const issue of issues) {
    const metadata = parseAgentMetadata(issue.body);
    const id = `issue-${issue.number}`;
    const labels = issueLabelNames(issue);
    const existing = state.tasks.find((task) => task.id === id);
    const task = existing ?? { id, attempts: 0, dependsOn: [], lastError: null };
    task.title = issue.title;
    task.issueNumber = issue.number;
    task.issueUrl = issue.url;
    task.command = metadata.command ?? task.command ?? config.defaultCommand;
    task.fixCommand = metadata.fixCommand ?? task.fixCommand ?? config.defaultFixCommand;
    task.branchName = `agent/issue-${issue.number}`;
    task.status = labels.has(config.labels.done)
      ? "passed"
      : labels.has(config.labels.blocked)
        ? "blocked"
        : "ready";
    task.updatedAt = now();
    if (!existing) state.tasks.push(task);
    if (config.projectNumber) addIssueToProject(config, issue.number, config.projectNumber);
  }
  writeState(state);
  console.log(`تمت مزامنة ${issues.length} Issue من ${config.repository}.`);
  return issues.length;
}

function githubTask(state, issueNumber) {
  const tasks = state.tasks.filter((task) => task.issueNumber);
  if (issueNumber) return tasks.find((task) => task.issueNumber === Number(issueNumber));
  return tasks.find((task) => ["ready", "running"].includes(task.status));
}

function runGithub(state, config, issueNumber, publish) {
  syncGithub(state, config);
  const task = githubTask(state, issueNumber);
  if (!task) throw new Error("ما لقيتش Issue جاهزة. زِد label agent:ready ثم شغّل sync.");

  createOrReuseBranch(ROOT, task.branchName, config.defaultBranch);
  updateIssueLabels(config, task.issueNumber, {
    add: [config.labels.inProgress],
    remove: [config.labels.ready, config.labels.blocked],
  });
  commentIssue(config, task.issueNumber, `بدأ GitHub Agents تنفيذ المهمة على branch \`${task.branchName}\`.\n\nالأمر: \`${task.command}\``);

  const exitCode = runTask(state, task.id);
  if (exitCode === 0 && task.status === "passed") {
    const committed = commitChanges(ROOT, `agent: complete #${task.issueNumber} ${task.title}`);
    let pullRequest = null;
    if (publish) {
      pushBranch(ROOT, task.branchName);
      pullRequest = createPullRequest(config, task.branchName, task);
    }
    updateIssueLabels(config, task.issueNumber, {
      add: [config.labels.done],
      remove: [config.labels.inProgress, config.labels.ready],
    });
    commentIssue(
      config,
      task.issueNumber,
      `نجحت المهمة بعد ${task.attempts} محاولة.\n\n- commit: ${committed ? "تم" : "لا توجد تغييرات"}\n- النشر: ${publish ? "تم إنشاء/رفع PR" : "متوقف افتراضياً؛ استعمل --publish"}${pullRequest ? `\n- PR: ${pullRequest}` : ""}`,
    );
    console.log(`اكتملت Issue #${task.issueNumber}.`);
  } else {
    updateIssueLabels(config, task.issueNumber, {
      add: [config.labels.blocked],
      remove: [config.labels.inProgress, config.labels.ready],
    });
    commentIssue(config, task.issueNumber, `توقفت المهمة بعد ${task.attempts} محاولات.\n\nالتشخيص: ${task.lastError}`);
  }
  return exitCode;
}

function main() {
  const [action = "status", ...args] = process.argv.slice(2);
  const state = readState();
  if (!Array.isArray(state.tasks)) throw new Error("صيغة state.yml غير صحيحة: tasks يجب أن تكون قائمة.");

  if (action === "status") printStatus(state);
  else if (action === "add") addTask(state, args);
  else if (action === "run") process.exitCode = runTask(state, args[0]);
  else if (action === "github") {
    const config = readGithubConfig();
    const subcommand = args[0] ?? "sync";
    if (subcommand === "sync") syncGithub(state, config);
    else if (subcommand === "run") {
      const issueNumber = args.find((arg) => /^\d+$/.test(arg));
      process.exitCode = runGithub(state, config, issueNumber, args.includes("--publish"));
    } else if (subcommand === "config") console.log(JSON.stringify(config, null, 2));
    else throw new Error("الاستعمال: github sync | github run [issue-number] [--publish] | github config");
  } else throw new Error(`أمر غير معروف: ${action}. استعمل status أو add أو run أو github.`);
}

try {
  main();
} catch (error) {
  console.error(`خطأ في المنسّق: ${error.message}`);
  process.exitCode = 1;
}
