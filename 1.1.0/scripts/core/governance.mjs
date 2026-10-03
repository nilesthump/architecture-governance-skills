import fs from "node:fs";
import path from "node:path";
import {
  rootOf,
  safe,
  suiteRoot,
  readJSON,
  write,
  transaction,
  validate,
  fail,
  git,
} from "./util.mjs";
import { integrity } from "./artifacts.mjs";
const template = (name, values) =>
  fs
    .readFileSync(path.join(suiteRoot, "templates", name), "utf8")
    .replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "unknown");
export function installGovernance(input) {
  const root = rootOf(input);
  if (input.mode !== "greenfield")
    fail(
      "user_decision_required",
      "Existing repository uses approved governance.apply proposal",
    );
  const current = integrity(input);
  validate("validation", input.contract);
  if (!Array.isArray(input.allowedPaths) || !input.allowedPaths.length)
    fail("user_decision_required", "Explicit write scope required");
  for (const pattern of input.allowedPaths) {
    const rel = pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern;
    if (rel === "*" || rel === "**")
      fail("validation_failed", "Unbounded write scope forbidden");
    safe(root, rel);
  }
  const values = {
    canonical: root,
    version: current.version,
    branch: git(root, ["branch", "--show-current"], true) ?? "main",
    worktree: "none",
  };
  const changes = [
    { path: "AGENTS.md", content: template("AGENTS.md", values) },
    { path: "CLAUDE.md", content: template("CLAUDE.md", values) },
    {
      path: "spec/governance/WORKFLOW.md",
      content: template("WORKFLOW.md", values),
    },
    {
      path: "spec/governance/WRITE_SCOPE.md",
      content:
        "# Write scope\n\nAllowed paths (current task scope):\n" +
        input.allowedPaths.map((p) => "- " + p).join("\n") +
        "\n\nAll other paths are read-only. Scope expansion requires explicit human approval.\n",
    },
    {
      path: "spec/governance/validation.json",
      content: JSON.stringify(input.contract, null, 2) + "\n",
    },
    {
      path: "spec/progress/CURRENT.md",
      content: template("PROGRESS.md", values),
    },
  ];
  for (const c of changes) {
    if (fs.existsSync(safe(root, c.path)))
      fail(
        "user_decision_required",
        "Existing governance must be preserved or changed by approved proposal: " +
          c.path,
      );
  }
  transaction(root, changes);
  return {
    changed: changes.map((c) => c.path),
    version: current.version,
    behavioralVerification: "pending",
  };
}
export function progress(input, update = false) {
  const root = rootOf(input),
    p = safe(root, "spec/progress/CURRENT.md");
  if (!update)
    return {
      content: fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null,
      branch: git(root, ["branch", "--show-current"], true),
      worktrees: git(root, ["worktree", "list", "--porcelain"], true),
    };
  if (
    input.approval?.approved !== true ||
    !input.approval.paths?.includes("spec/progress/CURRENT.md")
  )
    fail("user_decision_required", "Progress write scope approval required");
  if (typeof input.content !== "string" || !input.content.trim())
    fail("validation_failed", "Nonempty progress content required");
  transaction(root, [
    { path: "spec/progress/CURRENT.md", content: input.content },
  ]);
  return { updated: true };
}
export function governanceTest(input) {
  const root = rootOf(input);
  const required = [
    "AGENTS.md",
    "CLAUDE.md",
    "spec/governance/WORKFLOW.md",
    "spec/governance/WRITE_SCOPE.md",
    "spec/progress/CURRENT.md",
    "spec/governance/validation.json",
  ];
  for (const p of required) {
    if (!fs.existsSync(safe(root, p)))
      fail("validation_failed", "Missing governance file: " + p);
  }
  if (
    fs.readFileSync(safe(root, "CLAUDE.md"), "utf8").trim() !==
    "Read and follow ./AGENTS.md."
  )
    fail("validation_failed", "CLAUDE must route to AGENTS");
  integrity(input);
  validate(
    "validation",
    readJSON(safe(root, "spec/governance/validation.json")),
  );
  return { structuralChecks: "success", ...verifyBehaviorTrace(input) };
}
export function verifyBehaviorTrace(input) {
  if (!input.trace)
    fail(
      "user_decision_required",
      "Real fresh-context behavior trace required",
      { structuralChecks: "success", behavioralChecks: "not_run" },
    );
  const t = input.trace;
  if (
    t.simulated ||
    t.freshContext !== true ||
    !t.hostTrace ||
    !t.agent ||
    !t.continuationAgent ||
    t.agent === t.continuationAgent
  )
    fail(
      "validation_failed",
      "Independent real agent and distinct continuation agent required",
    );
  const requiredEvents = [
    "ordered-spec-read",
    "current-architecture-resolved",
    "minimum-implementation",
    "scope-refusal",
    "task-worktree-created",
    "local-validation-passed",
    "independent-review-passed",
    "pr-ci-passed",
    "canonical-integrated",
    "canonical-verified",
    "progress-updated",
    "fresh-agent-continued",
  ];
  for (const event of requiredEvents) {
    if (
      !t.events?.some(
        (e) => e.kind === event && e.evidence && e.observed === true,
      )
    )
      fail("validation_failed", "Missing actual behavior evidence: " + event);
  }
  return {
    structuralChecks: "success",
    behavioralChecks: "trace_validated",
    hostTrace: t.hostTrace,
    limitation:
      "Host must retain original tool traces; JSON claims alone cannot prove actual behavior",
  };
}
