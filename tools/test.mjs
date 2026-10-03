import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd(),
  files = [];
function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const file = path.join(p, e.name);
    if (e.isDirectory()) walk(file);
    else if (file.endsWith(".test.mjs")) files.push(file);
  }
}
walk(path.join(root, "test/1.0.0"));
if (!files.length) throw Error("No tests discovered");
const r = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", ...files],
  { stdio: "inherit" },
);
process.exitCode = r.status ?? 1;
