import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { verify, root } from "../../../tools/build.mjs";
function inventory(dir) {
  const out = {};
  function walk(p, rel = "") {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const r = rel ? rel + "/" + e.name : e.name;
      if (e.isDirectory()) walk(path.join(p, e.name), r);
      else
        out[r] = crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(p, e.name)))
          .digest("hex");
    }
  }
  walk(dir);
  return out;
}
test("Frozen 1.0.0 sources, tests, package remain identical; original tests replay in historical package context", () => {
  const dirs = ["1.0.0", "test/1.0.0", "release/1.0.0"],
    before = dirs.map((d) => inventory(path.join(root, d)));
  assert.equal(verify("1.0.0").verified, true);
  const harness = path.join(root, ".tmp/historical-harness");
  fs.mkdirSync(harness, { recursive: true });
  for (const p of [
    "1.0.0",
    "bin",
    "LICENSE",
    "README.md",
    "README.en.md",
    "package.json",
  ])
    fs.cpSync(path.join(root, "release/1.0.0", p), path.join(harness, p), {
      recursive: true,
    });
  fs.cpSync(path.join(root, "test/1.0.0"), path.join(harness, "test/1.0.0"), {
    recursive: true,
  });
  fs.cpSync(path.join(root, "tools"), path.join(harness, "tools"), {
    recursive: true,
  });
  const historicalEnv = { ...process.env };
  delete historicalEnv.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ["tools/validate.mjs"], {
    cwd: harness,
    encoding: "utf8",
    env: historicalEnv,
    timeout: 300000,
    maxBuffer: 8 * 1024 * 1024,
  });
  fs.writeFileSync(
    path.join(root, "test/1.1.0/evidence/historical-validation.txt"),
    (r.stdout ?? "") + (r.stderr ?? ""),
  );
  assert.equal(r.status, 0, (r.stdout ?? "") + (r.stderr ?? ""));
  assert.match(r.stdout, /tests 33\b/, "Original tests must actually execute");
  assert.match(r.stdout, /fail 0\b/);
  for (let i = 0; i < dirs.length; i++)
    assert.deepEqual(inventory(path.join(root, dirs[i])), before[i]);
});
