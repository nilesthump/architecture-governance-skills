import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  fixture,
  ok,
  complete,
  generated,
  review,
  seed,
  execute,
} from "../helpers.mjs";
import {
  saveState,
  contentDigest,
} from "../../../1.1.0/scripts/core/working.mjs";
import {
  run,
  readJSON,
  write,
  digest,
} from "../../../1.1.0/scripts/core/util.mjs";
async function use(fn) {
  const f = fixture();
  try {
    await fn(f);
  } finally {
    f.cleanup();
  }
}
test("State-bound real PDF/PUML freeze; historical verification survives later working-state changes", () =>
  use(async (f) => {
    await complete(f);
    seed(f);
    const g = await generated(f),
      r = await review(f, g.candidate);
    let a = ok(
      await execute("architecture.working.advance", {
        ...f.input,
        expectedRevision: g.state.revision,
        phase: "reviewed",
        candidate: g.candidate,
        reviewPackages: [r],
      }),
    );
    const freeze = {
      ...f.input,
      expectedRevision: a.state.revision,
      candidate: g.candidate,
      reviewPackages: [r],
      version: "2.0.0",
      decision: { freeze: true, version: "2.0.0" },
      plantumlJar: process.env.ARCHITECTURE_PLANTUML_JAR,
      python: process.env.ARCHITECTURE_PYTHON,
    };
    const frozen = ok(await execute("architecture.freeze", freeze));
    assert.equal(frozen.version, "2.0.0");
    const dir = path.join(f.root, "spec/architecture/v2.0.0");
    assert.equal(
      fs
        .readFileSync(path.join(dir, "ARCHITECTURE.pdf"))
        .subarray(0, 5)
        .toString(),
      "%PDF-",
    );
    assert.ok(
      fs.readFileSync(path.join(dir, "diagrams/health-sequence.png")).length >
        100,
    );
    assert.ok(fs.existsSync(path.join(dir, "STATE.json")));
    let s = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    assert.equal(s.phase, "frozen");
    assert.equal(contentDigest(s), g.candidate.discussion.digest);
    assert.equal(
      (
        await execute("architecture.working.update", {
          ...f.input,
          expectedRevision: s.revision,
          operations: [],
        })
      ).status,
      "user_decision_required",
    );
    assert.equal(
      (
        await execute("architecture.working.advance", {
          ...f.input,
          expectedRevision: s.revision,
          phase: "bootstrapped",
          candidate: g.candidate,
        })
      ).status,
      "user_decision_required",
      "Git alone does not satisfy bootstrap",
    );
    ok(
      await execute("governance.install", {
        root: f.root,
        mode: "greenfield",
        contract: {
          version: 1,
          commands: [
            {
              name: "fixture",
              executable: process.execPath,
              args: ["-e", 'process.stdout.write("validated")'],
            },
          ],
        },
        allowedPaths: ["src/**"],
        python: freeze.python,
      }),
    );
    fs.cpSync(dir, path.join(f.root, "unrelated/v2.0.0"), { recursive: true });
    const substitution = await execute("architecture.working.advance", {
      ...f.input,
      expectedRevision: s.revision,
      phase: "bootstrapped",
      candidate: g.candidate,
      directory: "unrelated/v2.0.0",
      layout: {
        directory: "unrelated",
        pointer: "unrelated/CURRENT",
        versionPrefix: "v",
      },
      python: freeze.python,
    });
    assert.equal(substitution.status, "validation_failed");
    s = ok(
      await execute("architecture.working.advance", {
        ...f.input,
        expectedRevision: s.revision,
        phase: "bootstrapped",
        candidate: g.candidate,
        python: freeze.python,
      }),
    ).state;
    assert.equal(
      (
        await execute("architecture.working.advance", {
          ...f.input,
          expectedRevision: s.revision,
          phase: "validated",
          candidate: g.candidate,
          directory: "unrelated/v2.0.0",
          contract: readJSON(
            path.join(f.root, "spec/governance/validation.json"),
          ),
          python: freeze.python,
        })
      ).status,
      "validation_failed",
    );
    assert.equal(
      (
        await execute("architecture.working.advance", {
          ...f.input,
          expectedRevision: s.revision,
          phase: "validated",
          candidate: g.candidate,
          contract: {
            version: 1,
            commands: [
              {
                name: "fake",
                executable: process.execPath,
                args: ["-e", "process.exit(0)"],
              },
            ],
          },
          python: freeze.python,
        })
      ).status,
      "validation_failed",
    );
    s = ok(
      await execute("architecture.working.advance", {
        ...f.input,
        expectedRevision: s.revision,
        phase: "validated",
        candidate: g.candidate,
        contract: readJSON(
          path.join(f.root, "spec/governance/validation.json"),
        ),
        python: freeze.python,
      }),
    ).state;
    assert.equal(
      (
        await execute("architecture.working.advance", {
          ...f.input,
          expectedRevision: s.revision,
          phase: "accepted",
          candidate: g.candidate,
          acceptanceEvidence: f.evidence,
          python: freeze.python,
        })
      ).status,
      "user_decision_required",
      "Real behavior trace remains a separate gate",
    );
    // Handcrafted accepted state isolates archive persistence tests; this is not real acceptance evidence.
    s.phase = "accepted";
    saveState(path.join(f.root, "spec/architecture/WORKING.json"), s);
    const archived = ok(
      await execute("architecture.working.archive", {
        ...f.input,
        expectedRevision: s.revision,
      }),
    );
    const next = ok(
      await execute("architecture.working.start", {
        ...f.input,
        expectedRevision: archived.state.revision,
        discussionId: "discussion-2",
      }),
    );
    assert.equal(next.state.discussionId, "discussion-2");
    assert.equal(next.state.links.baseline.architecture.version, "2.0.0");
    const originalSnapshot = fs.readFileSync(path.join(dir, "STATE.json"));
    const newInput = {
      ...f.input,
      discussionId: "discussion-2",
      expectedRevision: next.state.revision,
    };
    const answers = (await import("../helpers.mjs")).definition.nodes.map(
      (n) => {
        const old = s.nodes.find((x) => x.id === n.id);
        return {
          type: "set",
          id: n.id,
          status: old.status,
          value: old.value,
          evidence: old.evidence,
          reason: old.reason,
        };
      },
    );
    const answered = ok(
      await execute("architecture.working.update", {
        ...newInput,
        operations: answers,
      }),
    );
    const g2 = ok(
        await execute("architecture.candidate.generate", {
          ...newInput,
          expectedRevision: answered.state.revision,
          candidate: (await import("../helpers.mjs")).candidate(),
        }),
      ),
      r2 = await review(f, g2.candidate);
    const a2 = ok(
      await execute("architecture.working.advance", {
        ...newInput,
        expectedRevision: g2.state.revision,
        phase: "reviewed",
        candidate: g2.candidate,
        reviewPackages: [r2],
      }),
    );
    const f2 = ok(
      await execute("architecture.freeze", {
        ...freeze,
        ...newInput,
        expectedRevision: a2.state.revision,
        candidate: g2.candidate,
        reviewPackages: [r2],
        decision: {
          freeze: true,
          version: "2.0.0",
          preserveVersion: true,
          reason: "Confirmed baseline change with version preserved",
        },
      }),
    );
    assert.equal(f2.revision, 2);
    const history = path.join(
      f.root,
      "spec/architecture/history/v2.0.0/revision-1",
    );
    assert.deepEqual(
      fs.readFileSync(path.join(history, "STATE.json")),
      originalSnapshot,
    );
    ok(
      await execute("architecture.integrity.verify", {
        root: f.root,
        directory: "spec/architecture/history/v2.0.0/revision-1",
        python: freeze.python,
      }),
    );
    ok(
      await execute("architecture.integrity.verify", {
        root: f.root,
        python: freeze.python,
      }),
    );
    write(path.join(dir, "STATE.json"), "tampered");
    assert.equal(
      (
        await execute("architecture.integrity.verify", {
          root: f.root,
          python: freeze.python,
        })
      ).status,
      "validation_failed",
    );
  }));
