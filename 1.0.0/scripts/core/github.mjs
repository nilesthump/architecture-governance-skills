import fs from "node:fs";
import { run, fail, rootOf, safe, write } from "./util.mjs";
function repo(input) {
  if (
    typeof input.repository !== "string" ||
    !/^[-\w.]+\/[-\w.]+$/.test(input.repository)
  )
    fail("validation_failed", "GitHub owner/name required");
  return input.repository;
}
function api(args, input) {
  try {
    return JSON.parse(
      run(
        "gh",
        ["api", ...args],
        input ? { input: JSON.stringify(input) } : {},
      ),
    );
  } catch (e) {
    const text = (e.data?.stderr ?? "") + (e.data?.stdout ?? "");
    if (
      /401|authentication|not logged|403|Resource not accessible|Must have admin/.test(
        text,
      )
    )
      fail(
        "authorization_required",
        "GitHub authorization/capability required",
        { capability: "AUTHORIZATION_REQUIRED", detail: text.slice(-2000) },
      );
    if (/404|not supported|upgrade|plan/i.test(text))
      fail("execution_failed", "GitHub capability unavailable", {
        capability: "UNAVAILABLE",
        detail: text.slice(-2000),
      });
    throw e;
  }
}
export function auth() {
  try {
    run("gh", ["auth", "status"]);
    const user = api(["user"]);
    return { capability: "AVAILABLE", login: user.login };
  } catch (e) {
    if (e.status === "authorization_required") throw e;
    fail("authorization_required", "GitHub login required", {
      capability: "AUTHORIZATION_REQUIRED",
    });
  }
}
export function create(input) {
  const repository = repo(input);
  if (!["public", "private"].includes(input.visibility))
    fail("user_decision_required", "Explicit repository visibility required");
  run("gh", ["repo", "create", repository, "--" + input.visibility]);
  return {
    repository,
    url: "https://github.com/" + repository,
    capability: "AVAILABLE",
  };
}
export function ruleDefinitions(checks) {
  if (
    !Array.isArray(checks) ||
    !checks.length ||
    checks.some((c) => typeof c !== "string" || !c.trim())
  )
    fail("validation_failed", "Explicit required checks required");
  const conditions = {
    ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] },
  };
  return [
    {
      name: "architecture-integrity",
      target: "branch",
      enforcement: "active",
      conditions,
      bypass_actors: [],
      rules: [
        { type: "deletion" },
        { type: "non_fast_forward" },
        {
          type: "required_status_checks",
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: checks.map((context) => ({ context })),
          },
        },
      ],
    },
    {
      name: "architecture-pr-review",
      target: "branch",
      enforcement: "active",
      conditions,
      bypass_actors: [
        {
          actor_id: 5,
          actor_type: "RepositoryRole",
          bypass_mode: "pull_request",
        },
      ],
      rules: [
        {
          type: "pull_request",
          parameters: {
            required_approving_review_count: 1,
            dismiss_stale_reviews_on_push: true,
            require_code_owner_review: false,
            require_last_push_approval: false,
            required_review_thread_resolution: true,
          },
        },
      ],
    },
  ];
}
export function configureRules(input) {
  const repository = repo(input),
    definitions = ruleDefinitions(input.checks),
    existing = api(["repos/" + repository + "/rulesets"]),
    configured = [];
  for (const definition of definitions) {
    const old = existing.find((r) => r.name === definition.name);
    configured.push(
      api(
        [
          "--method",
          old ? "PUT" : "POST",
          "repos/" + repository + "/rulesets" + (old ? "/" + old.id : ""),
          "--input",
          "-",
        ],
        definition,
      ),
    );
  }
  return {
    capability: "AVAILABLE",
    rulesets: configured.map((r) => ({ id: r.id, name: r.name })),
    verified: verifyRules(input),
  };
}
export function verifyRules(input) {
  const repository = repo(input),
    rules = api(["repos/" + repository + "/rulesets"])
      .filter((r) =>
        ["architecture-integrity", "architecture-pr-review"].includes(r.name),
      )
      .map((r) => api(["repos/" + repository + "/rulesets/" + r.id]));
  const expected = ruleDefinitions(input.checks);
  for (const e of expected) {
    const r = rules.find((r) => r.name === e.name);
    if (
      !r ||
      r.enforcement !== "active" ||
      JSON.stringify(r.conditions?.ref_name) !==
        JSON.stringify(e.conditions.ref_name)
    )
      fail("validation_failed", "Required GitHub ruleset missing/inactive");
    for (const rule of e.rules) {
      const actual = r.rules.find((a) => a.type === rule.type);
      if (!actual)
        fail("validation_failed", "Missing GitHub rule: " + rule.type);
      if (
        rule.type === "required_status_checks" &&
        input.checks.some(
          (c) =>
            !actual.parameters.required_status_checks.some(
              (s) => s.context === c,
            ),
        )
      )
        fail("validation_failed", "Missing required check");
      if (
        rule.type === "pull_request" &&
        actual.parameters.required_approving_review_count < 1
      )
        fail("validation_failed", "Review approval not enforced");
    }
    if (e.name === "architecture-integrity" && r.bypass_actors?.length)
      fail("validation_failed", "Integrity protection has bypass");
    if (
      e.name === "architecture-pr-review" &&
      (r.bypass_actors?.length !== 1 ||
        !r.bypass_actors.some(
          (a) =>
            a.actor_type === "RepositoryRole" &&
            a.actor_id === 5 &&
            a.bypass_mode === "pull_request",
        ))
    )
      fail("validation_failed", "Admin PR-only bypass missing");
  }
  return { capability: "AVAILABLE", verified: true };
}
export function ci(input) {
  const root = rootOf(input);
  if (!input.runtimePath || !input.contractPath)
    fail("validation_failed", "Runtime and validation contract paths required");
  safe(root, input.runtimePath);
  safe(root, input.contractPath);
  if (
    !/^[A-Za-z0-9_./-]+$/.test(input.runtimePath) ||
    !/^[A-Za-z0-9_./-]+$/.test(input.contractPath)
  )
    fail(
      "validation_failed",
      "CI entry paths must contain only safe portable characters",
    );
  const p = safe(root, ".github/workflows/architecture-validation.yml");
  if (fs.existsSync(p) && input.approval?.approved !== true)
    fail(
      "user_decision_required",
      "Existing CI changes require explicit approval",
    );
  const workflow =
    "name: architecture-validation\non:\n  push:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  validate:\n    strategy:\n      fail-fast: false\n      matrix:\n        os: [windows-latest, macos-latest, ubuntu-latest]\n    runs-on: $" +
    "{{ matrix.os }}\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24\n      - run: node " +
    input.runtimePath +
    " validation.run-local --contract " +
    input.contractPath +
    " --root .\n";
  write(p, workflow);
  return { file: p, sharedContract: input.contractPath };
}
