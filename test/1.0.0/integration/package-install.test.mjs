import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { run, packageManagerCli } from "../../../1.0.0/scripts/core/util.mjs";
import { build } from "../../../tools/build.mjs";
import { temp, cleanup, project } from "../helpers.mjs";
test("Actual npm and pnpm transport: project/global installs and independently usable runtime", async () => {
  const base = temp();
  try {
    build();
    const npm = packageManagerCli("npm"),
      pnpm = packageManagerCli("pnpm");
    assert.ok(npm, "npm CLI required");
    assert.ok(pnpm, "pnpm CLI required");
    const packed = JSON.parse(
      run(
        process.execPath,
        [npm, "pack", "--json", "--pack-destination", base],
        { cwd: path.join(project, "release/1.0.0") },
      ),
    );
    const tar = path.join(base, packed[0].filename);
    for (const manager of ["npm", "pnpm"]) {
      for (const scope of ["project", "global"]) {
        const target = path.join(base, manager + "-" + scope),
          args =
            manager === "npm"
              ? [
                  npm,
                  "exec",
                  "--yes",
                  "--package",
                  tar,
                  "--",
                  "architecture-skills",
                  "--scope",
                  scope,
                  "--directory",
                  target,
                ]
              : [
                  pnpm,
                  "--package",
                  tar,
                  "dlx",
                  "architecture-skills",
                  "--scope",
                  scope,
                  "--directory",
                  target,
                ];
        run(process.execPath, args, {
          cwd: base,
          timeout: 180000,
          env: {
            ...process.env,
            npm_config_cache: path.join(base, "npm-cache"),
            pnpm_config_pm_on_fail: "ignore",
          },
        });
        assert.ok(fs.existsSync(path.join(target, "architecture/SKILL.md")));
        const result = JSON.parse(
          run(
            process.execPath,
            [
              path.join(target, "architecture/scripts/run.mjs"),
              "environment.probe",
            ],
            { cwd: base },
          ),
        );
        assert.equal(result.status, "success");
        assert.equal(result.suiteVersion, "1.0.0");
        assert.equal(fs.existsSync(path.join(base, "AGENTS.md")), false);
      }
    }
  } finally {
    cleanup(base);
  }
});
