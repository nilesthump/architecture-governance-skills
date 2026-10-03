---
name: governance-verify
description: Verifies governance using real independent-agent behavior traces. Use when testing ordered reads, write scope, worktrees, integration or continuation reliability.
---

# governance-verify

## Quick start

Use /architecture governance-verify or the corresponding natural-language intent.
Example: "测试新 Agent 能否遵循范围并继续已集成任务。"

## Workflow

1. Collect raw governance/architecture/progress/task/repository evidence; launch independent fixture agent without author context.
2. Record ordered reads, current architecture resolution, actual writes and rejected out-of-scope attempts; check minimum implementation.
3. Exercise API/backend/frontend/dependency/contract/CI/freeze changes and scope-expansion decisions.
4. Observe actual task worktree, local validation, independent review, PR/CI, canonical integration, verification and progress update.
5. Start second fresh agent from canonical state alone and verify continuation.
6. Emit trace-backed results. Structural/unit tests are supplemental and never reported as real behavioral proof. Unsupported host blocks acceptance.

## Discussion

- Exercise real fresh-context discussion continuation, proposal versus confirmation, dependency changes, read-only status, scope refusals and strict freeze gates.
- Retain raw host traces separately from simulated unit inputs. Require distinct continuation agent after canonical integration.

See [discussion rules](../../shared/DISCUSSION.md) and [state schema](../../schemas/working.schema.json).

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
