package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	demo "github.com/goliatone/go-admin/examples/web/datamodule"
	router "github.com/goliatone/go-router"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func TestDataInsightsReferenceHTTPReadyQuietObservedAndPinnedActive(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "insights-http.db"), nil)
	ready := data.ExploreSelection{Dataset: f.input.Dataset, Scenario: f.input.Scenario, TargetID: demo.TargetID, Context: data.ExploreCatalog}
	meta, err := f.service.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: ready})
	if err != nil {
		t.Fatal(err)
	}
	quiet := ready
	for _, scenario := range meta.Scenarios {
		if scenario.Scenario.ID == "quiet" {
			quiet.Scenario = scenario.Scenario
		}
	}
	params := func(left, right data.ExploreSelection) url.Values {
		t.Helper()
		l, leftErr := json.Marshal(left)
		if leftErr != nil {
			t.Fatal(leftErr)
		}
		r, rightErr := json.Marshal(right)
		if rightErr != nil {
			t.Fatal(rightErr)
		}
		return url.Values{"selection": {string(l)}, "left": {string(l)}, "right": {string(r)}, "metric_set_id": {"orders"}}
	}
	get := func(kind string, values url.Values) *httpResult {
		res := f.request(t, http.MethodGet, "/admin/data/api/explore/"+kind+"?"+values.Encode(), "operator", nil)
		return &httpResult{status: res.Code, body: res.Body.Bytes()}
	}
	f.execute.Store(false)
	res := get("insights", params(ready, quiet))
	var insights data.ExploreInsights
	if res.status != 200 || json.Unmarshal(res.body, &insights) != nil || insights.Provenance != "example" || *insights.Metrics[0].Value != 3 {
		t.Fatal(res.status, string(res.body))
	}
	res = get("compare", params(ready, quiet))
	var compared data.SelectionComparison
	if res.status != 200 || json.Unmarshal(res.body, &compared) != nil || compared.Metrics[0].Delta != nil || compared.Metrics[0].Reason != "not_observed" {
		t.Fatal(res.status, string(res.body))
	}
	bad := params(ready, quiet)
	bad.Set("right", strings.TrimSuffix(bad.Get("right"), "}")+`,"actor_id":"forged"}`)
	if res = get("compare", bad); res.status != 400 {
		t.Fatal(res.status, string(res.body))
	}
	bad = params(ready, quiet)
	bad.Set("limit", "33")
	if res = get("insights", bad); res.status != 400 {
		t.Fatal(res.status, string(res.body))
	}
	bad = params(ready, quiet)
	bad.Set("from", "2026-01-01")
	bad.Set("to", "2026-04-01")
	if res = get("compare", bad); res.status != 400 {
		t.Fatal(res.status, string(res.body))
	}
	f.execute.Store(true)
	prepare := func(selection data.ExploreSelection, key string) data.ExploreSelection {
		t.Helper()
		in := f.input
		in.Scenario = selection.Scenario
		in.IdempotencyKey = key
		result, prepareErr := f.service.Run(t.Context(), data.Prepare, in)
		if prepareErr != nil || result.Receipt == nil {
			t.Fatal(result, prepareErr)
		}
		selection.Context = data.ExplorePrepared
		selection.ReceiptID = result.Receipt.ID
		selection.ContentRevision = result.Receipt.ContentRevision
		in.ReceiptID = selection.ReceiptID
		in.IdempotencyKey = key + "-verify"
		result, prepareErr = f.service.Run(t.Context(), data.Verify, in)
		if prepareErr != nil || result.Verification == nil || !result.Verification.Passed() {
			t.Fatal(result, prepareErr)
		}
		return selection
	}
	ready = prepare(ready, "http-insight-ready")
	quiet = prepare(quiet, "http-insight-quiet")
	f.execute.Store(false)
	res = get("compare", params(ready, quiet))
	if res.status != 200 || json.Unmarshal(res.body, &compared) != nil || *compared.Metrics[0].Delta != -3 || *compared.Metrics[1].Delta != -250 || compared.Right.Coverage[0].Status != data.CoveredEmpty {
		t.Fatal(res.status, string(res.body))
	}
	f.execute.Store(true)
	in := f.input
	in.ReceiptID = ready.ReceiptID
	in.IdempotencyKey = "http-insight-activate"
	g := uint64(0)
	in.ExpectedGeneration = &g
	activated, err := f.service.Run(t.Context(), data.Activate, in)
	if err != nil || activated.Activation == nil {
		t.Fatal(activated, err)
	}
	ready.Context = data.ExploreActive
	generation := activated.Activation.Generation
	ready.Generation = &generation
	f.execute.Store(false)
	res = get("compare", params(quiet, ready))
	if res.status != 200 {
		t.Fatal(res.status, string(res.body))
	}
	before, err := f.service.Active(t.Context(), demo.TargetID)
	if err != nil {
		t.Fatal(err)
	}
	generation++
	res = get("compare", params(quiet, ready))
	if res.status != 409 {
		t.Fatal(res.status, string(res.body))
	}
	generation--
	after, err := f.service.Active(t.Context(), demo.TargetID)
	if err != nil || after.Activation != before.Activation {
		t.Fatal("HTTP insight changed target", err)
	}
	f.view.Store(false)
	res = get("compare", params(quiet, ready))
	if res.status != 403 || strings.Contains(string(res.body), "orders.count") {
		t.Fatal(res.status, string(res.body))
	}
}

