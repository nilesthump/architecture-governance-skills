# Workflow 1.1.0

Discussion -> candidate -> reviewed -> frozen -> bootstrapped -> validated -> accepted.
Changed candidate invalidates review; failed gate leaves CURRENT unchanged.
Human architecture/version/approval decisions cannot be inferred from recommendations.
Host starts fresh reviewers with raw package only; record actual trace. Main-agent
claims are ADVISORY. Unsupported independence blocks the corresponding gate.
Read order: spec/progress/CURRENT.md, spec/architecture/CURRENT, pointed ARCHITECTURE.md,
spec/governance/WRITE_SCOPE.md, spec/governance/WORKFLOW.md, task-specific specs.
Canonical -> task worktree -> implementation -> validation -> independent review ->
PR/CI -> accepted integration -> canonical verification -> progress update.
Outside approved paths remains read-only; never silently widen scopes.
Freeze chooses architecture version independently, stages artifacts and publishes
pointer last. Preserved-version updates archive previous revisions.
Installer installs skills/private runtime only, never bootstraps project governance.
Success statuses: success, authorization_required, user_decision_required,
validation_failed, execution_failed. Non-success exits nonzero.
GitHub capabilities: AVAILABLE, AUTHORIZATION_REQUIRED, UNAVAILABLE.
No script proves reasoning-agent independence; real trace-backed tests required.

Discussion continuation: resolve WORKING.json authority and status, use only effective
confirmed nodes, and reference immutable review inputs. Do not infer confirmation
from accepted labels or mutate discussion during status reads. See DISCUSSION.md.