test("Archive is immutable/idempotent, conflicts fail, entry survives archive/write failure", () =>
  use(async (f) => {
    await complete(f);
    let s = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    const file = path.join(f.root, "spec/architecture/WORKING.json");
    assert.equal(
      (
        await execute("architecture.working.archive", {
          ...f.input,
          expectedRevision: s.revision,
        })
      ).status,
      "user_decision_required",
    );
    // Existing completed-state fixture: no synthetic behavior trace is represented as real evidence.
    s.mode = "existing";
    s.phase = "accepted";
    saveState(file, s);
    const input = {
      ...f.input,
      mode: "existing",
      expectedRevision: s.revision,
      approval: {
        approved: true,
        paths: [
          "spec/architecture/WORKING.json",
          "spec/architecture/discussions/discussion-1/STATE.json",
        ],
      },
    };
    let a = ok(await execute("architecture.working.archive", input));
    const snapshot = path.join(f.root, a.state.links.archive.path),
      original = fs.readFileSync(snapshot);
    const again = ok(
      await execute("architecture.working.archive", {
        ...input,
        expectedRevision: a.state.revision,
      }),
    );
    assert.equal(again.idempotent, true);
    assert.equal(again.state.revision, a.state.revision);
    assert.deepEqual(fs.readFileSync(snapshot), original);
    assert.equal(
      (
        await execute("architecture.working.archive", {
          ...input,
          expectedRevision: a.state.revision,
          archivePath: "elsewhere/STATE.json",
        })
      ).status,
      "user_decision_required",
    );
    s = structuredClone(a.state);
    s.risks.push("changed final content");
    saveState(file, s);
    assert.equal(
      (
        await execute("architecture.working.archive", {
          ...input,
          expectedRevision: s.revision,
        })
      ).status,
      "validation_failed",
    );
    assert.deepEqual(fs.readFileSync(snapshot), original);
    s = structuredClone(a.state);
    delete s.links.archive;
    saveState(file, s);
    const before = fs.readFileSync(file),
      rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      if (path.resolve(to) === path.resolve(file))
        throw Error("injected working entry failure");
      return rename(from, to);
    };
    try {
      assert.equal(
        (
          await execute("architecture.working.archive", {
            ...input,
            expectedRevision: s.revision,
          })
        ).status,
        "execution_failed",
      );
      assert.deepEqual(fs.readFileSync(file), before);
    } finally {
      fs.renameSync = rename;
    }
    assert.ok(fs.existsSync(snapshot));
    ok(
      await execute("architecture.working.archive", {
        ...input,
        expectedRevision: s.revision,
      }),
    );
  }));
