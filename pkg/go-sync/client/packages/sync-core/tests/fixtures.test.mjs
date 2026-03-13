import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = resolve(here, "..", "..", "..", "..", "testdata", "http");

function readJSON(name) {
  return JSON.parse(readFileSync(resolve(fixturesRoot, name), "utf8"));
}

test("canonical backend read fixture is available to sync-core consumers", () => {
  const payload = readJSON("01_read_success.json");
  assert.equal(payload.revision, 12);
  assert.ok(payload.data);
});

test("canonical backend stale revision fixture is available to sync-core consumers", () => {
  const payload = readJSON("03_stale_revision_conflict.json");
  assert.equal(payload.error.code, "STALE_REVISION");
  assert.equal(payload.error.details.current_revision, 13);
});

test("phase 3 example fixtures cover load, autosave, send replay, and stale recovery", () => {
  const loadPayload = readJSON("05_resource_load_example.json");
  const autosavePayload = readJSON("06_autosave_mutation_example.json");
  const replayPayload = readJSON("07_send_action_replay_example.json");
  const recoveryPayload = readJSON("08_stale_revision_recovery_example.json");

  assert.equal(loadPayload.metadata.source, "phase3_resource_load");
  assert.equal(autosavePayload.metadata.operation, "autosave");
  assert.equal(replayPayload.metadata.operation, "send");
  assert.equal(replayPayload.replay, true);
  assert.equal(
    recoveryPayload.error.details.resource.metadata.source,
    "phase3_stale_revision_recovery",
  );
});
