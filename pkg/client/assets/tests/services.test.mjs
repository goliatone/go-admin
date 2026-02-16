import test from 'node:test';
import assert from 'node:assert/strict';

// Import services module from the dist output
// Note: Requires `npm run build` to be run first
const {
  // Query State
  QueryStateManager,
  debounce,
  buildSearchParams,
  parseSearchParams,

  // Permissions
  ServicesPermissionManager,
  createPermissionGuard,
  requireAll,
  requireAny,
  combineGuards,
  isForbiddenError,

  // Activity Labels
  initActivityLabels,
  getActionLabel,
  getActionEntry,
  getAllActionLabels,
  getActionsByCategory,
  resetActivityLabels,
  createActionLabelResolver,
  DEFAULT_ACTION_LABELS,

  // Deep Links
  configureDeepLinks,
  generateDeepLink,
  generateListLink,
  parseDeepLink,
  mapObjectTypeToEntity,
  createNavigationContext,

  // Mutation Feedback
  MutationButtonManager,
  ActionQueue,
  getServiceConfirmConfig,
} = await import('../dist/services/index.js');

// =============================================================================
// QueryStateManager Tests
// =============================================================================

test('QueryStateManager initializes with default state', () => {
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 25,
      onChange: () => {},
    },
    filterFields: ['provider_id', 'status'],
  });

  const state = manager.getState();

  assert.equal(state.page, 1);
  assert.equal(state.per_page, 25);
  assert.equal(state.search, '');
  assert.ok(state.filters);
});

test('QueryStateManager setFilter updates filter value', () => {
  let changeCount = 0;
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 25,
      onChange: () => { changeCount++; },
    },
    filterFields: ['provider_id', 'status'],
  });

  manager.setFilter('provider_id', 'google');
  const state = manager.getState();

  assert.equal(state.filters.provider_id, 'google');
  assert.equal(changeCount, 1);
});

test('QueryStateManager setSearch updates search query', () => {
  let changeCount = 0;
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 25,
      onChange: () => { changeCount++; },
    },
    filterFields: [],
  });

  manager.setSearch('test query');
  const state = manager.getState();

  assert.equal(state.search, 'test query');
});

test('QueryStateManager pagination: nextPage and prevPage', () => {
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 10,
      onChange: () => {},
    },
    filterFields: [],
  });

  // Simulate response that indicates more pages
  manager.updateFromResponse(100, true);

  manager.nextPage();
  assert.equal(manager.getState().page, 2);

  manager.nextPage();
  assert.equal(manager.getState().page, 3);

  manager.prevPage();
  assert.equal(manager.getState().page, 2);

  manager.prevPage();
  assert.equal(manager.getState().page, 1);

  // Can't go below page 1
  manager.prevPage();
  assert.equal(manager.getState().page, 1);
});

test('QueryStateManager setPage jumps to specific page', () => {
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 10,
      onChange: () => {},
    },
    filterFields: [],
  });

  manager.updateFromResponse(100, true);
  manager.setPage(5);

  assert.equal(manager.getState().page, 5);
});

test('QueryStateManager reset clears all filters and pagination', () => {
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 10,
      onChange: () => {},
    },
    filterFields: ['provider_id', 'status'],
  });

  manager.setFilter('provider_id', 'google');
  manager.setFilter('status', 'active');
  manager.setSearch('test');
  manager.setPage(5);

  manager.reset();
  const state = manager.getState();

  assert.equal(state.page, 1);
  assert.equal(state.search, '');
  assert.equal(state.filters.provider_id, undefined);
  assert.equal(state.filters.status, undefined);
});

test('QueryStateManager getActiveFilterCount returns correct count', () => {
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 10,
      onChange: () => {},
    },
    filterFields: ['provider_id', 'status', 'scope_type'],
  });

  assert.equal(manager.getActiveFilterCount(), 0);

  manager.setFilter('provider_id', 'google');
  assert.equal(manager.getActiveFilterCount(), 1);

  manager.setFilter('status', 'active');
  assert.equal(manager.getActiveFilterCount(), 2);

  manager.setFilter('status', undefined);
  assert.equal(manager.getActiveFilterCount(), 1);
});

