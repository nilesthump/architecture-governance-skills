#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const json = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
function guardDirectory(p) {
  let current = path.resolve(p);
  while (true) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
      throw Error("Symlink installation path forbidden: " + current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
function dependencyRoot(name, from) {
  const req = createRequire(path.join(from, "package.json"));
  let entry;
  try {
    entry = req.resolve(name + "/package.json");
  } catch {
    entry = req.resolve(name);
  }
  let directory = fs.statSync(entry).isDirectory()
    ? entry
    : path.dirname(entry);
  while (true) {
    const file = path.join(directory, "package.json");
    if (fs.existsSync(file) && json(file).name === name)
      return fs.realpathSync(directory);
    const parent = path.dirname(directory);
    if (parent === directory) throw Error("Cannot resolve dependency " + name);
    directory = parent;
  }
}
function copyDependencies(from, target) {
  const recorded = new Map();
  function copy(
    name,
    parent,
    modules,
    ancestors = new Set(),
    optional = false,
  ) {
    let directory;
    try {
      directory = dependencyRoot(name, parent);
    } catch (e) {
      if (optional) return;
      throw e;
    }
    const pkg = json(path.join(directory, "package.json")),
      key = name + "@" + pkg.version;
    if (ancestors.has(key)) return;
    const destination = path.join(modules, ...name.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(directory, destination, {
      recursive: true,
      dereference: true,
      filter: (p) => path.basename(p) !== "node_modules",
    });
    recorded.set(key, pkg.version);
    const next = new Set([...ancestors, key]);
    for (const dep of Object.keys(pkg.dependencies ?? {}))
      copy(dep, directory, path.join(destination, "node_modules"), next);
    for (const dep of Object.keys(pkg.optionalDependencies ?? {}))
      copy(dep, directory, path.join(destination, "node_modules"), next, true);
  }
  for (const name of Object.keys(
    json(path.join(from, "package.json")).dependencies ?? {},
  ))
    copy(name, from, path.join(target, "node_modules"));
  return Object.fromEntries(recorded);
}
function parse(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (["--scope", "--directory", "--version", "--project"].includes(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith("--"))
        throw Error("Missing " + arg + " value");
      options[arg.slice(2)] = argv[++i];
    } else if (arg === "--replace") options.replace = true;
    else if (arg === "--help") options.help = true;
    else throw Error("Unknown option " + arg);
  }
  return options;
}
export async function install(argv = process.argv.slice(2)) {
  const o = parse(argv);
  if (o.help) {
    return {
      help: "architecture-skills --scope project|global [--project path] [--directory skill-dir] [--version latest|X.Y.Z] [--replace]",
    };
  }
  if (!o.scope) {
    if (!process.stdin.isTTY)
      throw Error(
        "Non-interactive installation requires --scope project|global",
      );
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    try {
      o.scope = (await rl.question("Install scope (project/global): ")).trim();
    } finally {
      rl.close();
    }
  }
  if (!["project", "global"].includes(o.scope))
    throw Error("Scope must be project or global");
  const pkg = json(path.join(packageRoot, "package.json")),
    version = !o.version || o.version === "latest" ? pkg.version : o.version;
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw Error("Invalid suite version");
  const source = path.join(packageRoot, version);
  if (!fs.existsSync(path.join(source, "shared/version.json")))
    throw Error(
      "Version unavailable in this package; use npm/pnpm package@" + version,
    );
  if (json(path.join(source, "shared/version.json")).suiteVersion !== version)
    throw Error("Source/runtime version mismatch");
  const target = path.resolve(
    o.directory ??
      (o.scope === "project"
        ? path.join(o.project ?? process.cwd(), ".agents", "skills")
        : path.join(
            process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
            "skills",
          )),
  );
  guardDirectory(target);
  const runtime = path.join(target, ".architecture-suite", version);
  const names = fs.readdirSync(path.join(source, "skills"));
  const destinations = [runtime, ...names.map((n) => path.join(target, n))];
  for (const p of destinations) {
    guardDirectory(p);
    if (fs.existsSync(p) && !o.replace)
      throw Error("Existing installation; review then use --replace: " + p);
  }
  fs.mkdirSync(target, { recursive: true });
  const stage = path.join(target, ".install-" + crypto.randomUUID()),
    backup = path.join(target, ".backup-" + crypto.randomUUID());
  fs.mkdirSync(stage);
  const moved = [];
  try {
    const stageRuntime = path.join(stage, ".architecture-suite", version);
    fs.cpSync(source, stageRuntime, { recursive: true });
    fs.copyFileSync(
      path.join(packageRoot, "package.json"),
      path.join(stageRuntime, "package.json"),
    );
    const dependencies = copyDependencies(packageRoot, stageRuntime);
    for (const name of names) {
      const dir = path.join(stage, name);
      fs.cpSync(path.join(source, "skills", name), dir, { recursive: true });
      let skill = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
      skill = skill
        .replaceAll(
          "../../shared/",
          "../.architecture-suite/" + version + "/shared/",
        )
        .replaceAll(
          "../../contracts/",
          "../.architecture-suite/" + version + "/contracts/",
        )
        .replaceAll(
          "../../schemas/",
          "../.architecture-suite/" + version + "/schemas/",
        );
      fs.writeFileSync(path.join(dir, "SKILL.md"), skill);
      fs.writeFileSync(
        path.join(dir, "scripts/run.mjs"),
        '#!/usr/bin/env node\nimport { main } from "../../.architecture-suite/' +
          version +
          '/scripts/core/cli.mjs";\nawait main();\n',
      );
    }
    fs.writeFileSync(
      path.join(stageRuntime, "installation.json"),
      JSON.stringify({ version, scope: o.scope, dependencies }, null, 2) + "\n",
    );
    fs.mkdirSync(backup);
    for (const p of destinations) {
      const rel = path.relative(target, p),
        staged = path.join(stage, rel),
        saved = path.join(backup, rel);
      if (fs.existsSync(p)) {
        fs.mkdirSync(path.dirname(saved), { recursive: true });
        fs.renameSync(p, saved);
      }
      fs.mkdirSync(path.dirname(p), { recursive: true });
      try {
        fs.renameSync(staged, p);
      } catch (e) {
        if (fs.existsSync(saved)) fs.renameSync(saved, p);
        throw e;
      }
      moved.push({ p, saved });
    }
    return {
      scope: o.scope,
      version,
      skillDirectory: target,
      skills: names,
      runtime,
      projectInitialization: false,
    };
  } catch (e) {
    for (const { p, saved } of moved.reverse()) {
      fs.rmSync(p, { recursive: true, force: true });
      if (fs.existsSync(saved)) fs.renameSync(saved, p);
    }
    throw e;
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    fs.rmSync(backup, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.stdout.write(
      JSON.stringify({ status: "success", data: await install() }) + "\n",
    );
  } catch (e) {
    process.stdout.write(
      JSON.stringify({ status: "execution_failed", message: e.message }) + "\n",
    );
    process.exitCode = 1;
  }
}
