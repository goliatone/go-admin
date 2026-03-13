import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distEntry = pathToFileURL(resolve(here, "..", "dist", "index.js")).href;
const syncCore = await import(distEntry);

function createRef(id, scope = { tenant: "tenant_1" }) {
  return {
    kind: "agreement_draft",
    id,
    scope,
  };
}

function createSnapshot(ref, revision, data = {}) {
  return {
    ref,
    data: {
      id: ref.id,
      status: "draft",
      ...data,
    },
    revision,
    updatedAt: `2026-03-12T18:00:0${Math.min(revision, 9)}Z`,
    metadata: {
      scope: ref.scope,
    },
  };
}

test("createResourceKey is stable for reordered scope fields and isolates different scopes", () => {
  const ordered = syncCore.createResourceKey(createRef("draft_1", { tenant: "a", user: "u1" }));
  const reordered = syncCore.createResourceKey(createRef("draft_1", { user: "u1", tenant: "a" }));
  const differentScope = syncCore.createResourceKey(createRef("draft_1", { tenant: "b", user: "u1" }));

  assert.equal(ordered, reordered);
  assert.notEqual(ordered, differentScope);
});

test("cache state is isolated by {kind,id,scope} and invalidate only marks the bound resource", async () => {
  const refA = createRef("draft_shared", { tenant: "tenant_a" });
  const refB = createRef("draft_shared", { tenant: "tenant_b" });
  const loadCalls = [];
  const engine = syncCore.createSyncEngine({
    transport: {
      async load(ref) {
        loadCalls.push(syncCore.createResourceKey(ref));
        return createSnapshot(ref, 12, { tenant: ref.scope.tenant });
      },
      async mutate() {
        throw new Error("not used");
      },
    },
    wait: async () => {},
  });

  const resourceA = engine.resource(refA);
  const resourceB = engine.resource(refB);

  await resourceA.load();
  resourceA.invalidate("focus");

  assert.equal(resourceA.getState().invalidated, true);
  assert.equal(resourceA.getState().invalidationReason, "focus");
  assert.equal(resourceB.getSnapshot(), null);
  assert.equal(resourceB.getState().status, "idle");

  await resourceB.load();

  assert.deepEqual(loadCalls, [
    syncCore.createResourceKey(refA),
    syncCore.createResourceKey(refB),
  ]);
  assert.equal(resourceA.getSnapshot().data.tenant, "tenant_a");
  assert.equal(resourceB.getSnapshot().data.tenant, "tenant_b");
});

test("per-resource mutation queue preserves FIFO order and rebinds expectedRevision from latest snapshot", async () => {
  const ref = createRef("draft_queue");
  const requests = [];
  let releaseFirst;
  const firstBlocked = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  let revision = 12;

  const resource = syncCore.createSyncEngine({
    transport: {
      async load(requestRef) {
        return createSnapshot(requestRef, revision);
      },
      async mutate(input) {
        requests.push({
          operation: input.operation,
          expectedRevision: input.expectedRevision,
        });
        if (requests.length === 1) {
          await firstBlocked;
        }
        revision += 1;
        return {
          snapshot: createSnapshot(input.ref, revision, { operation: input.operation }),
          applied: true,
          replay: false,
        };
      },
    },
    wait: async () => {},
    retry: {
      jitterRatio: 0,
    },
  }).resource(ref);

  await resource.load();

  const first = resource.mutate({
    operation: "autosave-title",
    payload: {
      title: "A",
    },
  });
  const second = resource.mutate({
    operation: "autosave-participants",
    payload: {
      participants: 2,
    },
  });

  await Promise.resolve();
  assert.equal(requests.length, 1);

  releaseFirst();

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.deepEqual(requests, [
    {
      operation: "autosave-title",
      expectedRevision: 12,
    },
    {
      operation: "autosave-participants",
      expectedRevision: 13,
    },
  ]);
  assert.equal(firstResult.snapshot.revision, 13);
  assert.equal(secondResult.snapshot.revision, 14);
  assert.equal(resource.getState().queueDepth, 0);
  assert.equal(resource.getState().status, "ready");
});