test('QueryStateManager getQueryParams returns API-ready params', () => {
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 25,
      onChange: () => {},
    },
    filterFields: ['provider_id', 'status'],
  });

  manager.setFilter('provider_id', 'google');
  manager.setSearch('test');
  manager.setPage(2);

  const params = manager.getQueryParams();

  assert.equal(params.provider_id, 'google');
  assert.equal(params.q, 'test');
  assert.equal(params.page, 2);
  assert.equal(params.per_page, 25);
});

// =============================================================================
// buildSearchParams / parseSearchParams Tests
// =============================================================================

test('buildSearchParams creates URLSearchParams from object', () => {
  const params = buildSearchParams({
    provider_id: 'google',
    status: 'active',
    page: 2,
    empty: undefined,
    nullVal: null,
  });

  assert.equal(params.get('provider_id'), 'google');
  assert.equal(params.get('status'), 'active');
  assert.equal(params.get('page'), '2');
  assert.equal(params.has('empty'), false);
  assert.equal(params.has('nullVal'), false);
});

test('parseSearchParams parses URLSearchParams into object', () => {
  const urlParams = new URLSearchParams('provider_id=google&status=active&page=2');
  const parsed = parseSearchParams(urlParams, ['provider_id', 'status']);

  assert.equal(parsed.provider_id, 'google');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.page, '2');
});

// =============================================================================
// Permissions Tests
// =============================================================================

test('ServicesPermissionManager initializes with no permissions', () => {
  const manager = new ServicesPermissionManager();

  assert.equal(manager.can('admin.services.view'), false);
  assert.equal(manager.can('admin.services.connect'), false);
});

test('ServicesPermissionManager setPermissions updates state', () => {
  const manager = new ServicesPermissionManager();
  manager.setPermissions(['admin.services.view', 'admin.services.connect']);

  assert.equal(manager.can('admin.services.view'), true);
  assert.equal(manager.can('admin.services.connect'), true);
  assert.equal(manager.can('admin.services.revoke'), false);
});

test('ServicesPermissionManager canAll requires all permissions', () => {
  const manager = new ServicesPermissionManager();
  manager.setPermissions(['admin.services.view', 'admin.services.connect']);

  assert.equal(manager.canAll(['admin.services.view']), true);
  assert.equal(manager.canAll(['admin.services.view', 'admin.services.connect']), true);
  assert.equal(manager.canAll(['admin.services.view', 'admin.services.revoke']), false);
});

test('ServicesPermissionManager canAny requires at least one permission', () => {
  const manager = new ServicesPermissionManager();
  manager.setPermissions(['admin.services.view']);

  assert.equal(manager.canAny(['admin.services.view', 'admin.services.connect']), true);
  assert.equal(manager.canAny(['admin.services.revoke', 'admin.services.edit']), false);
});

test('createPermissionGuard creates guard function', () => {
  const manager = new ServicesPermissionManager();
  manager.setPermissions(['admin.services.view']);

  const guard = createPermissionGuard(['admin.services.view']);

  assert.equal(guard(manager)(), true);
});

test('requireAll creates combined guard requiring all permissions', () => {
  const manager = new ServicesPermissionManager();
  manager.setPermissions(['admin.services.view', 'admin.services.connect']);

  const guard = requireAll(['admin.services.view', 'admin.services.connect']);

  assert.equal(guard(manager)(), true);
});

test('requireAny creates combined guard requiring any permission', () => {
  const manager = new ServicesPermissionManager();
  manager.setPermissions(['admin.services.view']);

  const guard = requireAny(['admin.services.view', 'admin.services.revoke']);

  assert.equal(guard(manager)(), true);
});

test('combineGuards combines multiple guards', () => {
  const manager = new ServicesPermissionManager();
  manager.setPermissions(['admin.services.view', 'admin.services.connect']);

  const guard1 = createPermissionGuard(['admin.services.view']);
  const guard2 = createPermissionGuard(['admin.services.connect']);
  const combined = combineGuards([guard1, guard2]);

  assert.equal(combined(manager)(), true);
});

test('isForbiddenError detects 403 errors', () => {
  const forbiddenError = { statusCode: 403, code: 'FORBIDDEN' };
  const notFoundError = { statusCode: 404, code: 'NOT_FOUND' };

  assert.equal(isForbiddenError(forbiddenError), true);
  assert.equal(isForbiddenError(notFoundError), false);
});

