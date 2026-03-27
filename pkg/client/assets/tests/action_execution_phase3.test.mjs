import test from 'node:test';
import assert from 'node:assert/strict';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

const { ActionRenderer, PayloadInputModal, handleDelete } = await importDatatableModule();

test('legacy handleDelete refreshes and renders structured backend errors', async () => {
  const originalFetch = globalThis.fetch;
  const grid = {
    config: { apiEndpoint: '/admin/api/panels/pages' },
    lastError: '',
    refreshCalls: 0,
    async confirmAction() {
      return true;
    },
    async refresh() {
      this.refreshCalls += 1;
    },
    showError(message) {
      this.lastError = message;
    },
  };

  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      error: {
        text_code: 'RESOURCE_IN_USE',
        message: 'Document cannot be deleted while attached to agreements',
        metadata: { id: 'page_123' },
      },
    }), { status: 409, headers: { 'Content-Type': 'application/json' } });

    await handleDelete(grid, 'page_123');

    assert.equal(grid.refreshCalls, 1);
    assert.equal(grid.lastError, 'RESOURCE_IN_USE: Document cannot be deleted while attached to agreements');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('bulk action executor surfaces structured backend messages', async () => {
  const originalFetch = globalThis.fetch;
  const notifier = {
    errors: [],
    successes: [],
    async confirm() {
      return true;
    },
    error(message) {
      this.errors.push(message);
    },
    success(message) {
      this.successes.push(message);
    },
  };

  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      error: {
        text_code: 'INVALID_SELECTION',
        message: 'Some selected records cannot be deleted',
        metadata: { field: 'ids' },
      },
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const renderer = new ActionRenderer({ notifier });
    await assert.rejects(
      () => renderer.executeBulkAction({
        id: 'delete',
        label: 'Delete',
        endpoint: '/admin/api/panels/pages/bulk/delete',
      }, ['a1', 'a2']),
      /INVALID_SELECTION: Some selected records cannot be deleted/
    );

    assert.deepEqual(notifier.errors, ['INVALID_SELECTION: Some selected records cannot be deleted']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('bulk action executor prompts through the shared payload modal for missing required fields', async () => {
  const originalFetch = globalThis.fetch;
  const originalPrompt = PayloadInputModal.prompt;
  const promptCalls = [];
  const fetchBodies = [];
  const notifier = {
    successes: [],
    errors: [],
    async confirm() {
      return true;
    },
    success(message) {
      this.successes.push(message);
    },
    error(message) {
      this.errors.push(message);
    },
  };

  try {
    PayloadInputModal.prompt = async (config) => {
      promptCalls.push(config);
      return { mode: 'hard' };
    };
    globalThis.fetch = async (input, init) => {
      fetchBodies.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const renderer = new ActionRenderer({ notifier });
    await renderer.executeBulkAction(
      {
        id: 'purge',
        label: 'Purge',
        endpoint: '/admin/api/panels/pages/bulk/purge',
        payloadRequired: ['mode'],
        payloadSchema: {
          type: 'object',
          required: ['mode'],
          properties: {
            mode: {
              type: 'string',
              title: 'Purge mode',
              description: 'Select how aggressively to purge.',
              enum: ['soft', 'hard'],
            },
          },
        },
      },
      ['row_1', 'row_2']
    );

    assert.equal(promptCalls.length, 1);
    assert.equal(promptCalls[0].title, 'Complete Purge');
    assert.deepEqual(promptCalls[0].fields, [
      {
        name: 'mode',
        label: 'Purge mode',
        description: 'Select how aggressively to purge.',
        value: '',
        type: 'string',
        options: [
          { value: 'soft', label: 'soft' },
          { value: 'hard', label: 'hard' },
        ],
      },
    ]);
    assert.deepEqual(fetchBodies, [
      {
        ids: ['row_1', 'row_2'],
        mode: 'hard',
      },
    ]);
    assert.deepEqual(notifier.errors, []);
  } finally {
    globalThis.fetch = originalFetch;
    PayloadInputModal.prompt = originalPrompt;
  }
});
