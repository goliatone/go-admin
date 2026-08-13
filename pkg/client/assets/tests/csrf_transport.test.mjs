import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(path.resolve(testFileDir, relativePath), 'utf8');
}

function listTypeScriptFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(target);
    }
    return entry.isFile() && entry.name.endsWith('.ts') ? [target] : [];
  });
}

function enclosingFunctionName(node) {
  let current = node.parent;
  while (current) {
    if (
      (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current))
      && current.name
    ) {
      return current.name.getText();
    }
    current = current.parent;
  }
  return '<module>';
}

function rawFetchName(expression) {
  if (ts.isIdentifier(expression) && (expression.text === 'fetch' || expression.text === 'fetchImpl')) {
    return expression.text;
  }
  if (
    ts.isPropertyAccessExpression(expression)
    && (expression.name.text === 'fetch' || expression.name.text === 'fetchImpl')
    && expression.expression.kind !== ts.SyntaxKind.ThisKeyword
  ) {
    return expression.getText();
  }
  if (
    ts.isElementAccessExpression(expression)
    && ts.isStringLiteral(expression.argumentExpression)
    && expression.argumentExpression.text === 'fetch'
  ) {
    return expression.getText();
  }
  return '';
}

function requestMayBeUnsafe(init) {
  if (!init) {
    return false;
  }
  if (!ts.isObjectLiteralExpression(init)) {
    return true;
  }
  const methodIndex = init.properties.findLastIndex((property) => (
    (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property))
    && property.name.getText().replaceAll(/["']/g, '') === 'method'
  ));
  const method = methodIndex >= 0 ? init.properties[methodIndex] : undefined;
  if (method && ts.isShorthandPropertyAssignment(method)) {
    return true;
  }
  if (method && ts.isPropertyAssignment(method)) {
    if (ts.isStringLiteral(method.initializer)) {
      const normalized = method.initializer.text.trim().toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalized)) {
        return true;
      }
      return init.properties.slice(methodIndex + 1).some((property) => ts.isSpreadAssignment(property));
    }
    return true;
  }
  return init.properties.some((property) => ts.isSpreadAssignment(property));
}

