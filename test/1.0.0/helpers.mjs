import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { run, write, readJSON } from "../../1.0.0/scripts/core/util.mjs";
import { packageReview } from "../../1.0.0/scripts/core/review.mjs";
export const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const candidate = () =>
  readJSON(path.join(project, "test/1.0.0/fixtures/candidate.json"));
export const temp = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "architecture-suite-test-"));
export function cleanup(p) {
  if (!p.startsWith(path.join(os.tmpdir(), "architecture-suite-test-")))
    throw Error("Unsafe test cleanup");
  fs.rmSync(p, { recursive: true, force: true });
}
export function gitSeed(root) {
  run("git", ["init", "-b", "main", root]);
  write(
    path.join(root, "requirements.md"),
    "# Accepted requirements\nDeterministic health JSON.\n",
  );
  write(
    path.join(root, "package.json"),
    '{"name":"health-fixture","scripts":{"test":"node --test"}}\n',
  );
  run("git", ["-C", root, "add", "."]);
  run("git", [
    "-C",
    root,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-m",
    "seed",
  ]);
}
export function review(root, c, container) {
  const directory = path.join(
    container,
    "review-" + Math.random().toString(16).slice(2),
  );
  const p = packageReview({
    root,
    output: directory,
    candidate: c,
    sources: [
      { path: "requirements.md", category: "AUTHORITATIVE" },
      { path: "package.json", category: "EVIDENCE" },
    ],
  });
  return {
    directory,
    report: {
      packageDigest: p.packageDigest,
      candidateDigest: p.candidateDigest,
      reviewer: "unit-fixture-reviewer",
      freshContext: true,
      hostTrace: "SIMULATED-UNIT-INPUT-NOT-BEHAVIOR-PROOF",
      findings: [],
      coverage: c.concerns.filter((c) => c.applicable).map((c) => c.name),
    },
  };
}
export const contract = {
  version: 1,
  commands: [
    {
      name: "health-check",
      executable: process.execPath,
      args: ["-e", 'process.stdout.write("fixture validation passed")'],
    },
  ],
};
export function freezeInput(root, c, container, version = "1.0.0") {
  return {
    root,
    candidate: c,
    version,
    decision: { freeze: true, version },
    reviewPackages: [review(root, c, container)],
    plantumlJar: process.env.ARCHITECTURE_PLANTUML_JAR,
    python: process.env.ARCHITECTURE_PYTHON,
  };
}