// Reuse the protected Data-only HTTP harness with a provider that changes its
// current domain or host grants after reading, before final JSON delivery.
type insightsDeliveryProvider struct {
	*explorationDeliveryProvider
	loaded       bool
	setsHidden   bool
	auth         func(data.ExploreAccess) error
	revision     uint64
	metadata     func() data.ExploreMetadata
	describeHook func()
}

func (p *insightsDeliveryProvider) Describe(ctx context.Context, principal data.Principal, ref data.DatasetRef) (data.Descriptor, error) {
	d, err := p.explorationDeliveryProvider.Describe(ctx, principal, ref)
	if p.describeHook != nil {
		p.describeHook()
	}
	return d, err
}

func (p *insightsDeliveryProvider) ExploreMetadata(ctx context.Context, principal data.Principal, read data.ExploreRead) (data.ExploreMetadata, error) {
	if p.metadata != nil {
		return p.metadata(), nil
	}
	return p.explorationDeliveryProvider.ExploreMetadata(ctx, principal, read)
}

func (p *insightsDeliveryProvider) InsightAuthorizationRevision(ctx context.Context, _ data.Principal) (string, error) {
	return strconv.FormatUint(p.revision, 10), ctx.Err()
}

func (p *insightsDeliveryProvider) AuthorizeExplore(_ context.Context, _ data.Principal, a data.ExploreAccess) error {
	if p.auth != nil {
		return p.auth(a)
	}
	return nil
}
func (p *insightsDeliveryProvider) InsightMetricSets(context.Context, data.Principal, data.ExploreRead) ([]data.InsightMetricSet, error) {
	if p.setsHidden {
		return nil, nil
	}
	return []data.InsightMetricSet{{ID: "orders", Metrics: []data.InsightMetricDefinition{{ID: "orders.count", Label: "Orders", Kind: "count", Unit: "orders", Population: "scenario"}}, Period: data.ExplorePeriod{Start: "2026-01-01", End: "2026-01-01", Timezone: "UTC"}, MaxQueries: 1, MaxRecords: 3, WorkEvidence: "bounded fixture"}}, nil
}
func (p *insightsDeliveryProvider) ExploreInsights(_ context.Context, _ data.Principal, _ data.ExploreRead, q data.ExploreInsightsQuery, _ data.InsightWork) (data.ExploreInsights, error) {
	p.loaded = true
	value := float64(3)
	return data.ExploreInsights{ExploreEnvelope: data.ExploreEnvelope{PresentationRevision: "1", Completeness: "complete", State: data.ExploreAvailable}, Metrics: []data.InsightMetric{{InsightMetricDefinition: data.InsightMetricDefinition{ID: "orders.count", Label: "Orders", Kind: "count", Unit: "orders", Population: "scenario"}, TimeScope: data.ExplorePeriod{Start: q.From, End: q.To, Timezone: "UTC"}, Value: &value, Status: "known", SamplingMethod: "fixture"}}}, nil
}
func TestDataInsightsLateDeliveryRevocation(t *testing.T) {
	for _, mode := range []string{"metric", "registry", "coverage", "feature", "session", "close"} {
		t.Run(mode, func(t *testing.T) {
			m, base, store, ctx, identity := snapshotFixture(t, nil, snapshotPolicy{})
			p := &insightsDeliveryProvider{explorationDeliveryProvider: &explorationDeliveryProvider{explorationHTTPProvider: &explorationHTTPProvider{snapshotProvider: base}}}
			service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"sample": p}, Target: dataRegistrationTarget{}, Store: store, Policy: snapshotPolicy{}, Resolve: func(c context.Context) (data.Principal, error) { return snapshotPrincipal(t, c), nil }})
			if err != nil {
				t.Fatal(err)
			}
			m.config.Service = service
			server := router.NewHTTPServer()
			adm := mustNewAdmin(t, Config{BasePath: "/control"}, Dependencies{})
			adm.commandBus = NewCommandBus(true)
			adm.router = &stubWebSocketRouter{}
			contract := m.RouteContract()
			mc := ModuleContext{Admin: adm, ProtectedRouter: server.Router(), AuthMiddleware: func(next router.HandlerFunc) router.HandlerFunc { return next }, Routing: routing.BuildModuleContext(contract, routing.ResolvedModule{Slug: "data", UIMountBase: "/control/data"})}
			if err = m.Register(mc); err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() {
				if closeErr := m.Close(); closeErr != nil {
					t.Error(closeErr)
				}
			})
			m.host.config.RequestIdentity = func(c router.Context) (console.Identity, error) { c.SetContext(ctx); return identity, nil }
			delivery, revoked := false, false
			m.config.ResolveIdentity = func(context.Context) (console.Identity, error) {
				if revoked && mode == "session" {
					return console.Identity{}, ErrForbidden
				}
				if p.loaded {
					delivery = true
					if mode == "registry" {
						p.setsHidden = true
					}
				}
				return identity, nil
			}
			m.config.Enabled = func() bool { return !revoked || mode != "feature" }
			m.host.config.Enabled = m.config.Enabled
			p.auth = func(a data.ExploreAccess) error {
				if delivery && a.MetricSetID != "" {
					switch mode {
					case "metric", "registry":
						if len(a.MetricIDs) > 0 {
							return data.Error(data.CodeDenied)
						}
					case "coverage":
						if a.Coverage {
							return data.Error(data.CodeDenied)
						}
					case "close":
						if !revoked {
							revoked = true
							return m.Close()
						}
					default:
						revoked = true
					}
				}
				return nil
			}
			selection := data.ExploreSelection{Dataset: base.descriptor.Dataset, Scenario: base.descriptor.Scenarios[0], TargetID: "preview", Context: data.ExploreCatalog}
			wire, err := json.Marshal(selection)
			if err != nil {
				t.Fatal(err)
			}
			params := url.Values{"selection": {string(wire)}, "metric_set_id": {"orders"}}
			response := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/control/data/api/explore/insights?"+params.Encode(), nil))
			if response.Code != 403 || strings.Contains(response.Body.String(), "orders.count") {
				t.Fatal(response.Code, response.Body.String())
			}
		})
	}
}