test("mutation retries use bounded backoff before succeeding", async () => {
  const ref = createRef("draft_retry");
  const delays = [];
  let attempts = 0;
  const resource = syncCore.createSyncEngine({
    transport: {
      async load(requestRef) {
        return createSnapshot(requestRef, 7);
      },
      async mutate(input) {
        attempts += 1;
        if (attempts < 3) {
          throw {
            code: "TEMPORARY_FAILURE",
            message: "retry later",
          };
        }
        return {
          snapshot: createSnapshot(input.ref, 8, { recovered: true }),
          applied: true,
          replay: false,
        };
      },
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 25,
      maxDelayMs: 100,
      jitterRatio: 0,
    },
    wait: async (delayMs) => {
      delays.push(delayMs);
    },
  }).resource(ref);

  await resource.load();
  const result = await resource.mutate({
    operation: "autosave",
    payload: {
      title: "Recovered",
    },
  });

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [25, 50]);
  assert.equal(result.snapshot.data.recovered, true);
  assert.equal(resource.getState().status, "ready");
});

test("mutate rejects before initial load when expectedRevision is not provided", async () => {
  const ref = createRef("draft_unloaded");
  const resource = syncCore.createSyncEngine({
    transport: {
      async load(requestRef) {
        return createSnapshot(requestRef, 1);
      },
      async mutate() {
        throw new Error("not used");
      },
    },
    wait: async () => {},
  }).resource(ref);

  await assert.rejects(
    resource.mutate({
      operation: "autosave",
      payload: {
        title: "Needs load",
      },
    }),
    (error) => error.code === "INVALID_MUTATION" && /loaded before mutate/.test(error.message),
  );

  assert.equal(resource.getState().status, "error");
  assert.equal(resource.getState().queueDepth, 0);
});

test("stale revision conflicts normalize into reload-latest state and clear on refresh", async () => {
  const ref = createRef("draft_conflict");
  const staleSnapshot = createSnapshot(ref, 12, { title: "Local draft" });
  const latestSnapshot = createSnapshot(ref, 13, { title: "Server draft" });
  const states = [];
  let loadCount = 0;
  const resource = syncCore.createSyncEngine({
    transport: {
      async load() {
        loadCount += 1;
        return loadCount === 1 ? staleSnapshot : latestSnapshot;
      },
      async mutate() {
        throw {
          code: "STALE_REVISION",
          message: "resource has a newer revision",
          currentRevision: latestSnapshot.revision,
          resource: latestSnapshot,
        };
      },
    },
    wait: async () => {},
  }).resource(ref);

  resource.subscribe((state) => {
    states.push(state.status);
  });

  await resource.load();

  await assert.rejects(
    resource.mutate({
      operation: "autosave",
      payload: {
        title: "Conflicting edit",
      },
    }),
    (error) => error.code === "STALE_REVISION",
  );

  assert.equal(resource.getState().status, "conflict");
  assert.equal(resource.getState().snapshot.revision, 12);
  assert.equal(resource.getState().conflict.currentRevision, 13);
  assert.equal(resource.getState().conflict.latestSnapshot.revision, 13);
  assert.equal(resource.getState().conflict.staleSnapshot.revision, 12);

  await resource.refresh({ force: true });

  assert.equal(resource.getState().status, "ready");
  assert.equal(resource.getState().conflict, null);
  assert.equal(resource.getSnapshot().revision, 13);
  assert.ok(states.includes("conflict"));
  assert.ok(states.includes("refreshing"));
});

