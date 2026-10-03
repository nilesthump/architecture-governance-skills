import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
export const suiteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export class GateError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}
export function fail(status, message, data) {
  throw new GateError(status, message, data);
}
export function sha(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
export function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stable(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export const digest = (value) => sha(stable(value));
export const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export function write(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
}
export function atomic(p, data) {
  const tmp = p + ".tmp-" + crypto.randomUUID();
  write(tmp, data);
  try {
    fs.renameSync(tmp, p);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}
export function rootOf(input) {
  if (!input.root || !path.isAbsolute(input.root))
    fail("validation_failed", "root must be absolute");
  const root = path.resolve(input.root);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory())
    fail("validation_failed", "root must be an existing directory");
  if (fs.realpathSync(root) !== root && process.platform !== "win32")
    fail("validation_failed", "root cannot alias a symlink");
  return root;
}
export function safe(root, rel) {
  root = path.resolve(root);
  let ancestor = root;
  while (true) {
    if (fs.existsSync(ancestor) && fs.lstatSync(ancestor).isSymbolicLink())
      fail("validation_failed", "Symlink root/ancestor forbidden");
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  if (
    typeof rel !== "string" ||
    !rel ||
    path.isAbsolute(rel) ||
    rel.includes("\\") ||
    rel
      .split("/")
      .some((s) => s === ".." || s === "." || s === "" || s.includes(":")) ||
    /[\x00-\x1f]/.test(rel)
  )
    fail("validation_failed", "Unsafe relative path: " + rel);
  const result = path.resolve(root, rel);
  if (!result.startsWith(root + path.sep))
    fail("validation_failed", "Path escapes root");
  let cursor = root;
  for (const part of rel.split("/")) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink())
      fail("validation_failed", "Symlink paths are forbidden: " + rel);
  }
  return result;
}
export function walk(root, base = "", out = []) {
  for (const e of fs
    .readdirSync(path.join(root, base), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (
      [".git", ".tmp", "node_modules", ".architecture-suite"].includes(e.name)
    )
      continue;
    const rel = base ? base + "/" + e.name : e.name;
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) walk(root, rel, out);
    else if (e.isFile()) out.push(rel);
  }
  return out;
}
const ajv = new Ajv({ allErrors: true, strict: false });
const validators = {};
export function validate(kind, value) {
  const checker = (validators[kind] ??= ajv.compile(
    readJSON(path.join(suiteRoot, "schemas", kind + ".schema.json")),
  ));
  if (!checker(value))
    fail("validation_failed", "Invalid " + kind, { errors: checker.errors });
  return value;
}
export function packageManagerCli(name) {
  const plain = name.replace(/\.(cmd|ps1)$/i, "");
  if (!["npm", "npx", "pnpm"].includes(plain)) return null;
  const found =
    spawnSync(process.platform === "win32" ? "where.exe" : "which", [plain], {
      encoding: "utf8",
    })
      .stdout?.trim()
      .split(/\r?\n/)
      .filter(Boolean) ?? [];
  const candidates = [];
  for (const entry of found) {
    const dir = path.dirname(entry);
    try {
      const real = fs.realpathSync(entry);
      if (/\.(cjs|mjs|js)$/.test(real)) candidates.push(real);
    } catch {}
    if (plain === "npm" || plain === "npx") {
      candidates.push(
        path.join(
          dir,
          "node_modules/npm/bin",
          plain === "npm" ? "npm-cli.js" : "npx-cli.js",
        ),
        path.join(
          dir,
          "../lib/node_modules/npm/bin",
          plain === "npm" ? "npm-cli.js" : "npx-cli.js",
        ),
      );
    } else {
      for (const file of ["pnpm.cjs", "pnpm.mjs"])
        candidates.push(
          path.join(dir, "node_modules/pnpm/bin", file),
          path.join(dir, "../lib/node_modules/pnpm/bin", file),
          path.join(dir, "../../node/node_modules/pnpm/bin", file),
        );
    }
  }
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}
export function run(executable, args = [], options = {}) {
  if (
    typeof executable !== "string" ||
    !Array.isArray(args) ||
    args.some((a) => typeof a !== "string")
  )
    fail("validation_failed", "Command must be executable and string argv");
  const cli =
    process.platform === "win32" ? packageManagerCli(executable) : null;
  if (cli) {
    args = [cli, ...args];
    executable = process.execPath;
  }
  const r = spawnSync(executable, args, {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
    ...options,
    shell: false,
  });
  if (r.error || r.status !== 0)
    fail("execution_failed", "Command failed: " + executable, {
      code: r.status,
      reason: r.error?.message,
      stdout: r.stdout?.slice(-16000),
      stderr: r.stderr?.slice(-16000),
    });
  return r.stdout.trim();
}
export function git(root, args, optional = false) {
  try {
    return run("git", ["-C", root, ...args]);
  } catch (e) {
    if (optional) return null;
    throw e;
  }
}
export function revision(root) {
  return git(root, ["rev-parse", "HEAD"], true);
}
export function fileHash(p) {
  return fs.existsSync(p) ? sha(fs.readFileSync(p)) : null;
}
export function transaction(root, changes) {
  const saved = [];
  try {
    for (const c of changes) {
      const p = safe(root, c.path);
      saved.push({ p, old: fs.existsSync(p) ? fs.readFileSync(p) : null });
      atomic(p, c.content);
    }
  } catch (e) {
    for (const { p, old } of saved.reverse()) {
      if (old === null) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } else atomic(p, old);
    }
    throw e;
  }
}
