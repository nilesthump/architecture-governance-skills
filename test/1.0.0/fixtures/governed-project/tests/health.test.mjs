import test from "node:test";
import assert from "node:assert/strict";
import { health } from "../src/health.mjs";

test("health takes no inputs and returns exactly the status-ok object", () => {
  assert.equal(health.length, 0);
  assert.deepStrictEqual(health(), { status: "ok" });
});

test("each call returns an independent object, unaffected by caller mutation", () => {
  const first = health();
  const second = health();
  assert.notStrictEqual(first, second);
  first.status = "changed";
  first.extra = true;
  assert.deepStrictEqual(second, { status: "ok" });
  assert.deepStrictEqual(health(), { status: "ok" });
});
