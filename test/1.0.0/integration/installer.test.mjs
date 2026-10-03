import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { install } from "../../../bin/install.mjs";
import { run, readJSON } from "../../../1.0.0/scripts/core/util.mjs";
import { build, verify } from "../../../tools/build.mjs";
import { temp, cleanup, project } from "../helpers.mjs";
test("Project/global version-bound install, replacement and no bootstrap", async () => {
  const root = temp();
  try {
    const a = await install([
      "--scope",
      "project",
      "--project",
      path.join(root, "project"),
    ]);
    const b = await install([
      "--scope",
      "global",
      "--directory",
      path.join(root, "global"),
      "--version",
      "1.0.0",
    ]);
    assert.equal(a.skills.length, 11);
    assert.equal(a.version, b.version);
    assert.equal(fs.existsSync(path.join(root, "project/AGENTS.md")), false);
    assert.equal(fs.existsSync(path.join(root, "project/spec")), false);
    for (const directory of [a.skillDirectory, b.skillDirectory]) {
      assert.equal(
        JSON.parse(
          run(
            process.execPath,
            [
              path.join(directory, "architecture/scripts/run.mjs"),
              "environment.probe",
            ],
            { cwd: root },
          ),
        ).suiteVersion,
        "1.0.0",
      );
      assert.ok(
        fs
          .readFileSync(path.join(directory, "architecture/SKILL.md"), "utf8")
          .includes("../.architecture-suite/1.0.0/shared/"),
      );
      assert.ok(
        readJSON(
          path.join(directory, ".architecture-suite/1.0.0/installation.json"),
        ).dependencies["pdfkit@0.17.2"],
      );
    }
    await assert.rejects(() =>
      install(["--scope", "project", "--project", path.join(root, "project")]),
    );
    await install([
      "--scope",
      "project",
      "--project",
      path.join(root, "project"),
      "--replace",
    ]);
    await assert.rejects(() =>
      install([
        "--scope",
        "global",
        "--directory",
        b.skillDirectory,
        "--version",
        "9.9.9",
      ]),
    );
    await assert.rejects(() => install(["--scope", "invalid"]));
  } finally {
    cleanup(root);
  }
});
test("Release expanded and source/installer integrity verified", () => {
  assert.ok(build().sourceFiles > 30);
  assert.equal(verify().verified, true);
  assert.ok(
    fs.existsSync(
      path.join(project, "release/1.0.0/1.0.0/skills/architecture/SKILL.md"),
    ),
  );
});
