import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function loadJSDOM() {
  try {
    return await import("jsdom");
  } catch {
    return await import("../../../../../go-formgen/client/node_modules/jsdom/lib/api.js");
  }
}

const { JSDOM } = await loadJSDOM();

const fixtures = JSON.parse(
  await readFile(
    new URL(
      "../../../../admin/testdata/translation_exchange_contract_fixtures.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const { TranslationExchangeManager } = await import(
  "../dist/translation-exchange/index.js"
);

const originalGlobals = {
  window: globalThis.window,
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  HTMLInputElement: globalThis.HTMLInputElement,
  HTMLFormElement: globalThis.HTMLFormElement,
  HTMLSelectElement: globalThis.HTMLSelectElement,
  Event: globalThis.Event,
  CustomEvent: globalThis.CustomEvent,
  MouseEvent: globalThis.MouseEvent,
  FormData: globalThis.FormData,
  File: globalThis.File,
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
  fetch: globalThis.fetch,
  navigator: globalThis.navigator,
};

let activeDOM = null;

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.Event = win.Event;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.FormData = win.FormData;
  globalThis.File = win.File;
  globalThis.URL = win.URL;
  globalThis.URLSearchParams = win.URLSearchParams;
  globalThis.fetch = undefined;
  Object.defineProperty(globalThis, "navigator", {
    value: win.navigator,
    configurable: true,
  });
}

function setupDOM() {
  cleanupDOM();
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="translation-exchange-app"></div></body></html>',
    { url: "http://localhost/admin/translations/exchange" },
  );
  activeDOM = dom;
  setGlobals(dom.window);
  return dom.window.document.getElementById("translation-exchange-app");
}

function restoreGlobal(name, value) {
  if (typeof value === "undefined") {
    delete globalThis[name];
    return;
  }
  globalThis[name] = value;
}

function cleanupDOM() {
  if (activeDOM) {
    activeDOM.window.close();
    activeDOM = null;
  }
  restoreGlobal("window", originalGlobals.window);
  restoreGlobal("document", originalGlobals.document);
  restoreGlobal("HTMLElement", originalGlobals.HTMLElement);
  restoreGlobal("HTMLInputElement", originalGlobals.HTMLInputElement);
  restoreGlobal("HTMLFormElement", originalGlobals.HTMLFormElement);
  restoreGlobal("HTMLSelectElement", originalGlobals.HTMLSelectElement);
  restoreGlobal("Event", originalGlobals.Event);
  restoreGlobal("CustomEvent", originalGlobals.CustomEvent);
  restoreGlobal("MouseEvent", originalGlobals.MouseEvent);
  restoreGlobal("FormData", originalGlobals.FormData);
  restoreGlobal("File", originalGlobals.File);
  restoreGlobal("URL", originalGlobals.URL);
  restoreGlobal("URLSearchParams", originalGlobals.URLSearchParams);
  restoreGlobal("fetch", originalGlobals.fetch);
  if (typeof originalGlobals.navigator === "undefined") {
    delete globalThis.navigator;
  } else {
    Object.defineProperty(globalThis, "navigator", {
      value: originalGlobals.navigator,
      configurable: true,
    });
  }
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return String(name).toLowerCase() === "content-type"
          ? "application/json"
          : null;
      },
    },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitFor(assertion, attempts = 25) {
  let lastError = null;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return assertion();
    } catch (error) {
      lastError = error;
      await flush();
    }
  }
  throw lastError ?? new Error("Timed out waiting for condition");
}

test("translation exchange wizard: export step renders seeded example downloads and completed handoff", async () => {
  const root = setupDOM();
  const fetchMock = mock.fn(async (input, init = {}) => {
    const url = String(input);
    if (url.includes("/jobs")) {
      return jsonResponse(fixtures.history);
    }
    if (url.endsWith("/export")) {
      assert.equal(init.method, "POST");
      return jsonResponse(fixtures.export_completed);
    }
    throw new Error(`unexpected url ${url}`);
  });
  globalThis.fetch = fetchMock;

  try {
    const manager = new TranslationExchangeManager({
      apiPath: "/admin/api/translations/exchange",
      basePath: "/admin",
      includeExamples: true,
    });
    manager.init();
    await flush();
    await flush();

    assert.match(root.innerHTML, /Seeded Examples/i);
    assert.match(root.innerHTML, /Download export JSON/i);

    root
      .querySelector('[data-export-form="true"]')
      .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /2 rows ready for handoff/i);
      assert.match(root.innerHTML, /Latest export job/i);
      return true;
    });
    assert.ok(fetchMock.mock.calls.length >= 2);
  } finally {
    cleanupDOM();
  }
});

