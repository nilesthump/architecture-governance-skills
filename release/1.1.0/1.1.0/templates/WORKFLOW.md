# Project workflow

canonical -> task worktree -> minimum implementation -> local validation ->
fresh-context independent review -> PR -> GitHub CI -> accepted integration ->
canonical verification -> progress update. New agent reads canonical state only.

Validation Contract: spec/governance/validation.json. Local and remote execute
the same version-bound validation.run-local action. Do not invent commands.
GitHub main requires checks and one review; admins may use PR-only approval bypass
where platform supports it. Force pushes/deletion remain protected.
Working architecture is separate from frozen state. Freeze requires explicit
human version choice, resolved decisions and candidate-bound independent review.
Existing repository changes require exact approved proposal and preserved DevOps.
