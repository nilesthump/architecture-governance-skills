---
name: existing-repo-architecture
description: Reconstructs existing architecture and proposes approved improvements. Use when analyzing an existing repository or adding agent governance while preserving DevOps.
---

# existing-repo-architecture

## Quick start

Use /architecture existing-repo-architecture or the corresponding natural-language intent.
Example: "重建这个仓库的架构，并保留现有部署流程。"

## Workflow

1. Read existing AGENTS/CLAUDE/spec/ADRs before mutation. Collect tree, actual source, manifests, contracts, tests, build, lint, CI, release/deployment, Git/worktree policies and remote governance.
2. Separate AS-IS, NORMATIVE, user-approved TARGET and KNOWN DEVIATION; inherit reliable existing layouts and architecture version policies.
3. Capture DevOps baseline; present proposal in conversation covering conflicts, missing decisions, gaps, redundancies, keep/fix/add/simplify choices, reasons and effects.
4. Wait for approval of exact proposal/subset; unaccepted proposals never enter repository.
5. Apply hash-bound approved paths, preserve DevOps and independently verify governance correctness plus behavioral preservation.

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
