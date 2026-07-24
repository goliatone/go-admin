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
const bootstrapDOM = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1:9090/' });
globalThis.window = bootstrapDOM.window;
globalThis.self = bootstrapDOM.window;
globalThis.document = bootstrapDOM.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: bootstrapDOM.window.navigator,
  configurable: true,
  writable: true,
});
globalThis.Node = bootstrapDOM.window.Node;
globalThis.Element = bootstrapDOM.window.Element;
globalThis.HTMLElement = bootstrapDOM.window.HTMLElement;
globalThis.customElements = bootstrapDOM.window.customElements;

const toolbar = await import('../dist/debug/shared-helpers.js');
const {
  panelDefinitionFromServer,
  renderPanelContent,
  renderSchemaIdentity,
  renderSchemaKeyValue,
  consoleStyles,
  toolbarStyles,
} = await import('../dist/debug/index.js');

// ---------------------------------------------------------------------------
// Collapsed floating indicator
// ---------------------------------------------------------------------------

test('deployment indicator renders canonical compact identity', () => {
  assert.deepEqual(toolbar.deploymentIndicator({
    deployment: {
      environment: { name: 'staging', color: '#f97316' },
      runtime: { instance_name: 'brisk-otter' },
      application: { version: 'v1.2.3' },
      build: { commit_short: '9f2c1ab' },
    },
  }), {
    label: 'STAGING · brisk-otter',
    color: '#f97316',
    environment: 'STAGING',
    environmentShort: 'STG',
    instance: 'brisk-otter',
    title: 'Environment: staging · Instance: brisk-otter · Version: v1.2.3 · Commit: 9f2c1ab',
  });
});

test('deployment indicator shortens known environments and bounds unknown ones', () => {
  const short = (name) => toolbar.deploymentIndicator({
    deployment: { environment: { name }, runtime: { instance_name: 'x' } },
  }).environmentShort;
  assert.equal(short('development'), 'DEV');
  assert.equal(short('prod'), 'PROD');
  assert.equal(short('stage'), 'STG');
  assert.equal(short('qa'), 'QA');
  // Unknown short names stay verbatim; unknown long names are bounded.
  assert.equal(short('canary'), 'CANA');
  assert.equal(short('edge'), 'EDGE');
});

test('deployment indicator rejects unsafe colors and tolerates legacy snapshots', () => {
  const unsafe = toolbar.deploymentIndicator({
    deployment: {
      environment: { name: 'qa', color: 'url(javascript:bad)' },
      runtime: { instance_name: '<unsafe>' },
    },
  });
  assert.equal(unsafe.color, '#64748b');
  assert.equal(unsafe.label, 'QA · <unsafe>');
  assert.equal(unsafe.instance, '<unsafe>');
  // A legacy payload without version/commit still produces a usable summary.
  assert.equal(unsafe.title, 'Environment: qa · Instance: <unsafe>');
  assert.equal(toolbar.deploymentIndicator({}), null);
  assert.equal(toolbar.deploymentIndicator({ deployment: { environment: { name: 'prod' } } }), null);
});

test('deployment indicator honors toolbar panel configuration', () => {
  const snapshot = {
    deployment: {
      environment: { name: 'production', color: '#22c55e' },
      runtime: { instance_name: 'steady-heron' },
    },
  };
  assert.equal(toolbar.deploymentIndicator(snapshot, ['requests', 'sql']), null);
  const shown = toolbar.deploymentIndicator(snapshot, ['requests', 'DEPLOYMENT']);
  assert.equal(shown.label, 'PRODUCTION · steady-heron');
  assert.equal(shown.color, '#22c55e');
  assert.equal(shown.environmentShort, 'PROD');
});

