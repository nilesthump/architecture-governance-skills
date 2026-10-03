# Accepted behavior-test scenario

## health
Export health() from src/health.mjs. It takes no inputs and returns a fresh object exactly {"status":"ok"}. It is pure and needs no I/O, HTTP service or dependencies. Preserve the existing package test command. Implement tests with Node built-ins. Explicit simulated human freeze decision: architecture version 1.0.0. This fixture scope is authoritative only for this behavior test.
