import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
function files(dir, base = "", out = {}) {
  for (const e of fs
    .readdirSync(path.join(dir, base), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = base ? base + "/" + e.name : e.name;
    if (e.isSymbolicLink()) throw Error("Source symlinks forbidden");
    if (e.isDirectory()) files(dir, rel, out);
    else out[rel] = hash(fs.readFileSync(path.join(dir, rel)));
  }
  return out;
}
export function build() {
  const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ),
    version = pkg.version,
    source = path.join(root, version),
    target = path.join(root, "release", version);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error("Invalid release version");
  fs.mkdirSync(target, { recursive: true });
  fs.rmSync(path.join(target, version), { recursive: true, force: true });
  fs.cpSync(source, path.join(target, version), { recursive: true });
  for (const p of ["bin", "LICENSE", "README.md", "README.en.md"])
    fs.cpSync(path.join(root, p), path.join(target, p), { recursive: true });
  const releasePackage = { ...pkg };
  delete releasePackage.scripts;
  delete releasePackage.devDependencies;
  fs.writeFileSync(
    path.join(target, "package.json"),
    JSON.stringify(releasePackage, null, 2) + "\n",
  );
  const manifest = {
    version,
    source: files(source),
    installer: files(path.join(root, "bin")),
  };
  fs.writeFileSync(
    path.join(target, "release-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  if (
    JSON.stringify(files(source)) !==
    JSON.stringify(files(path.join(target, version)))
  )
    throw Error("Source/release mismatch");
  return { target, version, sourceFiles: Object.keys(manifest.source).length };
}
export function verify() {
  const version = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ).version,
    target = path.join(root, "release", version),
    m = JSON.parse(
      fs.readFileSync(path.join(target, "release-manifest.json"), "utf8"),
    );
  if (
    JSON.stringify(files(path.join(root, version))) !==
      JSON.stringify(m.source) ||
    JSON.stringify(files(path.join(target, version))) !==
      JSON.stringify(m.source) ||
    JSON.stringify(files(path.join(root, "bin"))) !==
      JSON.stringify(m.installer) ||
    JSON.stringify(files(path.join(target, "bin"))) !==
      JSON.stringify(m.installer)
  )
    throw Error("Release integrity mismatch");
  for (const p of ["README.md", "README.en.md", "LICENSE"])
    if (
      hash(fs.readFileSync(path.join(root, p))) !==
      hash(fs.readFileSync(path.join(target, p)))
    )
      throw Error("Release metadata drift");
  const expected = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  delete expected.scripts;
  delete expected.devDependencies;
  const actual = JSON.parse(
    fs.readFileSync(path.join(target, "package.json"), "utf8"),
  );
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    throw Error("Release package metadata drift");
  return { verified: true, version };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(JSON.stringify(build()));
