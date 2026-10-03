---
name: architecture
description: Routes project architecture and governance workflows. Use when requesting project architecture, architecture conflicts, agent governance discussion decisions/status/change impact or /architecture; exclude isolated technical questions.
---

# architecture

## Quick start

Use /architecture architecture or the corresponding natural-language intent.
Example: "帮我设计这个项目架构。"

## Workflow

1. Inspect repository instructions and classify Greenfield versus Existing Repository from actual evidence.
2. Route design, review, freeze, artifacts, bootstrap, governance, DevOps and status to the matching focused skill.
3. Maintain accepted/candidate/rejected decisions, constraints, assumptions, risks and open questions; discussion never silently freezes.
4. Use version-bound scripts and structured results. Dispatch reviewers with fresh context and direct Review Package; never inherited conversation.
5. Require user decisions for formal version/architecture choices; resolve failed gates before continuing.

## Discussion

- Use architecture.working.read/status for confirmed/all/pending/next queries; show the generated ID/priority/status/conclusion table. Queries never mutate.
- Use only the designated authority root and coordinator with expectedRevision; other agents submit proposals. Route missing answers by queue, accept early answers.

See [discussion rules](../../shared/DISCUSSION.md) and [state schema](../../schemas/working.schema.json).

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
