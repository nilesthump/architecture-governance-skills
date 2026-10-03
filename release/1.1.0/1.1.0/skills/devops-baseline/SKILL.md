---
name: devops-baseline
description: Discovers and preserves DevOps semantics. Use when analyzing CI/CD, validation entry points or existing build/test/release/deployment workflows.
---

# devops-baseline

## Quick start

Use /architecture devops-baseline or the corresponding natural-language intent.
Example: "分析现有 CI、测试、发布与部署的基线。"

## Workflow

1. Capture raw manifests/locks/CI/release/deployment/environment/branch/worktree evidence without executing unknown commands.
2. Record commands, package manager, triggers, environment assumptions and file hashes; explicitly identify unknowns.
3. Existing governance wraps existing workflows; DevOps changes require separate approval.
4. Compare before/after evidence and independently review behavior. Identical hashes prove files unchanged, not complete operational equivalence.
5. Greenfield uses explicit accepted commands in a unified local/remote Validation Contract.

## Discussion

- Distinguish selected delivery plan, operation authorization, completed configuration and actual successful execution; no production deployment inferred from CI.

See [discussion rules](../../shared/DISCUSSION.md) and [state schema](../../schemas/working.schema.json).

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