test("forced refresh does not let an older load overwrite a newer snapshot", async () => {
  const ref = createRef("draft_refresh_race");
  let loadCount = 0;

  const resource = syncCore.createSyncEngine({
    transport: {
      async load(requestRef) {
        loadCount += 1;
        const current = loadCount;
        if (current === 2) {
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
        if (current === 3) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return createSnapshot(requestRef, current, {
          loadedFromCall: current,
        });
      },
      async mutate() {
        throw new Error("not used");
      },
    },
    wait: async () => {},
  }).resource(ref);

  await resource.load();
  resource.invalidate("focus");

  const [refresh, forcedRefresh] = await Promise.all([
    resource.refresh(),
    resource.refresh({ force: true }),
  ]);

  assert.equal(refresh.revision, 3);
  assert.equal(forcedRefresh.revision, 3);
  assert.equal(resource.getSnapshot().revision, 3);
  assert.equal(resource.getSnapshot().data.loadedFromCall, 3);
  assert.equal(resource.getState().status, "ready");
});

test("two different resources operate independently on the same engine", async () => {
  const refA = createRef("draft_a");
  const refB = createRef("draft_b");
  let releaseA;
  const blockA = new Promise((resolve) => {
    releaseA = resolve;
  });

  const engine = syncCore.createSyncEngine({
    transport: {
      async load(ref) {
        return createSnapshot(ref, 3);
      },
      async mutate(input) {
        if (input.ref.id === "draft_a") {
          await blockA;
        }
        return {
          snapshot: createSnapshot(input.ref, input.expectedRevision + 1, {
            savedBy: input.ref.id,
          }),
          applied: true,
          replay: false,
        };
      },
    },
    wait: async () => {},
  });

  const resourceA = engine.resource(refA);
  const resourceB = engine.resource(refB);

  await Promise.all([resourceA.load(), resourceB.load()]);

  const saveA = resourceA.mutate({
    operation: "autosave",
    payload: {
      title: "A",
    },
  });
  const saveB = resourceB.mutate({
    operation: "autosave",
    payload: {
      title: "B",
    },
  });

  const resultB = await saveB;

  assert.equal(resourceA.getState().status, "saving");
  assert.equal(resourceB.getState().status, "ready");
  assert.equal(resultB.snapshot.data.savedBy, "draft_b");

  releaseA();
  const resultA = await saveA;

  assert.equal(resultA.snapshot.data.savedBy, "draft_a");
  assert.equal(resourceA.getState().status, "ready");
});

test("createSyncResource exposes the public runtime surface without framework coupling", async () => {
  const ref = createRef("draft_direct");
  const resource = syncCore.createSyncResource({
    ref,
    transport: {
      async load(requestRef) {
        return createSnapshot(requestRef, 1);
      },
      async mutate(input) {
        return {
          snapshot: createSnapshot(input.ref, 2, { direct: true }),
          applied: true,
          replay: false,
        };
      },
    },
    wait: async () => {},
  });

  await resource.load();
  const result = await resource.mutate({
    operation: "autosave",
    payload: {
      title: "Direct",
    },
  });

  assert.equal(result.snapshot.data.direct, true);
  assert.equal(resource.getState().status, "ready");
});

test("resource snapshots and queued payloads are isolated from caller mutation", async () => {
  const ref = createRef("draft_isolated");
  const transportPayloads = [];
  let releaseFirst;
  const blockFirst = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const resource = syncCore.createSyncEngine({
    transport: {
      async load(requestRef) {
        return createSnapshot(requestRef, 4, {
          nested: {
            title: "Original",
          },
        });
      },
      async mutate(input) {
        transportPayloads.push(input.payload);
        await blockFirst;
        return {
          snapshot: createSnapshot(input.ref, input.expectedRevision + 1, {
            nested: {
              title: input.payload.nested.title,
            },
          }),
          applied: true,
          replay: false,
        };
      },
    },
    wait: async () => {},
  }).resource(ref);

  await resource.load();
  const localSnapshot = resource.getSnapshot();
  localSnapshot.data.nested.title = "Changed locally";

  assert.equal(resource.getSnapshot().data.nested.title, "Original");

  const payload = {
    nested: {
      title: "Queued",
    },
  };
  const save = resource.mutate({
    operation: "autosave",
    payload,
  });
  payload.nested.title = "Mutated after enqueue";

  releaseFirst();
  const result = await save;

  assert.equal(transportPayloads[0].nested.title, "Queued");
  assert.equal(result.snapshot.data.nested.title, "Queued");
  assert.equal(resource.getSnapshot().data.nested.title, "Queued");
});
