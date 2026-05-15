import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

function setGlobals(win) {
  globalThis.window = win;
  globalThis.self = win;
  globalThis.document = win.document;
  Object.defineProperty(globalThis, 'navigator', {
    value: win.navigator,
    configurable: true,
    writable: true,
  });
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.Node = win.Node;
}

const bootstrapDOM = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://127.0.0.1:9090/' });
setGlobals(bootstrapDOM.window);

// Import the panel renderers
const debugModule = await import('../dist/debug/index.js');
const { renderSiteRenderCachePanel, renderSiteRenderCachePanelCompact, consoleStyles, toolbarStyles } = debugModule;

// ============================================================================
// Test Fixtures
// ============================================================================

const fixtures = {
  // Healthy cache with activity
  healthy: {
    configured: true,
    active: true,
    backend: 'valkey',
    status: 'healthy',
    scope: 'process_local',
    observed_by: 'debug-observer',
    config: {
      enabled: true,
      backend: 'valkey',
      fresh_ttl: '30m',
      stale_ttl: '2h',
      render_version: 'v1',
      namespace: 'site-cache',
      debug_headers: true,
      debug_keys: false,
      fail_closed: false,
      valkey: {
        address: 'localhost:6379',
        namespace: 'site',
        db: 0,
        tls_enabled: false,
        username_set: false,
        password_set: true,
      },
    },
    capabilities: {
      tag_invalidation: true,
      prefix_invalidation: true,
      close: true,
      backend_descriptor: true,
      app_wide_tag_clear_preferred: true,
      process_local_observed_keys: true,
      backend_key_scanning_enabled: false,
    },
    counters: {
      lookups: 1500,
      hits: 1200,
      misses: 300,
      writes: 300,
      deletes: 10,
      invalidations: 5,
      errors: 2,
      clears: 1,
      hit_ratio: 0.8,
    },
    latest_cached: {
      timestamp: '2026-05-14T10:30:00Z',
      status: 200,
      content_type: 'text/html; charset=utf-8',
      body_size: 45678,
      header_count: 12,
      tag_count: 3,
      ttl_seconds: 1800,
      ttl_class: 'default',
      key: {
        key_hash: 'abc123def456',
        route_hint: '/teachings/video/123',
        render_prefix: true,
      },
    },
    observed_keys: [
      { observed_at: '2026-05-14T10:30:00Z', key_hash: 'abc123', route_hint: '/teachings/video/123', render_prefix: true },
      { observed_at: '2026-05-14T10:29:00Z', key_hash: 'def456', route_hint: '/teachings/audio/456', render_prefix: true },
    ],
    recent_operations: [
      { timestamp: '2026-05-14T10:30:00Z', operation: 'get', backend: 'valkey', outcome: 'hit' },
      { timestamp: '2026-05-14T10:29:30Z', operation: 'set', backend: 'valkey', outcome: 'success' },
    ],
    recent_errors: [],
    last_command: {
      timestamp: '2026-05-14T10:00:00Z',
      command: 'clear',
      mode: 'tag',
      backend: 'valkey',
      outcome: 'success',
      target_count: 15,
      message: 'Cleared 15 cached entries by tag',
    },
  },

  // Zero lookups (hit ratio should show N/A)
  zeroLookups: {
    configured: true,
    active: true,
    backend: 'valkey',
    status: 'healthy',
    scope: 'process_local',
    counters: {
      lookups: 0,
      hits: 0,
      misses: 0,
      writes: 0,
      errors: 0,
      clears: 0,
    },
    observed_keys: [],
    recent_operations: [],
    recent_errors: [],
  },

  // Startup error
  startupError: {
    configured: true,
    active: false,
    backend: 'valkey',
    status: 'startup_error',
    scope: 'process_local',
    startup_error: {
      timestamp: '2026-05-14T09:00:00Z',
      backend: 'valkey',
      error_kind: 'connection_failed',
      message: 'Failed to connect to Valkey at localhost:6379: connection refused',
      fail_closed: true,
    },
    counters: { lookups: 0, hits: 0, misses: 0, errors: 0 },
    observed_keys: [],
    recent_operations: [],
    recent_errors: [],
  },

  // Failed clear command
  failedClearCommand: {
    configured: true,
    active: true,
    backend: 'valkey',
    status: 'degraded',
    scope: 'process_local',
    counters: { lookups: 100, hits: 50, misses: 50, errors: 5 },
    last_command: {
      timestamp: '2026-05-14T10:00:00Z',
      command: 'clear',
      mode: 'tag',
      backend: 'valkey',
      outcome: 'failed',
      target_count: 0,
      message: 'Failed to clear cache: backend connection lost',
    },
    recent_errors: [
      {
        timestamp: '2026-05-14T10:00:00Z',
        operation: 'clear',
        backend: 'valkey',
        message: 'Backend connection lost during clear operation',
      },
    ],
    observed_keys: [],
    recent_operations: [],
  },

  // Unsupported clear command
  unsupportedClearCommand: {
    configured: true,
    active: true,
    backend: 'memory',
    status: 'healthy',
    scope: 'process_local',
    counters: { lookups: 50, hits: 25, misses: 25, errors: 0 },
    capabilities: {
      tag_invalidation: false,
      prefix_invalidation: false,
    },
    last_command: {
      timestamp: '2026-05-14T10:00:00Z',
      command: 'clear',
      mode: 'none',
      backend: 'memory',
      outcome: 'unsupported',
      target_count: 0,
      message: 'Site render cache is inactive or does not support tag-based clearing',
    },
    observed_keys: [],
    recent_operations: [],
    recent_errors: [],
  },

  // Raw key present (debug_keys enabled)
  rawKeyPresent: {
    configured: true,
    active: true,
    backend: 'valkey',
    status: 'healthy',
    scope: 'process_local',
    config: {
      enabled: true,
      debug_keys: true,
    },
    counters: { lookups: 100, hits: 80, misses: 20 },
    observed_keys: [
      {
        observed_at: '2026-05-14T10:30:00Z',
        key_redacted: false,
        key_hash: 'abc123def456',
        raw_key: 'site:v1:render:/teachings/video/123',
        route_hint: '/teachings/video/123',
        render_prefix: true,
      },
    ],
    recent_operations: [],
    recent_errors: [],
  },

  // Raw key absent (redacted)
  rawKeyAbsent: {
    configured: true,
    active: true,
    backend: 'valkey',
    status: 'healthy',
    scope: 'process_local',
    config: {
      enabled: true,
      debug_keys: false,
    },
    counters: { lookups: 100, hits: 80, misses: 20 },
    observed_keys: [
      {
        observed_at: '2026-05-14T10:30:00Z',
        key_redacted: true,
        key_hash: 'abc123def456',
        route_hint: '/teachings/video/123',
        render_prefix: true,
      },
    ],
    recent_operations: [],
    recent_errors: [],
  },

  // Null lists
  nullLists: {
    configured: true,
    active: true,
    backend: 'valkey',
    status: 'healthy',
    scope: 'process_local',
    counters: { lookups: 100, hits: 80, misses: 20 },
    observed_keys: null,
    recent_operations: null,
    recent_errors: null,
  },

  // Unsafe dynamic text (XSS test)
  unsafeText: {
    configured: true,
    active: true,
    backend: '<script>alert("xss")</script>',
    status: '<img onerror="alert(1)" src="x">',
    scope: 'process_local',
    observed_by: '"><img src=x onerror=alert(1)>',
    counters: { lookups: 1, hits: 0, misses: 1, errors: 0 },
    last_command: {
      timestamp: '2026-05-14T10:00:00Z',
      command: 'clear',
      mode: 'tag',
      backend: 'valkey',
      outcome: 'success',
      message: '<script>document.write("XSS")</script>',
    },
    startup_error: {
      timestamp: '2026-05-14T09:00:00Z',
      backend: 'valkey',
      error_kind: 'test',
      message: '<img src=x onerror="alert(document.cookie)">',
    },
    config: {
      namespace: '"><script>alert(1)</script>',
      render_version: '<img/src=x onerror=alert(1)>',
    },
    observed_keys: [
      {
        observed_at: '2026-05-14T10:30:00Z',
        key_hash: '<script>alert(1)</script>',
        route_hint: '"><img src=x onerror=alert(1)>',
        raw_key: '<script>document.cookie</script>',
        render_prefix: true,
      },
    ],
    recent_operations: [
      {
        timestamp: '2026-05-14T10:30:00Z',
        operation: '<script>alert(1)</script>',
        backend: '"><img src=x>',
        outcome: 'success',
        message: '<script>document.write("XSS")</script>',
      },
    ],
    recent_errors: [
      {
        timestamp: '2026-05-14T10:00:00Z',
        operation: 'get',
        backend: 'valkey',
        message: '<img src=x onerror="alert(document.domain)">',
      },
    ],
  },

  // Not configured
  notConfigured: {
    configured: false,
    active: false,
    backend: 'none',
    status: 'inactive',
  },

  // Inactive but configured
  inactiveConfigured: {
    configured: true,
    active: false,
    backend: 'valkey',
    status: 'inactive',
    scope: 'process_local',
    config: {
      enabled: false,
      backend: 'valkey',
    },
    counters: { lookups: 0, hits: 0, misses: 0, errors: 0 },
    observed_keys: [],
    recent_operations: [],
    recent_errors: [],
  },
};

