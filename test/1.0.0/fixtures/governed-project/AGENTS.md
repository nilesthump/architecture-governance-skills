# Agent workflow

Read authoritative state in this order:

1. spec/progress/CURRENT.md
2. spec/architecture/CURRENT
3. ARCHITECTURE.md in the pointed architecture directory
4. spec/governance/WRITE_SCOPE.md
5. spec/governance/WORKFLOW.md
6. Current task contracts, protocols and domain specifications

Implement the minimum reliable solution for accepted requirements and acceptance
criteria. Explain dependencies/abstractions/infrastructure by present necessity.
Outside allowed scope remains read-only; ask for explicit scope expansion.
Canonical project directory: H:\architecture-skills\.tmp\behavior\canonical. Task worktree is separate.
Use a task branch/worktree, local validation, fresh-context independent review,
PR and GitHub CI; integrate accepted result into canonical and verify it there.
Record task/branch/worktree/validation/review/integration in CURRENT progress.
Do not claim completion until accepted result is in canonical and progress updated.
Use the project's existing DevOps baseline and authoritative architecture rules.
