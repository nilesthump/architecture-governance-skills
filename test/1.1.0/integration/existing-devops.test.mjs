import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execute } from "../../../1.1.0/scripts/core/cli.mjs";
import { run, write } from "../../../1.1.0/scripts/core/util.mjs";
import { temp, cleanup, gitSeed } from "../../1.0.0/helpers.mjs";
test("Existing Node/Python source behavior and build/test/lint/release/deploy entries preserved after approved governance", async () => {
  for (const kind of ["node", "python"]) {
    const base = temp(),
      root = path.join(base, "repo");
    fs.mkdirSync(root);
    try {
      gitSeed(root);
      write(
        path.join(root, "src/health.mjs"),
        'export function health(){ return {status:"ok"}; }\n',
      );
      write(
        path.join(root, "src/health.py"),
        'def health():\n    return {"status": "ok"}\n',
      );
      write(
        path.join(root, "tools/devops.mjs"),
        'import fs from "node:fs";import {health} from "../src/health.mjs";const stage=process.argv[2];if(health().status!=="ok")throw Error("health");if(stage==="deploy"&&process.env.DEPLOY_TARGET!=="fixture")throw Error("target");console.log(JSON.stringify({stage,status:health().status,target:stage==="deploy"?process.env.DEPLOY_TARGET:null}));\n',
      );
      write(
        path.join(root, "tools/devops.py"),
        'import sys,json,os\nfrom pathlib import Path\nsys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))\nfrom health import health\nstage=sys.argv[1]\nassert health()["status"]=="ok"\nassert stage!="deploy" or os.environ["DEPLOY_TARGET"]=="fixture"\nprint(json.dumps({"stage":stage,"status":health()["status"],"target":os.environ["DEPLOY_TARGET"] if stage=="deploy" else None},sort_keys=True))\n',
      );
      write(
        path.join(root, ".github/workflows/existing.yml"),
        "name: existing\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  existing:\n    runs-on: ubuntu-latest\n    steps:\n      - run: " +
          (kind === "node"
            ? "node tools/devops.mjs test"
            : "python tools/devops.py test") +
          "\n",
      );
      write(
        path.join(root, "DEPLOYMENT.md"),
        "Use DEPLOY_TARGET=fixture. Deploy one service. Rollback uses previous release. Branch main integrates reviewed task branches.\n",
      );
      const executable =
        kind === "node" ? process.execPath : process.env.ARCHITECTURE_PYTHON;
      assert.ok(executable);
      const stages = ["build", "test", "lint", "format", "release", "deploy"],
        commands = stages.map((name) => ({
          name,
          executable,
          args: [
            kind === "node" ? "tools/devops.mjs" : "tools/devops.py",
            name,
          ],
          env: { DEPLOY_TARGET: "fixture" },
        })),
        contract = { version: 1, commands };
      const before = await execute("validation.run-local", { root, contract });
      assert.equal(before.status, "success", JSON.stringify(before));
      const baseline = (await execute("repo.inspect", { root })).data;
      assert.ok(baseline.files.some((f) => f.path === "src/health.mjs"));
      assert.equal(
        (
          await execute("governance.apply", {
            root,
            baseline,
            approval: { approved: true, paths: ["AGENTS.md", "CLAUDE.md"] },
            changes: [
              {
                path: "AGENTS.md",
                beforeHash: null,
                content:
                  "# Existing governance\nRead DEPLOYMENT.md and existing source. Use existing tools/devops entry points and main/task branch workflow. No dependency or CI changes.\n",
              },
              {
                path: "CLAUDE.md",
                beforeHash: null,
                content: "Read and follow ./AGENTS.md.\n",
              },
            ],
          })
        ).status,
        "success",
      );
      const after = await execute("validation.run-local", { root, contract });
      assert.equal(after.status, "success", JSON.stringify(after));
      assert.deepEqual(
        before.data.results.map((r) => [r.name, r.stdout]),
        after.data.results.map((r) => [r.name, r.stdout]),
      );
      const afterFiles = (await execute("repo.inspect", { root })).data;
      assert.equal(
        (
          await execute("validation.compare-remote", {
            before: baseline,
            after: afterFiles,
            approval: {
              approved: true,
              changes: ["AGENTS.md", "CLAUDE.md"].map((p) => ({
                path: p,
                beforeHash: null,
                afterHash: afterFiles.files.find((f) => f.path === p).sha256,
              })),
            },
          })
        ).status,
        "success",
      );
      const evidence = {
        kind,
        commands,
        entryOutputsBefore: before.data.results.map(({ name, stdout }) => ({
          name,
          stdout,
        })),
        entryOutputsAfter: after.data.results.map(({ name, stdout }) => ({
          name,
          stdout,
        })),
        ciHashPreserved: true,
        behavior: "actual deterministic execution",
        independentAgentReview: "separate gate",
      };
      write(
        path.join("test/1.1.0/evidence", "existing-" + kind + "-devops.json"),
        JSON.stringify(evidence, null, 2) + "\n",
      );
    } finally {
      cleanup(base);
    }
  }
});
