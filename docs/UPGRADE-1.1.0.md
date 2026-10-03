# 1.1.0 upgrade and release checklist

This update implements sourced discussion decisions in the existing 11-skill suite.
Source: 1.1.0/. Tests: test/1.1.0/. Build: npm run build -> release/1.1.0/.
1.0.0 source, tests, expanded package and tags remain immutable. Historical npm
installation uses architecture-governance-skills@1.0.0, its own installer/runtime.
The current package contains 1.1.0 only; --version cannot fetch another package.

## Installation after publication

Project: npx --yes --package architecture-governance-skills@1.1.0 architecture-skills --scope project
Global: npx --yes --package architecture-governance-skills@1.1.0 architecture-skills --scope global
pnpm: pnpm --package architecture-governance-skills@1.1.0 dlx architecture-skills --scope project
Use --replace only after reviewing existing skills. Runtime versions remain isolated.
Installer never touches WORKING.json, architecture versions or project governance.
Until publication, use the built package path with npm/pnpm; do not claim registry availability.

## State migration and recovery

Read with architecture.working.read/status using the approved project root/workingPath.
Legacy reads return migrationRequired without changing bytes. Explicit migrate needs
writerId, expectedRevision, projectIdentity/discussionId and Existing approved state
and hashed backup paths. All legacy data is retained; new queue nodes start undetermined.
Confirm reliably supported decisions with original user/default/norm evidence.
No accepted-label inference, silent migration, downgrade writes or bidirectional promise.

Use approved existing layouts. One coordinator operates the authoritative root.
Task worktrees submit proposals and reference that root, never merge competing JSON.
Status returns confirmed/all/pending/next tables. See 1.1.0/shared/DISCUSSION.md for
operation shapes, provenance, budget/components, dependencies and recovery protocol.

Formal generation uses architecture.candidate.generate, review.package, independent
host review, working.advance reviewed, architecture.freeze, verified completion and
working.archive. Snapshot hash excludes phases, candidate/review/architecture/archive
links, so lifecycle transitions do not invalidate reviewed input. Decisions invalidate
candidate/review links and retain downstream comparison values as needs-review.
Frozen changes begin a new archived-baseline discussion. History integrity remains
readable with the new runtime and uses retained STATE.json for new artifacts.

## Traceability

| Requirement | Implementation | Executable coverage / evidence |
| --- | --- | --- |
| queue, components, budget, provenance, conflicts | shared/discussion.json, core/working.mjs | integration/discussion.test.mjs |
| protected revision, atomic writes, path/authority safety | core/working.mjs, util.mjs | discussion concurrency/path/corruption tests |
| migration, archive, baseline, immutable input | core/working.mjs | discussion + lifecycle tests |
| candidate/review/freeze binding, historical integrity | core/working.mjs, review.mjs, artifacts.mjs | lifecycle, direct bypass tests |
| Skill composition and disclosure | 11 SKILL.md + shared/DISCUSSION.md | tools/validate.mjs |
| old sources and installer, npm/pnpm scopes | build verify historical mode, versioned regression harness | regression/historical.test.mjs, integration/installer.test.mjs, integration/package-install.test.mjs |
| actual agent review/continuation and remote matrix | raw independent review/host and CI records | test/1.1.0/evidence; unavailable gates remain pending |

## Release acceptance

- Concise triggers, examples, one-level references; deterministic state operations.
- npm run validate, source/release parity for both versions and unchanged historical bytes.
- Raw fresh-context independent source/semantic/artifact reviews; resolve blockers.
- Actual npm/pnpm project/global transport, isolation, no implicit migration/bootstrap.
- Protected PR, one reviewer approval (supported PR-only admin bypass only), actual
  Windows/macOS/Linux CI, canonical integration/validation/progress and continuation.
- Accepted source/tag/built bytes agree; GitHub Release and authenticated npm publish.
- Verify explicit 1.1.0 registry installation; latest only with authorization and verified tag.

Deterministic fixture reports and handcrafted accepted states test persistence gates;
they are explicitly not actual independent-agent or project acceptance evidence.
