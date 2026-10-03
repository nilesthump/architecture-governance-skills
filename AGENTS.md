# Suite development

Current source: 1.0.0/. Tests: test/1.0.0/. Derived release: release/1.0.0/.
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
