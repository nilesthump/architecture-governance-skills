---
name: architecture-review
description: Reviews conflicts and missing architectural decisions from independent evidence. Use when requesting architecture review, conflict review or independent checks.
---

# architecture-review

## Quick start

Use /architecture review or the corresponding natural-language intent.
Example: "检查当前候选方案的契约冲突与缺失决策。"

## Workflow

1. Construct review.package from raw AUTHORITATIVE/EVIDENCE/CANDIDATE/ADVISORY sources, original bytes and Git revision.
2. Launch fresh-context reviewer with package and task only; default distrust of author. Unsupported agent host blocks the gate.
3. Cover applicable shared concerns; compare contracts, text, diagrams and operational behavior, not keyword counts.
4. Report OBSERVATION/RISK/CONFLICT/MISSING_DECISION/RECOMMENDATION/DECISION_REQUIRED with severity, exact citations, reasons, assumptions and trade-offs.
5. Bind report to package/candidate digests and host trace. Fix blockers and repeat review for changed candidate. Recommendations remain advisory until accepted.

## Discussion

- Review generated immutable discussion input, never mutable WORKING.json. Candidate sections/decisions map to effective confirmed nodeIds.
- Use architecture.working.advance phase=reviewed with bound independent reports; substantive changes invalidate old reports. Hashes cannot prove semantic correctness or independence.

See [discussion rules](../../shared/DISCUSSION.md) and [state schema](../../schemas/working.schema.json).

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
