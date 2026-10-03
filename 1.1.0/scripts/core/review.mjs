import fs from "node:fs";
import path from "node:path";
import {
  rootOf,
  safe,
  sha,
  digest,
  revision,
  write,
  validate,
  readJSON,
  fail,
} from "./util.mjs";
import { status, verifyBinding } from "./working.mjs";
export function packageReview(input) {
  const root = rootOf(input);
  validate("candidate", input.candidate);
  const state = status(input).state;
  if (
    !state ||
    state.formatVersion !== 2 ||
    !state.links.candidate ||
    state.links.candidate.digest !== digest(input.candidate)
  )
    fail(
      "user_decision_required",
      "Generate a state-bound candidate before review",
    );
  verifyBinding(root, input.candidate, state);
  if (!input.output || !path.isAbsolute(input.output))
    fail("validation_failed", "Absolute review output required");
  const requested = path.resolve(input.output);
  let ancestor = path.dirname(requested);
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor)
      fail("validation_failed", "Review output filesystem root is unavailable");
    ancestor = parent;
  }
  const output = path.resolve(
    fs.realpathSync(ancestor),
    path.relative(ancestor, requested),
  );
  if (
    output === root ||
    output.startsWith(root + path.sep) ||
    fs.existsSync(output)
  )
    fail(
      "validation_failed",
      "Review output must be new and outside evidence repository",
    );
  const sources = [];
  const names = new Set();
  const mutable = input.workingPath ?? "spec/architecture/WORKING.json";
  if (input.sources?.some((s) => s.path === mutable))
    fail(
      "validation_failed",
      "Review immutable discussion input instead of mutable WORKING.json",
    );
  const reviewSources = [...(input.sources ?? [])];
  if (
    !reviewSources.some((s) => s.path === input.candidate.discussion.snapshot)
  )
    reviewSources.push({
      path: input.candidate.discussion.snapshot,
      category: "AUTHORITATIVE",
    });
  for (const n of state.nodes) {
    const p = n.evidence?.source?.path;
    if (p && !reviewSources.some((x) => x.path === p))
      reviewSources.push({ path: p, category: "AUTHORITATIVE" });
  }
  for (const s of reviewSources) {
    if (
      !["AUTHORITATIVE", "EVIDENCE", "CANDIDATE", "ADVISORY"].includes(
        s.category,
      )
    )
      fail("validation_failed", "Invalid trust category");
    if (names.has(s.path)) fail("validation_failed", "Duplicate review path");
    names.add(s.path);
    const p = safe(root, s.path),
      bytes = fs.readFileSync(p);
    sources.push({
      path: s.path,
      category: s.category,
      sha256: sha(bytes),
      bytes,
    });
  }
  if (
    !sources.some((s) => s.category === "AUTHORITATIVE") ||
    !sources.some((s) => s.category === "EVIDENCE")
  )
    fail(
      "validation_failed",
      "Raw authoritative and evidence sources required",
    );
  const model = {
    suiteVersion: "1.1.0",
    repositoryRevision: revision(root),
    candidateDigest: digest(input.candidate),
    candidate: input.candidate,
    sources: sources.map(({ bytes, ...s }) => s),
  };
  const manifest = { ...model, packageDigest: digest(model) };
  fs.mkdirSync(output, { recursive: true });
  for (const s of sources) write(safe(output, "sources/" + s.path), s.bytes);
  write(
    path.join(output, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return {
    directory: output,
    packageDigest: manifest.packageDigest,
    candidateDigest: manifest.candidateDigest,
  };
}
export function verifyPackage(directory) {
  if (!path.isAbsolute(directory))
    fail("validation_failed", "Absolute package directory required");
  const pkg = readJSON(path.join(directory, "package.json"));
  const { packageDigest, ...model } = pkg;
  if (digest(model) !== packageDigest)
    fail("validation_failed", "Review package manifest altered");
  for (const s of pkg.sources) {
    if (sha(fs.readFileSync(safe(directory, "sources/" + s.path))) !== s.sha256)
      fail("validation_failed", "Review source altered: " + s.path);
  }
  if (digest(pkg.candidate) !== pkg.candidateDigest)
    fail("validation_failed", "Review candidate digest mismatch");
  return pkg;
}
export function verifyReports(candidate, packages, repositoryRevision, root) {
  if (!Array.isArray(packages) || !packages.length)
    fail("user_decision_required", "Fresh-context independent review required");
  const cd = digest(candidate),
    reviewers = new Set();
  for (const entry of packages) {
    const pkg = verifyPackage(entry.directory),
      r = validate("review", entry.report);
    if (
      r.packageDigest !== pkg.packageDigest ||
      r.candidateDigest !== cd ||
      pkg.candidateDigest !== cd
    )
      fail("validation_failed", "Stale or mismatched independent review");
    for (const source of pkg.sources) {
      if (
        root &&
        sha(fs.readFileSync(safe(root, source.path))) !== source.sha256
      )
        fail(
          "validation_failed",
          "Working evidence changed after review: " + source.path,
        );
    }
    if (pkg.repositoryRevision !== repositoryRevision)
      fail("validation_failed", "Repository changed after review");
    if (reviewers.has(r.reviewer))
      fail("validation_failed", "Duplicate reviewer");
    reviewers.add(r.reviewer);
    if (r.findings.some((f) => f.severity === "blocking"))
      fail("user_decision_required", "Review has blocking findings", {
        findings: r.findings,
      });
    const required =
      candidate.concerns?.filter((c) => c.applicable).map((c) => c.name) ?? [];
    if (required.some((c) => !r.coverage.includes(c)))
      fail("validation_failed", "Incomplete concern review coverage");
    for (const f of r.findings) {
      if (
        !f.citations.length ||
        f.citations.some(
          (c) =>
            !pkg.sources.some((s) =>
              [s.path, "sources/" + s.path].some(
                (p) =>
                  c === p || c.startsWith(p + "#") || c.startsWith(p + ":"),
              ),
            ) &&
            !c.startsWith("candidate#") &&
            !c.startsWith("package.json:candidate."),
        )
      )
        fail("validation_failed", "Finding must cite raw package sources");
      if (
        f.kind === "RECOMMENDATION" &&
        (!f.reason || !f.tradeoffs || !f.assumptions)
      )
        fail(
          "validation_failed",
          "Recommendation requires reasons, tradeoffs and assumptions",
        );
    }
  }
  return {
    candidateDigest: cd,
    reviewers: [...reviewers],
    claim:
      "Reports bound to raw package; host trace independence must be verified by orchestration",
  };
}
