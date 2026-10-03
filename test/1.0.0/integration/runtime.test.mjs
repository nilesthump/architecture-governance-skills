import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execute } from "../../../1.0.0/scripts/core/cli.mjs";
import { safe, sha, write, run } from "../../../1.0.0/scripts/core/util.mjs";
import { verifyPackage } from "../../../1.0.0/scripts/core/review.mjs";
import { ruleDefinitions } from "../../../1.0.0/scripts/core/github.mjs";
import {
  temp,
  cleanup,
  gitSeed,
  candidate,
  review,
  contract,
  freezeInput,
  project,
} from "../helpers.mjs";
async function fixture(fn) {
  const base = temp(),
    root = path.join(base, "repo");
  fs.mkdirSync(root);
  try {
    gitSeed(root);
    await fn(root, base);
  } finally {
    cleanup(base);
  }
}
test("Path containment rejects traversal, absolute, symlink and controls", () => {
  const root = temp();
  try {
    for (const p of [
      "../escape",
      "a/../../escape",
      "C:/escape",
      "a\\b",
      "/absolute",
      "a//b",
      "a/./b",
      "a\u0000b",
    ])
      assert.throws(() => safe(root, p));
    write(path.join(root, "real/file"), "ok");
    fs.symlinkSync(
      path.join(root, "real"),
      path.join(root, "link"),
      process.platform === "win32" ? "junction" : "dir",
    );
    assert.throws(() => safe(root, "link/file"));
  } finally {
    cleanup(root);
  }
});
test("Unknown action and malformed input return structured failure", async () => {
  assert.equal((await execute("unknown")).status, "validation_failed");
  assert.equal(
    (await execute("repo.inspect", { root: "relative" })).status,
    "validation_failed",
  );
  assert.equal(
    JSON.parse(
      run(process.execPath, [
        path.join(project, "1.0.0/skills/architecture/scripts/run.mjs"),
        "environment.probe",
      ]),
    ).suiteVersion,
    "1.0.0",
  );
});
test("Review raw packages reproducible and tampering detected", async () =>
  fixture((root, base) => {
    const c = candidate(),
      a = review(root, c, base),
      b = review(root, c, base);
    assert.equal(a.report.packageDigest, b.report.packageDigest);
    assert.equal(
      verifyPackage(a.directory).sources[0].category,
      "AUTHORITATIVE",
    );
    write(path.join(a.directory, "sources/package.json"), "tampered");
    assert.throws(() => verifyPackage(a.directory));
  }));
test("Freeze rejects missing human choice, unresolved decisions and stale review before mutation", async () =>
  fixture(async (root, base) => {
    const c = candidate(),
      input = freezeInput(root, c, base);
    assert.equal(
      (await execute("architecture.freeze", { ...input, decision: {} })).status,
      "user_decision_required",
    );
    const open = structuredClone(c);
    open.openQuestions.push("Which transport?");
    assert.equal(
      (await execute("architecture.freeze", { ...input, candidate: open }))
        .status,
      "user_decision_required",
    );
    const stale = structuredClone(c);
    stale.sections[0].content += " Change.";
    assert.equal(
      (await execute("architecture.freeze", { ...input, candidate: stale }))
        .status,
      "validation_failed",
    );
    assert.equal(
      fs.existsSync(path.join(root, "spec/architecture/CURRENT")),
      false,
    );
  }));
test("Blocking report and missing renderer leave CURRENT untouched", async () =>
  fixture(async (root, base) => {
    const input = freezeInput(root, candidate(), base);
    input.reviewPackages[0].report.findings = [
      {
        kind: "CONFLICT",
        severity: "blocking",
        message: "Contract conflict",
        citations: ["requirements.md#health"],
      },
    ];
    assert.equal(
      (await execute("architecture.freeze", input)).status,
      "user_decision_required",
    );
    input.reviewPackages[0].report.findings = [];
    input.plantumlJar = path.join(base, "missing.jar");
    assert.equal(
      (await execute("architecture.freeze", input)).status,
      "execution_failed",
    );
    assert.equal(
      fs.existsSync(path.join(root, "spec/architecture/CURRENT")),
      false,
    );
    assert.equal(
      fs
        .readdirSync(path.join(root, "spec/architecture"))
        .some((p) => p.startsWith(".stage")),
      false,
    );
  }));
