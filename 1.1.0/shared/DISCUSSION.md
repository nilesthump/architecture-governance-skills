# Discussion contract

WORKING.json is the single mutable discussion entry, default spec/architecture/WORKING.json.
Use an approved existing workingPath. Suite 1.1.0, formatVersion 2, definitionVersion
1.1.0, revision, contentRevision and architecture version/revision are distinct.
The shared discussion.json supplies stable IDs, priorities and dependencies;
concern nodes derive from concerns.json. API is a component boundary, not a branch.

## Deterministic operations

Every mutation supplies root (absolute designated authority), mode, writerId and
expectedRevision. Creation uses expectedRevision=0, projectIdentity, discussionId.
Existing mode supplies approval.approved=true and exact approval.paths including
workingPath and any backup/snapshot/archive path. This is an operation declaration;
the host must check actual human authorization, not invent approvals in JSON.

Example: architecture.working.update with operations:

```json
{
  "type": "set",
  "id": "goals",
  "status": "confirmed",
  "value": "Health service",
  "evidence": {
    "kind": "explicit-user",
    "source": {
      "path": "requirements.md",
      "sha256": "<hash of original bytes>",
      "locator": "line 2",
      "quote": "Health service"
    }
  }
}
```

Verifiable evidence distinguishes explicit-user, user-default, inherited-norm and
agent-proposal. Source path/hash/quote/locator are required for closure. The host
must verify the source is genuinely human/normative; a hash cannot establish identity.
Proposed values are never confirmed. not-applicable and excluded require rationale;
reject records an alternative and leaves the unresolved question open.
Record operations preserve requirements, decisions, constraints, non-goals, risks,
assumptions and questions. These are raw contextual records; formal decisions use
confirmed nodes, not accepted labels. Material unconfirmed assumptions block closure.
Conflicts are explicit node-bound records, resolved only with sourced decisions.

Smaller priority schedules missing answers, with dependency order and stable ID order.
Accept early answers and independent branches; never clear already answered nodes.
components.value = {types:[server,client,game,web,other], gui:boolean}, at least one.
GUI never infers a new API. Persistence/middleware may explicitly confirm "none".
Budget needs deadline and one or more typed resources: people(count,availability),
agent(product,count,constraints), funds(amount,currency,period,coverage).
Separate estimates with their assumptions from confirmed constraints. Feasibility
needs feasible=true and basis; conflicts require scope/solution/budget options.
Topology describes single instance, replicas or collaborating services precisely.
Confirmed concern values are {applicable:boolean,reason:string}; generated candidate
concerns derive from these nodes, and cannot be substituted in a handwritten candidate.
Business dataflow covers actual participants, success/failure, contracts and ownership;
do not invent gateway/database/client chains. Review concerns for applicability.

Material edits preserve stale downstream values with needs-review, reset workflow to
discussion, increment contentRevision, and invalidate candidate/review links. Batch
answers may close several dependency levels, but their evidence must cover each choice.
Frozen nodes cannot change. New discussions use a new ID and immutable archive baseline.

## Candidate, review and freeze

architecture.candidate.generate accepts a candidate whose decisions and sections have
nodeIds referencing active confirmed nodes; formal decisions are accepted. Readiness
requires all active mandatory nodes closed, no conflicts/questions, validated values.
Generate writes a content-addressed immutable review-input snapshot and binds its ID,
contentRevision and digest into the candidate. Identical content reuses the snapshot.
This is necessary review evidence, not per-turn backup storage. Preserve review evidence.
Semantic reviewers must detect unsupported components and new choices hidden in prose,
requirements or diagrams; structural mappings cannot prove semantics.
review.package includes the snapshot and rejects mutable working state sources.
architecture.working.advance phase=reviewed checks reports/candidate/raw hashes/HEAD.
architecture.freeze requires reviewed state, same candidate/input, explicit version and
freeze choice, current independent reports, concern coverage and real renderers.
The working lock spans validation, rendering and publication. New formal artifacts
retain hashed STATE.json and discussion binding; CURRENT publishes last. Historic
integrity uses artifact bytes, never later mutable state. No legacy bypass is supported.

## Completion, migration and recovery

advance validates adjacent transitions: frozen -> bootstrapped requires Greenfield
Git plus all governance/progress entries, or sourced Existing completion; validated
runs actual Validation Contract and artifact integrity; accepted requires sourced
acceptance plus real governance host trace and integrity. Existing acceptance uses
independent behavior and DevOps preservation evidence, retaining inherited layouts;
it does not require replacing CLAUDE or moving governance to Greenfield defaults. Independent artifact
semantic/visual review and actual PR/CI remain orchestration acceptance gates.
archive requires accepted, verifies an immutable final STATE.json, then saves its
reference in WORKING.json. Repeats are idempotent; content conflicts fail. Review
snapshots and migration backups are necessary evidence and remain retained. No
unrelated drafts are deleted automatically. Failures leave current state recoverable.
start requires an intact archive and a new ID; architecture baseline is explicit.

Read legacy state without writes. migrate explicitly saves a hashed legacy backup,
preserves every legacy field, and initializes new nodes undetermined. Reliable user
or norm evidence can then confirm mapped nodes; accepted labels alone never suffice.
Downgrade writes and silent two-way migration are unsupported. Installer does not
scan projects, migrate discussion state or bootstrap governance.

Lock uses exclusive creation; expectedRevision check and write are one transaction.
Atomic rename leaves old or new JSON after interruption. A remaining lock requires
owner/process and staged-byte inspection; release it only after proving no live
writer, preserve staged bytes, then retry using actual revision. Never auto-expire.
Corrupt state fails without reset; inspect/restore the verified recovery backup.
Task copies cannot write: use authority.root and workingPath. At integration compare
content/revision against the designated authority; copying a task snapshot is not
an authorized state handoff. Coordinator identity/authorization are host-enforced.
