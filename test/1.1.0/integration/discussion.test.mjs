import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  fixture,
  ok,
  init,
  update,
  answer,
  complete,
  generated,
  candidate,
  execute,
  definition,
  review,
} from "../helpers.mjs";
import {
  checkState,
  contentDigest,
} from "../../../1.1.0/scripts/core/working.mjs";
import { write, digest } from "../../../1.1.0/scripts/core/util.mjs";
async function use(fn) {
  const f = fixture();
  try {
    await fn(f);
  } finally {
    f.cleanup();
  }
}
test("Queries are read-only, return stable queue and separate proposals from confirmation", () =>
  use(async (f) => {
    assert.equal(
      ok(await execute("architecture.working.read", { root: f.root })).state,
      null,
    );
    for (const id of [".", "..", "bad/id"])
      assert.equal(
        (
          await execute("architecture.working.update", {
            ...f.input,
            discussionId: id,
          })
        ).status,
        "validation_failed",
      );
    await init(f);
    const file = path.join(f.root, "spec/architecture/WORKING.json"),
      before = fs.readFileSync(file);
    for (const a of ["read", "status", "check"]) {
      const r = ok(
        await execute("architecture.working." + a, { root: f.root }),
      );
      assert.deepEqual(r.next, ["goals"]);
      assert.equal(r.confirmed.length, 0);
    }
    assert.deepEqual(fs.readFileSync(file), before);
    await update(f, [
      {
        type: "set",
        id: "goals",
        status: "proposed",
        value: "agent idea",
        evidence: { kind: "agent-proposal", source: "agent" },
      },
    ]);
    const q = ok(
      await execute("architecture.working.status", { root: f.root }),
    );
    assert.equal(q.confirmed.length, 0);
    assert.equal(q.table[0].proposal, "agent idea");
  }));
test("Early answers and parallel branches are retained; API is not a component branch", () =>
  use(async (f) => {
    await init(f);
    await update(f, [
      answer(f, "other.stack", "Node CLI"),
      answer(f, "components", { types: ["other", "web"], gui: false }),
    ]);
    let r = ok(await execute("architecture.working.status", { root: f.root }));
    assert.ok(r.table.some((n) => n.id === "web.stack"));
    assert.ok(!r.table.some((n) => n.id === "gui"));
    assert.ok(!r.table.some((n) => n.id.startsWith("server.")));
    assert.equal(
      r.confirmed.find((n) => n.id === "other.stack").conclusion,
      "Node CLI",
    );
    r = await execute("architecture.working.update", {
      ...f.input,
      expectedRevision: r.state.revision,
      operations: [answer(f, "components", { types: ["API"], gui: false })],
    });
    assert.equal(r.status, "validation_failed");
  }));
test("Provenance, budgets, core exclusions and unauthorized writes fail without replacing state", () =>
  use(async (f) => {
    await init(f);
    let s = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    for (const op of [
      { ...answer(f, "goals"), evidence: { confirmed: true } },
      {
        ...answer(f, "goals"),
        evidence: {
          ...f.evidence,
          source: { ...f.evidence.source, sha256: "bad" },
        },
      },
      answer(f, "budget", { deadline: "week", resources: [] }),
      { ...answer(f, "components"), status: "excluded", reason: "skip" },
    ]) {
      const r = await execute("architecture.working.update", {
        ...f.input,
        expectedRevision: s.revision,
        operations: [op],
      });
      assert.notEqual(r.status, "success");
    }
    assert.deepEqual(
      ok(await execute("architecture.working.read", { root: f.root })).state,
      s,
    );
    assert.equal(
      (
        await execute("architecture.working.update", {
          ...f.input,
          writerId: "other",
          expectedRevision: s.revision,
          operations: [],
        })
      ).status,
      "user_decision_required",
    );
    assert.equal(
      (
        await execute("architecture.working.update", {
          ...f.input,
          mode: "existing",
          expectedRevision: s.revision,
          operations: [],
        })
      ).status,
      "user_decision_required",
    );
  }));
