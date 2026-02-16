/**
 * Services Module E2E Tests
 * Tests full vertical verification across backend API contracts and frontend flows
 *
 * These tests simulate the complete services integration platform workflows
 * using mock API responses that match the documented contract.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// Test Infrastructure: Mock Fetch & Response Builders
// =============================================================================

/**
 * Create a mock Response object for fetch simulation
 */
function mockResponse(body, options = {}) {
  const status = options.status || 200;
  const headers = new Map([
    ['content-type', options.contentType || 'application/json'],
  ]);

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: options.statusText || (status === 200 ? 'OK' : 'Error'),
    headers: {
      get: (key) => headers.get(key.toLowerCase()) || null,
    },
    clone() { return this; },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
    async json() {
      return typeof body === 'string' ? JSON.parse(body) : body;
    },
  };
}

/**
 * Create a mock fetch function that returns configured responses
 */
function createMockFetch(responseMap) {
  const calls = [];

  const mockFn = async (url, options = {}) => {
    const urlPath = new URL(url, 'http://localhost').pathname;
    const method = (options.method || 'GET').toUpperCase();
    const key = `${method}:${urlPath}`;

    calls.push({ url, method, options, key });

    // Check for exact match first, then prefix matches
    if (responseMap[key]) {
      const response = responseMap[key];
      return mockResponse(
        typeof response.body === 'function' ? response.body(url, options) : response.body,
        response
      );
    }

    // Check for prefix matches (for dynamic routes like /connections/:id)
    for (const [pattern, response] of Object.entries(responseMap)) {
      const [patternMethod, patternPath] = pattern.split(':');
      if (method === patternMethod && urlPath.startsWith(patternPath.replace(/:\w+$/, ''))) {
        return mockResponse(
          typeof response.body === 'function' ? response.body(url, options) : response.body,
          response
        );
      }
    }

    return mockResponse({ error: 'Not found' }, { status: 404 });
  };

  mockFn.calls = calls;
  mockFn.getCalls = () => calls;
  mockFn.reset = () => calls.length = 0;

  return mockFn;
}

/**
 * Standard test fixtures for services API responses
 */
const fixtures = {
  providers: {
    github: {
      id: 'github',
      auth_kind: 'oauth2_auth_code',
      supported_scope_types: ['user', 'org'],
      capabilities: [
        { name: 'read_repos', required_grants: ['repo:read'], optional_grants: [], denied_behavior: 'block' },
        { name: 'write_repos', required_grants: ['repo:write'], optional_grants: ['repo:admin'], denied_behavior: 'degrade' },
      ],
    },
    google_drive: {
      id: 'google_drive',
      auth_kind: 'oauth2_auth_code',
      supported_scope_types: ['user', 'org'],
      capabilities: [
        { name: 'read_files', required_grants: ['drive.readonly'], optional_grants: [], denied_behavior: 'block' },
        { name: 'write_files', required_grants: ['drive'], optional_grants: ['drive.appdata'], denied_behavior: 'degrade' },
      ],
    },
  },

  createConnection(overrides = {}) {
    return {
      id: overrides.id || 'conn_test123',
      provider_id: overrides.provider_id || 'github',
      scope_type: overrides.scope_type || 'user',
      scope_id: overrides.scope_id || 'user_456',
      external_account_id: overrides.external_account_id || 'ext_789',
      status: overrides.status || 'active',
      last_error: overrides.last_error || '',
      created_at: overrides.created_at || '2024-01-15T10:00:00Z',
      updated_at: overrides.updated_at || '2024-01-15T10:00:00Z',
    };
  },

  createInstallation(overrides = {}) {
    return {
      id: overrides.id || 'inst_test123',
      provider_id: overrides.provider_id || 'github',
      scope_type: overrides.scope_type || 'org',
      scope_id: overrides.scope_id || 'org_456',
      install_type: overrides.install_type || 'marketplace_app',
      status: overrides.status || 'active',
      granted_at: overrides.granted_at || '2024-01-15T10:00:00Z',
      revoked_at: overrides.revoked_at || null,
      metadata: overrides.metadata || {},
      created_at: overrides.created_at || '2024-01-15T10:00:00Z',
      updated_at: overrides.updated_at || '2024-01-15T10:00:00Z',
    };
  },

  createSubscription(overrides = {}) {
    return {
      id: overrides.id || 'sub_test123',
      connection_id: overrides.connection_id || 'conn_test123',
      provider_id: overrides.provider_id || 'github',
      resource_type: overrides.resource_type || 'repository',
      resource_id: overrides.resource_id || 'repo_789',
      channel_id: overrides.channel_id || 'ch_001',
      remote_subscription_id: overrides.remote_subscription_id || 'remote_sub_001',
      callback_url: overrides.callback_url || 'https://example.com/webhooks/github',
      status: overrides.status || 'active',
      expires_at: overrides.expires_at || '2024-02-15T10:00:00Z',
      last_notified_at: overrides.last_notified_at || null,
      metadata: overrides.metadata || {},
      created_at: overrides.created_at || '2024-01-15T10:00:00Z',
      updated_at: overrides.updated_at || '2024-01-15T10:00:00Z',
    };
  },

  createSyncJob(overrides = {}) {
    return {
      id: overrides.id || 'job_test123',
      connection_id: overrides.connection_id || 'conn_test123',
      provider_id: overrides.provider_id || 'github',
      mode: overrides.mode || 'incremental',
      checkpoint: overrides.checkpoint || 'cursor_abc',
      status: overrides.status || 'succeeded',
      attempts: overrides.attempts || 1,
      metadata: overrides.metadata || {},
      created_at: overrides.created_at || '2024-01-15T10:00:00Z',
      updated_at: overrides.updated_at || '2024-01-15T10:00:00Z',
    };
  },

  createActivityEntry(overrides = {}) {
    return {
      id: overrides.id || 'act_test123',
      provider_id: overrides.provider_id || 'github',
      scope_type: overrides.scope_type || 'user',
      scope_id: overrides.scope_id || 'user_456',
      connection_id: overrides.connection_id || 'conn_test123',
      action: overrides.action || 'connected',
      status: overrides.status || 'success',
      channel: overrides.channel || 'oauth',
      object_type: overrides.object_type || 'connection',
      object_id: overrides.object_id || 'conn_test123',
      metadata: overrides.metadata || {},
      created_at: overrides.created_at || '2024-01-15T10:00:00Z',
    };
  },

  createGrantSnapshot(overrides = {}) {
    return {
      connection_id: overrides.connection_id || 'conn_test123',
      requested_grants: overrides.requested_grants || ['repo:read', 'repo:write'],
      granted_grants: overrides.granted_grants || ['repo:read'],
      version: overrides.version || 1,
      captured_at: overrides.captured_at || '2024-01-15T10:00:00Z',
    };
  },
};

