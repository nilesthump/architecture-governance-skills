import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { root, build, verify } from "./build.mjs";
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), out);
    else if (e.name.endsWith(".mjs")) out.push(path.join(dir, e.name));
  }
  return out;
}
const version = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
).version;
for (const name of fs.readdirSync(path.join(root, version, "skills"))) {
  const p = path.join(root, version, "skills", name, "SKILL.md"),
    s = fs.readFileSync(p, "utf8"),
    header = YAML.parse(s.split("---")[1]);
  if (
    header.name !== name ||
    !header.description.includes("Use when") ||
    header.description.length > 1024 ||
    s.trim().split("\n").length >= 100 ||
    !s.includes("Example:")
  )
    throw Error("Skill methodology violation: " + name);
  for (const match of s.matchAll(/\]\(([^)]+)\)/g))
    if (!fs.existsSync(path.resolve(path.dirname(p), match[1])))
      throw Error("Missing skill reference: " + match[1]);
}
for (const p of [
  ...walk(path.join(root, version)),
  ...walk(path.join(root, "bin")),
  ...walk(path.join(root, "tools")),
]) {
  const r = spawnSync(process.execPath, ["--check", p], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
build();
verify();
verify("1.0.0");
const tests = walk(path.join(root, "test", version)).filter((p) =>
  p.endsWith(".test.mjs"),
);
if (!tests.length) throw Error("No tests discovered");
const r = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", ...tests],
  { cwd: root, stdio: "inherit", env: process.env },
);
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(
  "Skill checks, runtime syntax, tests and source/release parity passed.",
);
