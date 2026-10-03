import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJSON,
  rootOf,
  safe,
  run,
  git,
  fail,
  suiteRoot,
  validate,
} from "./util.mjs";
import {
  inspect,
  discover,
  validation,
  apply,
  worktree,
  writeback,
  compare,
} from "./repository.mjs";
import { packageReview } from "./review.mjs";
import { freeze, integrity, parity } from "./artifacts.mjs";
import { installGovernance, progress, governanceTest } from "./governance.mjs";
import * as github from "./github.mjs";
import {
  working,
  status,
  mutate,
  candidateGenerate,
  advance,
} from "./working.mjs";
export const actions = {
  "architecture.working.read": (input) => working(input),
  "architecture.working.update": (input) => working(input, true),
  "architecture.working.status": status,
  "architecture.working.check": status,
  "architecture.working.migrate": (input) => mutate(input, "migrate"),
  "architecture.working.archive": (input) => mutate(input, "archive"),
  "architecture.working.start": (input) => mutate(input, "start"),
  "architecture.working.advance": advance,
  "architecture.candidate.generate": candidateGenerate,
  "environment.probe": () => ({
    suiteVersion: "1.1.0",
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    git: run("git", ["--version"]),
    renderer: {
      plantuml: process.env.ARCHITECTURE_PLANTUML_JAR ?? null,
      python: process.env.ARCHITECTURE_PYTHON ?? null,
    },
  }),
  "repo.inspect": inspect,
  "repo.status": inspect,
  "repo.worktree.inspect": inspect,
  "repo.worktree.create": worktree,
  "repo.writeback.verify": writeback,
  "repo.bootstrap": (input) => {
    const root = rootOf(input);
    if (git(root, ["rev-parse", "--show-toplevel"], true))
      fail(
        "user_decision_required",
        "Repository already exists; preserve its workflow",
      );
    git(root, ["init", "-b", "main"]);
    return { canonical: root, branch: "main" };
  },
  "review.package": packageReview,
  "architecture.freeze": freeze,
  "architecture.integrity.verify": integrity,
  "manifest.verify": integrity,
  "document.parity-check": (input) =>
    parity(safe(rootOf(input), input.directory), input.python),
  "validation.discover": discover,
  "validation.run-local": validation,
  "validation.compare-remote": compare,
  "governance.install": installGovernance,
  "governance.apply": apply,
  "governance.update": apply,
  "governance.test": governanceTest,
  "progress.read": (input) => progress(input),
  "progress.update": (input) => progress(input, true),
  "github.auth.inspect": github.auth,
  "github.repo.create": github.create,
  "github.ci.configure": github.ci,
  "github.ruleset.configure": github.configureRules,
  "github.ruleset.verify": github.verifyRules,
};
export async function execute(action, input = {}) {
  try {
    if (!Object.hasOwn(actions, action))
      fail("validation_failed", "Unknown action: " + action);
    return {
      status: "success",
      action,
      suiteVersion: "1.1.0",
      data: await actions[action](input),
    };
  } catch (e) {
    return {
      status: e.status ?? "execution_failed",
      action,
      suiteVersion: "1.1.0",
      message: e.message,
      data: e.data ?? {},
    };
  }
}
export async function main(argv = process.argv.slice(2)) {
  let action = argv[0],
    input = {};
  try {
    if (argv[1] === "--input" && argv.length === 3)
      input = readJSON(path.resolve(argv[2]));
    else if (
      argv.length === 5 &&
      argv[1] === "--contract" &&
      argv[3] === "--root"
    ) {
      input = {
        root: path.resolve(argv[4]),
        contract: readJSON(path.resolve(argv[2])),
      };
    } else if (argv.length !== 1)
      fail("validation_failed", "Usage: <action> --input <json>");
    const result = await execute(action, input);
    process.stdout.write(JSON.stringify(result) + "\n");
    if (result.status !== "success") process.exitCode = 1;
  } catch (e) {
    process.stdout.write(
      JSON.stringify({
        status: e.status ?? "validation_failed",
        action,
        suiteVersion: "1.1.0",
        message: e.message,
      }) + "\n",
    );
    process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
