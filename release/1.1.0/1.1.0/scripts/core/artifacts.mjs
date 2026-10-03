import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import PDFDocument from "pdfkit";
import YAML from "yaml";
import {
  rootOf,
  safe,
  write,
  atomic,
  sha,
  digest,
  readJSON,
  validate,
  fail,
  run,
  revision,
  suiteRoot,
} from "./util.mjs";
import { verifyReports } from "./review.mjs";
import { withWorkingLock, verifyBinding, saveState } from "./working.mjs";
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function candidateCheck(candidate) {
  validate("candidate", candidate);
  const ids = candidate.sections.map((s) => s.id);
  if (new Set(ids).size !== ids.length)
    fail("validation_failed", "Duplicate section IDs");
  const diagramIds = candidate.diagrams.map((d) => d.id);
  if (new Set(diagramIds).size !== diagramIds.length)
    fail("validation_failed", "Duplicate diagram IDs");
  for (const d of candidate.diagrams) {
    if (!d.sectionIds.length || d.sectionIds.some((id) => !ids.includes(id)))
      fail("validation_failed", "Invalid diagram section mapping");
    if (
      !/^\s*@startuml\b/.test(d.source) ||
      !/@enduml\s*$/.test(d.source) ||
      /^\s*!/m.test(d.source)
    )
      fail(
        "validation_failed",
        "Unsafe/invalid PlantUML source: directives/includes forbidden",
      );
  }
  return candidate;
}
function modelText(c, version) {
  const lines = [
    c.title,
    "Architecture identity: " + c.identity,
    "Architecture version: " + version,
  ];
  for (const [key, title] of Object.entries({
    requirements: "Requirements",
    constraints: "Constraints",
    nonGoals: "Non-goals",
    assumptions: "Assumptions",
    risks: "Risks",
    externalDependencies: "External dependencies",
    rejectedAlternatives: "Rejected alternatives",
  })) {
    if (c[key]?.length) lines.push(title, ...c[key]);
  }
  for (const d of c.decisions)
    lines.push("Decision " + d.id + " [" + d.status + "]: " + d.text);
  for (const s of c.sections) {
    lines.push(s.id + " " + s.title, s.content);
    if (s.rationale) lines.push("Rationale: " + s.rationale);
    if (s.tradeoffs) lines.push("Trade-offs: " + s.tradeoffs);
  }
  for (const d of c.diagrams)
    lines.push("Diagram " + d.id + " | " + d.sectionIds.join(", "));
  return lines;
}
function markdown(c, version) {
  const lines = [
    "# " + c.title,
    "",
    "Architecture identity: " + c.identity,
    "Architecture version: " + version,
    "",
    "## Contents",
    "",
    ...c.sections.map(
      (s) => "- [" + s.id + " " + s.title + "](#" + s.id.toLowerCase() + ")",
    ),
    "",
  ];
  for (const [key, title] of Object.entries({
    requirements: "Requirements",
    constraints: "Constraints",
    nonGoals: "Non-goals",
    assumptions: "Assumptions",
    risks: "Risks",
    externalDependencies: "External dependencies",
    rejectedAlternatives: "Rejected alternatives",
  })) {
    if (c[key]?.length)
      lines.push("## " + title, "", ...c[key].map((v) => "- " + v), "");
  }
  lines.push(
    "## Decisions",
    "",
    ...c.decisions.map(
      (d) => "- Decision " + d.id + " [" + d.status + "]: " + d.text,
    ),
    "",
  );
  for (const s of c.sections) {
    lines.push(
      '<a id="' + s.id.toLowerCase() + '"></a>',
      "## " + s.id + " " + s.title,
      "",
      s.content,
      "",
    );
    if (s.rationale) lines.push("Rationale: " + s.rationale, "");
    if (s.tradeoffs) lines.push("Trade-offs: " + s.tradeoffs, "");
  }
  for (const d of c.diagrams)
    lines.push(
      "### Diagram " + d.id + " | " + d.sectionIds.join(", "),
      "",
      "![Diagram " + d.id + "](diagrams/" + d.id + ".png)",
      "",
      "Source: [PlantUML](diagrams/" + d.id + ".puml)",
      "",
    );
  return lines.join("\n");
}
export function renderPuml(source, jar) {
  if (!jar || !path.isAbsolute(jar) || !fs.existsSync(jar))
    fail(
      "execution_failed",
      "Configure existing absolute plantumlJar or ARCHITECTURE_PLANTUML_JAR",
    );
  const r = spawnSync(
    "java",
    [
      "-DPLANTUML_SECURITY_PROFILE=SECURE",
      "-Djava.awt.headless=true",
      "-jar",
      jar,
      "-pipe",
      "-tpng",
    ],
    {
      input: Buffer.from(source),
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (
    r.error ||
    r.status !== 0 ||
    !r.stdout
      ?.subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    fail("execution_failed", "PlantUML rendering failed", {
      stderr: r.stderr?.toString().slice(-4000),
      reason: r.error?.message,
    });
  return r.stdout;
}
async function renderPdf(c, version, dir, fontPath) {
  const text = modelText(c, version).join("\n");
  if (/[^\x00-\x7f]/.test(text) && !fontPath)
    fail(
      "execution_failed",
      "Unicode content requires configured embeddable fontPath",
    );
  const doc = new PDFDocument({
    size: "A4",
    margin: 52,
    bufferPages: true,
    info: {
      Title: c.title,
      Subject: c.identity + " " + version,
      Creator: "Architecture Governance Skill Suite 1.1.0",
    },
  });
  const chunks = [];
  doc.on("data", (b) => chunks.push(b));
  const finished = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  if (fontPath) doc.font(fontPath);
  const bodyFont = fontPath || "Helvetica";
  const heading = (text) => {
    doc.font(bodyFont).fontSize(17).fillColor("#16324f").text(text);
    doc.moveDown(0.7);
  };
  const body = (text) => {
    doc
      .font(bodyFont)
      .fontSize(10)
      .fillColor("#243447")
      .text(text, { lineGap: 4 });
    doc.moveDown(0.7);
  };
  heading(c.title);
  body("Architecture identity: " + c.identity);
  body("Architecture version: " + version);
  heading("Contents");
  const outline = doc.outline.addItem("Contents");
  for (const s of c.sections) body(s.id + " " + s.title);
  doc.addPage();
  for (const [key, title] of Object.entries({
    requirements: "Requirements",
    constraints: "Constraints",
    nonGoals: "Non-goals",
    assumptions: "Assumptions",
    risks: "Risks",
    externalDependencies: "External dependencies",
    rejectedAlternatives: "Rejected alternatives",
  })) {
    if (c[key]?.length) {
      heading(title);
      for (const v of c[key]) body(v);
    }
  }
  heading("Decisions");
  for (const d of c.decisions)
    body("Decision " + d.id + " [" + d.status + "]: " + d.text);
  for (const s of c.sections) {
    doc.addPage();
    doc.outline.addItem(s.id + " " + s.title);
    heading(s.id + " " + s.title);
    body(s.content);
    if (s.rationale) body("Rationale: " + s.rationale);
    if (s.tradeoffs) body("Trade-offs: " + s.tradeoffs);
    for (const d of c.diagrams.filter((d) => d.sectionIds.includes(s.id))) {
      doc.addPage();
      heading("Diagram " + d.id + " | " + d.sectionIds.join(", "));
      doc.image(path.join(dir, "diagrams", d.id + ".png"), {
        fit: [490, 650],
        align: "center",
      });
    }
  }
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .font(bodyFont)
      .fontSize(8)
      .fillColor("#607080")
      .text("Page " + (i + 1) + " / " + range.count, 52, doc.page.height - 36, {
        lineBreak: false,
      });
  }
  doc.end();
  return finished;
}
export function pdfText(pdf, python) {
  return run(
    python ||
      process.env.ARCHITECTURE_PYTHON ||
      (process.platform === "win32" ? "python" : "python3"),
    [
      "-X",
      "utf8",
      "-c",
      'import sys; from pypdf import PdfReader; r=PdfReader(sys.argv[1]); texts=[]\nfor i,p in enumerate(r.pages):\n t=(p.extract_text() or "").rstrip(); footer="Page "+str(i+1)+" / "+str(len(r.pages))\n if t.endswith(footer): t=t[:-len(footer)].rstrip()\n texts.append(t)\nprint("\\n".join(texts))',
      pdf,
    ],
  );
}
const normalize = (s) =>
  s
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[\u00ad]/g, "");
export function parity(dir, python) {
  const model = readJSON(path.join(dir, "candidate.json")),
    manifest = YAML.parse(
      fs.readFileSync(path.join(dir, "manifest.yaml"), "utf8"),
    );
  candidateCheck(model);
  if (
    model.identity !== manifest.identity ||
    digest(model) !== manifest.candidateDigest
  )
    fail("validation_failed", "Manifest identity/candidate binding mismatch");
  if (
    manifest.diagrams.length !== model.diagrams.length ||
    model.diagrams.some(
      (d) =>
        !manifest.diagrams.some(
          (m) =>
            m.id === d.id &&
            m.puml === "diagrams/" + d.id + ".puml" &&
            m.image === "diagrams/" + d.id + ".png" &&
            JSON.stringify(m.sectionIds) === JSON.stringify(d.sectionIds),
        ),
    )
  )
    fail("validation_failed", "Manifest diagram mappings mismatch");
  const md = fs.readFileSync(path.join(dir, "ARCHITECTURE.md"), "utf8"),
    pdf = pdfText(path.join(dir, "ARCHITECTURE.pdf"), python);
  for (const fragment of modelText(model, manifest.version)) {
    if (
      !normalize(md).includes(normalize(fragment)) ||
      !normalize(pdf).includes(normalize(fragment))
    )
      fail("validation_failed", "Semantic artifact parity failure", {
        fragment,
      });
  }
  for (const d of model.diagrams) {
    if (
      fs.readFileSync(path.join(dir, "diagrams", d.id + ".puml"), "utf8") !==
      d.source
    )
      fail("validation_failed", "PlantUML source mismatch");
  }
  return {
    semanticParity: true,
    identity: manifest.identity,
    version: manifest.version,
    sectionIds: model.sections.map((s) => s.id),
    note: "Text extraction parity; visual and diagram semantics still require independent review",
  };
}
export function resolveLayout(input) {
  const layout = {
    directory: "spec/architecture",
    pointer: "spec/architecture/CURRENT",
    versionPrefix: "v",
    ...input.layout,
  };
  const root = rootOf(input);
  safe(root, layout.directory);
  safe(root, layout.pointer);
  if (
    typeof layout.versionPrefix !== "string" ||
    !/^[A-Za-z0-9_-]*$/.test(layout.versionPrefix)
  )
    fail("validation_failed", "Invalid version prefix");
  return layout;
}
export function integrity(input) {
  const root = rootOf(input);
  let rel = input.directory;
  if (!rel) {
    const layout = resolveLayout(input),
      current = fs.readFileSync(safe(root, layout.pointer), "utf8").trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(current))
      fail("validation_failed", "Invalid CURRENT pointer");
    rel = layout.directory + "/" + current;
  }
  const dir = safe(root, rel),
    m = validate(
      "manifest",
      YAML.parse(fs.readFileSync(path.join(dir, "manifest.yaml"), "utf8")),
    );
  const model = readJSON(path.join(dir, "candidate.json"));
  const required = [
    "candidate.json",
    "ARCHITECTURE.md",
    "ARCHITECTURE.pdf",
    ...model.diagrams.flatMap((d) => [
      "diagrams/" + d.id + ".puml",
      "diagrams/" + d.id + ".png",
    ]),
  ];
  if (required.some((p) => !Object.hasOwn(m.artifacts, p)))
    fail("validation_failed", "Manifest missing required artifact hashes");
  const layout = resolveLayout(input),
    normal = layout.directory + "/" + layout.versionPrefix + m.version,
    archived =
      layout.directory +
      "/history/" +
      layout.versionPrefix +
      m.version +
      "/revision-" +
      m.revision;
  if (rel !== normal && rel !== archived)
    fail("validation_failed", "Architecture version/path binding mismatch");
  for (const [p, hash] of Object.entries(m.artifacts)) {
    if (sha(fs.readFileSync(safe(dir, p))) !== hash)
      fail("validation_failed", "Artifact integrity failure: " + p);
  }
  if (digest(readJSON(path.join(dir, "candidate.json"))) !== m.candidateDigest)
    fail("validation_failed", "Candidate integrity failure");
  if (m.suiteVersion === "1.1.0") {
    if (
      !m.artifacts["STATE.json"] ||
      digest(m.discussion) !== digest(model.discussion)
    )
      fail("validation_failed", "Manifest discussion binding required");
    verifyBinding(dir, {
      ...model,
      discussion: { ...model.discussion, snapshot: "STATE.json" },
    });
  }
  return { ...parity(dir, input.python), revision: m.revision, manifest: m };
}
async function performFreeze(input, context) {
  const root = rootOf(input),
    c = candidateCheck(input.candidate);
  const state = context.state;
  verifyBinding(root, c, state);
  if (
    state.phase !== "reviewed" ||
    state.links.candidate?.digest !== digest(c) ||
    state.links.review?.candidateDigest !== digest(c)
  )
    fail(
      "user_decision_required",
      "Current state-bound independently reviewed candidate required",
    );
  if (
    input.decision?.freeze !== true ||
    input.decision.version !== input.version
  )
    fail(
      "user_decision_required",
      "Explicit freeze intent and chosen version required",
    );
  if (input.versionPolicy === "project") {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.version))
      fail("validation_failed", "Safe project architecture version required");
  } else if (!semver.test(input.version))
    fail("validation_failed", "Stable architecture SemVer required");
  if (
    c.openQuestions.length ||
    c.decisions.some((d) => d.status === "candidate")
  )
    fail("user_decision_required", "Required decisions unresolved");
  const required = JSON.parse(
    fs.readFileSync(path.join(suiteRoot, "shared/concerns.json"), "utf8"),
  );
  if (
    !c.concerns ||
    required.some((name) => !c.concerns.some((item) => item.name === name))
  )
    fail(
      "user_decision_required",
      "Explicit applicability and rationale required for each architecture concern",
    );
  const review = verifyReports(c, input.reviewPackages, revision(root), root);
  const layout = resolveLayout(input),
    rel = layout.directory + "/" + layout.versionPrefix + input.version,
    dir = safe(root, rel),
    exists = fs.existsSync(dir);
  if (exists && input.decision.preserveVersion !== true)
    fail(
      "user_decision_required",
      "Existing architecture version requires explicit preserveVersion decision",
    );
  if (exists && !input.decision.reason)
    fail(
      "user_decision_required",
      "Preserved-version revision requires reason",
    );
  let previous = null;
  if (exists)
    previous = YAML.parse(
      fs.readFileSync(path.join(dir, "manifest.yaml"), "utf8"),
    );
  approveFormalPaths(input, state, layout, rel, exists, previous, c);
  const stage = safe(root, layout.directory + "/.stage-" + crypto.randomUUID());
  fs.mkdirSync(stage, { recursive: true });
  try {
    write(
      path.join(stage, "candidate.json"),
      JSON.stringify(c, null, 2) + "\n",
    );
    write(
      path.join(stage, "ARCHITECTURE.md"),
      markdown(c, input.version) + "\n",
    );
    for (const d of c.diagrams) {
      write(path.join(stage, "diagrams", d.id + ".puml"), d.source);
      write(
        path.join(stage, "diagrams", d.id + ".png"),
        renderPuml(
          d.source,
          input.plantumlJar || process.env.ARCHITECTURE_PLANTUML_JAR,
        ),
      );
    }
    write(
      path.join(stage, "ARCHITECTURE.pdf"),
      await renderPdf(
        c,
        input.version,
        stage,
        input.fontPath || process.env.ARCHITECTURE_FONT,
      ),
    );
    write(
      path.join(stage, "STATE.json"),
      JSON.stringify(verifyBinding(root, c, state), null, 2) + "\n",
    );
    const artifacts = {};
    for (const name of [
      "candidate.json",
      "STATE.json",
      "ARCHITECTURE.md",
      "ARCHITECTURE.pdf",
      ...c.diagrams.flatMap((d) => [
        "diagrams/" + d.id + ".puml",
        "diagrams/" + d.id + ".png",
      ]),
    ])
      artifacts[name] = sha(fs.readFileSync(path.join(stage, name)));
    const m = {
      suiteVersion: "1.1.0",
      discussion: c.discussion,
      identity: c.identity,
      version: input.version,
      revision: (previous?.revision ?? 0) + 1,
      frozenAt: new Date().toISOString(),
      repositoryRevision: revision(root),
      candidateDigest: digest(c),
      artifacts,
      diagrams: c.diagrams.map((d) => ({
        id: d.id,
        puml: "diagrams/" + d.id + ".puml",
        image: "diagrams/" + d.id + ".png",
        sectionIds: d.sectionIds,
      })),
      review,
      verification: {
        semanticParity: true,
        visualReview: "pending",
        independentArtifactReview: "pending",
      },
      generation: {
        pdf: "PDFKit",
        plantumlJarSha256: c.diagrams.length
          ? sha(
              fs.readFileSync(
                input.plantumlJar || process.env.ARCHITECTURE_PLANTUML_JAR,
              ),
            )
          : null,
      },
      semanticChange: exists
        ? {
            preservedVersion: true,
            reason: input.decision.reason,
            previousRevision: previous.revision,
          }
        : null,
    };
    write(path.join(stage, "manifest.yaml"), YAML.stringify(m));
    parity(stage, input.python);
    let archive = null,
      backup = null,
      archiveStarted = false,
      published = false,
      stateWritten = false;
    const pointer = safe(root, layout.pointer),
      oldPointer = fs.existsSync(pointer) ? fs.readFileSync(pointer) : null;
    try {
      if (exists) {
        const historyRel =
          "history/" +
          layout.versionPrefix +
          input.version +
          "/revision-" +
          previous.revision;
        archive = safe(root, layout.directory + "/" + historyRel);
        if (fs.existsSync(archive))
          fail("validation_failed", "Revision archive already exists");
        fs.mkdirSync(path.dirname(archive), { recursive: true });
        archiveStarted = true;
        fs.cpSync(dir, archive, { recursive: true });
        if (
          oldPointer?.toString().trim() ===
          layout.versionPrefix + input.version
        )
          atomic(pointer, historyRel + "\n");
        backup = safe(
          root,
          layout.directory + "/.previous-" + crypto.randomUUID(),
        );
        fs.renameSync(dir, backup);
      }
      fs.renameSync(stage, dir);
      published = true;
      const advanced = structuredClone(state);
      advanced.phase = "frozen";
      advanced.revision++;
      advanced.links.architecture = {
        layout,
        version: input.version,
        revision: m.revision,
        directory: rel,
        candidateDigest: m.candidateDigest,
      };
      saveState(context.file, advanced);
      stateWritten = true;
      atomic(pointer, layout.versionPrefix + input.version + "\n");
    } catch (e) {
      if (published && fs.existsSync(dir))
        fs.rmSync(dir, { recursive: true, force: true });
      if (backup && fs.existsSync(backup)) fs.renameSync(backup, dir);
      if (oldPointer) atomic(pointer, oldPointer);
      else if (fs.existsSync(pointer)) fs.unlinkSync(pointer);
      if (archiveStarted && fs.existsSync(archive))
        fs.rmSync(archive, { recursive: true, force: true });
      if (stateWritten) saveState(context.file, state);
      throw e;
    }
    if (backup) {
      try {
        fs.rmSync(backup, { recursive: true, force: true });
      } catch {}
    }
    return {
      directory: dir,
      version: input.version,
      revision: m.revision,
      semanticParity: true,
      artifactReview: "pending",
    };
  } finally {
    if (fs.existsSync(stage))
      fs.rmSync(stage, { recursive: true, force: true });
  }
}