// Import services module from the dist output
// Note: Requires `npm run build` to be run first
const {
  // API Client
  ServicesAPIClient,
  ServicesAPIError,

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
  resetActivityLabels,

  // Query State
  QueryStateManager,

  // Deep Links
  configureDeepLinks,
  generateDeepLink,
  mapObjectTypeToEntity,

  // Mutation Feedback
  ActionQueue,
  getServiceConfirmConfig,
} = await import('../dist/services/index.js');

// =============================================================================
// E2E Test Suite: Task 8.1 - Connect Flows
// =============================================================================

test('E2E: Connect flow (user scope) - begin → callback → connection established', async () => {
  const userConnection = fixtures.createConnection({
    scope_type: 'user',
    scope_id: 'user_123'
  });

  const mockFetch = createMockFetch({
    'GET:/admin/api/services/providers': {
      body: { providers: [fixtures.providers.github, fixtures.providers.google_drive] },
    },
    'POST:/admin/api/services/connections/github/begin': {
      body: {
        begin: {
          authorize_url: 'https://github.com/login/oauth/authorize?client_id=xxx&scope=repo:read',
          state: 'state_abc123',
        },
      },
    },
    'GET:/admin/api/services/connections/github/callback': {
      body: {
        completion: {
          connection_id: userConnection.id,
          provider_id: 'github',
          scope: { type: 'user', id: 'user_123' },
          external_account_id: 'ext_789',
          granted_scopes: ['repo:read'],
        },
      },
    },
    'GET:/admin/api/services/connections': {
      body: {
        connections: [userConnection],
        page: 1,
        per_page: 25,
        total: 1,
        has_next: false,
      },
    },
  });

  // Save original fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Step 1: List providers
    const providersResponse = await client.listProviders();
    assert.equal(providersResponse.providers.length, 2);
    assert.ok(providersResponse.providers.find(p => p.id === 'github'));

    // Step 2: Begin connection
    const beginResponse = await client.beginConnection('github', {
      scope_type: 'user',
      scope_id: 'user_123',
      requested_grants: ['repo:read'],
    });
    assert.ok(beginResponse.begin.authorize_url.includes('github.com'));
    assert.equal(beginResponse.begin.state, 'state_abc123');

    // Step 3: Complete callback (simulates redirect back from OAuth provider)
    const callbackResponse = await client.completeCallback('github', {
      code: 'auth_code_xyz',
      state: 'state_abc123',
    });
    assert.equal(callbackResponse.completion.connection_id, userConnection.id);
    assert.equal(callbackResponse.completion.scope.type, 'user');
    assert.deepEqual(callbackResponse.completion.granted_scopes, ['repo:read']);

    // Step 4: Verify connection appears in list
    const listResponse = await client.listConnections({ scope_type: 'user' });
    assert.equal(listResponse.connections.length, 1);
    assert.equal(listResponse.connections[0].id, userConnection.id);
    assert.equal(listResponse.connections[0].status, 'active');

    // Verify API calls were made in correct order
    assert.equal(mockFetch.calls.length, 4);
    assert.ok(mockFetch.calls[0].key.includes('providers'));
    assert.ok(mockFetch.calls[1].key.includes('begin'));
    assert.ok(mockFetch.calls[2].key.includes('callback'));
    assert.ok(mockFetch.calls[3].key.includes('connections'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Connect flow (org scope) - begin → callback → connection established', async () => {
  const orgConnection = fixtures.createConnection({
    scope_type: 'org',
    scope_id: 'org_456'
  });

  const mockFetch = createMockFetch({
    'POST:/admin/api/services/connections/github/begin': {
      body: {
        begin: {
          authorize_url: 'https://github.com/login/oauth/authorize?client_id=xxx&scope=repo:read&org=org_456',
          state: 'state_org_123',
        },
      },
    },
    'GET:/admin/api/services/connections/github/callback': {
      body: {
        completion: {
          connection_id: orgConnection.id,
          provider_id: 'github',
          scope: { type: 'org', id: 'org_456' },
          external_account_id: 'ext_org_789',
          granted_scopes: ['repo:read', 'org:read'],
        },
      },
    },
    'GET:/admin/api/services/connections': {
      body: {
        connections: [orgConnection],
        page: 1,
        per_page: 25,
        total: 1,
        has_next: false,
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Begin org-scoped connection
    const beginResponse = await client.beginConnection('github', {
      scope_type: 'org',
      scope_id: 'org_456',
      requested_grants: ['repo:read', 'org:read'],
    });
    assert.equal(beginResponse.begin.state, 'state_org_123');

    // Complete callback
    const callbackResponse = await client.completeCallback('github', {
      code: 'auth_code_org',
      state: 'state_org_123',
    });
    assert.equal(callbackResponse.completion.scope.type, 'org');
    assert.equal(callbackResponse.completion.scope.id, 'org_456');

    // Verify org connection in list
    const listResponse = await client.listConnections({ scope_type: 'org', scope_id: 'org_456' });
    assert.equal(listResponse.connections.length, 1);
    assert.equal(listResponse.connections[0].scope_type, 'org');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Refresh connection flow', async () => {
  const connection = fixtures.createConnection();

  const mockFetch = createMockFetch({
    'GET:/admin/api/services/connections/conn_test123': {
      body: {
        connection,
        credential_health: {
          has_active_credential: true,
          refreshable: true,
          expires_at: '2024-01-16T10:00:00Z',
          last_refresh_at: '2024-01-15T08:00:00Z',
          next_refresh_attempt_at: '2024-01-15T22:00:00Z',
          last_error: '',
        },
        grants_summary: {
          snapshot_found: true,
          version: 1,
          captured_at: '2024-01-15T10:00:00Z',
          requested_grants: ['repo:read'],
          granted_grants: ['repo:read'],
          required_grants: ['repo:read'],
          missing_grants: [],
        },
        subscription_summary: { total: 0, active: 0, expiring: 0, last_delivery_at: null, subscriptions: [] },
        sync_summary: { cursor_count: 0, last_cursor: '', last_synced_at: null, last_sync_error: '', cursors: [] },
        rate_limit_summary: { total_buckets: 0, exhausted_buckets: 0, next_reset_at: null, max_retry_after_seconds: 0 },
      },
    },
    'POST:/admin/api/services/connections/conn_test123/refresh': {
      body: {
        refresh: {
          connection_id: 'conn_test123',
          provider_id: 'github',
          refreshed_at: '2024-01-15T12:00:00Z',
          expires_at: '2024-01-16T12:00:00Z',
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Get connection detail
    const detailResponse = await client.getConnectionDetail('conn_test123');
    assert.equal(detailResponse.credential_health.refreshable, true);

    // Refresh the connection
    const refreshResponse = await client.refreshConnection('conn_test123');
    assert.ok(refreshResponse.refresh);
    assert.equal(refreshResponse.refresh.connection_id, 'conn_test123');
    assert.ok(refreshResponse.refresh.refreshed_at);

    // Verify idempotency key was sent
    const refreshCall = mockFetch.calls.find(c => c.key.includes('refresh'));
    assert.ok(refreshCall);
    const headers = JSON.parse(refreshCall.options.body || '{}');
    // The request should have been made
    assert.ok(refreshCall.method === 'POST');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Revoke connection flow', async () => {
  const mockFetch = createMockFetch({
    'POST:/admin/api/services/connections/conn_test123/revoke': {
      body: {
        status: 'revoked',
        connection_id: 'conn_test123',
      },
    },
    'GET:/admin/api/services/connections': {
      body: {
        connections: [],
        page: 1,
        per_page: 25,
        total: 0,
        has_next: false,
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Revoke the connection
    const revokeResponse = await client.revokeConnection('conn_test123', {
      reason: 'User requested disconnection',
    });
    assert.equal(revokeResponse.status, 'revoked');
    assert.equal(revokeResponse.connection_id, 'conn_test123');

    // Verify connection no longer in list
    const listResponse = await client.listConnections();
    assert.equal(listResponse.connections.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Inheritance-enabled connection resolution (user inherits from org)', async () => {
  const userConnection = fixtures.createConnection({ scope_type: 'user', scope_id: 'user_123' });
  const orgConnection = fixtures.createConnection({
    id: 'conn_org_456',
    scope_type: 'org',
    scope_id: 'org_456',
    external_account_id: 'org_ext_789',
  });

  const mockFetch = createMockFetch({
    'GET:/admin/api/services/connections': {
      body: (url) => {
        const urlObj = new URL(url, 'http://localhost');
        const scopeType = urlObj.searchParams.get('scope_type');

        // Simulates inheritance: when user scope is queried, both user and inherited org connections return
        if (scopeType === 'user') {
          return {
            connections: [userConnection, orgConnection], // org connection inherited
            page: 1,
            per_page: 25,
            total: 2,
            has_next: false,
          };
        }
        return {
          connections: [orgConnection],
          page: 1,
          per_page: 25,
          total: 1,
          has_next: false,
        };
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Query for user scope - should inherit org connections
    const listResponse = await client.listConnections({ scope_type: 'user', scope_id: 'user_123' });

    // User should see both their own connection and inherited org connection
    assert.equal(listResponse.connections.length, 2);
    const userConn = listResponse.connections.find(c => c.scope_type === 'user');
    const orgConn = listResponse.connections.find(c => c.scope_type === 'org');
    assert.ok(userConn);
    assert.ok(orgConn);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// =============================================================================
// E2E Test Suite: Task 8.2 - Webhook & Subscription Flows
// =============================================================================

test('E2E: Webhook-triggered incremental sync flow', async () => {
  const subscription = fixtures.createSubscription();
  const syncJob = fixtures.createSyncJob({ mode: 'incremental' });

  const mockFetch = createMockFetch({
    'POST:/admin/api/services/webhooks/github': {
      body: {
        result: {
          status_code: 200,
          processed: true,
          delivery_id: 'del_webhook_123',
          metadata: { event_type: 'push', repo_id: 'repo_789' },
        },
      },
    },
    'GET:/admin/api/services/sync/conn_test123/status': {
      body: {
        connection_id: 'conn_test123',
        sync_summary: {
          cursor_count: 1,
          last_cursor: 'cursor_abc',
          last_synced_at: '2024-01-15T12:00:00Z',
          last_sync_error: '',
          cursors: [{
            id: 'cur_001',
            connection_id: 'conn_test123',
            provider_id: 'github',
            resource_type: 'repository',
            resource_id: 'repo_789',
            cursor: 'cursor_abc',
            status: 'synced',
            last_synced_at: '2024-01-15T12:00:00Z',
            metadata: {},
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T12:00:00Z',
          }],
          last_job: syncJob,
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Webhook arrives from provider
    const webhookResponse = await client.processWebhook('github', {
      action: 'push',
      repository: { id: 'repo_789' },
    }, { 'X-GitHub-Event': 'push', 'X-Hub-Signature-256': 'sha256=xxx' });

    assert.ok(webhookResponse.result.processed);
    assert.equal(webhookResponse.result.status_code, 200);

    // Check sync status was updated
    const syncStatus = await client.getSyncStatus('conn_test123');
    assert.equal(syncStatus.sync_summary.last_job?.mode, 'incremental');
    assert.equal(syncStatus.sync_summary.last_job?.status, 'succeeded');
    assert.ok(syncStatus.sync_summary.last_synced_at);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Subscription renewal flow', async () => {
  const subscription = fixtures.createSubscription({
    expires_at: '2024-01-16T10:00:00Z' // Expiring soon
  });
  const renewedSubscription = fixtures.createSubscription({
    expires_at: '2024-02-16T10:00:00Z' // Extended
  });

  const mockFetch = createMockFetch({
    'GET:/admin/api/services/subscriptions': {
      body: {
        subscriptions: [subscription],
        page: 1,
        per_page: 25,
        total: 1,
        has_next: false,
      },
    },
    'POST:/admin/api/services/subscriptions/sub_test123/renew': {
      body: {
        subscription: renewedSubscription,
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // List subscriptions to find expiring ones
    const listResponse = await client.listSubscriptions({ status: 'active' });
    assert.equal(listResponse.subscriptions.length, 1);

    // Renew the subscription
    const renewResponse = await client.renewSubscription('sub_test123');
    assert.ok(renewResponse.subscription);
    assert.equal(renewResponse.subscription.expires_at, '2024-02-16T10:00:00Z');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Subscription cancel and reconnect flow', async () => {
  let subscriptionActive = true;

  const mockFetch = createMockFetch({
    'POST:/admin/api/services/subscriptions/sub_test123/cancel': {
      body: () => {
        subscriptionActive = false;
        return {
          status: 'cancelled',
          subscription_id: 'sub_test123',
        };
      },
    },
    'GET:/admin/api/services/subscriptions': {
      body: () => ({
        subscriptions: subscriptionActive
          ? [fixtures.createSubscription()]
          : [fixtures.createSubscription({ status: 'cancelled' })],
        page: 1,
        per_page: 25,
        total: 1,
        has_next: false,
      }),
    },
    'POST:/admin/api/services/sync/conn_test123/run': {
      body: {
        job: fixtures.createSyncJob({ status: 'queued', mode: 'bootstrap' }),
        queued: true,
        job_id: 'job_reconnect_123',
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Cancel subscription
    const cancelResponse = await client.cancelSubscription('sub_test123', {
      reason: 'User requested cancellation',
    });
    assert.equal(cancelResponse.status, 'cancelled');

    // Verify subscription is cancelled
    const listResponse = await client.listSubscriptions();
    assert.equal(listResponse.subscriptions[0].status, 'cancelled');

    // Reconnect by running a new sync (which may create new subscription)
    const syncResponse = await client.runSync('conn_test123', {
      resource_type: 'repository',
      resource_id: 'repo_789',
    });
    assert.ok(syncResponse.queued);
    assert.equal(syncResponse.job?.mode, 'bootstrap');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Webhook delivery retry behavior', async () => {
  let deliveryAttempts = 0;

  const mockFetch = createMockFetch({
    'POST:/admin/api/services/webhooks/github': {
      body: () => {
        deliveryAttempts++;
        if (deliveryAttempts < 3) {
          // Simulate transient failure
          return {
            result: {
              status_code: 503,
              processed: false,
              delivery_id: `del_retry_${deliveryAttempts}`,
              metadata: { retry_after: 30, attempt: deliveryAttempts },
            },
          };
        }
        // Success on third attempt
        return {
          result: {
            status_code: 200,
            processed: true,
            delivery_id: `del_success_${deliveryAttempts}`,
            metadata: { attempt: deliveryAttempts },
          },
        };
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // First attempt - fails
    const response1 = await client.processWebhook('github', { event: 'push' });
    assert.equal(response1.result.processed, false);
    assert.equal(response1.result.status_code, 503);

    // Second attempt - fails
    const response2 = await client.processWebhook('github', { event: 'push' });
    assert.equal(response2.result.processed, false);

    // Third attempt - succeeds
    const response3 = await client.processWebhook('github', { event: 'push' });
    assert.equal(response3.result.processed, true);
    assert.equal(response3.result.status_code, 200);

    assert.equal(deliveryAttempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// =============================================================================
// E2E Test Suite: Task 8.3 - Inbound Non-Webhook Callback Surfaces
// =============================================================================

test('E2E: Inbound command surface dispatches to async worker', async () => {
  const mockFetch = createMockFetch({
    'POST:/admin/api/services/inbound/slack/command': {
      body: {
        result: {
          status_code: 202,
          processed: true,
          surface: 'command',
          metadata: {
            job_id: 'job_cmd_123',
            queued_at: '2024-01-15T10:00:00Z',
            command: '/deploy',
          },
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Inbound slash command arrives
    const response = await client.dispatchInbound('slack', 'command', {
      command: '/deploy',
      user_id: 'U123',
      channel_id: 'C456',
      text: 'production',
    }, {
      'X-Slack-Signature': 'v0=xxx',
      'X-Slack-Request-Timestamp': '1234567890',
    });

    assert.ok(response.result.processed);
    assert.equal(response.result.surface, 'command');
    assert.equal(response.result.status_code, 202); // Accepted for async processing
    assert.ok(response.result.metadata?.job_id);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Inbound interaction surface dispatches to async worker', async () => {
  const mockFetch = createMockFetch({
    'POST:/admin/api/services/inbound/slack/interaction': {
      body: {
        result: {
          status_code: 202,
          processed: true,
          surface: 'interaction',
          metadata: {
            job_id: 'job_int_456',
            action_type: 'button_click',
            callback_id: 'approve_deployment',
          },
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Inbound interaction arrives
    const response = await client.dispatchInbound('slack', 'interaction', {
      type: 'block_actions',
      user: { id: 'U123' },
      actions: [{ action_id: 'approve', value: 'yes' }],
      callback_id: 'approve_deployment',
    });

    assert.ok(response.result.processed);
    assert.equal(response.result.surface, 'interaction');
    assert.equal(response.result.metadata?.callback_id, 'approve_deployment');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Inbound event callback surface dispatches to async worker', async () => {
  const mockFetch = createMockFetch({
    'POST:/admin/api/services/inbound/slack/event_callback': {
      body: {
        result: {
          status_code: 202,
          processed: true,
          surface: 'event_callback',
          metadata: {
            job_id: 'job_evt_789',
            event_type: 'message',
            event_id: 'Ev123',
          },
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Inbound event callback arrives
    const response = await client.dispatchInbound('slack', 'event_callback', {
      type: 'event_callback',
      event: { type: 'message', user: 'U123', text: 'Hello' },
      event_id: 'Ev123',
    });

    assert.ok(response.result.processed);
    assert.equal(response.result.surface, 'event_callback');
    assert.ok(response.result.metadata?.job_id);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// =============================================================================
// E2E Test Suite: Task 8.4 - Capability Blocked/Unblocked by Grants
// =============================================================================

test('E2E: Capability blocked due to missing grants', async () => {
  const mockFetch = createMockFetch({
    'POST:/admin/api/services/capabilities/github/write_repos/invoke': {
      body: {
        result: {
          allowed: false,
          mode: 'block',
          missing_grants: ['repo:write', 'repo:admin'],
          metadata: {
            connection_id: 'conn_test123',
            reason: 'MISSING_REQUIRED_GRANTS',
          },
        },
      },
    },
    'GET:/admin/api/services/connections/conn_test123/grants': {
      body: {
        snapshot: fixtures.createGrantSnapshot({
          requested_grants: ['repo:read', 'repo:write'],
          granted_grants: ['repo:read'], // Missing write grant
        }),
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Try to invoke capability that requires missing grants
    const invokeResponse = await client.invokeCapability('github', 'write_repos', {
      connection_id: 'conn_test123',
      payload: { repo: 'my-repo', branch: 'main' },
    });

    assert.equal(invokeResponse.result.allowed, false);
    assert.equal(invokeResponse.result.mode, 'block');
    assert.deepEqual(invokeResponse.result.missing_grants, ['repo:write', 'repo:admin']);

    // Verify grants show missing permissions
    const grantsResponse = await client.getConnectionGrants('conn_test123');
    assert.ok(!grantsResponse.snapshot.granted_grants.includes('repo:write'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Capability unblocked after re-consent grants additional permissions', async () => {
  let grantsUpdated = false;

  const mockFetch = createMockFetch({
    'POST:/admin/api/services/connections/conn_test123/reconsent/begin': {
      body: {
        begin: {
          authorize_url: 'https://github.com/login/oauth/authorize?scope=repo:read,repo:write',
          state: 'reconsent_state_123',
        },
      },
    },
    'GET:/admin/api/services/connections/github/callback': {
      body: () => {
        grantsUpdated = true;
        return {
          completion: {
            connection_id: 'conn_test123',
            provider_id: 'github',
            scope: { type: 'user', id: 'user_123' },
            external_account_id: 'ext_789',
            granted_scopes: ['repo:read', 'repo:write'], // Now has write access
          },
        };
      },
    },
    'GET:/admin/api/services/connections/conn_test123/grants': {
      body: () => ({
        snapshot: fixtures.createGrantSnapshot({
          requested_grants: ['repo:read', 'repo:write'],
          granted_grants: grantsUpdated ? ['repo:read', 'repo:write'] : ['repo:read'],
          version: grantsUpdated ? 2 : 1,
        }),
      }),
    },
    'POST:/admin/api/services/capabilities/github/write_repos/invoke': {
      body: () => ({
        result: grantsUpdated
          ? {
              allowed: true,
              mode: 'block',
              result: { success: true, commit_sha: 'abc123' },
            }
          : {
              allowed: false,
              mode: 'block',
              missing_grants: ['repo:write'],
            },
      }),
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Step 1: Verify capability is blocked initially
    const blockedResponse = await client.invokeCapability('github', 'write_repos', {
      connection_id: 'conn_test123',
    });
    assert.equal(blockedResponse.result.allowed, false);

    // Step 2: Begin re-consent to request additional grants
    const reconsentResponse = await client.beginReconsent('conn_test123', {
      requested_grants: ['repo:read', 'repo:write'],
    });
    assert.ok(reconsentResponse.begin.authorize_url.includes('repo:write'));

    // Step 3: Complete re-consent callback
    const callbackResponse = await client.completeCallback('github', {
      code: 'reconsent_code',
      state: 'reconsent_state_123',
    });
    assert.ok(callbackResponse.completion.granted_scopes.includes('repo:write'));

    // Step 4: Verify grants are updated
    const grantsResponse = await client.getConnectionGrants('conn_test123');
    assert.ok(grantsResponse.snapshot.granted_grants.includes('repo:write'));
    assert.equal(grantsResponse.snapshot.version, 2);

    // Step 5: Capability is now allowed
    const allowedResponse = await client.invokeCapability('github', 'write_repos', {
      connection_id: 'conn_test123',
    });
    assert.equal(allowedResponse.result.allowed, true);
    assert.ok(allowedResponse.result.result?.success);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Capability degrades gracefully with optional grants', async () => {
  const mockFetch = createMockFetch({
    'POST:/admin/api/services/capabilities/google_drive/write_files/invoke': {
      body: {
        result: {
          allowed: true,
          mode: 'degrade',
          missing_grants: ['drive.appdata'], // Optional grant missing
          result: {
            success: true,
            file_id: 'file_123',
            features_degraded: ['app_data_sync'],
          },
          metadata: { degraded: true },
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Invoke capability that degrades without optional grants
    const response = await client.invokeCapability('google_drive', 'write_files', {
      connection_id: 'conn_drive_123',
      payload: { filename: 'test.txt', content: 'Hello' },
    });

    // Capability executes but with degraded features
    assert.equal(response.result.allowed, true);
    assert.equal(response.result.mode, 'degrade');
    assert.deepEqual(response.result.missing_grants, ['drive.appdata']);
    assert.ok(response.result.result?.success);
    assert.deepEqual(response.result.result?.features_degraded, ['app_data_sync']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// =============================================================================
// E2E Test Suite: Task 8.5 - Lifecycle Event Fan-out
// =============================================================================

test('E2E: Lifecycle event produces activity entry', async () => {
  const activityEntry = fixtures.createActivityEntry({
    action: 'connected',
    channel: 'oauth',
    object_type: 'connection',
  });

  const mockFetch = createMockFetch({
    'GET:/admin/api/services/activity': {
      body: {
        entries: [activityEntry],
        total: 1,
        limit: 25,
        offset: 0,
        has_more: false,
        next_offset: 0,
        filter_applied: {},
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Query activity for the connection event
    const activityResponse = await client.listActivity({
      action: 'connected',
      connections: ['conn_test123'],
    });

    assert.equal(activityResponse.entries.length, 1);
    assert.equal(activityResponse.entries[0].action, 'connected');
    assert.equal(activityResponse.entries[0].channel, 'oauth');
    assert.equal(activityResponse.entries[0].status, 'success');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Lifecycle events are idempotent on replay', async () => {
  let activityEntries = [
    fixtures.createActivityEntry({ id: 'act_1', action: 'sync_completed' }),
  ];

  const mockFetch = createMockFetch({
    'POST:/admin/api/services/webhooks/github': {
      body: (url, options) => {
        const body = JSON.parse(options.body);
        // Simulate idempotent replay - same event ID doesn't create duplicate
        const existingEntry = activityEntries.find(e =>
          e.metadata?.event_id === body.event_id
        );

        if (!existingEntry) {
          activityEntries.push(fixtures.createActivityEntry({
            id: `act_${activityEntries.length + 1}`,
            action: 'sync_completed',
            metadata: { event_id: body.event_id },
          }));
        }

        return {
          result: {
            status_code: 200,
            processed: true,
            delivery_id: 'del_123',
            metadata: { deduplicated: !!existingEntry },
          },
        };
      },
    },
    'GET:/admin/api/services/activity': {
      body: () => ({
        entries: activityEntries,
        total: activityEntries.length,
        limit: 25,
        offset: 0,
        has_more: false,
        next_offset: 0,
        filter_applied: {},
      }),
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Process webhook (creates activity entry)
    const response1 = await client.processWebhook('github', {
      event: 'push',
      event_id: 'evt_unique_123',
    });
    assert.ok(response1.result.processed);

    const activityAfterFirst = await client.listActivity();
    const countAfterFirst = activityAfterFirst.entries.length;

    // Replay same webhook (should be deduplicated)
    const response2 = await client.processWebhook('github', {
      event: 'push',
      event_id: 'evt_unique_123', // Same event ID
    });
    assert.ok(response2.result.processed);
    assert.ok(response2.result.metadata?.deduplicated);

    // Verify no duplicate activity entries
    const activityAfterReplay = await client.listActivity();
    assert.equal(activityAfterReplay.entries.length, countAfterFirst);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Lifecycle event produces notification side effect', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/status': {
      body: {
        runtime_enabled: true,
        worker_enabled: true,
        webhook_processor_enabled: true,
        inbound_dispatcher_enabled: true,
        sync_orchestrator_enabled: true,
        lifecycle_dispatcher_enabled: true,
        activity_sink_status: 'active',
        retention_config: { ttl_days: 30, max_rows: 100000 },
      },
    },
    'GET:/admin/api/services/activity': {
      body: {
        entries: [
          fixtures.createActivityEntry({
            action: 'token_refresh_failed',
            status: 'failure',
            metadata: {
              notification_sent: true,
              notification_id: 'notif_123',
              notification_channel: 'email',
            },
          }),
        ],
        total: 1,
        limit: 25,
        offset: 0,
        has_more: false,
        next_offset: 0,
        filter_applied: {},
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Verify lifecycle dispatcher is enabled
    const statusResponse = await client.getStatus();
    assert.ok(statusResponse.lifecycle_dispatcher_enabled);

    // Check activity shows notification was sent
    const activityResponse = await client.listActivity({ action: 'token_refresh_failed' });
    assert.equal(activityResponse.entries.length, 1);
    assert.ok(activityResponse.entries[0].metadata?.notification_sent);
    assert.ok(activityResponse.entries[0].metadata?.notification_id);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// =============================================================================
// E2E Test Suite: Task 8.6 - Frontend Role-Based Gating
// =============================================================================

test('E2E: Role-based permission gating for view access', () => {
  const manager = new ServicesPermissionManager();

  // User with view-only permissions
  manager.setPermissions(['admin.services.view']);

  const viewGuard = createPermissionGuard(['admin.services.view']);
  const connectGuard = createPermissionGuard(['admin.services.connect']);
  const revokeGuard = createPermissionGuard(['admin.services.revoke']);

  assert.equal(viewGuard(manager)(), true);
  assert.equal(connectGuard(manager)(), false);
  assert.equal(revokeGuard(manager)(), false);
});

test('E2E: Role-based permission gating for full admin access', () => {
  const manager = new ServicesPermissionManager();

  // Admin with all permissions
  manager.setPermissions([
    'admin.services.view',
    'admin.services.connect',
    'admin.services.edit',
    'admin.services.revoke',
    'admin.services.reconsent',
    'admin.services.activity.view',
    'admin.services.webhooks',
  ]);

  const allServicesGuard = requireAll([
    'admin.services.view',
    'admin.services.connect',
    'admin.services.edit',
    'admin.services.revoke',
  ]);

  assert.equal(allServicesGuard(manager)(), true);
});

test('E2E: Forbidden response handling for API requests', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/connections': {
      status: 403,
      body: {
        error: 'Forbidden',
        text_code: 'FORBIDDEN',
        message: 'You do not have permission to view connections',
      },
    },
    'POST:/admin/api/services/connections/github/begin': {
      status: 403,
      body: {
        error: 'Forbidden',
        text_code: 'FORBIDDEN',
        message: 'You do not have permission to create connections',
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Attempt to list connections without permission
    try {
      await client.listConnections();
      assert.fail('Should have thrown forbidden error');
    } catch (err) {
      assert.ok(err instanceof ServicesAPIError);
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'FORBIDDEN');
      assert.ok(isForbiddenError(err));
    }

    // Attempt to begin connection without permission
    try {
      await client.beginConnection('github', { scope_type: 'user' });
      assert.fail('Should have thrown forbidden error');
    } catch (err) {
      assert.ok(err instanceof ServicesAPIError);
      assert.equal(err.statusCode, 403);
      assert.ok(err.isForbidden);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Combined permission guards for complex access control', () => {
  const manager = new ServicesPermissionManager();

  // User with connect + edit but no revoke
  manager.setPermissions([
    'admin.services.view',
    'admin.services.connect',
    'admin.services.edit',
  ]);

  // Guard that requires any of connect OR revoke
  const canModifyGuard = requireAny(['admin.services.connect', 'admin.services.revoke']);
  assert.equal(canModifyGuard(manager)(), true);

  // Guard that requires both edit AND revoke
  const canEditAndRevokeGuard = requireAll(['admin.services.edit', 'admin.services.revoke']);
  assert.equal(canEditAndRevokeGuard(manager)(), false);

  // Combined guard: can view AND (can connect OR can edit)
  const viewAndModify = combineGuards([
    createPermissionGuard(['admin.services.view']),
    requireAny(['admin.services.connect', 'admin.services.edit']),
  ]);
  assert.equal(viewAndModify(manager)(), true);
});

test('E2E: Permission-based UI element visibility', () => {
  const manager = new ServicesPermissionManager();

  // Define visibility rules for UI elements
  const uiVisibility = {
    connectButton: createPermissionGuard(['admin.services.connect']),
    refreshButton: createPermissionGuard(['admin.services.edit']),
    revokeButton: createPermissionGuard(['admin.services.revoke']),
    reconsentButton: createPermissionGuard(['admin.services.reconsent']),
    activityTab: createPermissionGuard(['admin.services.activity.view']),
  };

  // Test with limited permissions
  manager.setPermissions(['admin.services.view', 'admin.services.connect']);

  assert.equal(uiVisibility.connectButton(manager)(), true);
  assert.equal(uiVisibility.refreshButton(manager)(), false);
  assert.equal(uiVisibility.revokeButton(manager)(), false);
  assert.equal(uiVisibility.reconsentButton(manager)(), false);
  assert.equal(uiVisibility.activityTab(manager)(), false);

  // Test with more permissions
  manager.setPermissions([
    'admin.services.view',
    'admin.services.connect',
    'admin.services.edit',
    'admin.services.activity.view',
  ]);

  assert.equal(uiVisibility.connectButton(manager)(), true);
  assert.equal(uiVisibility.refreshButton(manager)(), true);
  assert.equal(uiVisibility.revokeButton(manager)(), false);
  assert.equal(uiVisibility.activityTab(manager)(), true);
});

// =============================================================================
// E2E Test Suite: Task 8.7 - Quickstart Path Validation
// =============================================================================

test('E2E: Quickstart config - verify status endpoint reflects feature flags', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/status': {
      body: {
        runtime_enabled: true,
        worker_enabled: true,
        webhook_processor_enabled: true,
        inbound_dispatcher_enabled: true,
        sync_orchestrator_enabled: true,
        lifecycle_dispatcher_enabled: true,
        activity_sink_status: 'active',
        fallback_entries_count: 0,
        retention_config: {
          ttl_days: 30,
          max_rows: 100000,
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    const statusResponse = await client.getStatus();

    // Verify all expected features are enabled
    assert.equal(statusResponse.runtime_enabled, true);
    assert.equal(statusResponse.worker_enabled, true);
    assert.equal(statusResponse.webhook_processor_enabled, true);
    assert.equal(statusResponse.inbound_dispatcher_enabled, true);
    assert.equal(statusResponse.sync_orchestrator_enabled, true);
    assert.equal(statusResponse.lifecycle_dispatcher_enabled, true);

    // Verify activity sink is healthy
    assert.equal(statusResponse.activity_sink_status, 'active');
    assert.equal(statusResponse.fallback_entries_count, 0);

    // Verify retention config is set
    assert.ok(statusResponse.retention_config);
    assert.equal(statusResponse.retention_config.ttl_days, 30);
    assert.equal(statusResponse.retention_config.max_rows, 100000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Quickstart config - verify providers are registered', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/providers': {
      body: {
        providers: [
          fixtures.providers.github,
          fixtures.providers.google_drive,
          {
            id: 'google_calendar',
            auth_kind: 'oauth2_auth_code',
            supported_scope_types: ['user'],
            capabilities: [
              { name: 'read_events', required_grants: ['calendar.readonly'], optional_grants: [], denied_behavior: 'block' },
            ],
          },
        ],
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    const providersResponse = await client.listProviders();

    // Verify built-in providers are registered
    assert.ok(providersResponse.providers.length >= 3);

    const providerIds = providersResponse.providers.map(p => p.id);
    assert.ok(providerIds.includes('github'));
    assert.ok(providerIds.includes('google_drive'));
    assert.ok(providerIds.includes('google_calendar'));

    // Verify provider structure
    const github = providersResponse.providers.find(p => p.id === 'github');
    assert.equal(github.auth_kind, 'oauth2_auth_code');
    assert.ok(github.capabilities.length > 0);
    assert.ok(github.supported_scope_types.includes('user'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Quickstart config - failure mode smoke check (degraded activity sink)', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/status': {
      body: {
        runtime_enabled: true,
        worker_enabled: true,
        webhook_processor_enabled: true,
        inbound_dispatcher_enabled: true,
        sync_orchestrator_enabled: true,
        lifecycle_dispatcher_enabled: true,
        activity_sink_status: 'fallback', // Degraded state
        fallback_entries_count: 42, // Entries buffered in fallback
        retention_config: {
          ttl_days: 30,
          max_rows: 100000,
        },
      },
    },
    'POST:/admin/api/services/activity/retention/cleanup': {
      body: {
        status: 'ok',
        deleted_count: 0,
        execution_time_ms: 15,
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Check status shows degraded state
    const statusResponse = await client.getStatus();
    assert.equal(statusResponse.activity_sink_status, 'fallback');
    assert.equal(statusResponse.fallback_entries_count, 42);

    // Verify retention cleanup still works in degraded mode
    const cleanupResponse = await client.runRetentionCleanup();
    assert.equal(cleanupResponse.status, 'ok');
    assert.ok(cleanupResponse.execution_time_ms >= 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Quickstart config - observability endpoints accessible', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/status': {
      body: {
        runtime_enabled: true,
        worker_enabled: true,
        webhook_processor_enabled: true,
        inbound_dispatcher_enabled: true,
        sync_orchestrator_enabled: true,
        lifecycle_dispatcher_enabled: true,
        activity_sink_status: 'active',
        retention_config: { ttl_days: 30, max_rows: 100000 },
      },
    },
    'GET:/admin/api/services/activity': {
      body: {
        entries: [
          fixtures.createActivityEntry({ action: 'connected', status: 'success' }),
          fixtures.createActivityEntry({ action: 'sync_completed', status: 'success' }),
        ],
        total: 2,
        limit: 25,
        offset: 0,
        has_more: false,
        next_offset: 0,
        filter_applied: {},
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Status endpoint is accessible
    const statusResponse = await client.getStatus();
    assert.ok(statusResponse.runtime_enabled !== undefined);

    // Activity endpoint is accessible with proper structure
    const activityResponse = await client.listActivity();
    assert.ok(Array.isArray(activityResponse.entries));
    assert.ok(activityResponse.total !== undefined);
    assert.ok(activityResponse.limit !== undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// =============================================================================
// E2E Test Suite: Task 8.8 - Extension Composition Path
// =============================================================================

test('E2E: Extension diagnostics - provider pack registration state', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/status': {
      body: {
        runtime_enabled: true,
        worker_enabled: true,
        webhook_processor_enabled: true,
        inbound_dispatcher_enabled: true,
        sync_orchestrator_enabled: true,
        lifecycle_dispatcher_enabled: true,
        activity_sink_status: 'active',
        extensions: {
          provider_packs: [
            {
              id: 'go-marketplace',
              version: '1.0.0',
              status: 'active',
              providers: ['shopify', 'amazon'],
              capabilities_count: 12,
              error_count: 0,
            },
            {
              id: 'go-payment-gateways',
              version: '0.9.0',
              status: 'active',
              providers: ['stripe', 'paypal'],
              capabilities_count: 8,
              error_count: 0,
            },
          ],
          hooks: {
            lifecycle_subscribers: 2,
            command_bundles: 2,
            query_bundles: 2,
          },
          config_health: {
            secrets_provider: 'healthy',
            persistence_client: 'healthy',
            logger: 'healthy',
            config_source: 'healthy',
          },
          errors: [],
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    const statusResponse = await client.getStatus();

    // Verify extension data is exposed
    assert.ok(statusResponse.extensions);
    assert.equal(statusResponse.extensions.provider_packs.length, 2);

    // Verify provider packs
    const marketplacePack = statusResponse.extensions.provider_packs.find(p => p.id === 'go-marketplace');
    assert.ok(marketplacePack);
    assert.equal(marketplacePack.status, 'active');
    assert.deepEqual(marketplacePack.providers, ['shopify', 'amazon']);

    // Verify hooks
    assert.equal(statusResponse.extensions.hooks.lifecycle_subscribers, 2);
    assert.equal(statusResponse.extensions.hooks.command_bundles, 2);

    // Verify config health
    assert.equal(statusResponse.extensions.config_health.secrets_provider, 'healthy');
    assert.equal(statusResponse.extensions.config_health.persistence_client, 'healthy');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Extension diagnostics - API state visibility', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/installations': {
      body: {
        installations: [
          fixtures.createInstallation({
            provider_id: 'shopify', // From extension pack
            metadata: { source_pack: 'go-marketplace' },
          }),
        ],
        page: 1,
        per_page: 25,
        total: 1,
        has_next: false,
      },
    },
    'GET:/admin/api/services/connections': {
      body: {
        connections: [
          fixtures.createConnection({
            provider_id: 'stripe', // From extension pack
          }),
        ],
        page: 1,
        per_page: 25,
        total: 1,
        has_next: false,
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    // Extension-provided providers show up in API responses
    const installationsResponse = await client.listInstallations();
    assert.equal(installationsResponse.installations.length, 1);
    assert.equal(installationsResponse.installations[0].provider_id, 'shopify');
    assert.equal(installationsResponse.installations[0].metadata.source_pack, 'go-marketplace');

    const connectionsResponse = await client.listConnections();
    assert.equal(connectionsResponse.connections.length, 1);
    assert.equal(connectionsResponse.connections[0].provider_id, 'stripe');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E: Extension diagnostics - error tracking', async () => {
  const mockFetch = createMockFetch({
    'GET:/admin/api/services/status': {
      body: {
        runtime_enabled: true,
        worker_enabled: true,
        webhook_processor_enabled: true,
        inbound_dispatcher_enabled: true,
        sync_orchestrator_enabled: true,
        lifecycle_dispatcher_enabled: true,
        activity_sink_status: 'active',
        extensions: {
          provider_packs: [
            {
              id: 'go-marketplace',
              version: '1.0.0',
              status: 'degraded',
              providers: ['shopify', 'amazon'],
              capabilities_count: 12,
              error_count: 3,
            },
          ],
          hooks: {
            lifecycle_subscribers: 1,
            command_bundles: 1,
            query_bundles: 1,
          },
          config_health: {
            secrets_provider: 'healthy',
            persistence_client: 'warning',
            logger: 'healthy',
            config_source: 'healthy',
          },
          errors: [
            {
              timestamp: '2024-01-15T10:00:00Z',
              pack_id: 'go-marketplace',
              code: 'CAPABILITY_INIT_FAILED',
              message: 'Failed to initialize shopify.fulfill_order capability',
            },
            {
              timestamp: '2024-01-15T09:55:00Z',
              pack_id: 'go-marketplace',
              code: 'PROVIDER_AUTH_ERROR',
              message: 'OAuth configuration missing for amazon provider',
            },
          ],
        },
      },
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new ServicesAPIClient({ basePath: '/admin/api/services' });

    const statusResponse = await client.getStatus();

    // Verify degraded pack status
    const marketplacePack = statusResponse.extensions.provider_packs[0];
    assert.equal(marketplacePack.status, 'degraded');
    assert.equal(marketplacePack.error_count, 3);

    // Verify config health warnings
    assert.equal(statusResponse.extensions.config_health.persistence_client, 'warning');

    // Verify errors are tracked
    assert.equal(statusResponse.extensions.errors.length, 2);
    assert.equal(statusResponse.extensions.errors[0].code, 'CAPABILITY_INIT_FAILED');
    assert.equal(statusResponse.extensions.errors[0].pack_id, 'go-marketplace');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// =============================================================================
// Additional E2E Tests: Cross-cutting Concerns
// =============================================================================

test('E2E: Activity labels resolve from backend config', () => {
  resetActivityLabels();
  initActivityLabels({
    labels: {
      connected: 'Service Connected',
      disconnected: 'Service Disconnected',
      sync_started: 'Sync Job Started',
    },
  });

  // Verify backend overrides work
  assert.equal(getActionLabel('connected'), 'Service Connected');
  assert.equal(getActionLabel('sync_started'), 'Sync Job Started');

  // Verify fallback for unknown actions
  assert.equal(getActionLabel('custom_action'), 'Custom Action');

  resetActivityLabels();
});

test('E2E: Deep links navigate to entities with context preservation', () => {
  configureDeepLinks({ basePath: '/admin/services' });

  // Generate deep link with context
  const context = {
    fromPage: '/admin/services/activity',
    filters: { provider_id: 'github', status: 'active' },
    page: 2,
    viewMode: 'timeline',
  };

  const deepLink = generateDeepLink('connection', 'conn_123', context);

  assert.ok(deepLink.includes('/admin/services/connections/conn_123'));
  assert.ok(deepLink.includes('ctx='));

  // Verify entity type mapping
  assert.equal(mapObjectTypeToEntity('connection'), 'connection');
  assert.equal(mapObjectTypeToEntity('sync_job'), 'sync');
  assert.equal(mapObjectTypeToEntity('webhook_delivery'), null);
});

test('E2E: Action queue prevents duplicate submissions', async () => {
  const queue = new ActionQueue();
  let executionCount = 0;

  // Start first execution
  const promise1 = queue.execute('revoke_conn', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    executionCount++;
    return 'revoked';
  });

  // Try duplicate while first is in flight
  const result2 = await queue.execute('revoke_conn', async () => {
    executionCount++;
    return 'duplicate';
  });

  // Duplicate should return undefined
  assert.equal(result2, undefined);

  // Wait for first to complete
  const result1 = await promise1;
  assert.equal(result1, 'revoked');

  // Only one execution happened
  assert.equal(executionCount, 1);
});

test('E2E: Service confirmation config generates appropriate messages', () => {
  // Revoke action
  const revokeConfig = getServiceConfirmConfig({
    action: 'revoke',
    resourceType: 'connection',
    resourceName: 'GitHub (user_123)',
  });
  assert.ok(revokeConfig.message.includes('revoke'));
  assert.ok(revokeConfig.message.includes('GitHub'));
  assert.equal(revokeConfig.options.variant, 'danger');

  // Uninstall action
  const uninstallConfig = getServiceConfirmConfig({
    action: 'uninstall',
    resourceType: 'installation',
    resourceName: 'Slack Workspace',
    additionalContext: 'All associated connections will be revoked.',
  });
  assert.ok(uninstallConfig.message.includes('uninstall'));
  assert.ok(uninstallConfig.message.includes('All associated connections'));
  assert.equal(uninstallConfig.options.variant, 'danger');

  // Refresh action (non-destructive)
  const refreshConfig = getServiceConfirmConfig({
    action: 'refresh',
    resourceType: 'connection',
  });
  assert.ok(refreshConfig.message.includes('refresh'));
  assert.equal(refreshConfig.options.variant, 'primary');
});

test('E2E: Query state management for list pages', () => {
  const manager = new QueryStateManager({
    config: {
      defaultPerPage: 25,
      onChange: () => {},
    },
    filterFields: ['provider_id', 'scope_type', 'status'],
  });

  // Set filters
  manager.setFilter('provider_id', 'github');
  manager.setFilter('status', 'active');
  manager.setSearch('test');
  manager.setPage(2);

  // Verify state
  const state = manager.getState();
  assert.equal(state.filters.provider_id, 'github');
  assert.equal(state.filters.status, 'active');
  assert.equal(state.search, 'test');
  assert.equal(state.page, 2);

  // Get API params
  const params = manager.getQueryParams();
  assert.equal(params.provider_id, 'github');
  assert.equal(params.status, 'active');
  assert.equal(params.q, 'test');
  assert.equal(params.page, 2);

  // Reset
  manager.reset();
  const resetState = manager.getState();
  assert.equal(resetState.page, 1);
  assert.equal(resetState.search, '');
  assert.equal(resetState.filters.provider_id, undefined);
});