// =============================================================================
// Activity Labels Tests
// =============================================================================

test('Activity labels: getActionLabel returns default label', () => {
  resetActivityLabels();
  initActivityLabels();

  assert.equal(getActionLabel('connected'), 'Connected');
  assert.equal(getActionLabel('sync_started'), 'Sync Started');
  assert.equal(getActionLabel('webhook_received'), 'Webhook Received');
});

test('Activity labels: getActionLabel formats unknown actions', () => {
  resetActivityLabels();
  initActivityLabels();

  // Unknown actions should be formatted from snake_case to Title Case
  assert.equal(getActionLabel('custom_action'), 'Custom Action');
  assert.equal(getActionLabel('another_custom_event'), 'Another Custom Event');
});

test('Activity labels: initActivityLabels accepts backend overrides', () => {
  resetActivityLabels();
  initActivityLabels({
    labels: {
      connected: 'Service Connected',
      sync_started: 'Sync Initiated',
    },
  });

  assert.equal(getActionLabel('connected'), 'Service Connected');
  assert.equal(getActionLabel('sync_started'), 'Sync Initiated');
  // Non-overridden should still work
  assert.equal(getActionLabel('disconnected'), 'Disconnected');
});

test('Activity labels: getActionEntry returns full entry', () => {
  resetActivityLabels();
  initActivityLabels();

  const entry = getActionEntry('connected');

  assert.ok(entry);
  assert.equal(entry.action, 'connected');
  assert.equal(entry.label, 'Connected');
  assert.ok(entry.description);
  assert.equal(entry.category, 'connections');
});

test('Activity labels: getActionEntry returns null for unknown actions', () => {
  resetActivityLabels();
  initActivityLabels();

  const entry = getActionEntry('unknown_action');

  assert.equal(entry, null);
});

test('Activity labels: getAllActionLabels returns all labels as map', () => {
  resetActivityLabels();
  initActivityLabels();

  const labels = getAllActionLabels();

  assert.ok(labels.connected);
  assert.ok(labels.disconnected);
  assert.ok(labels.sync_started);
  assert.ok(labels.webhook_received);
});

test('Activity labels: getActionsByCategory returns grouped actions', () => {
  resetActivityLabels();
  initActivityLabels();

  const categories = getActionsByCategory();

  assert.ok(categories.connections);
  assert.ok(categories.sync);
  assert.ok(categories.webhooks);

  // Check connections category has relevant actions
  const connectionActions = categories.connections.map(e => e.action);
  assert.ok(connectionActions.includes('connected'));
  assert.ok(connectionActions.includes('disconnected'));
});

test('Activity labels: createActionLabelResolver with overrides', () => {
  resetActivityLabels();
  initActivityLabels();

  const resolver = createActionLabelResolver({
    connected: 'Custom Connected Label',
  });

  assert.equal(resolver('connected'), 'Custom Connected Label');
  assert.equal(resolver('disconnected'), 'Disconnected'); // Falls back to registry
});

test('Activity labels: DEFAULT_ACTION_LABELS has expected structure', () => {
  assert.ok(DEFAULT_ACTION_LABELS.connected);
  assert.equal(DEFAULT_ACTION_LABELS.connected.action, 'connected');
  assert.equal(DEFAULT_ACTION_LABELS.connected.label, 'Connected');
  assert.ok(DEFAULT_ACTION_LABELS.connected.description);
  assert.ok(DEFAULT_ACTION_LABELS.connected.category);
});

// =============================================================================
// Deep Links Tests
// =============================================================================

test('Deep links: generateDeepLink creates entity URL', () => {
  configureDeepLinks({ basePath: '/admin/services' });

  const url = generateDeepLink('connection', 'conn_123');

  assert.ok(url.includes('/admin/services/connections/conn_123'));
});

test('Deep links: generateDeepLink includes context when provided', () => {
  configureDeepLinks({ basePath: '/admin/services' });

  const context = {
    fromPage: '/admin/services/activity',
    filters: { provider_id: 'google' },
    page: 2,
  };
  const url = generateDeepLink('connection', 'conn_123', context);

  assert.ok(url.includes('/admin/services/connections/conn_123'));
  assert.ok(url.includes('ctx='));
});