function approveFormalPaths(input, state, layout, rel, exists, previous, c) {
  if (state.mode === "existing") {
    const outputs = [
      layout.pointer,
      rel + "/candidate.json",
      rel + "/STATE.json",
      rel + "/ARCHITECTURE.md",
      rel + "/ARCHITECTURE.pdf",
      rel + "/manifest.yaml",
      ...c.diagrams.flatMap((d) => [
        rel + "/diagrams/" + d.id + ".puml",
        rel + "/diagrams/" + d.id + ".png",
      ]),
    ];
    if (exists) {
      const base =
        layout.directory +
        "/history/" +
        layout.versionPrefix +
        input.version +
        "/revision-" +
        previous.revision;
      outputs.push(
        base + "/manifest.yaml",
        ...Object.keys(previous.artifacts).map((p) => base + "/" + p),
      );
    }
    if (
      input.approval?.approved !== true ||
      outputs.some((p) => !input.approval.paths?.includes(p))
    )
      fail(
        "user_decision_required",
        "Existing freeze requires approval for exact artifact/pointer/history paths",
        { paths: outputs },
      );
  }
}
async function freezeLocked(input, context) {
  const root = rootOf(input),
    layout = resolveLayout(input),
    lock = safe(root, layout.directory + "/.freeze-lock");
  const rel = layout.directory + "/" + layout.versionPrefix + input.version,
    dir = safe(root, rel),
    exists = fs.existsSync(dir);
  const previous = exists
    ? YAML.parse(fs.readFileSync(path.join(dir, "manifest.yaml"), "utf8"))
    : null;
  approveFormalPaths(
    input,
    context.state,
    layout,
    rel,
    exists,
    previous,
    input.candidate,
  );
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  let handle;
  try {
    handle = fs.openSync(lock, "wx");
    fs.writeFileSync(
      handle,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
  } catch (e) {
    if (e.code === "EEXIST")
      fail(
        "execution_failed",
        "Another freeze or interrupted freeze requires inspection; lock retained",
        { lock },
      );
    throw e;
  }
  try {
    return await performFreeze(input, context);
  } finally {
    fs.closeSync(handle);
    fs.unlinkSync(lock);
  }
}

export async function freeze(input) {
  return withWorkingLock(input, async (state, loc) => {
    if (!state || state.formatVersion !== 2)
      fail(
        "user_decision_required",
        "1.1.0 freeze requires migrated discussion state",
      );
    return freezeLocked(input, { state, file: loc.file });
  });
}