// This fixture uses the actual owned query registration and protected HTTP routes.
func insightDeliveryHTTPFixture(t *testing.T) (*DataModule, *insightsDeliveryProvider, http.Handler, context.Context, console.Identity, data.ExploreSelection) {
	t.Helper()
	m, base, store, ctx, identity := snapshotFixture(t, nil, snapshotPolicy{})
	p := &insightsDeliveryProvider{explorationDeliveryProvider: &explorationDeliveryProvider{explorationHTTPProvider: &explorationHTTPProvider{snapshotProvider: base}}}
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"sample": p}, Target: dataRegistrationTarget{}, Store: store, Policy: snapshotPolicy{}, Resolve: func(c context.Context) (data.Principal, error) { return snapshotPrincipal(t, c), nil }})
	if err != nil {
		t.Fatal(err)
	}
	m.config.Service = service
	server := router.NewHTTPServer()
	adm := mustNewAdmin(t, Config{BasePath: "/control"}, Dependencies{})
	adm.commandBus = NewCommandBus(true)
	adm.router = &stubWebSocketRouter{}
	mc := ModuleContext{Admin: adm, ProtectedRouter: server.Router(), AuthMiddleware: func(next router.HandlerFunc) router.HandlerFunc { return next }, Routing: routing.BuildModuleContext(m.RouteContract(), routing.ResolvedModule{Slug: "data", UIMountBase: "/control/data"})}
	if err = m.Register(mc); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := m.Close(); err != nil {
			t.Error(err)
		}
	})
	m.host.config.RequestIdentity = func(c router.Context) (console.Identity, error) { c.SetContext(ctx); return identity, nil }
	selection := data.ExploreSelection{Dataset: base.descriptor.Dataset, Scenario: base.descriptor.Scenarios[0], TargetID: "preview", Context: data.ExploreCatalog}
	return m, p, server.WrappedRouter(), ctx, identity, selection
}

func TestDataInsightsFinalHostGrantChange(t *testing.T) {
	for _, kind := range []string{"insights", "compare"} {
		t.Run(kind, func(t *testing.T) {
			m, p, server, _, identity, selection := insightDeliveryHTTPFixture(t)
			postReadChecks := 0
			revoked := false
			m.config.ResolveIdentity = func(context.Context) (console.Identity, error) {
				if p.loaded {
					postReadChecks++
					if postReadChecks == 2 {
						revoked = true
						p.revision++
					}
				}
				return identity, nil
			}
			p.auth = func(a data.ExploreAccess) error {
				if revoked && len(a.MetricIDs) > 0 {
					return data.Error(data.CodeDenied)
				}
				return nil
			}
			wire, err := json.Marshal(selection)
			if err != nil {
				t.Fatal(err)
			}
			params := url.Values{"selection": {string(wire)}, "left": {string(wire)}, "right": {string(wire)}, "metric_set_id": {"orders"}}
			response := httptest.NewRecorder()
			server.ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/control/data/api/explore/"+kind+"?"+params.Encode(), nil))
			if !revoked || response.Code != http.StatusForbidden || strings.Contains(response.Body.String(), "orders.count") {
				t.Fatalf("late host grant change leaked: revoked=%v checks=%d status=%d body=%s", revoked, postReadChecks, response.Code, response.Body.String())
			}
		})
	}
}