test("Dependency edits preserve stale values, unrelated confirmation, and invalidate candidate/review", () =>
  use(async (f) => {
    await complete(f);
    const c = await generated(f);
    assert.equal(c.state.phase, "candidate");
    const previous = c.state.nodes.find((n) => n.id === "other.stack").value;
    const u = await update(f, [
      answer(f, "components", { types: ["server", "other"], gui: false }),
    ]);
    assert.equal(
      u.state.nodes.find((n) => n.id === "other.stack").status,
      "needs-review",
    );
    assert.equal(
      u.state.nodes.find((n) => n.id === "other.stack").value,
      previous,
    );
    assert.equal(
      u.state.nodes.find((n) => n.id === "delivery").status,
      "confirmed",
    );
    assert.equal(u.state.links.candidate, undefined);
    assert.equal(u.state.phase, "discussion");
    assert.equal(u.ready, false);
    assert.notEqual(
      (
        await execute("review.package", {
          root: f.root,
          candidate: c.candidate,
          output: path.join(f.base, "stale"),
          sources: [],
        })
      ).status,
      "success",
    );
  }));
test("Rejection remains unresolved; conflicts block readiness until sourced resolution", () =>
  use(async (f) => {
    await complete(f);
    const u = await update(f, [
      {
        type: "set",
        id: "server.stack",
        status: "proposed",
        value: "A",
        evidence: { kind: "agent-proposal" },
      },
      {
        type: "reject",
        id: "server.stack",
        reason: "unsupported",
        evidence: f.evidence,
      },
    ]);
    assert.equal(
      u.state.nodes.find((n) => n.id === "server.stack").status,
      "undetermined",
    );
    let r = await update(f, [
      {
        type: "conflict",
        id: "budget-conflict",
        nodeIds: ["budget", "scope"],
        reason: "too much scope",
      },
    ]);
    assert.equal(r.ready, false);
    assert.ok(r.blockers.includes("conflicts"));
    r = await update(f, [
      {
        type: "resolve-conflict",
        id: "budget-conflict",
        reason: "bounded scope accepted",
        evidence: f.evidence,
      },
    ]);
    assert.equal(r.state.conflicts[0].resolved, true);
  }));
test("Expected revision and lock cover competing writes; crash locks and corrupt JSON are explicit", () =>
  use(async (f) => {
    await init(f);
    const file = path.join(f.root, "spec/architecture/WORKING.json"),
      state = ok(
        await execute("architecture.working.read", { root: f.root }),
      ).state;
    const writes = await Promise.all([
      execute("architecture.working.update", {
        ...f.input,
        expectedRevision: state.revision,
        operations: [answer(f, "goals", "one")],
      }),
      execute("architecture.working.update", {
        ...f.input,
        expectedRevision: state.revision,
        operations: [answer(f, "scope", "two")],
      }),
    ]);
    assert.equal(writes.filter((r) => r.status === "success").length, 1);
    fs.writeFileSync(file + ".lock", "interrupted owner");
    assert.equal(
      (
        await execute("architecture.working.update", {
          ...f.input,
          expectedRevision: 2,
          operations: [],
        })
      ).status,
      "execution_failed",
    );
    fs.unlinkSync(file + ".lock");
    fs.writeFileSync(file, "{broken");
    assert.equal(
      (await execute("architecture.working.read", { root: f.root })).status,
      "validation_failed",
    );
    assert.equal(fs.readFileSync(file, "utf8"), "{broken");
  }));
test("Legacy reads do not migrate; explicit migration preserves original arrays and recovery bytes", () =>
  use(async (f) => {
    const old = Object.fromEntries(
      [
        "userRequirements",
        "acceptedRequirements",
        "acceptedDecisions",
        "candidateDecisions",
        "rejectedAlternatives",
        "constraints",
        "nonGoals",
        "openQuestions",
        "risks",
        "externalDependencies",
        "assumptions",
      ].map((k) => [k, [k + " legacy"]]),
    );
    old.suiteVersion = "1.0.0";
    write(path.join(f.root, "custom/WORKING.json"), JSON.stringify(old));
    const before = fs.readFileSync(path.join(f.root, "custom/WORKING.json"));
    const r = ok(
      await execute("architecture.working.read", {
        root: f.root,
        workingPath: "custom/WORKING.json",
      }),
    );
    assert.equal(r.legacy, true);
    assert.deepEqual(
      fs.readFileSync(path.join(f.root, "custom/WORKING.json")),
      before,
    );
    const m = ok(
      await execute("architecture.working.migrate", {
        ...f.input,
        workingPath: "custom/WORKING.json",
      }),
    );
    assert.deepEqual(m.state.acceptedDecisions, old.acceptedDecisions);
    assert.ok(m.state.nodes.every((n) => n.status === "undetermined"));
    assert.equal(m.ready, false);
    assert.ok(
      fs.existsSync(
        path.join(
          f.root,
          "custom/WORKING.json.legacy-" + digest(old) + ".json",
        ),
      ),
    );
  }));
