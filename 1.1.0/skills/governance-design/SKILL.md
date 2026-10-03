---
name: governance-design
description: Designs specification hierarchy and agent governance. Use when defining AGENTS behavior, write scopes, worktree integration or project governance.
---

# governance-design

## Quick start

Use /architecture governance-design or the corresponding natural-language intent.
Example: "定义本任务的写入范围与 worktree 流程。"

## Workflow

1. Read accepted requirements and frozen architecture; inherit existing hierarchy or use Greenfield spec defaults.
2. Define ordered reads and minimum implementation; narrow project/task/freeze/governance/progress/CI scopes. Outside scope is read-only; expansion needs explicit decision.
3. Define canonical versus task worktree, task/branch/validation/review/integration records and accepted result write-back.
4. Generate concise instructions and focused governance/progress; CLAUDE only routes to AGENTS for new projects.
5. Existing mode presents exact approval-bound proposal and preserves DevOps. Review drafts with user and verify with fresh-context behavior.

## Discussion

- Specify one coordinator and authority root; task worktrees reference it instead of becoming competing discussion writers. Record expectedRevision on every mutation.

See [discussion rules](../../shared/DISCUSSION.md) and [state schema](../../schemas/working.schema.json).

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