func TestDataInsightsSameSelectionUsageGrantUnionHTTP(t *testing.T) {
	for _, count := range []int{17, 32} {
		t.Run(strconv.Itoa(count), func(t *testing.T) {
			m, p, handler, _, identity, selection := insightDeliveryHTTPFixture(t)
			m.config.ResolveIdentity = func(context.Context) (console.Identity, error) { return identity, nil }
			old := p.explorationDeliveryProvider
			p.metadata = func() data.ExploreMetadata {
				metadata, err := old.ExploreMetadata(t.Context(), data.Principal{}, data.ExploreRead{})
				if err != nil {
					t.Fatal(err)
				}
				for i := range count {
					metadata.Usages = append(metadata.Usages, data.ExploreUsage{SurfaceID: fmt.Sprintf("surface-%d", i), Kind: "report", Label: "Report"})
				}
				return metadata
			}
			wire, err := json.Marshal(selection)
			if err != nil {
				t.Fatal(err)
			}
			params := url.Values{"left": {string(wire)}, "right": {string(wire)}, "metric_set_id": {"orders"}}
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/control/data/api/explore/compare?"+params.Encode(), nil))
			var out data.SelectionComparison
			if response.Code != http.StatusOK || json.Unmarshal(response.Body.Bytes(), &out) != nil || len(out.LeftDeclarations.Usages) != count || len(out.RightDeclarations.Usages) != count {
				t.Fatalf("same-selection comparison failed: %d %s", response.Code, response.Body.String())
			}
		})
	}
}

func TestDataInsightsSourceWorkPrecedesFinalHostCheck(t *testing.T) {
	for _, mode := range []string{"session", "feature"} {
		t.Run(mode, func(t *testing.T) {
			m, p, handler, _, identity, selection := insightDeliveryHTTPFixture(t)
			postReadHostChecks, deliverySourceChecks := 0, 0
			revoked := false
			m.config.ResolveIdentity = func(context.Context) (console.Identity, error) {
				if revoked && mode == "session" {
					return console.Identity{}, ErrForbidden
				}
				if p.loaded {
					postReadHostChecks++
				}
				return identity, nil
			}
			m.host.config.Enabled = func() bool { return !revoked || mode != "feature" }
			p.describeHook = func() {
				if postReadHostChecks == 1 {
					deliverySourceChecks++
					// After rebind and domain authorization, revoke during the final source
					// validation. The final host check must still follow this source callback.
					if deliverySourceChecks == 5 {
						revoked = true
					}
				}
			}
			wire, err := json.Marshal(selection)
			if err != nil {
				t.Fatal(err)
			}
			params := url.Values{"selection": {string(wire)}, "metric_set_id": {"orders"}}
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/control/data/api/explore/insights?"+params.Encode(), nil))
			if !revoked || response.Code != http.StatusForbidden || strings.Contains(response.Body.String(), "orders.count") {
				t.Fatalf("source callback outlived host check: revoked=%v sources=%d hosts=%d status=%d body=%s", revoked, deliverySourceChecks, postReadHostChecks, response.Code, response.Body.String())
			}
		})
	}
}

func TestDataInsightsOmittedMetricSetHTTP(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "insights-default-set.db"), nil)
	ready := data.ExploreSelection{Dataset: f.input.Dataset, Scenario: f.input.Scenario, TargetID: demo.TargetID, Context: data.ExploreCatalog}
	selection, err := json.Marshal(ready)
	if err != nil {
		t.Fatal(err)
	}
	f.execute.Store(false)
	res := f.request(t, http.MethodGet, "/admin/data/api/explore/insights?"+url.Values{"selection": {string(selection)}}.Encode(), "operator", nil)
	var insights data.ExploreInsights
	if res.Code != http.StatusOK || json.Unmarshal(res.Body.Bytes(), &insights) != nil || insights.MetricSetID != "orders" || len(insights.Metrics) == 0 || *insights.Metrics[0].Value != 3 {
		t.Fatal(res.Code, res.Body.String())
	}
	res = f.request(t, http.MethodGet, "/admin/data/api/explore/compare?"+url.Values{"left": {string(selection)}, "right": {string(selection)}}.Encode(), "operator", nil)
	if res.Code != http.StatusBadRequest {
		t.Fatal("a comparison without a metric set", res.Code, res.Body.String())
	}
}