test("Unsafe paths, symlinks, non-authoritative worktree copies and modified dependencies fail", () =>
  use(async (f) => {
    for (const p of ["../state", "x/../state", "x\\state", "x:state"])
      assert.equal(
        (
          await execute("architecture.working.read", {
            root: f.root,
            workingPath: p,
          })
        ).status,
        "validation_failed",
      );
    await init(f);
    const file = path.join(f.root, "spec/architecture/WORKING.json"),
      copy = path.join(f.base, "copy");
    fs.mkdirSync(copy);
    write(
      path.join(copy, "spec/architecture/WORKING.json"),
      fs.readFileSync(file),
    );
    assert.equal(
      (
        await execute("architecture.working.update", {
          ...f.input,
          root: copy,
          expectedRevision: 1,
        })
      ).status,
      "validation_failed",
    );
    const s = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    s.nodes[0].dependencies = ["scope"];
    assert.throws(() => checkState(s));
    try {
      fs.symlinkSync(file, path.join(f.root, "linked-state"));
      assert.equal(
        (
          await execute("architecture.working.read", {
            root: f.root,
            workingPath: "linked-state",
          })
        ).status,
        "validation_failed",
      );
    } catch (e) {
      if (!["EPERM", "EACCES"].includes(e.code)) throw e;
    }
  }));
test("Candidate cannot bypass readiness or bind excluded/stale nodes; immutable input survives phase changes", () =>
  use(async (f) => {
    await init(f);
    assert.equal(
      (
        await execute("architecture.candidate.generate", {
          ...f.input,
          expectedRevision: 1,
          candidate: candidate(),
        })
      ).status,
      "user_decision_required",
    );
    const raw = candidate();
    assert.equal(
      (
        await execute("architecture.freeze", {
          ...f.input,
          expectedRevision: 1,
          candidate: raw,
          legacy: true,
          version: "1.0.0",
          decision: { freeze: true, version: "1.0.0" },
        })
      ).status,
      "user_decision_required",
    );
    // Complete answers without erasing the initialized discussion.
    await update(
      f,
      definition.nodes.map((n) =>
        answer(
          f,
          n.id,
          n.id === "components"
            ? { types: ["other"], gui: false }
            : n.id === "budget"
              ? {
                  deadline: "week",
                  resources: [
                    {
                      type: "funds",
                      amount: 0,
                      currency: "CNY",
                      period: "week",
                      coverage: "fixture",
                    },
                  ],
                }
              : n.id === "feasibility"
                ? { feasible: true, basis: "bounded" }
                : "fixture",
        ),
      ),
    );
    let g = await generated(f);
    const snap = fs.readFileSync(
        path.join(f.root, g.candidate.discussion.snapshot),
      ),
      h = contentDigest(g.state);
    const r = await review(f, g.candidate);
    let current = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    const a = ok(
      await execute("architecture.working.advance", {
        ...f.input,
        expectedRevision: current.revision,
        phase: "reviewed",
        candidate: g.candidate,
        reviewPackages: [r],
      }),
    );
    assert.equal(contentDigest(a.state), h);
    assert.deepEqual(
      fs.readFileSync(path.join(f.root, g.candidate.discussion.snapshot)),
      snap,
    );
    assert.equal(
      (
        await execute("review.package", {
          root: f.root,
          candidate: g.candidate,
          output: path.join(f.base, "mutable-review"),
          sources: [
            {
              path: "spec/architecture/WORKING.json",
              category: "AUTHORITATIVE",
            },
          ],
        })
      ).status,
      "validation_failed",
    );
    const b = candidate();
    b.sections[0].nodeIds = ["server.stack"];
    assert.equal(
      (
        await execute("architecture.candidate.generate", {
          ...f.input,
          expectedRevision: a.state.revision,
          candidate: b,
        })
      ).status,
      "validation_failed",
    );
  }));

