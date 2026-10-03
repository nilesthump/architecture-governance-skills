# Actions 1.0.0

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
