---
name: repository-bootstrap
description: Bootstraps architecture-based repository governance. Use when initializing Greenfield projects, AGENTS/spec or GitHub validation baseline.
---

# repository-bootstrap

## Quick start

Use /architecture repository-bootstrap or the corresponding natural-language intent.
Example: "检查这个仓库的架构冲突，并保留现有 DevOps。"

## Workflow

1. Require Greenfield mode or approved existing proposal and verified current architecture.
2. Generate root AGENTS, routing-only CLAUDE, WORKFLOW, WRITE_SCOPE and CURRENT progress with templates.
3. Enforce ordered spec reads, minimum implementation, explicit write scopes, task worktree, validation, review and canonical integration.
4. Use accepted explicit stack commands to create one Validation Contract, shared by local runner and GitHub CI.
5. Initialize Git/main, record canonical path and task/worktree states. Configure GitHub checks/approval/protection and PR-only admin bypass where available.
6. Verify artifacts and governance behavior before acceptance; distinguish AVAILABLE/AUTHORIZATION_REQUIRED/UNAVAILABLE.

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
