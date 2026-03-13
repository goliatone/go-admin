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

function createRef(id = "agreement_draft_123") {
  return {
    kind: "agreement_draft",
    id,
    scope: {
      tenant: "tenant_1",
    },
  };
}

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    },
  };
}

function textResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return payload;
    },
  };
}

test("createFetchSyncTransport uses canonical GET, PATCH, and POST action routes", async () => {
  const ref = createRef();
  const calls = [];
  const transport = syncCore.createFetchSyncTransport({
    baseURL: "/admin/api/v1",
    actionOperations: ["send"],
    fetch: async (url, init = {}) => {
      calls.push({
        url,
        method: init.method,
        body: init.body ? JSON.parse(init.body) : null,
      });
      if (init.method === "GET") {
        return jsonResponse(200, readJSON("01_read_success.json"));
      }
      if (init.method === "PATCH") {
        return jsonResponse(200, readJSON("02_mutate_success.json"));
      }
      return jsonResponse(200, readJSON("04_idempotency_replay.json"));
    },
  });

  const loaded = await transport.load(ref);
  const autosave = await transport.mutate({
    ref,
    operation: "autosave",
    payload: {
      title: "Mutual NDA",
    },
    expectedRevision: 12,
  });
  const replay = await transport.mutate({
    ref,
    operation: "send",
    payload: {
      confirm: true,
    },
    expectedRevision: 13,
    idempotencyKey: "idem_send_13",
  });

  assert.equal(loaded.revision, 12);
  assert.equal(autosave.snapshot.revision, 13);
  assert.equal(replay.replay, true);
  assert.deepEqual(calls, [
    {
      url: "/admin/api/v1/sync/resources/agreement_draft/agreement_draft_123",
      method: "GET",
      body: null,
    },
    {
      url: "/admin/api/v1/sync/resources/agreement_draft/agreement_draft_123",
      method: "PATCH",
      body: {
        operation: "autosave",
        payload: {
          title: "Mutual NDA",
        },
        expected_revision: 12,
      },
    },
    {
      url: "/admin/api/v1/sync/resources/agreement_draft/agreement_draft_123/actions/send",
      method: "POST",
      body: {
        payload: {
          confirm: true,
        },
        expected_revision: 13,
        idempotency_key: "idem_send_13",
      },
    },
  ]);
});

test("fetch transport falls back to retry-safe temporary failure errors for malformed 503 responses", async () => {
  const ref = createRef();
  const transport = syncCore.createFetchSyncTransport({
    fetch: async () => textResponse(503, "upstream unavailable"),
  });

  await assert.rejects(
    transport.load(ref),
    (error) => error.code === "TEMPORARY_FAILURE" && /status 503/.test(error.message),
  );
});

test("fetch transport maps network failures to TRANSPORT_UNAVAILABLE", async () => {
  const ref = createRef();
  const transport = syncCore.createFetchSyncTransport({
    fetch: async () => {
      throw new Error("connection reset");
    },
  });

  await assert.rejects(
    transport.load(ref),
    (error) => error.code === "TRANSPORT_UNAVAILABLE" && /connection reset/.test(error.message),
  );
});

test("createRefreshPolicy loads initially, refreshes on route re-entry, focus, and conflict acknowledgement", async () => {
  const calls = [];
  let snapshot = null;
  const focusTarget = createEventTarget();
  const resource = {
    getSnapshot() {
      return snapshot;
    },
    getState() {
      return {
        status: snapshot ? "ready" : "idle",
      };
    },
    subscribe() {
      return () => {};
    },
    async load() {
      calls.push({ type: "load" });
      snapshot = {
        ref: createRef(),
        data: { status: "draft" },
        revision: 12,
        updatedAt: "2026-03-12T18:00:00Z",
      };
      return snapshot;
    },
    async mutate() {
      throw new Error("not used");
    },
    invalidate() {},
    async refresh(options) {
      calls.push({ type: "refresh", options });
      snapshot = {
        ...snapshot,
        revision: snapshot.revision + 1,
      };
      return snapshot;
    },
  };

  const policy = syncCore.createRefreshPolicy(resource, {
    focusTarget,
    visibilityTarget: {
      visibilityState: "visible",
    },
  });

  const initial = await policy.start();
  const routeRefresh = await policy.refreshOnRouteReentry();
  focusTarget.emit("focus");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const conflictRefresh = await policy.refreshAfterConflictAcknowledgement();

  assert.equal(initial.revision, 12);
  assert.equal(routeRefresh.revision, 13);
  assert.equal(conflictRefresh.revision, 15);
  assert.deepEqual(calls, [
    { type: "load" },
    { type: "refresh", options: { force: true } },
    { type: "refresh", options: { force: true } },
    { type: "refresh", options: { force: true } },
  ]);

  policy.stop();
});

function createEventTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(
        type,
        entries.filter((entry) => entry !== listener),
      );
    },
    emit(type) {
      const entries = listeners.get(type) ?? [];
      for (const listener of entries) {
        listener();
      }
    },
  };
}
