import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fixture, execute, ok } from "../helpers.mjs";
import { write } from "../../../1.1.0/scripts/core/util.mjs";
test("Discussion-only files preserve Greenfield classification; existing code still classified as existing", async () => {
  const f = fixture();
  try {
    fs.unlinkSync(path.join(f.root, "package.json"));
    fs.unlinkSync(path.join(f.root, "requirements.md"));
    ok(await execute("architecture.working.update", f.input));
    assert.equal(
      ok(await execute("repo.inspect", { root: f.root })).mode,
      "greenfield",
    );
    write(path.join(f.root, "src/app.mjs"), "export const app=true;");
    assert.equal(
      ok(await execute("repo.inspect", { root: f.root })).mode,
      "existing",
    );
  } finally {
    f.cleanup();
  }
});