test("translation exchange wizard: validate step stages accept or reject decisions", async () => {
  const root = setupDOM();
  const fetchMock = mock.fn(async (input, init = {}) => {
    const url = String(input);
    if (url.includes("/jobs")) {
      return jsonResponse(fixtures.history);
    }
    if (url.endsWith("/import/validate")) {
      assert.equal(init.method, "POST");
      return jsonResponse(fixtures.validate_states.stale_source_hash);
    }
    throw new Error(`unexpected url ${url}`);
  });
  globalThis.fetch = fetchMock;

  try {
    const manager = new TranslationExchangeManager({
      apiPath: "/admin/api/translations/exchange",
      basePath: "/admin",
      includeExamples: true,
    });
    manager.init();
    await flush();
    await flush();

    root
      .querySelector('[data-exchange-step="validate"]')
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await flush();

    const fileInput = root.querySelector("#exchange-import-file");
    const file = new window.File(
      [
        JSON.stringify([
          {
            resource: "pages",
            entity_id: "page_home",
            family_id: "grp_home",
            target_locale: "es",
            field_path: "title",
            translated_text: "Inicio",
            source_hash: "hash_stale",
          },
        ]),
      ],
      "translations.json",
      { type: "application/json" },
    );
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    });
    fileInput.dispatchEvent(new window.Event("change", { bubbles: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /rows loaded and ready to validate/i);
      return true;
    });

    root
      .querySelector('[data-validate-form="true"]')
      .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /Continue to apply/i);
      assert.match(root.innerHTML, /source hash mismatch/i);
      return true;
    });

    root
      .querySelector('[data-stage-row="0"][data-stage-decision="accepted"]')
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /1 accepted, 0 rejected/i);
      return true;
    });
  } finally {
    cleanupDOM();
  }
});

test("translation exchange wizard: apply step submits explicit retry resolutions and renders terminal summary", async () => {
  const root = setupDOM();
  let applyRequestBody = null;
  let pollCount = 0;
  const fetchMock = mock.fn(async (input, init = {}) => {
    const url = String(input);
    if (url.includes("/jobs/")) {
      pollCount += 1;
      return jsonResponse({
        job:
          pollCount === 1
            ? {
                id: "txex_job_apply_running",
                kind: "import_apply",
                status: "running",
                poll_endpoint: "/admin/api/translations/exchange/jobs/txex_job_apply_running",
                progress: { total: 1, processed: 0, succeeded: 0, failed: 0 },
              }
            : fixtures.history.history.items[0],
      });
    }
    if (url.includes("/jobs")) {
      return jsonResponse(fixtures.history);
    }
    if (url.endsWith("/import/validate")) {
      return jsonResponse(fixtures.validate_states.stale_source_hash);
    }
    if (url.endsWith("/import/apply")) {
      applyRequestBody = JSON.parse(init.body);
      return jsonResponse({
        ...fixtures.validate_states.partial_success,
        job: {
          id: "txex_job_apply_running",
          kind: "import_apply",
          status: "running",
          poll_endpoint: "/admin/api/translations/exchange/jobs/txex_job_apply_running",
          progress: { total: 1, processed: 0, succeeded: 0, failed: 0 },
        },
      });
    }
    throw new Error(`unexpected url ${url}`);
  });
  globalThis.fetch = fetchMock;

  try {
    const manager = new TranslationExchangeManager({
      apiPath: "/admin/api/translations/exchange",
      basePath: "/admin",
      includeExamples: true,
    });
    manager.init();
    await flush();
    await flush();

    root
      .querySelector('[data-exchange-step="validate"]')
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await flush();

    const fileInput = root.querySelector("#exchange-import-file");
    const file = new window.File(
      [
        JSON.stringify([
          {
            resource: "pages",
            entity_id: "page_home",
            family_id: "grp_home",
            target_locale: "es",
            field_path: "title",
            translated_text: "Inicio",
            source_hash: "hash_stale",
          },
        ]),
      ],
      "translations.json",
      { type: "application/json" },
    );
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    });
    fileInput.dispatchEvent(new window.Event("change", { bubbles: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /rows loaded and ready to validate/i);
      return true;
    });

    root
      .querySelector('[data-validate-form="true"]')
      .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /source hash mismatch/i);
      return true;
    });

    root
      .querySelector('[data-exchange-step="apply"]')
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await flush();

    root
      .querySelector('[data-apply-row="0"][data-apply-decision="override_source_hash"]')
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await flush();

    root
      .querySelector('[data-apply-form="true"]')
      .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /Terminal Summary/i);
      return true;
    }, 40);

    assert.equal(applyRequestBody.rows.length, 1);
    assert.deepEqual(applyRequestBody.resolutions, [
      { row: 0, decision: "override_source_hash" },
    ]);
  } finally {
    cleanupDOM();
  }
});

