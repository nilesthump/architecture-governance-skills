---
name: architecture-freeze
description: Freezes reviewed architecture into versioned artifacts. Use when requesting freeze,正式冻结, formal generation or architecture version update.
---

# architecture-freeze

## Quick start

Use /architecture freeze or the corresponding natural-language intent.
Example: "将已确认的架构冻结为版本 2.0.0。"

## Workflow

1. Require explicit freeze intent and user-selected architecture version; use user policy, applicable existing architecture policy, then SemVer. Software version is separate.
2. If version unspecified propose concrete version/reasons and wait; resolve every required open decision.
3. Obtain fresh-context reports bound to exact candidate/repository; reject blockers, stale reports and fabricated independence.
4. Run architecture.freeze: stage MD/PDF/PUML/manifest, verify semantic parity and integrity, publish CURRENT last.
5. Retain historical versions. Same-version changes require explicit preserveVersion choice and retained revision archives.
6. Independently review final artifacts, then update progress after canonical verification.

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
