import fs from "node:fs";
import { rootOf, safe, atomic, validate, fail, readJSON } from "./util.mjs";
const fields = [
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
export function working(input, update = false) {
  const root = rootOf(input),
    rel = input.workingPath ?? "spec/architecture/WORKING.json",
    file = safe(root, rel);
  if (!update)
    return {
      state: fs.existsSync(file) ? readJSON(file) : null,
      formalFreeze: false,
    };
  if (
    input.mode !== "greenfield" &&
    (input.approval?.approved !== true || !input.approval.paths?.includes(rel))
  )
    fail(
      "user_decision_required",
      "Existing repository working-state write requires explicit approved path",
    );
  if (!input.state || fields.some((k) => !Array.isArray(input.state[k])))
    fail(
      "validation_failed",
      "Working state must preserve every required discussion field",
    );
  if (input.state.candidate) validate("candidate", input.state.candidate);
  atomic(
    file,
    JSON.stringify({ suiteVersion: "1.0.0", ...input.state }, null, 2) + "\n",
  );
  return { updated: true, path: rel, formalFreeze: false };
}