test("translation exchange wizard: history detail can load retained conflicts into apply step", async () => {
  const root = setupDOM();
  const fetchMock = mock.fn(async (input) => {
    const url = String(input);
    if (url.includes("/jobs")) {
      return jsonResponse(fixtures.history);
    }
    throw new Error(`unexpected url ${url}`);
  });
  globalThis.fetch = fetchMock;

  try {
    const manager = new TranslationExchangeManager({
      apiPath: "/admin/api/translations/exchange",
      basePath: "/admin",
      includeExamples: true,
    });
    manager.init();
    await flush();
    await flush();

    root
      .querySelector('[data-exchange-step="history"]')
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /Retry conflicts/i);
      return true;
    });

    root
      .querySelector('[data-history-job="txex_job_fixture_validate"]')
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await flush();

    root
      .querySelector('[data-history-load-apply="conflicts"]')
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => {
      assert.match(root.innerHTML, /Retry source: txex_job_fixture_validate/i);
      assert.match(root.innerHTML, /override source/i);
      return true;
    });
  } finally {
    cleanupDOM();
  }
});

test("translation exchange wizard: shared apply helpers emit analytics and poll running jobs", async () => {
  setupDOM();
  const analytics = [];
  window.addEventListener("translation:exchange-analytics", (event) => {
    analytics.push(event.detail);
  });
  let pollCount = 0;
  const fetchMock = mock.fn(async (input, init = {}) => {
    const url = String(input);
    if (url.includes("/jobs/")) {
      pollCount += 1;
      return jsonResponse({
        job:
          pollCount === 1
            ? {
                id: "txex_job_apply_running",
                kind: "import_apply",
                status: "running",
                poll_endpoint: "/admin/api/translations/exchange/jobs/txex_job_apply_running",
                progress: { total: 1, processed: 0, succeeded: 0, failed: 0 },
              }
            : fixtures.history.history.items[0],
      });
    }
    if (url.includes("/jobs")) {
      return jsonResponse(fixtures.history);
    }
    if (url.endsWith("/import/apply")) {
      assert.equal(init.method, "POST");
      return jsonResponse({
        ...fixtures.validate_states.partial_success,
        job: {
          id: "txex_job_apply_running",
          kind: "import_apply",
          status: "running",
          poll_endpoint: "/admin/api/translations/exchange/jobs/txex_job_apply_running",
          progress: { total: 1, processed: 0, succeeded: 0, failed: 0 },
        },
        meta: {
          request_hash: "apply-request-hash",
        },
      });
    }
    throw new Error(`unexpected url ${url}`);
  });
  globalThis.fetch = fetchMock;

  try {
    const manager = new TranslationExchangeManager({
      apiPath: "/admin/api/translations/exchange",
      basePath: "/admin",
      includeExamples: true,
    });

    const request = manager.buildApplyRequest(
      [
        {
          resource: "pages",
          entity_id: "page_home",
          family_id: "grp_home",
          target_locale: "fr",
          field_path: "title",
          translated_text: "Accueil",
        },
      ],
      {
        allow_create_missing: false,
        allow_source_hash_override: true,
        continue_on_error: true,
        dry_run: false,
        retry_job_id: "txex_job_previous",
        resolutions: [
          { row: 0, decision: "override_source_hash", conflict_type: "stale_source_hash" },
        ],
      },
    );
    const response = await manager.applyImport(request);
    assert.equal(response.job.status, "running");
    const job = await manager.pollJobUntilTerminal(response.job, {
      intervalMs: 0,
      timeoutMs: 1000,
    });
    assert.equal(job.status, "completed");
    assert.equal(job.retention.hard_delete_supported, true);
    assert.ok(
      analytics.some((entry) => entry.name === "exchange_apply_start"),
      "expected apply start analytics event",
    );
    assert.ok(
      analytics.some((entry) => entry.name === "exchange_conflict_resolved"),
      "expected conflict resolution analytics event",
    );
    assert.ok(
      analytics.some((entry) => entry.name === "exchange_apply_retry"),
      "expected retry analytics event",
    );
    assert.ok(
      analytics.some((entry) => entry.name === "exchange_apply_completion"),
      "expected apply completion analytics event",
    );
  } finally {
    cleanupDOM();
  }
});