test("Freeze render/publication failure never advances phase or CURRENT; manual candidate fails", () =>
  use(async (f) => {
    await complete(f);
    seed(f);
    const g = await generated(f),
      r = await review(f, g.candidate),
      a = ok(
        await execute("architecture.working.advance", {
          ...f.input,
          expectedRevision: g.state.revision,
          phase: "reviewed",
          candidate: g.candidate,
          reviewPackages: [r],
        }),
      );
    const input = {
      ...f.input,
      expectedRevision: a.state.revision,
      candidate: g.candidate,
      reviewPackages: [r],
      version: "3.0.0",
      decision: { freeze: true, version: "3.0.0" },
      plantumlJar: path.join(f.root, "missing.jar"),
    };
    assert.equal(
      (await execute("architecture.freeze", input)).status,
      "execution_failed",
    );
    assert.equal(
      fs.existsSync(path.join(f.root, "spec/architecture/CURRENT")),
      false,
    );
    assert.deepEqual(
      ok(await execute("architecture.working.read", { root: f.root })).state,
      a.state,
    );
    const forged = structuredClone(g.candidate);
    forged.sections[0].content = "unreviewed different content";
    assert.equal(
      (await execute("architecture.freeze", { ...input, candidate: forged }))
        .status,
      "user_decision_required",
    );
  }));