test('Deep links: generateListLink creates list URL', () => {
  configureDeepLinks({ basePath: '/admin/services' });

  const url = generateListLink('connection');

  assert.ok(url.includes('/admin/services/connections'));
});

test('Deep links: generateListLink includes filters', () => {
  configureDeepLinks({ basePath: '/admin/services' });

  const url = generateListLink('connection', { provider_id: 'google', status: 'active' });

  assert.ok(url.includes('provider_id=google'));
  assert.ok(url.includes('status=active'));
});

test('Deep links: parseDeepLink extracts entity info', () => {
  configureDeepLinks({ basePath: '/admin/services' });

  const parsed = parseDeepLink('/admin/services/connections/conn_123');

  assert.ok(parsed);
  assert.equal(parsed.entityType, 'connection');
  assert.equal(parsed.entityId, 'conn_123');
});

test('Deep links: parseDeepLink returns null for invalid URLs', () => {
  configureDeepLinks({ basePath: '/admin/services' });

  const parsed = parseDeepLink('/admin/other/path');

  assert.equal(parsed, null);
});

test('Deep links: mapObjectTypeToEntity maps activity object types', () => {
  assert.equal(mapObjectTypeToEntity('connection'), 'connection');
  assert.equal(mapObjectTypeToEntity('connections'), 'connection');
  assert.equal(mapObjectTypeToEntity('installation'), 'installation');
  assert.equal(mapObjectTypeToEntity('sync'), 'sync');
  assert.equal(mapObjectTypeToEntity('sync_job'), 'sync');
  assert.equal(mapObjectTypeToEntity('unknown'), null);
});

test('Deep links: createNavigationContext creates context object', () => {
  const queryState = {
    filters: { provider_id: 'google', status: undefined },
    search: 'test',
    page: 2,
  };

  const context = createNavigationContext(queryState, 'timeline');

  assert.ok(context.filters);
  assert.equal(context.filters.provider_id, 'google');
  assert.equal(context.search, 'test');
  assert.equal(context.page, 2);
  assert.equal(context.viewMode, 'timeline');
});

// =============================================================================
// ActionQueue Tests
// =============================================================================

test('ActionQueue: isInFlight tracks in-flight actions', async () => {
  const queue = new ActionQueue();

  assert.equal(queue.isInFlight('test'), false);

  const promise = queue.execute('test', async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return 'result';
  });

  assert.equal(queue.isInFlight('test'), true);

  await promise;

  assert.equal(queue.isInFlight('test'), false);
});

test('ActionQueue: execute returns result', async () => {
  const queue = new ActionQueue();

  const result = await queue.execute('test', async () => 'result');

  assert.equal(result, 'result');
});

test('ActionQueue: execute returns undefined for duplicate submissions', async () => {
  const queue = new ActionQueue();

  // Start first execution
  const promise1 = queue.execute('test', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return 'first';
  });

  // Try duplicate - should return undefined immediately
  const result2 = await queue.execute('test', async () => 'second');

  assert.equal(result2, undefined);

  const result1 = await promise1;
  assert.equal(result1, 'first');
});

