---
name: progress-versioning
description: Maintains resumable progress and architecture versions. Use when requesting /architecture status, version choice, checkpoints or next-agent continuation.
---

# progress-versioning

## Quick start

Use /architecture progress-versioning or the corresponding natural-language intent.
Example: "检查这个仓库的架构冲突，并保留现有 DevOps。"

## Workflow

1. Read progress/current architecture and actual Git/task/worktree state; distinguish facts from unknowns.
2. Resolve architecture version independently from suite/software version; user selects concrete proposed version before freeze.
3. Maintain phase/version/milestone/gate, completed/current/pending tasks, blockers, task/branch/worktree, checkpoint, decisions, next steps and reproducible entry.
4. Record validation/review/canonical write-back truthfully; update only on material changes within scope.
5. Retain all versions/revisions. A new agent must continue solely from canonical state.

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