// ============================================================================
// Tests
// ============================================================================

test('site render cache panel renders healthy state correctly', () => {
  const html = renderSiteRenderCachePanel(fixtures.healthy, consoleStyles);

  assert.match(html, /Healthy/i, 'should show healthy status');
  assert.match(html, /valkey/i, 'should show backend type');
  assert.match(html, /process_local/i, 'should show scope');
  assert.match(html, /Clear Cache/i, 'should show clear button when active');
  assert.match(html, /1,200/, 'should show hits count');
  assert.match(html, /80\.0%/, 'should show calculated hit ratio');
});

test('site render cache panel shows N/A for hit ratio when lookups is zero', () => {
  const html = renderSiteRenderCachePanel(fixtures.zeroLookups, consoleStyles);

  assert.match(html, /N\/A/i, 'should show N/A for hit ratio');
  assert.doesNotMatch(html, /NaN/, 'should not show NaN');
  assert.doesNotMatch(html, /Infinity/, 'should not show Infinity');
});

test('site render cache panel renders startup error prominently', () => {
  const html = renderSiteRenderCachePanel(fixtures.startupError, consoleStyles);

  assert.match(html, /Startup Error/i, 'should show startup error section');
  assert.match(html, /connection refused/i, 'should show error message');
  assert.match(html, /Fail Closed/i, 'should show fail_closed status');
});

