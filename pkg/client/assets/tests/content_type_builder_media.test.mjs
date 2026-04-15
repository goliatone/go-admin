import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });

globalThis.window = bootstrapDom.window;
globalThis.document = bootstrapDom.window.document;
globalThis.Node = bootstrapDom.window.Node;
globalThis.Element = bootstrapDom.window.Element;
globalThis.HTMLElement = bootstrapDom.window.HTMLElement;
globalThis.HTMLInputElement = bootstrapDom.window.HTMLInputElement;
globalThis.HTMLSelectElement = bootstrapDom.window.HTMLSelectElement;
globalThis.HTMLTextAreaElement = bootstrapDom.window.HTMLTextAreaElement;
globalThis.HTMLTemplateElement = bootstrapDom.window.HTMLTemplateElement;
globalThis.Event = bootstrapDom.window.Event;
globalThis.MouseEvent = bootstrapDom.window.MouseEvent;
globalThis.KeyboardEvent = bootstrapDom.window.KeyboardEvent;
globalThis.CustomEvent = bootstrapDom.window.CustomEvent;
globalThis.MutationObserver = bootstrapDom.window.MutationObserver;
globalThis.FormData = bootstrapDom.window.FormData;

const { schemaToFields, fieldsToSchema } = await import('../dist/content-type-builder/index.js');

test('schemaToFields/fieldsToSchema preserves media picker value mode and endpoints', () => {
  const inputSchema = {
    type: 'object',
    properties: {
      hero: {
        type: 'string',
        format: 'uuid',
        'x-formgen': {
          widget: 'media-picker',
          componentOptions: {
            valueMode: 'id',
            libraryPath: '/admin/api/media/library',
            itemEndpoint: '/admin/api/media/library/:id',
            capabilitiesEndpoint: '/admin/api/media/capabilities',
            acceptedKinds: ['image'],
          },
        },
        'x-admin': {
          media: {
            libraryPath: '/admin/api/media/library',
            itemPath: '/admin/api/media/library/:id',
            capabilitiesPath: '/admin/api/media/capabilities',
          },
        },
      },
      gallery: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        'x-formgen': {
          widget: 'media-picker',
          componentOptions: {
            valueMode: 'id',
            multiple: true,
            acceptedKinds: ['image', 'video'],
          },
        },
      },
    },
  };

  const fields = schemaToFields(inputSchema);
  assert.equal(fields[0].type, 'media-picker');
  assert.equal(fields[0].config.valueMode, 'id');
  assert.deepEqual(fields[0].config.acceptedKinds, ['image']);
  assert.equal(fields[1].type, 'media-gallery');
  assert.equal(fields[1].config.valueMode, 'id');
  assert.equal(fields[1].config.multiple, true);

  const rebuilt = fieldsToSchema(fields, 'page');
  assert.equal(rebuilt.properties.hero.format, 'uuid');
  assert.equal(rebuilt.properties.hero['x-formgen'].componentOptions.valueMode, 'id');
  assert.equal(rebuilt.properties.hero['x-formgen'].componentOptions.itemEndpoint, '/admin/api/media/library/:id');
  assert.deepEqual(rebuilt.properties.hero['x-formgen'].componentOptions.acceptedKinds, ['image']);
  assert.equal(rebuilt.properties.gallery.items.format, 'uuid');
  assert.equal(rebuilt.properties.gallery['x-formgen'].componentOptions.multiple, true);
  assert.deepEqual(rebuilt.properties.gallery['x-formgen'].componentOptions.acceptedKinds, ['image', 'video']);
});