function parseRequestInit(source) {
  const sourceFile = ts.createSourceFile(
    'request-init.ts',
    `fetch('/endpoint', ${source});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const statement = sourceFile.statements[0];
  assert.ok(ts.isExpressionStatement(statement));
  assert.ok(ts.isCallExpression(statement.expression));
  return statement.expression.arguments[1];
}

function rawUnsafeFetchCalls(sourceRoot) {
  return listTypeScriptFiles(sourceRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const calls = [];
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const callee = rawFetchName(node.expression);
        if (callee && requestMayBeUnsafe(node.arguments[1])) {
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          calls.push({
            file: path.relative(sourceRoot, file),
            functionName: enclosingFunctionName(node),
            callee,
            target: node.arguments[0]?.getText(sourceFile) ?? '',
            init: node.arguments[1]?.getText(sourceFile) ?? '',
            line: position.line + 1,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return calls;
  });
}

function withDocument(token = 'csrf-token') {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  const meta = {
    getAttribute(name) {
      if (name !== 'content') {
        return null;
      }
      return token;
    },
  };

  globalThis.document = {
    readyState: 'loading',
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) {
      if (selector === 'meta[name="csrf-token"]') {
        return meta;
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    body: {},
    documentElement: {},
  };
  globalThis.window = { document: globalThis.document };

  return () => {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  };
}

async function importFresh(relativePath) {
  const moduleURL = new URL(relativePath, import.meta.url);
  moduleURL.searchParams.set('t', String(Date.now() + Math.random()));
  return await import(moduleURL.href);
}

test('csrf-aware transport is adopted by shared wrappers and admin mutation pages', () => {
  const contentTypeAPIClientSource = readSource('../src/content-type-builder/api-client.ts');
  const menuBuilderAPIClientSource = readSource('../src/menu-builder/api-client.ts');
  const errorHelpersSource = readSource('../src/toast/error-helpers.ts');
  const servicesAPIClientSource = readSource('../src/services/api-client.ts');
  const translationExchangeSource = readSource('../src/translation-exchange/translation-exchange-manager.ts');
  const importModalSource = readSource('../src/components/import-modal.ts');
  const usersTemplateSource = readSource('../../templates/resources/users/list.html');
  const exchangeImportSource = readSource('../src/datatable/exchange-import.ts');
  const debugPanelSource = readSource('../src/debug/debug-panel.ts');
  const debugToolbarSource = readSource('../src/debug/toolbar/debug-toolbar.ts');
  const registerTemplateSource = readSource('../../templates/register.html');
  const layoutTemplateSource = readSource('../../templates/layout.html');
  const csrfRecoveryAlertSource = readSource('../../templates/partials/csrf-recovery-alert.html');
  const loginLayoutTemplateSource = readSource('../../templates/login-layout.html');
  const debugStandaloneTemplateSource = readSource('../../templates/resources/debug/index.html');
  const browserGlobalsSource = readSource('../src/shared/transport/browser-globals.ts');
  const commandRuntimeSource = readSource('../src/services/command-runtime.ts');
  const translationMatrixSource = readSource('../src/translation-matrix/index.ts');

  assert.match(contentTypeAPIClientSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(contentTypeAPIClientSource, /const response = await httpRequest\(url, \{/);

  assert.match(menuBuilderAPIClientSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(menuBuilderAPIClientSource, /const response = await httpRequest\(path, \{/);

  assert.match(errorHelpersSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(errorHelpersSource, /const response = await httpRequest\(endpoint, options\);/);

  assert.match(servicesAPIClientSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(servicesAPIClientSource, /return await httpRequest\(url, options\);/);

  assert.match(translationExchangeSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(translationExchangeSource, /const response = await httpRequest\(path, init\);/);

  assert.doesNotMatch(importModalSource, /httpRequest|shared\/transport\/http-client/, 'the generic import component owns no application transport');
  assert.match(usersTemplateSource, /assets\/dist\/shared\/transport\/http-client\.js/);
  assert.match(usersTemplateSource, /response = await httpRequest\(`\$\{apiRoot\}\/users-import`, \{/);

  assert.match(exchangeImportSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.ok((exchangeImportSource.match(/await httpRequest\(/g) || []).length >= 3);

  assert.match(debugPanelSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.ok((debugPanelSource.match(/httpRequest\(`\$\{this\.debugPath\}/g) || []).length >= 3);
  assert.match(debugPanelSource, /readHTTPErrorResult\(response, `Action failed \(\$\{response\.status\}\)`/);
  assert.match(debugPanelSource, /readExpectedHTTPJSON<\{ ok\?: boolean; message\?: string;/);
  assert.match(debugToolbarSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(debugToolbarSource, /readHTTPError\(response, `Action failed \(\$\{response\.status\}\)`/);
  assert.match(debugToolbarSource, /readExpectedHTTPJSON<\{ ok\?: boolean; message\?: string;/);
  assert.doesNotMatch(debugPanelSource, /const result = await response\.json\(\)/);
  assert.doesNotMatch(debugToolbarSource, /const result = await response\.json\(\)/);

  assert.equal((registerTemplateSource.match(/\{\{\s*csrf_field\|safe\s*\}\}/g) || []).length, 2);
  assert.match(browserGlobalsSource, /from '\.\/http-client\.js'/);
  assert.match(browserGlobalsSource, /return httpRequestWith\(fetch\.bind\(globalThis\), input, init\);/);
  assert.match(layoutTemplateSource, /assets\/dist\/runtime\/go-admin-browser\.js/);
  assert.match(layoutTemplateSource, /partials\/csrf-recovery-alert\.html/);
  assert.match(csrfRecoveryAlertSource, /role="alert"/);
  assert.match(csrfRecoveryAlertSource, /csrf_error_message/);
  assert.match(loginLayoutTemplateSource, /assets\/dist\/runtime\/go-admin-browser\.js/);
  assert.match(debugStandaloneTemplateSource, /\{\{\s*csrf_meta\|safe\s*\}\}/);
  assert.doesNotMatch(layoutTemplateSource, /window\.goAdminFetch = function/);
  assert.doesNotMatch(loginLayoutTemplateSource, /window\.goAdminFetch = function/);
  assert.match(commandRuntimeSource, /httpRequestWith\(this\.fetchImpl, endpoint, \{/);
  assert.match(commandRuntimeSource, /httpRequestWith\(this\.fetchImpl, this\.rpcEndpoint, \{/);
  assert.doesNotMatch(commandRuntimeSource, /this\.fetchImpl\((?:endpoint|this\.rpcEndpoint), \{\s*method: 'POST'/);
  assert.match(translationMatrixSource, /httpRequestWith\(fetchImpl, actionEndpoint, \{/);
  assert.doesNotMatch(translationMatrixSource, /fetchImpl\(actionEndpoint, \{/);
});

test('admin client source routes unsafe methods through an approved csrf-aware boundary', () => {
  const sourceRoot = path.resolve(testFileDir, '../src');
  const calls = rawUnsafeFetchCalls(sourceRoot);
  const approved = calls.filter((call) => (
    call.file === 'shared/transport/http-client.ts'
      && call.functionName === 'httpRequestWith'
      && call.callee === 'fetchImpl'
      && call.target === 'input'
  ) || (
    call.file === 'media/index.ts'
      && call.functionName === 'performPresignedUpload'
      && call.callee === 'fetch'
      && call.target === 'uploadURL'
      && call.init.includes('presign.method')
  ));
  const offenders = calls.filter((call) => !approved.includes(call));

  assert.deepEqual(offenders, []);
  assert.equal(approved.filter((call) => call.file === 'shared/transport/http-client.ts').length, 1);
  assert.equal(approved.filter((call) => call.file === 'media/index.ts').length, 2);
});

test('raw-fetch audit treats dynamic and overriding request methods as unsafe', () => {
  assert.equal(requestMayBeUnsafe(parseRequestInit("{ method: 'POST' }")), true);
  assert.equal(requestMayBeUnsafe(parseRequestInit('{ method }')), true);
  assert.equal(requestMayBeUnsafe(parseRequestInit("{ method: 'GET', ...options }")), true);
  assert.equal(requestMayBeUnsafe(parseRequestInit("{ ...options, method: 'GET' }")), false);
  assert.equal(requestMayBeUnsafe(parseRequestInit("{ method: 'GET' }")), false);
});

test('httpRequestWith prepares csrf headers before invoking an injected fetch', async () => {
  const restoreDocument = withDocument('injected-fetch-csrf');
  const originalLocation = globalThis.location;
  globalThis.location = new URL('https://example.com/admin/translations/matrix');
  const requests = [];
  const fetchImpl = async (input, init = {}) => {
    requests.push({ input, url: String(input), init });
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const { httpRequestWith } = await importFresh('../dist/shared/transport/http-client.js');
    await httpRequestWith(fetchImpl, '/admin/api/rpc', { method: 'POST' });
    await httpRequestWith(fetchImpl, '/admin/api/rpc', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'caller-token' },
    });
    await httpRequestWith(fetchImpl, 'https://external.example.com/rpc', { method: 'POST' });
    await httpRequestWith(fetchImpl, '//external.example.com/rpc', { method: 'POST' });
    await httpRequestWith(fetchImpl, '\\\\external.example.com/rpc', { method: 'POST' });
    await httpRequestWith(fetchImpl, '//example.com/rpc', { method: 'POST' });
    await httpRequestWith(fetchImpl, '/admin/api/rpc', { method: 'GET' });

    const request = new Request('https://example.com/admin/api/rpc', {
      method: 'POST',
      headers: { 'X-Request-Source': 'request-object' },
      body: 'request-body',
    });
    await httpRequestWith(fetchImpl, request);

    assert.equal(new Headers(requests[0].init.headers).get('X-CSRF-Token'), 'injected-fetch-csrf');
    assert.equal(new Headers(requests[1].init.headers).get('X-CSRF-Token'), 'caller-token');
    assert.equal(new Headers(requests[2].init.headers).get('X-CSRF-Token'), null);
    assert.equal(new Headers(requests[3].init.headers).get('X-CSRF-Token'), null);
    assert.equal(new Headers(requests[4].init.headers).get('X-CSRF-Token'), null);
    assert.equal(new Headers(requests[5].init.headers).get('X-CSRF-Token'), 'injected-fetch-csrf');
    assert.equal(new Headers(requests[6].init.headers).get('X-CSRF-Token'), null);
    assert.equal(requests[7].input, request);
    assert.equal(requests[7].init.method, undefined);
    assert.equal(Object.hasOwn(requests[7].init, 'body'), false);
    assert.equal(new Headers(requests[7].init.headers).get('X-Request-Source'), 'request-object');
    assert.equal(new Headers(requests[7].init.headers).get('X-CSRF-Token'), 'injected-fetch-csrf');
    assert.equal(await request.text(), 'request-body');
  } finally {
    if (originalLocation === undefined) {
      delete globalThis.location;
    } else {
      globalThis.location = originalLocation;
    }
    restoreDocument();
  }
});

test('browser globals install window.goAdminFetch with the shared csrf rules', async () => {
  const restoreDocument = withDocument('browser-globals-csrf');
  const originalFetch = globalThis.fetch;
  const originalLocation = globalThis.location;
  const requests = [];

  globalThis.location = new URL('https://example.com/admin/feature-flags');
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ input: String(input), init });
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const module = await importFresh('../dist/shared/transport/browser-globals.js');
    assert.equal(typeof globalThis.window.goAdminFetch, 'function');
    assert.equal(typeof globalThis.window.goAdminCSRFHeaders, 'function');
    assert.equal(typeof globalThis.window.goAdminGetCSRFToken, 'function');
    assert.equal(typeof module.goAdminFetch, 'function');
    assert.equal(typeof module.goAdminCSRFHeaders, 'function');
    assert.equal(typeof module.installBrowserCSRFGlobals, 'function');

    await globalThis.window.goAdminFetch('/admin/api/dashboard/preferences', { method: 'POST' });
    await globalThis.window.goAdminFetch('https://external.example.com/api', { method: 'POST' });
    assert.equal(requests.length, 2);

    const sameOriginHeaders = requests[0].init.headers instanceof Headers
      ? requests[0].init.headers
      : new Headers(requests[0].init.headers || {});
    const crossOriginHeaders = requests[1].init.headers instanceof Headers
      ? requests[1].init.headers
      : new Headers(requests[1].init.headers || {});

    assert.equal(sameOriginHeaders.get('X-CSRF-Token'), 'browser-globals-csrf');
    assert.equal(crossOriginHeaders.get('X-CSRF-Token'), null);
    assert.equal(globalThis.window.goAdminGetCSRFToken(), 'browser-globals-csrf');
    assert.equal(globalThis.window.goAdminCSRFHeaders({ Accept: 'application/json' }).get('X-CSRF-Token'), 'browser-globals-csrf');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    if (originalLocation === undefined) {
      delete globalThis.location;
    } else {
      globalThis.location = originalLocation;
    }
    restoreDocument();
  }
});

test('executeStructuredRequest appends csrf headers for same-origin unsafe requests', async () => {
  const restoreDocument = withDocument('structured-request-csrf');
  const originalFetch = globalThis.fetch;
  const { executeStructuredRequest } = await importFresh('../dist/toast/error-helpers.js');
  const requests = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await executeStructuredRequest('/admin/api/panels/articles/article_123', {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    assert.equal(result.success, true);
    assert.equal(requests.length, 1);
    const headers = requests[0].init.headers instanceof Headers
      ? requests[0].init.headers
      : new Headers(requests[0].init.headers || {});
    assert.equal(headers.get('X-CSRF-Token'), 'structured-request-csrf');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    restoreDocument();
  }
});

test('MenuBuilderAPIClient appends csrf headers on mutating requests', async () => {
  const restoreDocument = withDocument('menu-builder-csrf');
  const originalFetch = globalThis.fetch;
  const { MenuBuilderAPIClient } = await importFresh('../dist/menu-builder/index.js');
  const requests = [];
  const responses = [
    {
      contracts: {
        endpoints: {
          'menu.view_profiles': '/admin/api/menu-view-profiles',
        },
        error_codes: {},
      },
    },
    {
      profile: { code: 'default', name: 'Default', mode: 'full', status: 'draft' },
    },
  ];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    const payload = responses.shift();
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      async json() {
        return payload;
      },
      async text() {
        return JSON.stringify(payload);
      },
    };
  };

  try {
    const client = new MenuBuilderAPIClient({ basePath: '/admin/api' });
    await client.createProfile({ code: 'default', name: 'Default' });

    assert.equal(requests.length, 2);
    const headers = requests[1].init.headers instanceof Headers
      ? requests[1].init.headers
      : new Headers(requests[1].init.headers || {});
    assert.equal(requests[1].init.method, 'POST');
    assert.equal(headers.get('X-CSRF-Token'), 'menu-builder-csrf');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    restoreDocument();
  }
});

test('ContentTypeAPIClient appends csrf headers on mutating requests', async () => {
  const restoreDocument = withDocument('content-type-csrf');
  const originalFetch = globalThis.fetch;
  const { ContentTypeAPIClient } = await importFresh('../dist/content-type-builder/index.js');
  const requests = [];

  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      async json() {
        return { item: { id: 'news', slug: 'news', name: 'News' } };
      },
      async text() {
        return JSON.stringify({ item: { id: 'news', slug: 'news', name: 'News' } });
      },
      clone() {
        return this;
      },
    };
  };

  try {
    const client = new ContentTypeAPIClient({ basePath: '/admin' });
    await client.create({ slug: 'news', name: 'News' });

    assert.equal(requests.length, 1);
    const headers = requests[0].init.headers instanceof Headers
      ? requests[0].init.headers
      : new Headers(requests[0].init.headers || {});
    assert.equal(requests[0].init.method, 'POST');
    assert.equal(headers.get('X-CSRF-Token'), 'content-type-csrf');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    restoreDocument();
  }
});
