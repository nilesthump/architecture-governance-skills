import fs from "node:fs";
import path from "node:path";
import {
  rootOf,
  safe,
  walk,
  fileHash,
  git,
  revision,
  fail,
  validate,
  run,
  readJSON,
  transaction,
  digest,
} from "./util.mjs";
const devops = (rel) =>
  /\.(mjs|cjs|js|ts|py|sh|ps1|cmd|bat|rb|go|rs|toml|lock)$/.test(rel) ||
  /(^|\/)(eslint\.config|tsconfig|babel\.config|vite\.config|webpack\.config|\.npmrc|\.pnpmfile|\.prettierrc|\.python-version|\.node-version)/.test(
    rel,
  ) ||
  /^(tools\/|\.husky\/)/.test(rel) ||
  /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|Makefile|Dockerfile[^/]*|compose[^/]*|requirements[^/]*|pyproject\.toml|Cargo\.(toml|lock)|go\.(mod|sum)|pom\.xml|build\.gradle[^/]*|\.tool-versions|\.nvmrc|\.env[^/]*|AGENTS\.md|CLAUDE\.md)$/.test(
    rel,
  ) ||
  /^(\.github\/|\.gitlab-ci|\.circleci\/|scripts\/|deploy\/|spec\/governance\/)/.test(
    rel,
  );