test("Existing freeze requires each formal output and pointer path; no paths are written on refusal", () =>
  use(async (f) => {
    await complete(f);
    seed(f);
    let s = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    s.mode = "existing";
    saveState(path.join(f.root, "spec/architecture/WORKING.json"), s);
    const base = {
      ...f.input,
      mode: "existing",
      approval: { approved: true, paths: ["spec/architecture/WORKING.json"] },
    };
    let g = await execute("architecture.candidate.generate", {
      ...base,
      expectedRevision: s.revision,
      candidate: (await import("../helpers.mjs")).candidate(),
    });
    assert.equal(g.status, "user_decision_required");
    const inputPath = g.data.paths.find(
      (p) => p !== "spec/architecture/WORKING.json",
    );
    base.approval.paths.push(inputPath);
    g = ok(
      await execute("architecture.candidate.generate", {
        ...base,
        expectedRevision: s.revision,
        candidate: (await import("../helpers.mjs")).candidate(),
      }),
    );
    const r = await review(f, g.candidate),
      a = ok(
        await execute("architecture.working.advance", {
          ...base,
          expectedRevision: g.state.revision,
          phase: "reviewed",
          candidate: g.candidate,
          reviewPackages: [r],
        }),
      );
    const result = await execute("architecture.freeze", {
      ...base,
      expectedRevision: a.state.revision,
      candidate: g.candidate,
      reviewPackages: [r],
      version: "4.0.0",
      decision: { freeze: true, version: "4.0.0" },
    });
    assert.equal(result.status, "user_decision_required");
    assert.ok(result.data.paths.includes("spec/architecture/CURRENT"));
    assert.equal(
      fs.existsSync(path.join(f.root, "spec/architecture/v4.0.0")),
      false,
    );
    const authorized = {
      ...base,
      approval: {
        approved: true,
        paths: [...base.approval.paths, ...result.data.paths],
      },
    };
    write(
      path.join(f.root, "CLAUDE.md"),
      "Inherited custom repository instructions.\n",
    );
    const contract = {
      version: 1,
      commands: [
        {
          name: "existing-test",
          executable: process.execPath,
          args: ["-e", "process.stdout.write('existing validation')"],
        },
      ],
    };
    write(path.join(f.root, "norms/validation.json"), JSON.stringify(contract));
    ok(
      await execute("architecture.freeze", {
        ...authorized,
        expectedRevision: a.state.revision,
        candidate: g.candidate,
        reviewPackages: [r],
        version: "4.0.0",
        decision: { freeze: true, version: "4.0.0" },
        plantumlJar: process.env.ARCHITECTURE_PLANTUML_JAR,
        python: process.env.ARCHITECTURE_PYTHON,
      }),
    );
    let state = ok(
      await execute("architecture.working.read", { root: f.root }),
    ).state;
    state = ok(
      await execute("architecture.working.advance", {
        ...authorized,
        expectedRevision: state.revision,
        phase: "bootstrapped",
        candidate: g.candidate,
        completionEvidence: f.evidence,
        contractPath: "norms/validation.json",
        python: process.env.ARCHITECTURE_PYTHON,
      }),
    ).state;
    state = ok(
      await execute("architecture.working.advance", {
        ...authorized,
        expectedRevision: state.revision,
        phase: "validated",
        candidate: g.candidate,
        contract,
        python: process.env.ARCHITECTURE_PYTHON,
      }),
    ).state;
    const accepted = await execute("architecture.working.advance", {
      ...authorized,
      expectedRevision: state.revision,
      phase: "accepted",
      candidate: g.candidate,
      acceptanceEvidence: f.evidence,
      python: process.env.ARCHITECTURE_PYTHON,
    });
    assert.equal(accepted.status, "user_decision_required");
    assert.match(accepted.message, /real fresh-context/i);
    assert.equal(
      fs.readFileSync(path.join(f.root, "CLAUDE.md"), "utf8"),
      "Inherited custom repository instructions.\n",
    );
    assert.equal(
      fs.existsSync(path.join(f.root, "spec/governance/validation.json")),
      false,
    );
  }));