test('ActionQueue: clear removes all in-flight tracking', async () => {
  const queue = new ActionQueue();

  queue.execute('test1', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  queue.execute('test2', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  assert.equal(queue.isInFlight('test1'), true);
  assert.equal(queue.isInFlight('test2'), true);

  queue.clear();

  assert.equal(queue.isInFlight('test1'), false);
  assert.equal(queue.isInFlight('test2'), false);
});

// =============================================================================
// Service Confirm Config Tests
// =============================================================================

test('getServiceConfirmConfig generates revoke confirmation', () => {
  const config = getServiceConfirmConfig({
    action: 'revoke',
    resourceType: 'connection',
    resourceName: 'Google Drive',
  });

  assert.ok(config.message.includes('revoke'));
  assert.ok(config.message.includes('Google Drive'));
  assert.equal(config.options.variant, 'danger');
  assert.equal(config.options.confirmText, 'Revoke');
});

test('getServiceConfirmConfig generates disconnect confirmation', () => {
  const config = getServiceConfirmConfig({
    action: 'disconnect',
    resourceType: 'connection',
  });

  assert.ok(config.message.includes('disconnect'));
  assert.equal(config.options.variant, 'danger');
});

test('getServiceConfirmConfig generates refresh confirmation', () => {
  const config = getServiceConfirmConfig({
    action: 'refresh',
    resourceType: 'connection',
  });

  assert.ok(config.message.includes('refresh'));
  assert.equal(config.options.variant, 'primary');
});

test('getServiceConfirmConfig generates uninstall confirmation', () => {
  const config = getServiceConfirmConfig({
    action: 'uninstall',
    resourceType: 'installation',
    resourceName: 'Slack',
  });

  assert.ok(config.message.includes('uninstall'));
  assert.ok(config.message.includes('Slack'));
  assert.equal(config.options.variant, 'danger');
});

test('getServiceConfirmConfig generates cancel confirmation', () => {
  const config = getServiceConfirmConfig({
    action: 'cancel',
    resourceType: 'subscription',
  });

  assert.ok(config.message.includes('cancel'));
  assert.equal(config.options.variant, 'danger');
});

test('getServiceConfirmConfig includes additional context', () => {
  const config = getServiceConfirmConfig({
    action: 'revoke',
    resourceType: 'connection',
    additionalContext: 'All associated data will be removed.',
  });

  assert.ok(config.message.includes('All associated data will be removed.'));
});

// =============================================================================
// Debounce Tests
// =============================================================================

test('debounce delays function execution', async () => {
  let callCount = 0;
  const fn = debounce(() => { callCount++; }, 50);

  fn();
  fn();
  fn();

  assert.equal(callCount, 0);

  await new Promise(resolve => setTimeout(resolve, 100));

  assert.equal(callCount, 1);
});

test('debounce cancels previous calls', async () => {
  const results = [];
  const fn = debounce((value) => { results.push(value); }, 30);

  fn('a');
  await new Promise(resolve => setTimeout(resolve, 10));
  fn('b');
  await new Promise(resolve => setTimeout(resolve, 10));
  fn('c');

  await new Promise(resolve => setTimeout(resolve, 50));

  assert.deepEqual(results, ['c']);
});

// =============================================================================
// Role-Based Visibility Tests
// =============================================================================

test('Permission guards can be chained for role-based visibility', () => {
  const manager = new ServicesPermissionManager();

  // Simulate admin user
  manager.setPermissions([
    'admin.services.view',
    'admin.services.connect',
    'admin.services.edit',
    'admin.services.revoke',
  ]);

  const canViewAndEdit = combineGuards([
    createPermissionGuard(['admin.services.view']),
    createPermissionGuard(['admin.services.edit']),
  ]);

  assert.equal(canViewAndEdit(manager)(), true);

  // Simulate read-only user
  manager.setPermissions(['admin.services.view']);

  assert.equal(canViewAndEdit(manager)(), false);
});

test('Permission guards support conditional UI rendering logic', () => {
  const manager = new ServicesPermissionManager();

  // Define what elements should be visible based on permissions
  const visibilityConfig = {
    connectButton: createPermissionGuard(['admin.services.connect']),
    revokeButton: createPermissionGuard(['admin.services.revoke']),
    refreshButton: createPermissionGuard(['admin.services.edit']),
    viewActivity: createPermissionGuard(['admin.services.activity.view']),
  };

  // Test as admin
  manager.setPermissions([
    'admin.services.view',
    'admin.services.connect',
    'admin.services.edit',
    'admin.services.revoke',
    'admin.services.activity.view',
  ]);

  assert.equal(visibilityConfig.connectButton(manager)(), true);
  assert.equal(visibilityConfig.revokeButton(manager)(), true);
  assert.equal(visibilityConfig.refreshButton(manager)(), true);
  assert.equal(visibilityConfig.viewActivity(manager)(), true);

  // Test as limited user
  manager.setPermissions(['admin.services.view']);

  assert.equal(visibilityConfig.connectButton(manager)(), false);
  assert.equal(visibilityConfig.revokeButton(manager)(), false);
  assert.equal(visibilityConfig.refreshButton(manager)(), false);
  assert.equal(visibilityConfig.viewActivity(manager)(), false);
});