export function inspect(input) {
  const root = rootOf(input),
    files = walk(root);
  const records = files.map((p) => ({
    path: p,
    sha256: fileHash(safe(root, p)),
    devops: devops(p),
  }));
  return {
    root,
    revision: revision(root),
    branch: git(root, ["branch", "--show-current"], true),
    status: git(root, ["status", "--porcelain"], true),
    worktrees: git(root, ["worktree", "list", "--porcelain"], true),
    files: records,
    baselineDigest: digest(records),
    mode: files.some((p) => !["README.md", "LICENSE"].includes(p))
      ? "existing"
      : "greenfield",
    unknownRemotePolicies: true,
  };
}
export function discover(input) {
  const root = rootOf(input),
    commands = [];
  if (fs.existsSync(safe(root, "package.json"))) {
    const pkg = readJSON(safe(root, "package.json"));
    for (const [name, script] of Object.entries(pkg.scripts ?? {}))
      commands.push({
        name,
        declaredCommand: script,
        executionRequiresApproval: true,
      });
  }
  return {
    entryPoints: commands,
    files: inspect(input).files.filter((f) => f.devops),
    note: "Discovery never executes repository commands. Existing CI definitions remain authoritative.",
  };
}
export function validation(input) {
  const root = rootOf(input),
    contract = validate("validation", input.contract),
    results = [];
  for (const c of contract.commands) {
    const started = Date.now();
    try {
      const stdout = run(c.executable, c.args, {
        cwd: root,
        env: { ...process.env, ...c.env },
      });
      results.push({
        name: c.name,
        status: "success",
        milliseconds: Date.now() - started,
        stdout,
      });
    } catch (e) {
      fail("validation_failed", "Validation command failed: " + c.name, {
        results,
        failed: { name: c.name, ...e.data },
      });
    }
  }
  return {
    contractDigest: digest(contract),
    revision: revision(root),
    results,
  };
}
export function apply(input) {
  const root = rootOf(input);
  if (!input.baseline?.files || input.baseline.root !== root)
    fail("validation_failed", "Exact inspected repository baseline required");
  if (input.approval?.approved !== true)
    fail("user_decision_required", "Exact proposal approval required");
  if (!Array.isArray(input.changes) || !input.changes.length)
    fail("validation_failed", "Nonempty changes required");
  const approved = new Set(input.approval.paths ?? []),
    names = new Set();
  for (const c of input.changes) {
    const p = safe(root, c.path);
    if (names.has(c.path)) fail("validation_failed", "Duplicate change path");
    names.add(c.path);
    if (!approved.has(c.path))
      fail("user_decision_required", "Unapproved path: " + c.path);
    if (c.beforeHash !== fileHash(p))
      fail("validation_failed", "Stale before hash: " + c.path);
    if (typeof c.content !== "string")
      fail("validation_failed", "Change content must be text");
  }
  if (input.baseline) {
    const current = inspect(input);
    for (const f of input.baseline.files) {
      if (
        f.devops &&
        !input.approval.approvedDevops?.includes(f.path) &&
        fileHash(safe(root, f.path)) !== f.sha256
      )
        fail("validation_failed", "DevOps baseline drift: " + f.path);
    }
    for (const c of input.changes) {
      if (
        devops(c.path) &&
        !["AGENTS.md", "CLAUDE.md"].includes(c.path) &&
        !c.path.startsWith("spec/governance/") &&
        !input.approval.approvedDevops?.includes(c.path)
      )
        fail(
          "user_decision_required",
          "Separate DevOps approval required: " + c.path,
        );
    }
  }
  transaction(root, input.changes);
  return { changed: [...names], baselinePreserved: !!input.baseline };
}
export function worktree(input) {
  const root = rootOf(input);
  if (!input.branch || !/^task\/[a-zA-Z0-9._-]+$/.test(input.branch))
    fail("validation_failed", "Task branch must be task/<id>");
  if (
    !input.worktree ||
    !path.isAbsolute(input.worktree) ||
    fs.existsSync(input.worktree)
  )
    fail("validation_failed", "New absolute worktree path required");
  git(root, ["worktree", "add", "-b", input.branch, input.worktree]);
  return { canonical: root, worktree: input.worktree, branch: input.branch };
}
export function writeback(input) {
  const root = rootOf(input);
  const common = git(root, [
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    ]),
    gitDir = git(root, ["rev-parse", "--absolute-git-dir"]);
  if (path.resolve(common) !== path.resolve(gitDir))
    fail(
      "validation_failed",
      "Canonical verification must run in primary repository, not linked task worktree",
    );
  if (!input.acceptedCommit || !/^[a-f0-9]{40}$/.test(input.acceptedCommit))
    fail("validation_failed", "Accepted full commit ID required");
  git(root, ["merge-base", "--is-ancestor", input.acceptedCommit, "HEAD"]);
  const status = git(root, ["status", "--porcelain"]);
  if (status)
    fail("validation_failed", "Canonical repository has uncommitted changes", {
      status,
    });
  return {
    canonical: root,
    acceptedCommit: input.acceptedCommit,
    revision: revision(root),
    integrated: true,
  };
}
export function compare(input) {
  if (!input.before || !input.after)
    fail("validation_failed", "Before/after baselines required");
  const approved = new Map();
  if (input.approval?.approved === true) {
    for (const c of input.approval.changes ?? []) {
      if (
        !["AGENTS.md", "CLAUDE.md"].includes(c.path) &&
        !c.path.startsWith("spec/governance/")
      )
        fail(
          "validation_failed",
          "Only explicit governance paths can be excluded from DevOps comparison",
        );
      const before =
          input.before.files.find((f) => f.path === c.path)?.sha256 ?? null,
        after =
          input.after.files.find((f) => f.path === c.path)?.sha256 ?? null;
      if (c.beforeHash !== before || c.afterHash !== after)
        fail(
          "validation_failed",
          "Governance comparison approval hash mismatch",
        );
      approved.set(c.path, c);
    }
  }
  const paths = new Set([
      ...input.before.files.map((f) => f.path),
      ...input.after.files.map((f) => f.path),
    ]),
    changed = [];
  for (const p of paths) {
    const before = input.before.files.find((f) => f.path === p)?.sha256 ?? null,
      after = input.after.files.find((f) => f.path === p)?.sha256 ?? null;
    if (before !== after && !approved.has(p)) changed.push(p);
  }
  if (changed.length)
    fail("validation_failed", "DevOps baseline changed", { changed });
  return {
    unchanged: true,
    approvedGovernanceChanges: [...approved.keys()],
    claim:
      "All raw repository files unchanged outside exact approved governance; behavioral review still required",
  };
}
