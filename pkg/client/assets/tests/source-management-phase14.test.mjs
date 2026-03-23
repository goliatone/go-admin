import test from 'node:test';
import assert from 'node:assert/strict';

const {
  PHASE_14_FIXTURE_ROUTES,
  PHASE_14_ARCHITECTURAL_INVARIANTS,
  VERSION_2_ARCHITECTURAL_INVARIANTS,
  createSourceListPageFixture,
  createSourceDetailFixture,
  createSourceRevisionPageFixture,
  createSourceRelationshipPageFixture,
  createPhase13SourceSearchResultsFixture,
  createPhase13SourceCommentPageFixture,
  createPassingPhase14PageConfig,
  createPhase14SurfacePageConfig,
  runPhase14PageGuards,
  setGuardEnforcementMode,
  runV2LandingZoneSmokeTests,
  validateFixtureRoutes,
  V2_LANDING_ZONE_SURFACES,
} = await import('../dist/esign/index.js');

function cloneFixture(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFixtureRouteFetchStub(routeFactories, calls) {
  return async (url, options = {}) => {
    const href = String(url);
    const method = options.method ?? 'GET';
    const route = href.startsWith('http')
      ? new URL(href).pathname + new URL(href).search
      : href;

    calls.push({ method, route });

    if (!(route in routeFactories)) {
      return {
        ok: false,
        status: 404,
        async json() {
          return { error: 'not found' };
        },
      };
    }

    if (method === 'HEAD') {
      return {
        ok: true,
        status: 200,
        async json() {
          return null;
        },
      };
    }

    const payload = routeFactories[route]();
    return {
      ok: true,
      status: 200,
      async json() {
        return cloneFixture(payload);
      },
      async text() {
        return JSON.stringify(payload);
      },
    };
  };
}

test('phase 14 public api is exported through the dist esign entrypoint', () => {
  assert.ok(PHASE_14_ARCHITECTURAL_INVARIANTS);
  assert.ok(VERSION_2_ARCHITECTURAL_INVARIANTS);
  assert.ok(runPhase14PageGuards);
  assert.ok(runV2LandingZoneSmokeTests);
  assert.ok(validateFixtureRoutes);
  assert.deepEqual(V2_LANDING_ZONE_SURFACES, [
    'source_list',
    'source_detail',
    'revision_history',
    'relationship_summaries',
    'search',
    'source_comment',
  ]);
});

test('phase 14 raw google field guard rejects direct page access even when approved adapters are imported', () => {
  setGuardEnforcementMode('disabled');

  try {
    const directAccessResult = runPhase14PageGuards({
      ...createPassingPhase14PageConfig('source-browser-page'),
      usedContracts: ['SourceListPage'],
      usedAdapters: ['source-management-adapters'],
      rawFieldAccesses: ['htmlContent', 'google_user_id'],
    });

    assert.equal(directAccessResult.violated, true);
    assert.equal(
      directAccessResult.results.some(
        (result) => result.guardName === 'checkRawGoogleFieldAccessViolation'
      ),
      true
    );

    const approvedBoundaryResult = runPhase14PageGuards({
      ...createPassingPhase14PageConfig('source-browser-page'),
      usedContracts: ['SourceListPage'],
      rawFieldAccesses: [
        {
          field: 'htmlContent',
          accessedThrough: 'source-management-adapters',
        },
      ],
    });

    assert.equal(approvedBoundaryResult.violated, false);
  } finally {
    setGuardEnforcementMode('warn');
  }
});

test('phase 14 surface guard configs are specific to each contract family and endpoint family', () => {
  const listConfig = createPhase14SurfacePageConfig('source_list', createSourceListPageFixture());
  assert.deepEqual(listConfig.usedContracts, ['SourceListPage']);
  assert.deepEqual(listConfig.searchContracts, []);
  assert.deepEqual(listConfig.commentContracts, []);
  assert.equal(listConfig.fetchedEndpoints[0], '/admin/api/v1/esign/sources');

  const searchFixture = createPhase13SourceSearchResultsFixture();
  const searchConfig = createPhase14SurfacePageConfig('search', searchFixture);
  assert.deepEqual(searchConfig.usedContracts, ['Phase13SourceSearchResults']);
  assert.equal(searchConfig.searchContracts.length, 1);
  assert.deepEqual(searchConfig.commentContracts, []);
  assert.match(searchConfig.fetchedEndpoints[0], /\/source-search\?/);
  assert.deepEqual(searchConfig.searchFieldsAccessed, [
    'comment_sync_status',
    'has_comments',
    'relationship_state',
    'comment_count',
  ]);
});

test('phase 14 smoke runner loads backend-owned fixture routes for all landing-zone surfaces', async () => {
  const calls = [];
  const routeFactories = {
    [PHASE_14_FIXTURE_ROUTES.source_list.route]: () => createSourceListPageFixture(),
    [PHASE_14_FIXTURE_ROUTES.source_detail.route]: () => createSourceDetailFixture(),
    [PHASE_14_FIXTURE_ROUTES.revision_history.route]: () => createSourceRevisionPageFixture(),
    [PHASE_14_FIXTURE_ROUTES.relationship_summaries.route]: () =>
      createSourceRelationshipPageFixture(),
    [PHASE_14_FIXTURE_ROUTES.search.route]: () => createPhase13SourceSearchResultsFixture(),
    [PHASE_14_FIXTURE_ROUTES.source_comment.route]: () =>
      createPhase13SourceCommentPageFixture(),
  };

  const fetchImpl = createFixtureRouteFetchStub(routeFactories, calls);
  const routeValidation = await validateFixtureRoutes({ fetchImpl });
  const smokeResult = await runV2LandingZoneSmokeTests({ fetchImpl });

  assert.equal(routeValidation.every((result) => result.available), true);
  assert.equal(smokeResult.passed, true);
  assert.deepEqual(
    calls.filter((call) => call.method === 'GET').map((call) => call.route),
    Object.values(PHASE_14_FIXTURE_ROUTES).map(({ route }) => route)
  );

  for (const surfaceResult of smokeResult.surfaces) {
    assert.equal(
      surfaceResult.fixtureRoute,
      PHASE_14_FIXTURE_ROUTES[surfaceResult.surface].route
    );
    assert.equal(
      surfaceResult.contractFamily,
      PHASE_14_FIXTURE_ROUTES[surfaceResult.surface].contractFamily
    );
  }
});
