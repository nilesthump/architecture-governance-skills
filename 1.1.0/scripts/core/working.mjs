import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  rootOf,
  safe,
  atomic,
  validate,
  fail,
  readJSON,
  digest,
  sha,
  suiteRoot,
  revision,
  git,
} from "./util.mjs";
export const definition = readJSON(
  path.join(suiteRoot, "shared/discussion.json"),
);
export const fields = [
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
];
const closed = (n) =>
  ["confirmed", "not-applicable", "excluded"].includes(n.status);
const frozen = (s) =>
  definition.phases.indexOf(s.phase) >= definition.phases.indexOf("frozen");
function location(input) {
  const root = rootOf(input),
    rel = input.workingPath ?? "spec/architecture/WORKING.json";
  return { root, rel, file: safe(root, rel) };
}
function approval(input, paths) {
  if (
    input.mode !== "greenfield" &&
    (input.approval?.approved !== true ||
      paths.some((p) => !input.approval.paths?.includes(p)))
  )
    fail("user_decision_required", "Explicit approved paths required", {
      paths,
    });
}
function load(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return readJSON(file);
  } catch (e) {
    fail(
      "validation_failed",
      "Corrupt working state; preserve bytes and explicitly recover",
      { path: file, reason: e.message },
    );
  }
}
export function checkState(s) {
  validate("working", s);
  const ids = new Set(s.nodes.map((n) => n.id));
  if (ids.size !== s.nodes.length || s.nodes.length !== definition.nodes.length)
    fail("validation_failed", "Discussion definition node mismatch");
  for (const n of s.nodes) {
    const d = definition.nodes.find((x) => x.id === n.id);
    if (
      !d ||
      n.priority !== d.priority ||
      digest(n.dependencies) !== digest(d.dependencies) ||
      n.branch !== d.branch ||
      n.blocking !== true
    )
      fail("validation_failed", "Invalid node definition: " + n.id);
    if (n.dependencies.some((id) => !ids.has(id)))
      fail("validation_failed", "Missing dependency");
    if (
      closed(n) &&
      (!n.evidence || (!n.reason.trim() && n.status !== "confirmed"))
    )
      fail("validation_failed", "Closure evidence/reason required: " + n.id);
  }
  const visited = new Set(),
    stack = new Set();
  function visit(id) {
    if (stack.has(id)) fail("validation_failed", "Dependency cycle");
    if (visited.has(id)) return;
    stack.add(id);
    for (const dep of s.nodes.find((n) => n.id === id).dependencies) visit(dep);
    stack.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  return s;
}
function authority(input, s) {
  const { root, rel } = location(input);
  if (s.authority.root !== root || s.authority.workingPath !== rel)
    fail(
      "validation_failed",
      "Non-authoritative worktree copy; use the designated discussion root",
      { authority: s.authority },
    );
  if (input.mode !== s.mode)
    fail("validation_failed", "Discussion mode cannot be changed by caller");
  if (input.writerId !== s.coordinator)
    fail("user_decision_required", "Only the discussion coordinator may write");
}
export function active(s, n) {
  if (!n.branch) return true;
  const c = s.nodes.find((x) => x.id === "components");
  if (c.status !== "confirmed") return false;
  return n.branch === "gui"
    ? c.value?.gui === true
    : c.value?.types?.includes(n.branch) === true;
}
export function content(s) {
  return {
    suiteVersion: s.suiteVersion,
    formatVersion: s.formatVersion,
    definitionVersion: s.definitionVersion,
    projectIdentity: s.projectIdentity,
    discussionId: s.discussionId,
    contentRevision: s.contentRevision,
    baseline: s.links.baseline ?? null,
    ...(s.legacy ? { legacy: s.legacy } : {}),
    nodes: s.nodes,
    conflicts: s.conflicts,
    ...Object.fromEntries(fields.map((k) => [k, s[k]])),
  };
}
export const contentDigest = (s) => digest(content(s));
function evidence(
  root,
  e,
  allowed = ["explicit-user", "user-default", "inherited-norm"],
) {
  if (
    !e ||
    !allowed.includes(e.kind) ||
    !e.source?.path ||
    !e.source?.sha256 ||
    !e.source?.quote ||
    !e.source?.locator
  )
    fail(
      "user_decision_required",
      "Verifiable provenance required; Agent confirmed=true is insufficient",
    );
  const b = fs.readFileSync(safe(root, e.source.path));
  if (
    sha(b) !== e.source.sha256 ||
    !b.toString("utf8").includes(e.source.quote)
  )
    fail("validation_failed", "Confirmation source hash/quote mismatch");
  return e;
}
function validateValue(n) {
  if (n.status !== "confirmed") return;
  if (
    n.id.startsWith("concern.") &&
    (typeof n.value?.applicable !== "boolean" || !n.value.reason?.trim())
  )
    fail(
      "validation_failed",
      "Concern requires explicit applicability and basis",
    );
  if (n.value === null || n.value === undefined || n.value === "")
    fail("validation_failed", "Confirmed value required: " + n.id);
  if (
    n.id === "components" &&
    (!Array.isArray(n.value?.types) ||
      !n.value.types.length ||
      new Set(n.value.types).size !== n.value.types.length ||
      n.value.types.some((t) => !definition.componentTypes.includes(t)) ||
      typeof n.value.gui !== "boolean")
  )
    fail(
      "validation_failed",
      "Select actual component types and explicit GUI applicability; API is a boundary, not a component type",
    );
  if (n.id === "budget") {
    const v = n.value;
    if (!v?.deadline || !Array.isArray(v.resources) || !v.resources.length)
      fail(
        "validation_failed",
        "Deadline and at least one resource constraint required",
      );
    for (const r of v.resources) {
      if (r.type === "people") {
        if (!Number.isInteger(r.count) || !(r.count > 0) || !r.availability)
          fail("validation_failed", "People require count and availability");
      } else if (r.type === "agent") {
        if (
          !r.product ||
          !Number.isInteger(r.count) ||
          !(r.count > 0) ||
          !r.constraints
        )
          fail(
            "validation_failed",
            "Agent resource requires product/count/constraints",
          );
      } else if (r.type === "funds") {
        if (
          typeof r.amount !== "number" ||
          !Number.isFinite(r.amount) ||
          !(r.amount >= 0) ||
          !r.currency ||
          !r.period ||
          !r.coverage
        )
          fail(
            "validation_failed",
            "Funds require amount/currency/period/coverage",
          );
      } else fail("validation_failed", "Unknown resource type");
    }
  }
  if (n.id === "feasibility" && (n.value?.feasible !== true || !n.value.basis))
    fail(
      "user_decision_required",
      "Scope, acceptance and budget must be feasible; record conflicts otherwise",
    );
}
export function readiness(s) {
  checkState(s);
  const blockers = s.nodes
    .filter(
      (n) =>
        active(s, n) &&
        (!closed(n) ||
          n.dependencies.some((id) => {
            const d = s.nodes.find((x) => x.id === id);
            return active(s, d) && !closed(d);
          })),
    )
    .map((n) => n.id);
  if (s.conflicts.some((c) => !c.resolved)) blockers.push("conflicts");
  if (s.openQuestions.length) blockers.push("openQuestions");
  return { ready: !blockers.length, blockers };
}
export function status(input) {
  const { file } = location(input),
    s = load(file);
  if (!s) return { state: null, ready: false, next: [] };
  if (s.formatVersion !== 2)
    return {
      state: s,
      legacy: true,
      migrationRequired: true,
      ready: false,
      next: [],
      formalFreeze: false,
    };
  checkState(s);
  const table = s.nodes
    .filter((n) => active(s, n))
    .map((n) => ({
      id: n.id,
      priority: n.priority,
      status: n.status,
      conclusion: n.status === "confirmed" ? n.value : null,
      proposal: n.status === "proposed" ? n.value : null,
      pending: n.reason || (!closed(n) ? "confirmation required" : ""),
    }));
  const next = s.nodes
    .filter(
      (n) =>
        active(s, n) &&
        !closed(n) &&
        n.dependencies.every((id) => {
          const d = s.nodes.find((x) => x.id === id);
          return !active(s, d) || closed(d);
        }),
    )
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        definition.nodes.findIndex((n) => n.id === a.id) -
          definition.nodes.findIndex((n) => n.id === b.id),
    )
    .map((n) => n.id);
  return {
    state: s,
    table,
    confirmed: table.filter((n) => n.status === "confirmed"),
    next,
    ...readiness(s),
    contentDigest: contentDigest(s),
    formalFreeze: false,
  };
}
export function working(input, update = false) {
  return update ? mutate(input, "update") : status(input);
}
function initial(input, legacy) {
  const { root, rel } = location(input);
  if (
    !["greenfield", "existing"].includes(input.mode) ||
    !input.projectIdentity ||
    !input.discussionId ||
    !input.writerId
  )
    fail(
      "validation_failed",
      "Project identity, discussion ID and coordinator required",
    );
  const s = {
    suiteVersion: "1.1.0",
    formatVersion: 2,
    definitionVersion: definition.definitionVersion,
    projectIdentity: input.projectIdentity,
    discussionId: input.discussionId,
    revision: 1,
    contentRevision: 1,
    phase: "discussion",
    mode: input.mode,
    coordinator: input.writerId,
    authority: { root, workingPath: rel, baselineRevision: revision(root) },
    nodes: definition.nodes.map((n) => ({
      ...n,
      status: "undetermined",
      value: null,
      evidence: null,
      reason: "",
    })),
    conflicts: [],
    links: { baseline: input.baseline ?? null },
    continuation: {
      workingPath: rel,
      root,
      nextAction: "architecture.working.status",
    },
    ...Object.fromEntries(fields.map((k) => [k, legacy?.[k] ?? []])),
  };
  if (legacy) {
    s.legacy = legacy;
    s.links.migration = {
      legacyDigest: digest(legacy),
      note: "Preserved legacy information; unverified accepted labels do not close the new queue",
    };
  }
  return checkState(s);
}
export async function withWorkingLock(input, action) {
  const { root, rel, file } = location(input);
  approval(input, [rel]);
  const lock = safe(root, rel + ".lock");
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  let h;
  try {
    h = fs.openSync(lock, "wx");
    fs.writeFileSync(
      h,
      JSON.stringify({
        pid: process.pid,
        writer: input.writerId,
        startedAt: new Date().toISOString(),
      }),
    );
  } catch (e) {
    if (e.code === "EEXIST")
      fail(
        "execution_failed",
        "Discussion is locked; inspect owner and interrupted transaction before explicit recovery",
        { lock },
      );
    throw e;
  }
  try {
    const s = load(file);
    if (
      !Number.isInteger(input.expectedRevision) ||
      input.expectedRevision !== (s?.revision ?? 0)
    )
      fail("validation_failed", "Stale expectedRevision", {
        actualRevision: s?.revision ?? 0,
      });
    if (s?.formatVersion === 2) {
      checkState(s);
      authority(input, s);
    }
    return await action(s, { root, rel, file });
  } finally {
    fs.closeSync(h);
    fs.unlinkSync(lock);
  }
}
export function saveState(file, s) {
  checkState(s);
  atomic(file, JSON.stringify(s, null, 2) + "\n");
}
function invalidate(s, changed) {
  const affected = new Set(changed);
  let more = true;
  while (more) {
    more = false;
    for (const n of s.nodes)
      if (
        !affected.has(n.id) &&
        n.dependencies.some(
          (id) =>
            affected.has(id) &&
            active(
              s,
              s.nodes.find((x) => x.id === id),
            ),
        )
      ) {
        affected.add(n.id);
        more = true;
        if (n.status !== "undetermined") {
          n.status = "needs-review";
          n.reason = "Dependency changed: " + changed.join(", ");
        }
      }
  }
  s.contentRevision++;
  s.phase = "discussion";
  delete s.links.candidate;
  delete s.links.review;
  s.links.lastImpact = [...affected];
  return [...affected];
}
export async function mutate(input, kind = "update") {
  return withWorkingLock(input, async (old, { root, rel, file }) => {
    let s = old ? structuredClone(old) : null;
    if (kind === "migrate") {
      if (!old || old.formatVersion === 2)
        fail("validation_failed", "Explicit legacy state required");
      if (fields.some((k) => !Array.isArray(old[k])))
        fail("validation_failed", "Invalid legacy state; do not reset");
      const backup = rel + ".legacy-" + digest(old) + ".json";
      approval(input, [rel, backup]);
      const b = safe(root, backup);
      if (fs.existsSync(b) && digest(readJSON(b)) !== digest(old))
        fail("validation_failed", "Migration backup conflict");
      if (!fs.existsSync(b)) immutable(b, old);
      s = initial(input, old);
      s.revision = (old.revision ?? 0) + 1;
    } else if (!old) {
      s = initial(input);
      if (input.state)
        fail(
          "validation_failed",
          "Use operations; whole-state replacement is unsupported",
        );
    } else if (old.formatVersion !== 2)
      fail(
        "user_decision_required",
        "Legacy state is read-only until explicit migration",
      );
    if (kind === "start") {
      if (
        !old?.links.archive ||
        !input.discussionId ||
        input.discussionId === old.discussionId
      )
        fail(
          "user_decision_required",
          "Archive the completed discussion and choose a new ID first",
        );
      const archived = readJSON(safe(root, old.links.archive.path));
      if (digest(archived) !== old.links.archive.digest)
        fail("validation_failed", "Baseline archive changed");
      s = initial({
        ...input,
        baseline: {
          archive: old.links.archive,
          architecture: old.links.architecture ?? null,
        },
      });
      s.revision = old.revision + 1;
    } else if (kind === "archive") {
      if (!s || s.phase !== "accepted")
        fail(
          "user_decision_required",
          "Archive requires completed validated and accepted workflow",
        );
      if (s.mode === "greenfield" || input.mode === "greenfield") {
        if (
          !git(root, ["rev-parse", "--show-toplevel"], true) ||
          [
            "AGENTS.md",
            "CLAUDE.md",
            "spec/governance/WORKFLOW.md",
            "spec/governance/WRITE_SCOPE.md",
            "spec/governance/validation.json",
            "spec/progress/CURRENT.md",
          ].some((p) => !fs.existsSync(safe(root, p)))
        )
          fail(
            "user_decision_required",
            "Git initialization plus governance/progress entries required before Greenfield archive",
          );
      }
      const archiveRel =
        input.archivePath ??
        "spec/architecture/discussions/" + s.discussionId + "/STATE.json";
      approval(input, [rel, archiveRel]);
      if (archiveRel === rel)
        fail("validation_failed", "Archive cannot replace working state");
      const final = { ...content(s), phase: s.phase, links: { ...s.links } };
      delete final.links.archive;
      delete final.links.lastImpact;
      const target = safe(root, archiveRel);
      immutable(target, final);
      const hash = digest(readJSON(target));
      if (hash !== digest(final))
        fail(
          "validation_failed",
          "Archive verification failed; working state retained",
        );
      if (s.links.archive) {
        if (
          s.links.archive.path !== archiveRel ||
          s.links.archive.digest !== hash
        )
          fail("validation_failed", "Archive reference conflict");
        return { state: s, archived: true, idempotent: true };
      }
      s.links.archive = { path: archiveRel, digest: hash };
      s.continuation = {
        ...s.continuation,
        archive: s.links.archive,
        nextAction: "architecture.working.start",
      };
      s.revision++;
      saveState(file, s);
      return { state: s, archived: true };
    } else if (kind === "update") {
      if (input.state)
        fail("validation_failed", "Whole-state replacement forbidden");
      if (frozen(s))
        fail(
          "user_decision_required",
          "Frozen discussion is immutable; finish/archive then start a new baseline discussion",
        );
      const changed = [];
      for (const op of input.operations ?? []) {
        if (op.type === "set") {
          const n = s.nodes.find((n) => n.id === op.id);
          if (
            !n ||
            !definition.statuses.includes(op.status) ||
            op.status === "needs-review"
          )
            fail("validation_failed", "Unknown node/status");
          if (closed({ status: op.status })) evidence(root, op.evidence);
          else if (
            op.status === "proposed" &&
            op.evidence?.kind !== "agent-proposal"
          )
            fail(
              "validation_failed",
              "Proposal provenance must be agent-proposal",
            );
          if (
            ["not-applicable", "excluded"].includes(op.status) &&
            !op.reason?.trim()
          )
            fail(
              "validation_failed",
              "Explicit exclusion/applicability reason required",
            );
          if (
            [
              "goals",
              "scope",
              "acceptance",
              "constraints",
              "budget",
              "delivery",
              "components",
              "dataflow",
              "contracts",
              "feasibility",
            ].includes(n.id) &&
            ["not-applicable", "excluded"].includes(op.status)
          )
            fail(
              "user_decision_required",
              "Core decision requires an explicit confirmed value (none is allowed where appropriate)",
            );
          const replacement = {
            ...n,
            status: op.status,
            value: op.value ?? null,
            evidence: op.evidence ?? null,
            reason: op.reason ?? "",
          };
          validateValue(replacement);
          if (digest(n) !== digest(replacement)) {
            Object.assign(n, replacement);
            changed.push(n.id);
          }
        } else if (op.type === "reject") {
          const n = s.nodes.find((n) => n.id === op.id);
          if (!n || !op.reason)
            fail("validation_failed", "Rejection requires node and reason");
          evidence(root, op.evidence);
          s.rejectedAlternatives.push({
            id: n.id,
            value: op.value ?? n.value,
            reason: op.reason,
            evidence: op.evidence,
          });
          if (!closed(n)) {
            n.status = "undetermined";
            n.value = null;
            n.evidence = null;
          }
          changed.push(n.id);
        } else if (op.type === "record") {
          if (!fields.includes(op.field) || !Array.isArray(op.value))
            fail("validation_failed", "Invalid preserved discussion field");
          if (digest(s[op.field]) !== digest(op.value)) {
            s[op.field] = op.value;
            changed.push("records");
          }
        } else if (op.type === "conflict") {
          if (
            !op.id ||
            !op.reason ||
            !Array.isArray(op.nodeIds) ||
            !op.nodeIds.length ||
            op.nodeIds.some((id) => !s.nodes.some((n) => n.id === id)) ||
            s.conflicts.some((c) => c.id === op.id)
          )
            fail("validation_failed", "Invalid or duplicate conflict");
          s.conflicts.push({ ...op, resolved: false });
          changed.push(...op.nodeIds);
        } else if (op.type === "resolve-conflict") {
          const c = s.conflicts.find((c) => c.id === op.id);
          if (!c || !op.reason)
            fail("validation_failed", "Conflict resolution reason required");
          evidence(root, op.evidence);
          c.resolved = true;
          c.resolution = { reason: op.reason, evidence: op.evidence };
          changed.push(...c.nodeIds);
        } else fail("validation_failed", "Unknown operation");
      }
      // Batch answers are accepted in dependency order; explicitly answered nodes do not invalidate each other.
      if (changed.length) {
        const answered = new Map(
          s.nodes
            .filter((n) =>
              (input.operations ?? []).some(
                (op) => op.type === "set" && op.id === n.id,
              ),
            )
            .map((n) => [n.id, structuredClone(n)]),
        );
        invalidate(s, changed);
        for (const [id, n] of answered)
          Object.assign(
            s.nodes.find((x) => x.id === id),
            n,
          );
      }
      if (old) s.revision++;
    }
    saveState(file, s);
    return {
      state: s,
      impact: s.links.lastImpact ?? [],
      ...readiness(s),
      formalFreeze: false,
    };
  });
}
export function immutable(file, value) {
  if (fs.existsSync(file)) {
    if (digest(readJSON(file)) !== digest(value))
      fail("validation_failed", "Immutable snapshot content conflict", {
        path: file,
      });
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const stage = file + ".stage-" + crypto.randomUUID();
  try {
    fs.writeFileSync(stage, JSON.stringify(value, null, 2) + "\n", {
      flag: "wx",
    });
    fs.linkSync(stage, file);
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    if (digest(readJSON(file)) !== digest(value))
      fail("validation_failed", "Concurrent snapshot conflict");
  } finally {
    if (fs.existsSync(stage)) fs.unlinkSync(stage);
  }
}
export function snapshot(input, s) {
  const { root, rel } = location(input);
  const value = content(s),
    hash = digest(value),
    p = path.posix.join(
      path.posix.dirname(rel),
      "discussions",
      s.discussionId,
      "review-input-" + hash + ".json",
    );
  approval(input, [rel, p]);
  immutable(safe(root, p), value);
  return {
    id: s.discussionId,
    revision: s.contentRevision,
    digest: hash,
    snapshot: p,
  };
}
export function verifyBinding(root, c, s = null) {
  const b = c?.discussion;
  if (!b || !Number.isInteger(b.revision) || !b.digest)
    fail(
      "user_decision_required",
      "Candidate requires discussion binding; legacy bypass is unsupported",
    );
  const frozenInput = readJSON(safe(root, b.snapshot));
  if (
    digest(frozenInput) !== b.digest ||
    frozenInput.discussionId !== b.id ||
    frozenInput.contentRevision !== b.revision ||
    frozenInput.projectIdentity !== c.identity
  )
    fail("validation_failed", "Discussion input binding mismatch");
  if (
    s &&
    (contentDigest(s) !== b.digest ||
      s.contentRevision !== b.revision ||
      s.discussionId !== b.id)
  )
    fail("validation_failed", "Candidate/review stale after discussion change");
  const view = {
    ...frozenInput,
    revision: 1,
    phase: "discussion",
    coordinator: "verification",
    authority: { root, workingPath: "verification", baselineRevision: null },
    mode: "verification",
    continuation: {},
    links: { baseline: frozenInput.baseline },
  };
  const r = readiness(view);
  if (!r.ready)
    fail("user_decision_required", "Discussion decisions are not ready", r);
  for (const n of frozenInput.nodes) validateValue(n);
  for (const item of [...c.decisions, ...c.sections]) {
    if (
      !item.nodeIds?.length ||
      item.nodeIds.some((id) => {
        const n = view.nodes.find((x) => x.id === id);
        return !n || !active(view, n) || n.status !== "confirmed";
      })
    )
      fail(
        "validation_failed",
        "Formal content must map to effective confirmed nodes",
      );
  }
  const expectedConcerns = readJSON(
    path.join(suiteRoot, "shared/concerns.json"),
  ).map((name) => {
    const n = view.nodes.find(
      (n) =>
        n.id === "concern." + name.replaceAll(" ", "-").replaceAll("/", "-"),
    );
    return {
      name,
      applicable: n.status === "confirmed" ? n.value.applicable : false,
      reason: n.status === "confirmed" ? n.value.reason : n.reason,
    };
  });
  if (digest(c.concerns) !== digest(expectedConcerns))
    fail(
      "validation_failed",
      "Candidate concern applicability must match effective discussion nodes",
    );
  if (c.decisions.some((d) => d.status !== "accepted"))
    fail(
      "user_decision_required",
      "Only confirmed accepted decisions enter formal artifacts",
    );
  return frozenInput;
}
export async function candidateGenerate(input) {
  return withWorkingLock(input, async (s, { root, file }) => {
    if (!s || s.formatVersion !== 2 || frozen(s))
      fail("user_decision_required", "Active discussion required");
    const ready = readiness(s);
    if (!ready.ready)
      fail("user_decision_required", "Discussion is incomplete", ready);
    for (const n of s.nodes.filter((n) => active(s, n) && closed(n)))
      evidence(root, n.evidence);
    const c = structuredClone(input.candidate);
    c.concerns = readJSON(path.join(suiteRoot, "shared/concerns.json")).map(
      (name) => {
        const n = s.nodes.find(
          (n) =>
            n.id ===
            "concern." + name.replaceAll(" ", "-").replaceAll("/", "-"),
        );
        return {
          name,
          applicable: n.status === "confirmed" ? n.value.applicable : false,
          reason: n.status === "confirmed" ? n.value.reason : n.reason,
        };
      },
    );
    c.discussion = snapshot(input, s);
    validate("candidate", c);
    verifyBinding(root, c, s);
    s.phase = "candidate";
    s.links.candidate = { digest: digest(c), discussion: c.discussion };
    s.revision++;
    saveState(file, s);
    return { candidate: c, state: s };
  });
}
import { verifyReports } from "./review.mjs";
import { validation } from "./repository.mjs";
import { integrity } from "./artifacts.mjs";
import { governanceTest, verifyBehaviorTrace } from "./governance.mjs";
export async function advance(input) {
  return withWorkingLock(input, async (s, { root, file }) => {
    if (!s || s.formatVersion !== 2)
      fail("user_decision_required", "Versioned discussion required");
    const checkedArchitecture = () => {
      const link = s.links.architecture;
      if (!link?.directory || !link.layout)
        fail("validation_failed", "Stored architecture location required");
      if (
        (input.directory && input.directory !== link.directory) ||
        (input.layout && digest(input.layout) !== digest(link.layout))
      )
        fail(
          "validation_failed",
          "Cannot substitute another architecture during completion",
        );
      const result = integrity({
        ...input,
        directory: link.directory,
        layout: link.layout,
      });
      if (
        result.version !== link.version ||
        result.revision !== link.revision ||
        result.manifest.candidateDigest !== link.candidateDigest
      )
        fail("validation_failed", "Completion architecture binding mismatch");
      return result;
    };
    const next = input.phase,
      current = definition.phases.indexOf(s.phase);
    if (
      definition.phases[current + 1] !== next ||
      ["candidate", "frozen"].includes(next)
    )
      fail(
        "validation_failed",
        "Use candidate generation/freeze actions and advance one verified phase at a time",
      );
    const c = input.candidate;
    if (!c || digest(c) !== s.links.candidate?.digest)
      fail("validation_failed", "Current candidate required");
    verifyBinding(root, c, s);
    if (next === "reviewed")
      s.links.review = verifyReports(
        c,
        input.reviewPackages,
        revision(root),
        root,
      );
    else if (next === "bootstrapped") {
      if (input.mode === "greenfield") {
        if (
          git(root, ["rev-parse", "--show-toplevel"], true) !==
            root.replaceAll("\\", "/") ||
          [
            "AGENTS.md",
            "CLAUDE.md",
            "spec/governance/WORKFLOW.md",
            "spec/governance/WRITE_SCOPE.md",
            "spec/governance/validation.json",
            "spec/progress/CURRENT.md",
          ].some((p) => !fs.existsSync(safe(root, p)))
        )
          fail(
            "user_decision_required",
            "Canonical repository and all governance/progress entries required",
          );
      } else evidence(root, input.completionEvidence);
      checkedArchitecture();
      s.links.validationContractPath =
        input.contractPath ?? "spec/governance/validation.json";
      validate(
        "validation",
        readJSON(safe(root, s.links.validationContractPath)),
      );
    } else if (next === "validated") {
      const contractPath =
        s.links.validationContractPath ?? "spec/governance/validation.json";
      const approvedContract = readJSON(safe(root, contractPath));
      if (digest(approvedContract) !== digest(input.contract))
        fail(
          "validation_failed",
          "Use the stored approved Validation Contract",
        );
      s.links.validation = validation({ ...input, contract: approvedContract });
      checkedArchitecture();
    } else if (next === "accepted") {
      evidence(root, input.acceptanceEvidence);
      checkedArchitecture();
      if (s.mode === "greenfield")
        s.links.behavior = governanceTest({
          ...input,
          directory: s.links.architecture.directory,
          layout: s.links.architecture.layout,
        });
      else {
        s.links.behavior = verifyBehaviorTrace(input);
        if (
          !input.trace.events.some(
            (e) =>
              e.kind === "existing-devops-preserved" &&
              e.observed === true &&
              e.evidence,
          )
        )
          fail(
            "user_decision_required",
            "Existing acceptance requires independent DevOps preservation evidence without replacing inherited governance layouts",
          );
      }
      s.links.acceptance = input.acceptanceEvidence;
    }
    s.phase = next;
    s.revision++;
    saveState(file, s);
    return { state: s };
  });
}
