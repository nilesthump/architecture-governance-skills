---
name: greenfield-architecture
description: Designs architecture for new projects. Use when designing an empty project, establishing system boundaries or整理项目架构.
---

# greenfield-architecture

## Quick start

Use /architecture greenfield-architecture or the corresponding natural-language intent.
Example: "设计一个最小健康检查服务架构。"

## Workflow

1. Gather accepted requirements, non-goals, constraints, external dependencies and acceptance criteria; ask only missing information.
2. Maintain accepted requirements/decisions separately from candidate/rejected decisions and open questions.
3. Cover applicable concerns with explicit applicability and reasons; define interfaces, responsibilities and failure/deployment behavior.
4. Default to Git/main, GitHub PRs and shared local/CI validation; do not invent a stack.
5. Present draft for user review; route explicit formal-generation/freeze intent to architecture-freeze.

## Discussion

- Create WORKING.json in the authorized project directory even before Git; discussion files alone never change Greenfield classification.
- Use priority/dependency queue for goals/scope/acceptance/hard constraints, deadline/resources, delivery, actual component branches, dataflow, GUI and concerns.
- Capture verifiable user/default/norm provenance; proposals stay proposed. Generate candidates only with architecture.candidate.generate.

See [discussion rules](../../shared/DISCUSSION.md) and [state schema](../../schemas/working.schema.json).

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
