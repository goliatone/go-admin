import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = resolve(here, "..", "..", "..", "..", "testdata", "http");
const distEntry = pathToFileURL(resolve(here, "..", "dist", "index.js")).href;
const syncCore = await import(distEntry);

function readJSON(name) {
  return JSON.parse(readFileSync(resolve(fixturesRoot, name), "utf8"));
}

const ref = {
  kind: "agreement_draft",
  id: "agreement_draft_123",
  scope: {
    tenant: "tenant_1",
  },
};

test("parseReadEnvelope normalizes backend read fixtures", () => {
  const payload = readJSON("01_read_success.json");
  const snapshot = syncCore.parseReadEnvelope(ref, payload);

  assert.equal(snapshot.ref.kind, "agreement_draft");
  assert.equal(snapshot.revision, 12);
  assert.equal(snapshot.updatedAt, "2026-03-12T18:00:00Z");
  assert.equal(snapshot.data.title, "Mutual NDA");
});

test("parseMutationEnvelope normalizes backend success and replay fixtures", () => {
  const successPayload = readJSON("02_mutate_success.json");
  const replayPayload = readJSON("04_idempotency_replay.json");

  const success = syncCore.parseMutationEnvelope(ref, successPayload);
  const replay = syncCore.parseMutationEnvelope(ref, replayPayload);

  assert.equal(success.applied, true);
  assert.equal(success.replay, false);
  assert.equal(success.snapshot.revision, 13);
  assert.equal(replay.applied, true);
  assert.equal(replay.replay, true);
  assert.equal(replay.snapshot.revision, 14);
});

test("parseErrorEnvelope normalizes stale-revision conflict fixtures", () => {
  const payload = readJSON("03_stale_revision_conflict.json");
  const error = syncCore.parseErrorEnvelope(ref, payload);

  assert.equal(error.code, "STALE_REVISION");
  assert.equal(error.currentRevision, 13);
  assert.ok(error.resource);
  assert.equal(error.resource.revision, 13);
  assert.equal(error.resource.data.participants.length, 2);
});

test("phase 3 example fixtures parse into stable sync-core contracts", () => {
  const load = syncCore.parseReadEnvelope(ref, readJSON("05_resource_load_example.json"));
  const autosave = syncCore.parseMutationEnvelope(ref, readJSON("06_autosave_mutation_example.json"));
  const replay = syncCore.parseMutationEnvelope(ref, readJSON("07_send_action_replay_example.json"));
  const recovery = syncCore.parseErrorEnvelope(
    ref,
    readJSON("08_stale_revision_recovery_example.json"),
  );

  assert.equal(load.metadata.source, "phase3_resource_load");
  assert.equal(autosave.snapshot.metadata.source, "phase3_autosave_mutation");
  assert.equal(replay.replay, true);
  assert.equal(replay.snapshot.metadata.idempotency_key, "idem_send_agreement_draft_123_v14");
  assert.equal(recovery.currentRevision, 13);
  assert.equal(recovery.resource.metadata.source, "phase3_stale_revision_recovery");
});

test("parseMutationEnvelope rejects invalid payloads", () => {
  assert.throws(() => {
    syncCore.parseMutationEnvelope(ref, {
      data: {},
      revision: 3,
      updated_at: "2026-03-12T18:00:00Z",
      applied: "yes",
      replay: false,
    });
  }, /boolean applied/);
});

test("parsed envelopes deep-clone payload data and metadata", () => {
  const payload = readJSON("01_read_success.json");
  const snapshot = syncCore.parseReadEnvelope(ref, payload);

  snapshot.data.title = "Changed locally";
  snapshot.metadata.scope.tenant = "tenant_2";

  assert.equal(payload.data.title, "Mutual NDA");
  assert.equal(payload.metadata.scope.tenant, "tenant_1");
});
