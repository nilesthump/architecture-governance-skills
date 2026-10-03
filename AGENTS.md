# Suite development

Current development source: 1.1.0/. Tests: test/1.1.0/. Derived release: release/1.1.0/.
Official published version: 1.1.0 (GitHub and npm; verified latest=1.1.0).
Frozen 1.0.0 source, tests and package remain unchanged.
Read docs/REQUIREMENTS-1.1.0.md and docs/UPGRADE-1.1.0.md for this update.
Read docs/REQUIREMENTS.md, docs/DESIGN.md and docs/PROGRESS.md before work.
Use the installed Matt Pocock write-a-skill methodology: requirements, concise
SKILL.md, progressive disclosure, deterministic scripts, user review and checklist.
Descriptions need specific triggers; SKILL.md stays under 100 lines with examples
and one-level resource references. Implement the minimum accepted requirements.
Preserve released sources; later fixes create new source/test/release versions.
Use task branches/worktrees after committing the seed. Canonical repository is
resolved with git rev-parse --show-toplevel (initial host H:/architecture-skills).
Integrate accepted reviewed commits back to canonical, validate, update progress.
Run npm run validate, the same entry as GitHub CI. Keep versioned meaningful
negative/integration/regression tests and evidence; do not fabricate behavior traces.
Independent agents receive raw requirements, source, tests and review task only;
main-agent claims are advisory. Fix findings before release. Build releases using
npm run build, never edit derived release manually. Verify source/release parity.
Verify npm/pnpm project/global installation, artifact parity and actual CI matrix.
Use PR/CI, one reviewer approval, main force-push/deletion protection and supported
PR-only admin bypass. Record unavailable platform capabilities honestly.
No credentials in source. npm registry publishing needs authenticated npm account.
