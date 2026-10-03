# Independent review resolution

Raw initial reviews are retained separately from author resolution claims.
- Evidence freshness: compare current raw source hashes, not HEAD alone.
- Existing policy: explicit versionPolicy/project layout, separate from package version.
- Windows npm/pnpm: safely resolve JS CLI entry points, no command shell.
- CI stack: no invented npm install; accepted project setup remains explicit.
- Integrity: required artifact inventory, identity/candidate and diagram mapping binding.
- GitHub: exact PR-only admin actor and no integrity bypass.
- Canonical: reject linked task worktrees for canonical writeback verification.
- Proposal: inspected matching-root baseline mandatory.
- Release: compare package metadata, source, installer, license and README.
- Preserved-version failure/crash: CURRENT may temporarily point at retained history;
  all ordinary preparation failures restore prior pointer and remove incomplete archive.
- Real npm/pnpm transport and existing DevOps command behavior now have executable tests.

Behavioral host traces, independent artifact semantics and remote CI are acceptance
evidence gates; deterministic passing tests alone cannot satisfy them.


Remote CI discovered POSIX bin symlink dispatch and macOS /var temporary-root aliases. Bin entry compares real paths; chosen repository roots are canonicalized, while explicit symlink roots and nested symlink paths remain rejected. Installer permits only recognized macOS /var and /tmp system aliases. Ruleset conditions compare values, independent of JSON property order.

Remote macOS regression: rollback fault injection now compares physical paths, so system temporary-directory aliases do not bypass the injected failure. Nearest-ancestor output resolution also stops explicitly at unavailable filesystem roots.