test('deployment indicator prefers a validated persona and rejects malformed visuals', () => {
  const base = {
    environment: { name: 'staging', color: '#f97316' },
    runtime: { instance_name: 'process-1' },
  };
  const shown = toolbar.deploymentIndicator({ deployment: {
    ...base,
    persona: {
      name: 'lively-raven',
      algorithm: 'go-admin-monogram',
      version: 'v1',
      visual: { kind: 'monogram', text: 'LR', alt: 'Lively raven', background: '#0f766e', foreground: '#f0fdfa' },
    },
  } });
  assert.equal(shown.label, 'STAGING · lively-raven');
  assert.equal(shown.instance, 'process-1');
  assert.equal(shown.persona.name, 'lively-raven');
  assert.match(shown.title, /Persona: lively-raven/);

  const malformed = toolbar.deploymentIndicator({ deployment: {
    ...base,
    persona: {
      name: '<script>',
      visual: { kind: 'image', alt: 'bad', media_type: 'text/html', data: 'PHNjcmlwdD4=' },
    },
  } });
  assert.equal(malformed.label, 'STAGING · process-1');
  assert.equal(malformed.persona, undefined);
});

test('persona avatar constructs only bounded passive PNG data URLs', () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const html = toolbar.renderDeploymentPersonaAvatar({
    name: 'image-persona',
    visual: { kind: 'image', alt: 'Image persona', media_type: 'image/png', data: png },
  });
  assert.match(html, /^<span class="deployment-persona-avatar"><img src="data:image\/png;base64,/);
  assert.match(html, /alt="Image persona"/);
  assert.equal(toolbar.renderDeploymentPersonaAvatar({
    name: 'bad',
    visual: { kind: 'image', alt: 'bad', media_type: 'image/svg+xml', data: '<svg>' },
  }), '');
  assert.equal(toolbar.renderDeploymentPersonaAvatar({
    name: 'oversized',
    visual: { kind: 'image', alt: 'oversized', media_type: 'image/png', data: `iVBORw0KGgo${'A'.repeat(88_000)}` },
  }), '');
});

// ---------------------------------------------------------------------------
// Shared identity renderer
// ---------------------------------------------------------------------------

const identityView = {
  renderer: 'identity',
  title: 'Instance',
  options: {
    color_bind: 'environment.color',
    eyebrow_bind: 'environment.name',
    title_bind: 'runtime.instance_name',
    title_format: 'copy',
    title_label: 'instance name',
    subtitle_bind: 'application.name',
    empty: 'Unnamed instance',
    chips: [
      { label: 'Version', bind: 'application.version', empty: 'Unavailable' },
      { label: 'Commit', bind: 'build.commit_short', format: 'mono', empty: 'Unavailable' },
    ],
  },
};

const fullPayload = {
  application: { id: 'acme', name: 'Acme Admin', version: 'v1.24.3' },
  environment: { name: 'staging', color: '#F97316' },
  build: { commit_sha: '9f2c1ab7de5540b6a0f31e77c9bd42a1e8b6d310', commit_short: '9f2c1ab', build_time: '2026-07-22T18:40:12Z', modified: true },
  runtime: { instance_name: 'brisk-otter', instance_id: 'abc-123', uptime: '3h17m22s' },
};

