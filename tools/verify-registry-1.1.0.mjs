import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { install } from "../release/1.1.0/bin/install.mjs";
import { run, packageManagerCli } from "../1.1.0/scripts/core/util.mjs";
const root = process.cwd(),
  version = "1.1.0",
  base = path.join(root, ".tmp", "registry-verification-1.1.0");
fs.mkdirSync(base, { recursive: true });
fs.writeFileSync(
  path.join(base, "package.json"),
  JSON.stringify({
    name: "architecture-registry-verification-harness",
    version: "0.0.0",
    private: true,
  }) + "\n",
);
const npm = packageManagerCli("npm"),
  pnpm = packageManagerCli("pnpm");
const metadata = JSON.parse(
  run(process.execPath, [
    npm,
    "view",
    "architecture-governance-skills@" + version,
    "--json",
  ]),
);
const pack = JSON.parse(
  fs
    .readFileSync(path.join(root, ".tmp/publish-1.1.0/pack.json"), "utf8")
    .replace(/^\uFEFF/, ""),
)[0];
assert.equal(metadata.dist.shasum, pack.shasum);
assert.equal(metadata.dist.integrity, pack.integrity);
const fetched = JSON.parse(
  run(process.execPath, [
    npm,
    "pack",
    "architecture-governance-skills@" + version,
    "--pack-destination",
    base,
    "--json",
  ]),
)[0];
assert.equal(fetched.shasum, pack.shasum);
assert.equal(fetched.integrity, pack.integrity);
const tags = JSON.parse(
  run(process.execPath, [
    npm,
    "view",
    "architecture-governance-skills",
    "dist-tags",
    "--json",
  ]),
);
const rows = [];
for (const manager of ["npm", "pnpm"])
  for (const scope of ["project", "global"]) {
    const target = path.join(base, manager + "-" + scope);
    assert.ok(!fs.existsSync(target), "clean installation target required");
    const spec = "architecture-governance-skills@" + version;
    const args =
      manager === "npm"
        ? [
            npm,
            "exec",
            "--yes",
            "--package",
            spec,
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
            spec,
            "dlx",
            "architecture-skills",
            "--scope",
            scope,
            "--directory",
            target,
          ];
    const stdout = run(process.execPath, args, {
      cwd: base,
      timeout: 180000,
      env: {
        ...process.env,
        npm_config_cache: path.join(base, "npm-cache"),
        pnpm_config_pm_on_fail: "ignore",
      },
    });
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
    assert.equal(result.suiteVersion, version);
    const skills = fs
      .readdirSync(target)
      .filter((n) => fs.existsSync(path.join(target, n, "SKILL.md")));
    assert.equal(skills.length, 11);
    const reference = path.join(base, "reference-" + manager + "-" + scope);
    await install(["--scope", scope, "--directory", reference]);
    const files = (directory, prefix = "") =>
      fs
        .readdirSync(path.join(directory, prefix), { withFileTypes: true })
        .flatMap((entry) => {
          if (
            entry.name === "node_modules" ||
            entry.name === "installation.json"
          )
            return [];
          const relative = path.join(prefix, entry.name);
          return entry.isDirectory() ? files(directory, relative) : [relative];
        })
        .sort();
    const expectedFiles = files(reference);
    assert.deepEqual(files(target), expectedFiles);
    for (const relative of expectedFiles)
      assert.deepEqual(
        fs.readFileSync(path.join(target, relative)),
        fs.readFileSync(path.join(reference, relative)),
        relative,
      );
    const installation = JSON.parse(
      fs.readFileSync(
        path.join(target, ".architecture-suite", version, "installation.json"),
      ),
    );
    assert.equal(installation.version, version);
    assert.equal(installation.scope, scope);
    assert.ok(
      !fs.existsSync(path.join(base, "AGENTS.md")) &&
        !fs.existsSync(path.join(base, "spec")),
    );
    assert.ok(
      !fs.existsSync(path.join(target, "AGENTS.md")) &&
        !fs.existsSync(path.join(target, "spec")),
    );
    rows.push({
      manager,
      scope,
      spec,
      target,
      skills: skills.length,
      runtime: result.suiteVersion,
      sourceParity: true,
      comparedFiles: expectedFiles,
      parityBasis:
        "Every installed non-dependency file matches the accepted local installer output; generated installation metadata checked separately",
      noBootstrap: true,
      stdout,
    });
  }
const out = {
  kind: "actual registry fetch and npm/pnpm project/global installation",
  version,
  distTags: tags,
  fetchedPackage: fetched,
  registry: {
    shasum: metadata.dist.shasum,
    integrity: metadata.dist.integrity,
    tarball: metadata.dist.tarball,
  },
  expected: { shasum: pack.shasum, integrity: pack.integrity },
  rows,
  completedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(root, "test/1.1.0/evidence/registry-install.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(JSON.stringify(out));
