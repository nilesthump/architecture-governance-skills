# 1.1.0 release notes

Discussion state now records user/default/norm provenance, stable priority/dependency
nodes, component branches, deadline/resources, conflicts and resumable status.
Substantive edits preserve stale downstream values for review and invalidate prior
candidates/reports. Queries are read-only. Coordinator writes require expectedRevision
and a protected transaction, with explicit lock/corruption recovery.

Candidates and formal freeze are bound to immutable discussion input, effective nodes
and current independent reports. Formal artifacts retain that input for historical
verification. Explicit legacy migration preserves source data and recovery backups.
Final archive is immutable and idempotent; subsequent discussions use a new baseline.

Eleven focused skills, existing installation behavior, architecture version separation,
DevOps inheritance and frozen 1.0.0 bytes are preserved. See UPGRADE-1.1.0.md.
This document is not a publication claim; actual acceptance appears in PROGRESS.md.