test('site render cache panel renders failed clear command distinctly', () => {
  const html = renderSiteRenderCachePanel(fixtures.failedClearCommand, consoleStyles);

  assert.match(html, /Last Command/i, 'should show last command section');
  assert.match(html, /Failed/i, 'should show failed outcome');
  assert.match(html, /backend connection lost/i, 'should show error message');
});

test('site render cache panel renders unsupported clear command outcome', () => {
  const html = renderSiteRenderCachePanel(fixtures.unsupportedClearCommand, consoleStyles);

  assert.match(html, /Unsupported/i, 'should show unsupported outcome');
  assert.match(html, /inactive/i, 'should explain why clear is unsupported');
});

test('site render cache panel shows raw key when present', () => {
  const html = renderSiteRenderCachePanel(fixtures.rawKeyPresent, consoleStyles);

  assert.match(html, /site:v1:render:/, 'should show raw key');
  assert.match(html, /\/teachings\/video\/123/, 'should show route hint');
});

test('site render cache panel handles redacted keys correctly', () => {
  const html = renderSiteRenderCachePanel(fixtures.rawKeyAbsent, consoleStyles);

  assert.match(html, /\(redacted\)/i, 'should indicate key is redacted');
  // When redacted, we show route_hint as the key display (not raw_key)
  assert.match(html, /\/teachings\/video\/123/, 'should show route hint');
});

test('site render cache panel handles null/undefined lists safely', () => {
  const html = renderSiteRenderCachePanel(fixtures.nullLists, consoleStyles);

  // Should render without throwing
  assert.ok(html, 'should render without error');
  assert.doesNotMatch(html, /undefined/, 'should not show undefined');
  // Null lists should just be treated as empty
  assert.doesNotMatch(html, /null/, 'should not show null literally');
});

