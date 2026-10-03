import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { execute } from "../../1.1.0/scripts/core/cli.mjs";
import { definition } from "../../1.1.0/scripts/core/working.mjs";
import { sha, readJSON, write, run } from "../../1.1.0/scripts/core/util.mjs";
export { execute, definition };
export function fixture() {
  const base = fs.mkdtempSync(
    path.join(os.tmpdir(), "architecture-discussion-"),
  );
  const root = path.join(base, "repo");
  fs.mkdirSync(root);
  write(
    path.join(root, "requirements.md"),
    "Human fixture authorization: a minimal CLI health tool; one developer for one week; no GUI/server/database/middleware/gateway. All discussion choices in this deterministic fixture are simulated user decisions, not real host evidence.",
  );
  write(
    path.join(root, "package.json"),
    '{"name":"fixture","scripts":{"test":"node --test"}}',
  );
  const evidence = {
    kind: "explicit-user",
    source: {
      path: "requirements.md",
      sha256: sha(fs.readFileSync(path.join(root, "requirements.md"))),
      locator: "paragraph 1",
      quote: "Human fixture authorization",
    },
  };
  const input = {
    root,
    mode: "greenfield",
    writerId: "coordinator",
    projectIdentity: "health-fixture",
    discussionId: "discussion-1",
    expectedRevision: 0,
  };
  return {
    root,
    base,
    input,
    evidence,
    cleanup() {
      assert.ok(
        base.startsWith(path.join(os.tmpdir(), "architecture-discussion-")),
      );
      fs.rmSync(base, { recursive: true, force: true });
    },
  };
}
export const ok = (r) => {
  assert.equal(r.status, "success", JSON.stringify(r));
  return r.data;
};
export async function init(f) {
  return ok(await execute("architecture.working.update", f.input));
}
export async function update(f, operations) {
  const s = ok(
    await execute("architecture.working.read", { root: f.root }),
  ).state;
  return ok(
    await execute("architecture.working.update", {
      ...f.input,
      expectedRevision: s.revision,
      operations,
    }),
  );
}
export function answer(f, id, value = "Confirmed fixture choice") {
  if (id.startsWith("concern.") && typeof value === "string") {
    const reasons = {
      "concern.contracts":
        "The local CLI defines a JSON success contract and failure exit code.",
      "concern.failure-handling":
        "The local command must return a nonzero code with a diagnostic on failure.",
      "concern.testing": "Node tests verify the deterministic local command.",
      "concern.CI-CD":
        "The approved validation contract is shared between local execution and CI.",
      "concern.versioning":
        "Architecture versions and retained revisions are managed independently of Suite versions.",
    };
    value = {
      applicable: !!reasons[id],
      reason:
        reasons[id] ??
        "Out of scope for the simulated minimal local health CLI: no network service, GUI, persistence, shared state or remote operational dependency.",
    };
  }
  return { type: "set", id, status: "confirmed", value, evidence: f.evidence };
}
export async function complete(f, types = ["other"]) {
  await init(f);
  return update(
    f,
    definition.nodes.map((n) =>
      answer(
        f,
        n.id,
        n.id === "components"
          ? { types, gui: false }
          : n.id === "budget"
            ? {
                deadline: "one week",
                resources: [
                  { type: "people", count: 1, availability: "full week" },
                ],
              }
            : n.id === "feasibility"
              ? { feasible: true, basis: "one developer, bounded CLI scope" }
              : n.id === "other.stack"
                ? "Node CLI without framework"
                : n.id === "server.persistence" || n.id === "server.middleware"
                  ? "none"
                  : "Confirmed fixture " + n.id,
      ),
    ),
  );
}
export function candidate() {
  const c = readJSON(path.resolve("test/1.0.0/fixtures/candidate.json"));
  c.identity = "health-fixture";
  c.title = "CLI health architecture";
  c.requirements = ["Provide deterministic local health JSON."];
  c.constraints = ["A CLI tool, no server or GUI."];
  c.nonGoals = ["No database, middleware or gateway."];
  c.assumptions = [];
  c.risks = [];
  c.rejectedAlternatives = ["HTTP service excluded from this fixture."];
  c.decisions = [
    {
      id: "DEC-001",
      status: "accepted",
      text: "Node CLI without framework",
      nodeIds: ["other.stack"],
    },
  ];
  c.sections = [
    {
      id: "ARCH-001",
      title: "CLI scope",
      content:
        "A user invokes the local CLI health command and receives deterministic JSON. No HTTP server, GUI, database or gateway.",
      nodeIds: ["other.stack"],
    },
    {
      id: "ARCH-010",
      title: "Local contract",
      content:
        "The command returns status ok on success. Failures return a nonzero process code with a diagnostic. No network API is introduced.",
      nodeIds: ["contracts"],
    },
    {
      id: "ARCH-020",
      title: "Validation",
      content:
        "Node tests validate the local command. The same validation contract runs locally and in CI.",
      nodeIds: ["delivery"],
    },
  ];
  c.diagrams[0].source =
    "@startuml\nactor User\nparticipant CLI\nUser -> CLI: health\nCLI --> User: success\n@enduml";
  c.decisions = c.decisions
    .filter((d) => d.status === "accepted")
    .map((d) => ({ ...d, nodeIds: ["other.stack"] }));

  return c;
}
export async function generated(f) {
  const s = ok(
    await execute("architecture.working.read", { root: f.root }),
  ).state;
  return ok(
    await execute("architecture.candidate.generate", {
      ...f.input,
      expectedRevision: s.revision,
      candidate: candidate(),
    }),
  );
}
export async function review(f, c) {
  const output = path.join(
    f.base,
    "review-" + Math.random().toString(16).slice(2),
  );
  const p = ok(
    await execute("review.package", {
      root: f.root,
      candidate: c,
      output,
      sources: [
        { path: "requirements.md", category: "AUTHORITATIVE" },
        { path: "package.json", category: "EVIDENCE" },
      ],
    }),
  );
  return {
    directory: output,
    report: {
      packageDigest: p.packageDigest,
      candidateDigest: p.candidateDigest,
      reviewer: "unit-fixture-only",
      freshContext: true,
      hostTrace: "SIMULATED UNIT INPUT - NOT REAL AGENT EVIDENCE",
      findings: [],
      coverage: c.concerns.filter((c) => c.applicable).map((c) => c.name),
    },
  };
}
export function seed(f) {
  run("git", ["init", "-b", "main", f.root]);
  run("git", ["-C", f.root, "add", "."]);
  run("git", [
    "-C",
    f.root,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-m",
    "seed",
  ]);
}
