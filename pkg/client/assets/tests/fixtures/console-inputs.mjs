// Representative operator-console contract inputs (shared-runtime DESIGN):
// empty allowed panel, populated table/action, malformed schema with safe
// fallback, read-only panel, denied panel, two roots with the same panel ID,
// missed-event sequence, revoked actor and disposed host. Shapes follow the Go
// `console` package contracts (identity, record envelopes, urls).

export const identity = Object.freeze({
  console_id: 'data',
  application_id: 'crm',
  environment_id: 'staging',
  actor_id: 'operator-1',
  scope_key: 'synthetic-org',
});

export function identityFor(overrides = {}) {
  return { ...identity, ...overrides };
}

/** Populated table with a typed action form. */
export const operationsPanel = Object.freeze({
  id: 'operations',
  label: 'Operations',
  snapshot_key: 'operations',
  supports_toolbar: false,
  ui: {
    schema_version: '1',
    views: {
      console: {
        renderer: 'table',
        title: 'Operations',
        options: {
          key_bind: 'id',
          columns: [
            { label: 'Operation', bind: 'name' },
            { label: 'State', bind: 'state' },
          ],
        },
      },
    },
    filters: [{ id: 'state', label: 'State', kind: 'select', bind: 'state', options: ['running', 'succeeded'] }],
    actions: [
      {
        id: 'preview',
        label: 'Preview dataset',
        submit_label: 'Run preview',
        fields: [
          {
            name: 'dataset',
            label: 'Dataset',
            kind: 'select',
            required: true,
            option_items: [{ value: 'baseline', label: 'Baseline' }],
          },
        ],
      },
    ],
  },
});

/** Allowed panel with no records. */
export const targetsPanel = Object.freeze({
  id: 'targets',
  label: 'Targets',
  snapshot_key: 'targets',
  supports_toolbar: false,
  ui: { schema_version: '1', views: { console: { renderer: 'status_list', title: 'Targets' } } },
});

/** Read-only panel: no declared actions. */
export const auditPanel = Object.freeze({
  id: 'audit',
  label: 'Audit',
  snapshot_key: 'audit',
  supports_toolbar: false,
  ui: { schema_version: '1', views: { console: { renderer: 'timeline', title: 'Audit' } } },
});

/** Unsupported schema version and renderer: must degrade to escaped JSON. */
export const brokenPanel = Object.freeze({
  id: 'broken',
  label: 'Broken',
  snapshot_key: 'broken',
  supports_toolbar: false,
  ui: { schema_version: '9', views: { console: { renderer: 'mystery' } } },
});

export function operationRecord(overrides = {}) {
  return {
    record_key: 'op-1',
    revision: 3,
    data: { id: 'op-1', name: 'Seed <baseline>', state: 'running' },
    ...overrides,
  };
}

export function snapshot(overrides = {}) {
  const { panels, ...rest } = overrides;
  return {
    ...identity,
    watermark: 21,
    panels: panels || [
      { ...operationsPanel, records: [operationRecord()] },
      { ...targetsPanel, records: [] },
      {
        ...auditPanel,
        records: [{ record_key: 'a-1', revision: 1, data: { timestamp: '2026-10-01T10:00:00Z', message: 'Reset requested', level: 'info' } }],
      },
      { ...brokenPanel, records: [{ record_key: 'payload', revision: 1, data: { raw: '<script>alert(1)</script>' } }] },
    ],
    ...rest,
  };
}

export function event(overrides = {}) {
  return {
    ...identity,
    panel_id: 'operations',
    record_key: 'op-1',
    revision: 4,
    sequence: 22,
    kind: 'upsert',
    data: { id: 'op-1', name: 'Seed <baseline>', state: 'succeeded' },
    ...overrides,
  };
}

export const urls = Object.freeze({
  page: '/admin/data',
  panels: '/admin/data/api/panels',
  snapshot: '/admin/data/api/snapshot',
  actions: '/admin/data/api/panels/{panel_id}/actions/{action_id}',
  preferences: '/admin/data/api/preferences',
  live: '/admin/data/ws',
  lookup: '/admin/data/api/panels/{panel_id}/records/{record_key}',
});

export function bootstrap(overrides = {}) {
  const id = { ...identity, ...(overrides.identity || {}) };
  const { identity: _identity, ...rest } = overrides;
  return {
    ...id,
    title: 'Data operations',
    urls: { ...urls },
    preferences_namespace: JSON.stringify(id),
    snapshot: snapshot({ ...id }),
    ...rest,
  };
}
