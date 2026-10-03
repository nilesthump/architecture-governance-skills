> Suite 1.1.0: see [upgrade guide](docs/UPGRADE-1.1.0.md). Official publication status is recorded in [progress](https://github.com/nilesthump/architecture-governance-skills/blob/main/docs/PROGRESS.md).

# Architecture Governance Skill Suite

[简体中文（默认）](README.md) · **English**

Architecture design, independent review, formal freeze and agent governance for new projects and existing repositories. First version: 1.0.0. Supports Windows, macOS and Linux; requires Node.js 22+.

Eleven composable skills work with version-bound deterministic scripts, templates, contracts, schemas and an installer. A compatible host supplies fresh-context reasoning agents; scripts perform deterministic checks and operations.

## Install

Registry installation for officially published versions:

    npx architecture-governance-skills@latest --scope project
    pnpm dlx architecture-governance-skills@latest --scope project
    npx architecture-governance-skills@1.0.0 --scope global
    pnpm dlx architecture-governance-skills@1.0.0 --scope global

Project default: .agents/skills/. Global default: CODEX_HOME/skills or ~/.codex/skills. Without --scope, an interactive terminal offers project/global selection. --project selects a project directory; --directory selects a custom skill directory.

The resolved stable package version is the default. Select a historical release with package@X.Y.Z and optionally --version X.Y.Z. Historical 1.0.0 packages and runtimes remain supported; installing the update does not migrate project discussion state. Existing installations require explicit --replace. Project and global installations retain their own script and dependency versions.

Install the expanded package from a cloned repository:

    npm ci
    npm run build
    npm exec --package ./release/1.1.0 -- architecture-skills --scope project --project /path/to/project
    pnpm --package ./release/1.1.0 dlx architecture-skills --scope project --project /path/to/project

The installer copies skills and their runtime. Installed skill workflows initialize projects. Check the official Release and npm page for registry publication status.

## Start using the suite

Ask the host agent to:

- Design this project architecture.
- Check this repository for architecture conflicts.
- Formally freeze the current proposal.
- Add agent governance based on the existing DevOps baseline.

When supported by the host skill UI, use /architecture, /architecture review, /architecture freeze or /architecture status. These are agent workflow requests. Review gates require fresh-context independent agents.

| Skill | Responsibility |
| --- | --- |
| architecture | Entry, intent routing and state coordination |
| greenfield-architecture | New-project working state and architecture candidates |
| existing-repo-architecture | Repository evidence, conflict analysis and proposals |
| architecture-review | Raw review packages and independent review |
| architecture-freeze | Human version choice and formal freeze |
| architecture-artifacts | MD, PDF, PlantUML and consistency verification |
| repository-bootstrap | New-project repository baseline |
| governance-design | AGENTS, ordered reads, scopes and workflow |
| governance-verify | Structural checks and actual agent behavior acceptance |
| devops-baseline | Existing DevOps baseline and behavioral preservation |
| progress-versioning | Progress, versions and fresh-context continuation |

## Two workflows

**Greenfield**: discuss requirements -> accepted decisions -> independent review -> human architecture version choice -> freeze MD/PDF/PUML/manifest -> governance bootstrap -> actual behavior acceptance -> shared local/CI validation -> PR -> canonical integration.

**Existing Repository**: collect raw evidence -> distinguish AS-IS, NORMATIVE, TARGET and KNOWN DEVIATION -> DevOps baseline -> conversation proposal -> human approval of all or selected changes -> path/hash-bound application -> independent verification.

Existing specification layouts, version policies, package managers and DevOps are inherited. Unapproved proposals stay in the conversation. Changes must match approved paths and original file hashes.

## Artifacts and governance

Default frozen layout: spec/architecture/vX.Y.Z/ with ARCHITECTURE.md, ARCHITECTURE.pdf, manifest.yaml, diagrams/*.puml and rendered images. A plain CURRENT file points to the active version. MD/PDF share architecture identity, version and stable section IDs, with TOCs, anchors or bookmarks and page navigation.

Formal updates require human choice of a concrete version. Explicitly preserved versions archive the preceding revision; historical versions remain. Architecture versions are independent of suite/npm package versions.

Diagrams use the same PlantUML source. Rendering requires Java and the official PlantUML JAR via an absolute ARCHITECTURE_PLANTUML_JAR path. Semantic verification requires Python with pypdf; ARCHITECTURE_PYTHON selects the interpreter. Unicode documents require an embeddable font through ARCHITECTURE_FONT. Missing required rendering capabilities produce explicit failures.

Root AGENTS.md specifies authoritative read order, minimum implementation, write scopes, task worktrees, validation, review, PR/CI and canonical write-back. CLAUDE.md only routes to AGENTS.md. spec/progress/CURRENT.md enables fresh-context continuation. Unapproved paths stay read-only.

Review packages preserve raw AUTHORITATIVE, EVIDENCE, CANDIDATE and ADVISORY files with revision/hash binding. Independence depends on the host and retained original traces; JSON claims alone cannot prove actual agent behavior.

GitHub rulesets require three-platform checks and at least one approval, prevent main force-push/deletion, and support owner/admin PR-only approval bypass for single-person repositories. Integrity and required-check rules have no such bypass.

## Development and acceptance

Install Node.js, Java and Python, then run:

    npm ci
    python -m pip install pypdf==6.10.0
    node tools/fetch-renderer.mjs
    node tools/fetch-font.mjs
    node tools/ci.mjs

tools/ci.mjs sets renderer dependency paths and invokes tools/validate.mjs, the same core used by npm run validate with the environment variables configured. Local and GitHub Actions share validation logic. CI targets windows-latest, macos-latest and ubuntu-latest.

Tests cover package transport, project/global installs, negative gates, paths, review packages, versions/rollback, real PDF/PUML, worktrees/write-back, and Existing Node/Python build/test/lint/format/release/deploy entrypoint preservation. Actual independent agent acceptance and simulated unit inputs are recorded separately.

## Repository structure

    AGENTS.md / CLAUDE.md / README.md / README.en.md / LICENSE
    package.json / package-lock.json / bin/
    1.0.0/ (frozen historical source)
    1.1.0/
      skills/ scripts/ templates/ contracts/ schemas/ shared/
    test/1.0.0/ (frozen historical tests)
    test/1.1.0/
      integration/ fixtures/ regression/ fixes/ evidence/
    release/1.0.0/ (frozen historical package)
    release/1.1.0/
    tools/ docs/ .github/workflows/

1.1.0/ is the current authoritative version source; test/1.1.0/ holds corresponding tests/evidence. release/1.1.0/ is the deterministically built expanded package with source, installer and documentation parity checks. Fixes after formal release create a new version.

Original requirements: [REQUIREMENTS](docs/REQUIREMENTS.md); design: [DESIGN](docs/DESIGN.md); progress: [PROGRESS](docs/PROGRESS.md); acceptance details: [ACCEPTANCE](docs/ACCEPTANCE.md).

License: [MIT](LICENSE).

## Discussion state and upgrade

WORKING.json supports sourced confirmation, priority scheduling, component branches, dependency invalidation and read-only status tables. Candidates/review/freeze bind immutable discussion input. Legacy migration is explicit; archives retain recovery entries. Architecture and Suite versions remain separate. See the [1.1.0 upgrade guide](docs/UPGRADE-1.1.0.md).