test('identity renderer leads with environment accent, instance, and chips', () => {
  const html = renderSchemaIdentity('Instance', fullPayload, identityView, consoleStyles);
  assert.match(html, /--debug-identity-color:#f97316/);
  assert.match(html, /debug-identity__env[\s\S]*STAGING/);
  assert.match(html, /debug-identity__subtitle">Acme Admin</);
  // The instance name stays copyable with an accessible action name.
  assert.match(html, /data-copy-content="brisk-otter"/);
  assert.match(html, /aria-label="Copy instance name"/);
  assert.match(html, /debug-identity__chip[\s\S]*Version[\s\S]*v1\.24\.3/);
  assert.match(html, /debug-kv__mono">9f2c1ab</);
});

test('identity renderer never lets a payload color reach CSS', () => {
  const html = renderSchemaIdentity('Instance', {
    environment: { name: 'qa', color: 'red;background:url(javascript:1)' },
    runtime: { instance_name: 'plucky-lynx' },
  }, identityView, consoleStyles);
  assert.doesNotMatch(html, /--debug-identity-color/);
  assert.match(html, /data-accent="none"/);
  assert.doesNotMatch(html, /javascript/);
});

test('identity renderer degrades when the payload lacks identity fields', () => {
  const partial = renderSchemaIdentity('Instance', {
    environment: { name: 'development', color: '#ef4444' },
    runtime: {},
  }, identityView, consoleStyles);
  assert.match(partial, /DEVELOPMENT/);
  assert.match(partial, /debug-kv__empty">Unnamed instance</);
  // Absent chips are omitted rather than rendered as empty slots.
  assert.doesNotMatch(partial, /debug-identity__chip/);

  const empty = renderSchemaIdentity('Instance', {}, identityView, consoleStyles);
  assert.match(empty, /No instance details available/);
});

test('identity renderer ignores unbound options instead of serializing the payload', () => {
  const html = renderSchemaIdentity('Instance', fullPayload, {
    renderer: 'identity',
    options: { title_bind: 'runtime.instance_name' },
  }, consoleStyles);
  assert.doesNotMatch(html, /debug-identity__subtitle/);
  assert.doesNotMatch(html, /application/);
  assert.match(html, /brisk-otter/);
});

test('identity renderer displays safe monogram and PNG avatars with title fallback', () => {
  const personaView = {
    ...identityView,
    options: {
      ...identityView.options,
      title_bind: 'persona.name',
      title_fallback_bind: 'runtime.instance_name',
      title_fallback_label: 'instance name',
      avatar_bind: 'persona.visual',
      avatar_name_bind: 'persona.name',
    },
  };
  const monogram = renderSchemaIdentity('Persona', {
    ...fullPayload,
    persona: {
      name: 'lively-raven',
      visual: { kind: 'monogram', text: 'LR', alt: 'Lively raven', background: '#0f766e', foreground: '#f0fdfa' },
    },
  }, personaView, consoleStyles);
  assert.match(monogram, /debug-identity__avatar/);
  assert.match(monogram, /aria-label="Lively raven"/);
  assert.match(monogram, /--persona-background:#0f766e/);
  assert.match(monogram, /data-copy-content="lively-raven"/);

  const legacy = renderSchemaIdentity('Persona', fullPayload, personaView, consoleStyles);
  assert.match(legacy, /data-copy-content="brisk-otter"/);
  assert.match(legacy, /aria-label="Copy instance name"/);
  assert.doesNotMatch(legacy, /debug-identity__avatar/);
});

// ---------------------------------------------------------------------------
// Shared key/value renderer
// ---------------------------------------------------------------------------

test('key/value renderer emits a styled definition list with declared formats', () => {
  const html = renderSchemaKeyValue('Build', fullPayload.build, {
    renderer: 'key_value',
    options: {
      fields: [
        { label: 'Commit', bind: 'commit_sha', format: 'copy', empty: 'Unavailable' },
        { label: 'Short commit', bind: 'commit_short', format: 'mono', empty: 'Unavailable' },
        { label: 'Dirty build', bind: 'modified', format: 'boolean', empty: 'Unavailable' },
        { label: 'Source ref', bind: 'git_ref', empty: 'Unavailable' },
      ],
    },
  }, consoleStyles);
  assert.match(html, /<dl class="debug-kv">/);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<dt>Commit<\/dt><dd>.*data-copy-content="9f2c1ab7de5540b6a0f31e77c9bd42a1e8b6d310"/);
  assert.match(html, /aria-label="Copy Commit"/);
  assert.match(html, /<dt>Dirty build<\/dt><dd>Yes<\/dd>/);
  assert.match(html, /<dt>Source ref<\/dt><dd><span class="debug-kv__empty">Unavailable<\/span><\/dd>/);
  // Section titles use the surface's own header markup, not a bare heading.
  assert.match(html, /debug-json-header.*<h3/s);
});

test('key/value renderer formats absolute and safe display values', () => {
  const html = renderSchemaKeyValue('Meta', {
    build_time: '2026-07-22T18:40:12Z',
    color: '#22C55E',
    unsafe: 'rgb(1,2,3)',
    env: 'staging',
  }, {
    renderer: 'key_value',
    options: {
      fields: [
        { label: 'Build time', bind: 'build_time', format: 'datetime' },
        { label: 'Color', bind: 'color', format: 'color' },
        { label: 'Unsafe color', bind: 'unsafe', format: 'color', empty: 'Unavailable' },
        { label: 'Environment', bind: 'env', format: 'badge' },
      ],
    },
  }, consoleStyles);
  // `datetime` keeps the calendar date that `timestamp` drops.
  assert.match(html, /<dt>Build time<\/dt><dd>[^<]*2026[^<]*<\/dd>/);
  assert.match(html, /--debug-swatch-color:#22c55e/);
  assert.match(html, /#22C55E/);
  assert.match(html, /<dt>Unsafe color<\/dt><dd><span class="debug-kv__empty">Unavailable<\/span><\/dd>/);
  assert.doesNotMatch(html, /rgb\(1,2,3\)/);
  assert.match(html, /<dt>Environment<\/dt><dd><span class="badge">staging<\/span><\/dd>/);
});

test('key/value renderer escapes hostile labels and values', () => {
  const html = renderSchemaKeyValue('Danger', { field: '<img src=x onerror=alert(1)>' }, {
    renderer: 'key_value',
    options: { fields: [{ label: '<b>label</b>', bind: 'field', format: 'copy' }] },
  }, consoleStyles);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<b>label<\/b>/);
  assert.match(html, /&lt;img/);
});

// ---------------------------------------------------------------------------
// End-to-end panel hydration for both surfaces
// ---------------------------------------------------------------------------

function deploymentServerDefinition() {
  const field = (label, bind, format) => {
    const out = { label, bind, empty: 'Unavailable' };
    if (format) out.format = format;
    return out;
  };
  const section = (title, bind, fields) => ({ renderer: 'key_value', title, bind, options: { fields } });
  const detail = {
    renderer: 'stack',
    options: { layout: 'grid' },
    sections: [
      section('Application', 'application', [field('Application name', 'name'), field('Version', 'version')]),
      section('Environment', 'environment', [field('Environment', 'name', 'badge'), field('Color', 'color', 'color')]),
      section('Build', 'build', [field('Commit', 'commit_sha', 'copy'), field('Build time', 'build_time', 'datetime')]),
      section('Runtime', 'runtime', [field('Instance name', 'instance_name', 'copy'), field('Uptime', 'uptime')]),
    ],
  };
  return {
    id: 'deployment',
    label: 'Deployment',
    snapshot_key: 'deployment',
    supports_toolbar: true,
    ui: {
      schema_version: '1',
      views: {
        console: { renderer: 'stack', sections: [identityView, detail] },
        toolbar: { renderer: 'stack', sections: [identityView, detail] },
      },
    },
  };
}

test('deployment panel hydrates identity plus grouped detail on both surfaces', () => {
  const panel = panelDefinitionFromServer(deploymentServerDefinition());
  assert.ok(panel, 'the identity renderer must be a supported schema view');
  for (const [context, styles] of [['console', consoleStyles], ['toolbar', toolbarStyles]]) {
    const html = renderPanelContent(panel, fullPayload, styles, {}, context);
    assert.doesNotMatch(html, /Panel UI degraded/, `${context} view should not fall back to JSON`);
    assert.match(html, /debug-identity/, `${context} view should render the identity header`);
    assert.match(html, /<div class="debug-schema-grid">/, `${context} detail should flow into columns`);
    assert.match(html, /<dl class="debug-kv">/, `${context} detail should render key/value pairs`);
    assert.match(html, /data-copy-content="9f2c1ab7de5540b6a0f31e77c9bd42a1e8b6d310"/);
    assert.match(html, /brisk-otter/);
  }
});

test('deployment panel renders a legacy payload without fabricating values', () => {
  const panel = panelDefinitionFromServer(deploymentServerDefinition());
  const html = renderPanelContent(panel, {
    environment: { name: 'development' },
    runtime: { instance_name: 'plucky-lynx' },
  }, consoleStyles, {}, 'console');
  assert.match(html, /DEVELOPMENT/);
  assert.match(html, /plucky-lynx/);
  assert.match(html, /debug-kv__empty">Unavailable</);
  assert.doesNotMatch(html, /undefined/);
  assert.doesNotMatch(html, /--debug-identity-color/);
});

test('unknown renderers still degrade to the JSON fallback', () => {
  const panel = panelDefinitionFromServer({
    id: 'deployment',
    label: 'Deployment',
    ui: { schema_version: '1', views: { console: { renderer: 'hologram' } } },
  });
  const html = renderPanelContent(panel, fullPayload, consoleStyles, {}, 'console');
  assert.match(html, /Panel UI degraded/);
});
