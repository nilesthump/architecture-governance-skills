---
name: architecture-artifacts
description: Generates and verifies Markdown, PDF, PlantUML and manifests. Use when producing architecture documents, diagram consistency or artifact parity checks.
---

# architecture-artifacts

## Quick start

Use /architecture artifacts or the corresponding natural-language intent.
Example: "验证 ARCHITECTURE.md 与 PDF 和 PUML 一致。"

## Workflow

1. Use a single candidate model, identity/version and stable section IDs. MD has anchors/TOC; PDF has TOC/bookmarks/page numbers.
2. Include goals, rationale, trade-offs, alternatives, migration, AS-IS/TARGET/deviations and implementation rules where applicable.
3. All formal diagrams originate from .puml, rendered through configured Java PlantUML; map diagram IDs to section IDs in manifest.
4. Compare independently extracted PDF text with model and MD; hashes alone do not prove semantic parity.
5. Render and visually inspect PDF pages, long/Unicode fixtures; fresh-context review checks diagram/text/contracts.
6. Missing renderers return execution_failed. Never create placeholders and call them verified artifacts.

## Runtime

Run node <this-skill>/scripts/run.mjs <action> --input <absolute-input.json>.
Resolve this-skill from this file; prefer its own version, never global runtime.
See [workflow](../../shared/WORKFLOW.md), [actions](../../contracts/actions.md),
[candidate schema](../../schemas/candidate.schema.json) and [review schema](../../schemas/review.schema.json).
