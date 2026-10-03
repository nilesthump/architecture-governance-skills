# Architecture Governance Skill Suite

Composable architecture design, review, freeze and agent governance for new and
existing repositories. Version 1.0.0. Windows, macOS and Linux; Node.js 22+.

## Install and start

Install-ready package is expanded at release/1.0.0/. From a cloned repository:

    npm ci
    npm run build
    npm exec --package ./release/1.0.0 -- architecture-skills --scope project --project /path/to/project
    pnpm --package ./release/1.0.0 dlx architecture-skills --scope project --project /path/to/project

When published to npm, equivalent registry forms are:

    npx architecture-governance-skills@latest --scope project
    pnpm dlx architecture-governance-skills@latest --scope project
    npx architecture-governance-skills@1.0.0 --scope global
    pnpm dlx architecture-governance-skills@1.0.0 --scope global

Registry availability is a separate release gate; do not assume these work before
publication. --version latest defaults to the resolved package's stable version;
use package@X.Y.Z plus --version X.Y.Z for a historical source. Installation is
interactive without --scope on a terminal. --directory selects a custom skill root.
Project default: .agents/skills/. Global default: CODEX_HOME/skills or ~/.codex/skills.
Existing destinations fail until --replace is explicitly supplied. Project and global
versions coexist; each skill calls its own private version-bound scripts/dependencies.
Installer does not initialize Git, AGENTS, spec, CI or governance.

## Use

Say "帮我设计这个项目架构", "检查仓库架构冲突", "把方案正式冻结" or
"基于现有 DevOps 增加 Agent 治理". Use /architecture, /architecture review,
/architecture freeze or /architecture status when supported by the host's skill
invocation UI. These are agent workflow requests, not a standalone reasoning CLI.
A compatible host must support fresh-context independent agents for review gates.

Skills: architecture, greenfield-architecture, existing-repo-architecture,
architecture-review, architecture-freeze, architecture-artifacts,
repository-bootstrap, governance-design, governance-verify, devops-baseline,
progress-versioning. See each SKILL.md for triggers and workflow.

Greenfield: discuss requirements -> accepted decisions -> independent review ->
human version choice -> freeze MD/PDF/PUML/manifest -> governance bootstrap ->
behavior tests -> shared local/CI validation -> PR -> canonical integration.
Existing: inspect evidence -> AS-IS/NORMATIVE/TARGET/deviations -> DevOps baseline ->
conversation proposal -> exact human approval -> apply -> independent verification.
Existing specification layout, version rules, package manager and DevOps are inherited.

## Artifacts and governance

Frozen versions: spec/architecture/vX.Y.Z/ with ARCHITECTURE.md, ARCHITECTURE.pdf,
manifest.yaml, diagrams/*.puml and rendered PNGs. Plain CURRENT points at version.
Stable section IDs, MD TOC/anchors, PDF TOC/bookmarks/page numbers. Same-version
changes require explicit choice and archive previous revision. Historical versions stay.
Diagram rendering requires Java and official PlantUML JAR; set
ARCHITECTURE_PLANTUML_JAR to its absolute path. Semantic verification needs Python
with pypdf; set ARCHITECTURE_PYTHON to the executable. Unicode documents require
an embeddable font via ARCHITECTURE_FONT. Failures never produce fake artifacts.

Root AGENTS orders authoritative reads. CLAUDE only says Read and follow ./AGENTS.md.
Governance defines minimum implementation, explicit scopes, task worktrees and
canonical write-back; progress enables new-context continuation. Outside scope
remains read-only. Real behavior traces are required, not simulated unit evidence.
Review packages preserve raw AUTHORITATIVE/EVIDENCE/CANDIDATE/ADVISORY bytes and
revision/hash binding. Host verifies reviewer independence; scripts cannot prove it.
GitHub rulesets enforce checks, one approval, force-push/deletion protection and
separate PR-only admin approval bypass. Capability states distinguish missing
authorization from unavailable platform support.

## Development and validation

    npm ci
    python -m pip install pypdf
    npm run validate

Local and GitHub Actions run the same validation entry. CI matrix: windows-latest,
macos-latest, ubuntu-latest. Tests cover negative gates, paths, installers, review
packages, artifacts, integration, worktrees and DevOps preservation.
Source truth: 1.0.0/. Tests/evidence: test/1.0.0/. Derived expanded package:
release/1.0.0/. Build is deterministic for release contents and records hash parity.
See docs/REQUIREMENTS.md, docs/DESIGN.md and docs/PROGRESS.md. MIT License.

