# Actions 1.1.0

CLI: node <skill>/scripts/run.mjs <action> --input <absolute-json-path>.
Input JSON, stdout one structured result; unknown action/input fails closed.
root absolute; repository paths relative/contained/no symlinks. Executable/argv
arrays avoid shell interpolation. Mutations preflight all paths before applying.
review.package: root, output, sources [{path,category}], candidate. Raw bytes,
categories, hashes and revision bind reproducible context; output outside root.
architecture.freeze: root, candidate, version, decision {freeze,version,preserveVersion?},
reviewPackages [{directory,report}], plantumlJar, optional fontPath/python.
Report package/candidate digest and host trace required; blockers prevent freeze.
governance.apply: root, baseline, approval {approved,paths,approvedDevops?},
changes [{path,beforeHash,content}]. Exact approved paths; rollback on failure.
validation.run-local: root, contract {version:1,commands:[{name,executable,args,env?}]}.
Validation commands bounded and run without shell. CI calls same runner.
Read: environment.probe, repo.inspect/status/worktree.inspect, validation.discover,
progress.read, github.auth.inspect, github.ruleset.verify.
Write: repo.bootstrap/worktree.create, review.package, architecture.freeze,
governance.install/apply, progress.update, github.repo.create/ci.configure/ruleset.configure.
Verify: architecture.integrity.verify, document.parity-check, manifest.verify,
validation.compare-remote, repo.writeback.verify, governance.test.
Node 22+, PDFKit; Java + PlantUML JAR for diagrams; Python+pypdf for PDF extraction.

Existing architecture policy: versionPolicy="project" permits user-selected safe identifiers; layout={directory,pointer,versionPrefix} inherits approved existing paths. Defaults remain SemVer/spec/architecture/CURRENT/v. Integrity verifies version/path binding, including history revision pointers.
DevOps comparison includes approved governance differences only via approval={approved:true,changes:[{path,beforeHash,afterHash}]}; originals remain visible.
Windows npm/npx/pnpm commands resolve JS CLIs without a shell. Other .cmd files require explicit executable/argv adapters. Project CI generation does not invent dependency setup; configure accepted stack preparation explicitly.

Working state: architecture.working.read/update use approved workingPath (default spec/architecture/WORKING.json). Updates require mode, writerId, expectedRevision and operations; full input.state replacement is rejected. Create with projectIdentity/discussionId and expectedRevision=0. Preserved discussion arrays are updated through record operations; formal conclusions use sourced nodes. See shared/DISCUSSION.md for set/reject/conflict/record shapes. Discussion updates never change CURRENT.

Preservation compares every raw repository file outside exact approved governance differences, including tools/source/config dependencies; outside drift fails. Source/entrypoint/config changes require separate approvedDevops designation. Behavioral meaning remains an independent review concern.

Discussion 1.1.0: architecture.working.status/check are read-only; update/migrate/
start/archive/advance and architecture.candidate.generate use coordinator writerId,
expectedRevision, designated root and approved paths. See shared/DISCUSSION.md for
operation shapes, provenance, phase gates, snapshot binding and recovery.