test("Existing proposal exact approval, stale hashes and DevOps preflight", async () =>
  fixture(async (root) => {
    const baseline = (await execute("repo.inspect", { root })).data,
      changes = [{ path: "notes.md", beforeHash: null, content: "approved" }];
    assert.equal(
      (await execute("governance.apply", { root, baseline, changes })).status,
      "user_decision_required",
    );
    assert.equal(
      (
        await execute("governance.apply", {
          root,
          baseline,
          changes,
          approval: { approved: true, paths: [] },
        })
      ).status,
      "user_decision_required",
    );
    assert.equal(fs.existsSync(path.join(root, "notes.md")), false);
    assert.equal(
      (
        await execute("governance.apply", {
          root,
          baseline,
          changes,
          approval: { approved: true, paths: ["notes.md"] },
        })
      ).status,
      "success",
    );
    assert.equal(
      (
        await execute("governance.apply", {
          root,
          baseline,
          changes,
          approval: { approved: true, paths: ["notes.md"] },
        })
      ).status,
      "validation_failed",
    );
    const p = path.join(root, "package.json");
    assert.equal(
      (
        await execute("governance.apply", {
          root,
          baseline,
          changes: [
            {
              path: "package.json",
              beforeHash: sha(fs.readFileSync(p)),
              content: "{}",
            },
          ],
          approval: { approved: true, paths: ["package.json"] },
        })
      ).status,
      "user_decision_required",
    );
    assert.ok(fs.readFileSync(p, "utf8").includes("health-fixture"));
  }));
test("Existing Node/Python fixtures preserve DevOps; partial approval affects only selected paths", async () => {
  for (const type of ["node", "python"])
    await fixture(async (root) => {
      if (type === "python") {
        write(path.join(root, "pyproject.toml"), '[project]\nname="fixture"\n');
        write(
          path.join(root, ".github/workflows/build.yml"),
          "name: existing\non: push\njobs: {}\n",
        );
      }
      const baseline = (await execute("repo.inspect", { root })).data;
      assert.equal(
        (
          await execute("governance.apply", {
            root,
            baseline,
            approval: { approved: true, paths: ["AGENTS.md"] },
            changes: [
              {
                path: "AGENTS.md",
                beforeHash: null,
                content: "Use existing specs and commands.",
              },
            ],
          })
        ).status,
        "success",
      );
      const after = (await execute("repo.inspect", { root })).data;
      assert.equal(
        (
          await execute("validation.compare-remote", {
            before: baseline,
            after,
            approval: {
              approved: true,
              changes: [
                {
                  path: "AGENTS.md",
                  beforeHash: null,
                  afterHash: after.files.find((f) => f.path === "AGENTS.md")
                    .sha256,
                },
              ],
            },
          })
        ).status,
        "success",
      );
      assert.equal(fs.existsSync(path.join(root, "CLAUDE.md")), false);
    });
});
test("Validation explicit argv and failure status", async () =>
  fixture(async (root) => {
    assert.equal(
      (await execute("validation.run-local", { root, contract })).status,
      "success",
    );
    assert.equal(
      (
        await execute("validation.run-local", {
          root,
          contract: {
            version: 1,
            commands: [
              {
                name: "fail",
                executable: process.execPath,
                args: ["-e", "process.exit(3)"],
              },
            ],
          },
        })
      ).status,
      "validation_failed",
    );
    assert.equal(
      (
        await execute("validation.run-local", {
          root,
          contract: { version: 1, commands: [] },
        })
      ).status,
      "validation_failed",
    );
  }));
test("Real worktree and canonical integration required before write-back verification", async () =>
  fixture(async (root, base) => {
    const tree = path.join(base, "task");
    assert.equal(
      (
        await execute("repo.worktree.create", {
          root,
          branch: "task/health",
          worktree: tree,
        })
      ).status,
      "success",
    );
    write(
      path.join(tree, "health.js"),
      'export const health = () => ({status:"ok"});\n',
    );
    run("git", ["-C", tree, "add", "health.js"]);
    run("git", [
      "-C",
      tree,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "health",
    ]);
    const commit = run("git", ["-C", tree, "rev-parse", "HEAD"]);
    assert.equal(
      (await execute("repo.writeback.verify", { root, acceptedCommit: commit }))
        .status,
      "execution_failed",
    );
    run("git", ["-C", root, "merge", "--ff-only", "task/health"]);
    assert.equal(
      (await execute("repo.writeback.verify", { root, acceptedCommit: commit }))
        .status,
      "success",
    );
  }));
test("GitHub protection separates integrity from PR-only approval bypass", () => {
  const r = ruleDefinitions([
    "validate (windows-latest)",
    "validate (macos-latest)",
    "validate (ubuntu-latest)",
  ]);
  assert.equal(r[0].bypass_actors.length, 0);
  assert.deepEqual(
    r[0].rules.map((r) => r.type),
    ["deletion", "non_fast_forward", "required_status_checks"],
  );
  assert.equal(r[1].bypass_actors[0].bypass_mode, "pull_request");
  assert.equal(r[1].rules[0].parameters.required_approving_review_count, 1);
});