test("Active stack changes invalidate dataflow/contracts/GUI/feasibility while inactive branches do not", () =>
  use(async (f) => {
    await complete(f, ["server", "web"]);
    const result = await update(f, [
      answer(
        f,
        "server.stack",
        "replacement platform with changed costs/protocol",
      ),
    ]);
    for (const id of ["dataflow", "contracts", "feasibility"])
      assert.equal(
        result.state.nodes.find((n) => n.id === id).status,
        "needs-review",
      );
    assert.equal(result.ready, false);
    const reanswered = await update(
      f,
      definition.nodes.map((n) =>
        answer(
          f,
          n.id,
          n.id === "components"
            ? { types: ["server", "web"], gui: false }
            : n.id === "budget"
              ? {
                  deadline: "week",
                  resources: [
                    { type: "people", count: 1, availability: "week" },
                  ],
                }
              : n.id === "feasibility"
                ? { feasible: true, basis: "rechecked" }
                : "reconfirmed",
        ),
      ),
    );
    assert.equal(reanswered.ready, true);
    const inactive = await update(f, [
      answer(f, "game.stack", "future inactive engine"),
    ]);
    assert.equal(
      inactive.state.nodes.find((n) => n.id === "dataflow").status,
      "confirmed",
    );
    assert.equal(inactive.ready, true);
  }));
test("Batch preserves explicitly repeated unchanged downstream answers after upstream changes", () =>
  use(async (f) => {
    await complete(f);
    const before = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    const r = await update(f, [
      answer(f, "goals", "changed bounded goals"),
      answer(f, "scope", "changed scope"),
      answer(
        f,
        "components",
        before.nodes.find((n) => n.id === "components").value,
      ),
    ]);
    assert.equal(
      r.state.nodes.find((n) => n.id === "components").status,
      "confirmed",
    );
    assert.equal(
      r.state.nodes.find((n) => n.id === "other.stack").status,
      "needs-review",
    );
  }));

test("Concern applicability is explicit and generated from confirmed nodes; altered candidate concern fails", () =>
  use(async (f) => {
    await complete(f);
    const g = await generated(f);
    assert.ok(
      g.candidate.concerns.every(
        (c) => typeof c.applicable === "boolean" && c.reason,
      ),
    );
    const altered = structuredClone(g.candidate);
    altered.concerns[0].applicable = true;
    const r = await execute("review.package", {
      root: f.root,
      candidate: altered,
      output: path.join(f.base, "altered-concern"),
      sources: [],
    });
    assert.notEqual(r.status, "success");
    const s = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    assert.equal(
      (
        await execute("architecture.working.update", {
          ...f.input,
          expectedRevision: s.revision,
          operations: [
            {
              type: "set",
              id: "concern.transport",
              status: "confirmed",
              value: "assumed applicable",
              evidence: f.evidence,
            },
          ],
        })
      ).status,
      "validation_failed",
    );
  }));

test("Two independent CLI processes cannot both commit the same expected revision", () =>
  use(async (f) => {
    await init(f);
    const { spawn } = await import("node:child_process");
    const cli = path.resolve("1.1.0/scripts/core/cli.mjs"),
      files = ["one", "two"].map((name, i) => {
        const file = path.join(f.base, name + ".json");
        write(
          file,
          JSON.stringify({
            ...f.input,
            expectedRevision: 1,
            operations: [answer(f, i ? "scope" : "goals", name)],
          }),
        );
        return file;
      });
    const results = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const p = spawn(
              process.execPath,
              [cli, "architecture.working.update", "--input", file],
              { cwd: f.root, env: process.env },
            );
            let stdout = "",
              stderr = "";
            p.stdout.on("data", (b) => (stdout += b));
            p.stderr.on("data", (b) => (stderr += b));
            p.on("error", reject);
            p.on("close", (code) => {
              try {
                resolve({ code, result: JSON.parse(stdout), stderr });
              } catch (e) {
                reject(e);
              }
            });
          }),
      ),
    );
    assert.equal(
      results.filter((r) => r.result.status === "success").length,
      1,
    );
    assert.equal(results.filter((r) => r.code !== 0).length, 1);
    assert.equal(
      ok(await execute("architecture.working.read", { root: f.root })).state
        .revision,
      2,
    );
  }));

test("Missing funds never become zero and numeric strings never become resource counts", () =>
  use(async (f) => {
    await init(f);
    for (const resource of [
      {
        type: "funds",
        amount: null,
        currency: "CNY",
        period: "week",
        coverage: "all",
      },
      {
        type: "funds",
        amount: "",
        currency: "CNY",
        period: "week",
        coverage: "all",
      },
      { type: "people", count: "1", availability: "week" },
    ])
      assert.equal(
        (
          await execute("architecture.working.update", {
            ...f.input,
            expectedRevision: 1,
            operations: [
              answer(f, "budget", { deadline: "week", resources: [resource] }),
            ],
          })
        ).status,
        "validation_failed",
      );
  }));
