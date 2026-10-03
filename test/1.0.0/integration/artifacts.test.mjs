import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execute } from "../../../1.0.0/scripts/core/cli.mjs";
import { run, write } from "../../../1.0.0/scripts/core/util.mjs";
import {
  temp,
  cleanup,
  gitSeed,
  candidate,
  freezeInput,
  contract,
} from "../helpers.mjs";
test("Greenfield PDF/PUML parity, governance, versions and retained revisions", async () => {
  assert.ok(process.env.ARCHITECTURE_PLANTUML_JAR, "Real renderer required");
  assert.ok(process.env.ARCHITECTURE_PYTHON, "PDF extraction required");
  const base = temp(),
    root = path.join(base, "repo");
  fs.mkdirSync(root);
  try {
    gitSeed(root);
    const c = candidate(),
      input = freezeInput(root, c, base),
      frozen = await execute("architecture.freeze", input);
    assert.equal(frozen.status, "success", JSON.stringify(frozen));
    const dir = path.join(root, "spec/architecture/v1.0.0");
    assert.equal(
      fs
        .readFileSync(path.join(dir, "ARCHITECTURE.pdf"))
        .subarray(0, 5)
        .toString(),
      "%PDF-",
    );
    const verified = await execute("architecture.integrity.verify", {
      root,
      python: input.python,
    });
    assert.equal(verified.status, "success", JSON.stringify(verified));
    const metadata = JSON.parse(
      run(input.python, [
        "-c",
        'import sys,json; from pypdf import PdfReader; r=PdfReader(sys.argv[1]); print(json.dumps({"pages":len(r.pages),"outlines":len(r.outline)}))',
        path.join(dir, "ARCHITECTURE.pdf"),
      ]),
    );
    assert.ok(metadata.pages >= 4);
    assert.ok(metadata.outlines >= 4);
    assert.equal(
      (
        await execute("governance.install", {
          root,
          mode: "greenfield",
          contract,
          allowedPaths: ["src/**", "tests/**", "spec/progress/**"],
          python: input.python,
        })
      ).status,
      "success",
    );
    assert.equal(
      fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8").trim(),
      "Read and follow ./AGENTS.md.",
    );
    assert.equal(
      (await execute("governance.test", { root, python: input.python })).status,
      "user_decision_required",
      "Structural checks cannot prove behavior",
    );
    const revised = await execute("architecture.freeze", {
      ...freezeInput(root, c, base),
      decision: {
        freeze: true,
        version: "1.0.0",
        preserveVersion: true,
        reason: "Clarify with version preserved",
      },
    });
    assert.equal(revised.status, "success", JSON.stringify(revised));
    assert.equal(revised.data.revision, 2);
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          "spec/architecture/history/v1.0.0/revision-1/ARCHITECTURE.pdf",
        ),
      ),
    );
    assert.equal(
      (
        await execute(
          "architecture.freeze",
          freezeInput(root, c, base, "1.1.0"),
        )
      ).status,
      "success",
    );
    assert.equal(
      fs
        .readFileSync(path.join(root, "spec/architecture/CURRENT"), "utf8")
        .trim(),
      "v1.1.0",
    );
    assert.ok(fs.existsSync(dir));
    write(
      path.join(root, "spec/architecture/v1.1.0/ARCHITECTURE.md"),
      "tampered",
    );
    assert.equal(
      (
        await execute("architecture.integrity.verify", {
          root,
          python: input.python,
        })
      ).status,
      "validation_failed",
    );
  } finally {
    cleanup(base);
  }
});
test("Unsafe diagrams and duplicate IDs rejected", async () => {
  const base = temp(),
    root = path.join(base, "repo");
  fs.mkdirSync(root);
  try {
    gitSeed(root);
    let c = candidate();
    c.diagrams[0].source =
      "@startuml\n!include https://example.invalid/a\n@enduml";
    assert.equal(
      (await execute("architecture.freeze", freezeInput(root, c, base))).status,
      "validation_failed",
    );
    c = candidate();
    c.sections[1].id = c.sections[0].id;
    assert.equal(
      (await execute("architecture.freeze", freezeInput(root, c, base))).status,
      "validation_failed",
    );
  } finally {
    cleanup(base);
  }
});
test("Unicode missing font fails rather than dropping glyphs", async () => {
  const base = temp(),
    root = path.join(base, "repo");
  fs.mkdirSync(root);
  try {
    gitSeed(root);
    const c = candidate();
    c.title = "架构文档";
    const input = freezeInput(root, c, base),
      saved = process.env.ARCHITECTURE_FONT;
    delete process.env.ARCHITECTURE_FONT;
    try {
      assert.equal(
        (await execute("architecture.freeze", input)).status,
        "execution_failed",
      );
      assert.equal(
        fs.existsSync(path.join(root, "spec/architecture/CURRENT")),
        false,
      );
    } finally {
      if (saved) process.env.ARCHITECTURE_FONT = saved;
    }
  } finally {
    cleanup(base);
  }
});

test("Successful Chinese long-document PDF preserves glyphs and semantic text", async () => {
  const base = temp(),
    root = path.join(base, "repo");
  fs.mkdirSync(root);
  try {
    gitSeed(root);
    const c = candidate();
    c.title = "架构治理与健康检查";
    c.sections[0].content =
      "当前系统只实现明确的健康检查需求，保持最小可靠实现。".repeat(100);
    const input = freezeInput(root, c, base);
    input.fontPath = process.env.ARCHITECTURE_FONT;
    assert.ok(
      input.fontPath,
      "Configured cross-platform Chinese font required",
    );
    const r = await execute("architecture.freeze", input);
    assert.equal(r.status, "success", JSON.stringify(r));
    assert.equal(
      (
        await execute("architecture.integrity.verify", {
          root,
          python: input.python,
        })
      ).status,
      "success",
    );
  } finally {
    cleanup(base);
  }
});