test('site render cache panel escapes unsafe dynamic text', () => {
  const html = renderSiteRenderCachePanel(fixtures.unsafeText, consoleStyles);

  // Should NOT contain unescaped HTML tags that could execute
  // Note: The attribute names like 'onerror' are harmless when angle brackets are escaped
  assert.doesNotMatch(html, /<script>/i, 'should escape script tags');
  assert.doesNotMatch(html, /<img[^>]*onerror/i, 'should escape img tags with onerror');

  // Should contain escaped versions (angle brackets as entities)
  assert.match(html, /&lt;script&gt;/i, 'should contain escaped script tag');
  assert.match(html, /&lt;img/i, 'should contain escaped img tag');
});

test('site render cache panel renders not configured state', () => {
  const html = renderSiteRenderCachePanel(fixtures.notConfigured, consoleStyles);

  assert.match(html, /Not Configured/i, 'should show not configured message');
  assert.doesNotMatch(html, /Clear Cache/, 'should not show clear button');
});

test('site render cache panel renders inactive but configured state', () => {
  const html = renderSiteRenderCachePanel(fixtures.inactiveConfigured, consoleStyles);

  assert.match(html, /Inactive/i, 'should show inactive status');
  assert.doesNotMatch(html, /data-debug-action="clear-panel"/, 'should not show clear button when inactive');
});

test('site render cache panel includes clear button with correct action', () => {
  const html = renderSiteRenderCachePanel(fixtures.healthy, consoleStyles);

  assert.match(html, /data-debug-action="clear-panel"/, 'should have clear-panel action attribute');
});

test('site render cache compact panel renders correctly', () => {
  const html = renderSiteRenderCachePanelCompact(fixtures.healthy, toolbarStyles);

  assert.match(html, /Healthy/i, 'should show status');
  assert.match(html, /valkey/i, 'should show backend');
  assert.match(html, /80\.0%/, 'should show hit ratio');
  assert.match(html, /data-debug-action="clear-panel"/, 'should include clear button');
});

test('site render cache compact panel shows N/A for zero lookups', () => {
  const html = renderSiteRenderCachePanelCompact(fixtures.zeroLookups, toolbarStyles);

  assert.match(html, /N\/A/i, 'should show N/A for hit ratio');
});

test('site render cache panel handles empty snapshot', () => {
  const html = renderSiteRenderCachePanel({}, consoleStyles);

  assert.ok(html, 'should render without error');
  assert.match(html, /Not Configured|No.*data/i, 'should show appropriate empty state');
});

test('site render cache panel handles null snapshot', () => {
  const html = renderSiteRenderCachePanel(null, consoleStyles);

  assert.ok(html, 'should render without error');
  assert.match(html, /No.*data|empty/i, 'should show empty state');
});

test('site render cache panel renders config section', () => {
  const html = renderSiteRenderCachePanel(fixtures.healthy, consoleStyles);

  assert.match(html, /Configuration/i, 'should have config section');
  assert.match(html, /fresh_ttl/i, 'should show TTL config');
  assert.match(html, /namespace/i, 'should show namespace');
});

test('site render cache panel renders capabilities section', () => {
  const html = renderSiteRenderCachePanel(fixtures.healthy, consoleStyles);

  assert.match(html, /Capabilities/i, 'should have capabilities section');
  assert.match(html, /Tag Invalidation/i, 'should show tag invalidation capability');
});

test('site render cache panel renders recent operations', () => {
  const html = renderSiteRenderCachePanel(fixtures.healthy, consoleStyles);

  assert.match(html, /Recent Operations/i, 'should have operations section');
  assert.match(html, /get|set/i, 'should show operation types');
});

test('site render cache panel renders recent errors with count', () => {
  const html = renderSiteRenderCachePanel(fixtures.failedClearCommand, consoleStyles);

  assert.match(html, /Recent Errors/i, 'should have errors section');
  assert.match(html, /\(1\)/, 'should show error count');
});

test('site render cache panel makes process_local scope visible', () => {
  const html = renderSiteRenderCachePanel(fixtures.healthy, consoleStyles);

  // The scope should be visually highlighted when process_local
  assert.match(html, /process_local/, 'should show process_local scope');
  // Could also check for warning styling, but at minimum the text should be present
});
