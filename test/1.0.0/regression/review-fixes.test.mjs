import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { execute } from "../../../1.0.0/scripts/core/cli.mjs";
import {
  run,
  write,
  packageManagerCli,
} from "../../../1.0.0/scripts/core/util.mjs";
import {
  temp,
  cleanup,
  gitSeed,
  candidate,
  freezeInput,
  review,
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
test("Uncommitted authoritative evidence changes invalidate review", () =>
  fixture(async (root, base) => {
    const input = freezeInput(root, candidate(), base);
    write(path.join(root, "requirements.md"), "Different accepted requirement");
    const r = await execute("architecture.freeze", input);
    assert.equal(r.status, "validation_failed", JSON.stringify(r));
    assert.equal(
      fs.existsSync(path.join(root, "spec/architecture/CURRENT")),
      false,
    );
  }));
test("Existing project layout/calendar policy supported without default hierarchy mutation", () =>
  fixture(async (root, base) => {
    const input = {
      ...freezeInput(root, candidate(), base, "2026.10"),
      versionPolicy: "project",
      layout: {
        directory: "docs/architecture",
        pointer: "docs/architecture/ACTIVE",
        versionPrefix: "",
      },
    };
    const r = await execute("architecture.freeze", input);
    assert.equal(r.status, "success", JSON.stringify(r));
    assert.ok(
      fs.existsSync(
        path.join(root, "docs/architecture/2026.10/ARCHITECTURE.pdf"),
      ),
    );
    assert.equal(
      fs.existsSync(path.join(root, "spec/architecture/CURRENT")),
      false,
    );
    assert.equal(
      (
        await execute("architecture.integrity.verify", {
          root,
          layout: input.layout,
          python: input.python,
        })
      ).status,
      "success",
    );
  }));
test("Missing artifact hashes and changed manifest identity fail integrity", () =>
  fixture(async (root, base) => {
    const input = freezeInput(root, candidate(), base);
    assert.equal(
      (await execute("architecture.freeze", input)).status,
      "success",
    );
    const p = path.join(root, "spec/architecture/v1.0.0/manifest.yaml"),
      m = YAML.parse(fs.readFileSync(p, "utf8"));
    write(p, YAML.stringify({ ...m, artifacts: {} }));
    assert.equal(
      (await execute("manifest.verify", { root, python: input.python })).status,
      "validation_failed",
    );
    write(p, YAML.stringify({ ...m, identity: "changed" }));
    assert.equal(
      (await execute("manifest.verify", { root, python: input.python })).status,
      "validation_failed",
    );
  }));
test("CI rejects shell punctuation and does not invent npm preparation", () =>
  fixture(async (root) => {
    const r = await execute("github.ci.configure", {
      root,
      runtimePath: "runtime;echo-injected.mjs",
      contractPath: "validation.json",
    });
    assert.equal(r.status, "validation_failed");
    const ok = await execute("github.ci.configure", {
      root,
      runtimePath: "runtime.mjs",
      contractPath: "validation.json",
    });
    assert.equal(ok.status, "success");
    assert.equal(
      fs
        .readFileSync(
          path.join(root, ".github/workflows/architecture-validation.yml"),
          "utf8",
        )
        .includes("npm ci"),
      false,
    );
  }));
test("Windows adapter executes real npm and pnpm without shell", () =>
  fixture(async (root) => {
    for (const name of ["npm", "pnpm"]) {
      assert.ok(packageManagerCli(name), name + " CLI must resolve");
      const r = await execute("validation.run-local", {
        root,
        contract: {
          version: 1,
          commands: [{ name, executable: name, args: ["--version"] }],
        },
      });
      assert.equal(r.status, "success", JSON.stringify(r));
    }
  }));
test("Missing existing baseline and task-worktree canonical claim fail closed", () =>
  fixture(async (root, base) => {
    assert.equal(
      (
        await execute("governance.apply", {
          root,
          approval: { approved: true, paths: ["package.json"] },
          changes: [{ path: "package.json", beforeHash: null, content: "{}" }],
        })
      ).status,
      "validation_failed",
    );
    const tree = path.join(base, "task");
    assert.equal(
      (
        await execute("repo.worktree.create", {
          root,
          branch: "task/check",
          worktree: tree,
        })
      ).status,
      "success",
    );
    const commit = run("git", ["-C", tree, "rev-parse", "HEAD"]);
    assert.equal(
      (
        await execute("repo.writeback.verify", {
          root: tree,
          acceptedCommit: commit,
        })
      ).status,
      "validation_failed",
    );
  }));

test("Preserved-version archive copy and rename failures restore CURRENT and permit retry", () =>
  fixture(async (root, base) => {
    const c = candidate(),
      initial = freezeInput(root, c, base);
    assert.equal(
      (await execute("architecture.freeze", initial)).status,
      "success",
    );
    const pointer = path.join(root, "spec/architecture/CURRENT"),
      before = fs.readFileSync(pointer, "utf8"),
      dir = fs.realpathSync(path.join(root, "spec/architecture/v1.0.0"));
    for (const operation of ["copy", "rename"]) {
      const input = {
        ...freezeInput(root, c, base),
        decision: {
          freeze: true,
          version: "1.0.0",
          preserveVersion: true,
          reason: "rollback regression",
        },
      };
      const original = operation === "copy" ? fs.cpSync : fs.renameSync;
      if (operation === "copy")
        fs.cpSync = function (from, to, opts) {
          if (from === dir) {
            fs.mkdirSync(to, { recursive: true });
            throw Error("Injected archive-copy failure");
          }
          return original(from, to, opts);
        };
      else
        fs.renameSync = function (from, to) {
          if (from === dir && to.includes(".previous-"))
            throw Error("Injected directory-rename failure");
          return original(from, to);
        };
      try {
        assert.equal(
          (await execute("architecture.freeze", input)).status,
          "execution_failed",
        );
      } finally {
        if (operation === "copy") fs.cpSync = original;
        else fs.renameSync = original;
      }
      assert.equal(fs.readFileSync(pointer, "utf8"), before);
      assert.ok(fs.existsSync(path.join(dir, "ARCHITECTURE.pdf")));
      assert.equal(
        fs.existsSync(
          path.join(root, "spec/architecture/history/v1.0.0/revision-1"),
        ),
        false,
      );
    }
    const retry = {
      ...freezeInput(root, c, base),
      decision: {
        freeze: true,
        version: "1.0.0",
        preserveVersion: true,
        reason: "successful retry",
      },
    };
    assert.equal(
      (await execute("architecture.freeze", retry)).status,
      "success",
    );
  }));

test("CURRENT path cannot lie about architecture version", () =>
  fixture(async (root, base) => {
    const input = freezeInput(root, candidate(), base);
    assert.equal(
      (await execute("architecture.freeze", input)).status,
      "success",
    );
    fs.cpSync(
      path.join(root, "spec/architecture/v1.0.0"),
      path.join(root, "spec/architecture/v1.1.0"),
      { recursive: true },
    );
    write(path.join(root, "spec/architecture/CURRENT"), "v1.1.0\n");
    assert.equal(
      (
        await execute("architecture.integrity.verify", {
          root,
          python: input.python,
        })
      ).status,
      "validation_failed",
    );
  }));

test("Working discussion survives separately and existing writes require approval", () =>
  fixture(async (root) => {
    const state = Object.fromEntries(
      [
        "userRequirements",
        "acceptedRequirements",
        "acceptedDecisions",
        "candidateDecisions",
        "rejectedAlternatives",
        "constraints",
        "nonGoals",
        "openQuestions",
        "risks",
        "externalDependencies",
        "assumptions",
      ].map((k) => [k, []]),
    );
    state.candidateDecisions = ["Consider storage later"];
    assert.equal(
      (
        await execute("architecture.working.update", {
          root,
          mode: "existing",
          state,
        })
      ).status,
      "user_decision_required",
    );
    assert.equal(
      (
        await execute("architecture.working.update", {
          root,
          mode: "greenfield",
          state,
        })
      ).status,
      "success",
    );
    assert.deepEqual(
      (await execute("architecture.working.read", { root })).data.state
        .candidateDecisions,
      state.candidateDecisions,
    );
    assert.equal(
      fs.existsSync(path.join(root, "spec/architecture/CURRENT")),
      false,
    );
  }));

test("Actual tools entrypoint/config drift is not hidden by DevOps filename heuristics", () =>
  fixture(async (root) => {
    write(path.join(root, "tools/devops.mjs"), 'console.log("baseline")');
    const baseline = (await execute("repo.inspect", { root })).data;
    assert.equal(
      baseline.files.find((f) => f.path === "tools/devops.mjs").devops,
      true,
    );
    write(path.join(root, "tools/devops.mjs"), 'console.log("changed")');
    const after = (await execute("repo.inspect", { root })).data;
    assert.equal(
      (await execute("validation.compare-remote", { before: baseline, after }))
        .status,
      "validation_failed",
    );
    assert.equal(
      (
        await execute("governance.apply", {
          root,
          baseline: after,
          approval: { approved: true, paths: ["tools/devops.mjs"] },
          changes: [
            {
              path: "tools/devops.mjs",
              beforeHash: after.files.find((f) => f.path === "tools/devops.mjs")
                .sha256,
              content: 'console.log("changed again")',
            },
          ],
        })
      ).status,
      "user_decision_required",
    );
  }));
