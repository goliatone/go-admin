import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const distEntry = pathToFileURL(resolve(packageRoot, "dist", "index.js")).href;
const syncCore = await import(distEntry);

const expectedValueExports = [
  "DEFAULT_RETRY_POLICY",
  "SYNC_CORE_PACKAGE_NAME",
  "SYNC_CORE_PACKAGE_VERSION",
  "createFetchSyncTransport",
  "createInMemoryCache",
  "createRefreshPolicy",
  "createResourceKey",
  "createSyncEngine",
  "createSyncResource",
  "isSyncEnvelopeError",
  "normalizeSyncError",
  "parseErrorEnvelope",
  "parseMutationEnvelope",
  "parseReadEnvelope",
];

test("sync-core dist entrypoint exposes only the documented public runtime API", () => {
  assert.deepEqual(Object.keys(syncCore).sort(), expectedValueExports);
});

test("sync-core runtime metadata matches package manifest", () => {
  const pkg = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
  assert.equal(syncCore.SYNC_CORE_PACKAGE_NAME, pkg.name);
  assert.equal(syncCore.SYNC_CORE_PACKAGE_VERSION, pkg.version);
});

test("sync-core public entrypoint composes the documented runtime factories", async () => {
  const transport = {
    async load(ref) {
      return {
        ref,
        data: { id: ref.id, status: "draft" },
        revision: 3,
        updatedAt: "2026-03-12T18:00:00Z",
      };
    },
    async mutate(input) {
      return {
        snapshot: {
          ref: input.ref,
          data: { id: input.ref.id, status: "draft", operation: input.operation },
          revision: 4,
          updatedAt: "2026-03-12T18:00:01Z",
        },
        applied: true,
        replay: false,
      };
    },
  };
  const ref = { kind: "agreement_draft", id: "draft_123", scope: { tenant: "tenant_1" } };
  const resource = syncCore.createSyncResource({ ref, transport, wait: async () => {} });

  const snapshot = await resource.load();
  const mutation = await resource.mutate({
    operation: "autosave",
    payload: { title: "Hello" },
  });

  assert.equal(syncCore.createResourceKey(ref), "agreement_draft::draft_123::tenant=tenant_1");
  assert.equal(snapshot.revision, 3);
  assert.equal(mutation.snapshot.revision, 4);
  assert.equal(resource.getState().status, "ready");
});
