package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	gocommand "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type explorationHTTPProvider struct {
	*snapshotProvider
	after func()
	cause error
}

func (p *explorationHTTPProvider) AuthorizeExplore(context.Context, data.Principal, data.ExploreAccess) error {
	return nil
}
func (p *explorationHTTPProvider) ExploreMetadata(context.Context, data.Principal, data.ExploreRead) (data.ExploreMetadata, error) {
	if p.cause != nil {
		return data.ExploreMetadata{}, p.cause
	}
	return data.ExploreMetadata{ExploreEnvelope: data.ExploreEnvelope{State: data.ExploreAvailable, PresentationRevision: "1", Completeness: "complete"}, Title: "Synthetic orders", Origin: "synthetic", Entities: []data.ExploreEntity{{ID: "orders", Label: "Orders", Fields: []data.ExploreField{{ID: "id", Label: "Order", Type: "string"}}}}, UsageCompleteness: "unknown"}, nil
}
func (p *explorationHTTPProvider) ExploreSamples(context.Context, data.Principal, data.ExploreRead, data.ExploreSamplesQuery) (data.ExploreSamples, error) {
	if p.after != nil {
		p.after()
	}
	total := uint64(1)
	return data.ExploreSamples{ExploreEnvelope: data.ExploreEnvelope{State: data.ExploreAvailable, PresentationRevision: "1", Completeness: "complete"}, EntityID: "orders", Columns: []data.ExploreField{{ID: "id", Label: "Order", Type: "string"}}, Rows: []data.ExploreRow{{RecordKey: "opaque", Cells: map[string]data.ExploreCell{"id": {State: "value", Value: "order-1"}}}}, Total: &total, SamplingMethod: "fixture"}, nil
}
func (p *explorationHTTPProvider) ExploreRelated(context.Context, data.Principal, data.ExploreRead, data.ExploreRelatedQuery) (data.ExploreSamples, error) {
	return data.ExploreSamples{}, data.Error(data.CodeUnavailable)
}
func TestDataExplorationRealHTTPRegistrationAndDelivery(t *testing.T) {
	m, base, store, ctx, identity := snapshotFixture(t, nil, snapshotPolicy{})
	p := &explorationHTTPProvider{snapshotProvider: base}
	revoked := false
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"sample": p}, Target: dataRegistrationTarget{}, Store: store, Policy: snapshotPolicy{}, Resolve: func(ctx context.Context) (data.Principal, error) {
		if revoked {
			return data.Principal{}, data.Error(data.CodeDenied)
		}
		return snapshotPrincipal(t, ctx), nil
	}})
	if err != nil {
		t.Fatal(err)
	}
	m.config.Service = service
	server := router.NewHTTPServer()
	adm := mustNewAdmin(t, Config{BasePath: "/control", Debug: DebugConfig{Enabled: false}}, Dependencies{})
	adm.commandBus = NewCommandBus(true)
	adm.router = &stubWebSocketRouter{}
	contract := m.RouteContract()
	planner, err := routing.NewPlanner(routing.Config{Roots: routing.RootsConfig{AdminRoot: "/control", APIRoot: "/control/api", PublicAPIRoot: "/api"}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if err = planner.RegisterModule(contract); err != nil {
		t.Fatal(err)
	}
	moduleContext := ModuleContext{Admin: adm, ProtectedRouter: server.Router(), AuthMiddleware: func(next router.HandlerFunc) router.HandlerFunc { return next }, Routing: routing.BuildModuleContext(contract, routing.ResolvedModule{Slug: "data", UIMountBase: "/control/data"})}
	if err = m.Register(moduleContext); err != nil {
		t.Fatal(err)
	}
	m.host.config.RequestIdentity = func(c router.Context) (console.Identity, error) { c.SetContext(ctx); return identity, nil }
	selection := data.ExploreSelection{Dataset: base.descriptor.Dataset, Scenario: base.descriptor.Scenarios[0], TargetID: "preview", Context: data.ExploreCatalog}
	encoded, err := json.Marshal(selection)
	if err != nil {
		t.Fatal(err)
	}
	request := func(path string) *httptest.ResponseRecorder {
		t.Helper()
		res := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(res, httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil))
		return res
	}
	q := url.Values{"selection": {string(encoded)}, "entity_id": {"orders"}}
	for _, kind := range []string{"metadata", "samples"} {
		res := request("/control/data/api/explore/" + kind + "?" + q.Encode())
		if res.Code != 200 || !strings.Contains(res.Body.String(), `"presentation_revision":"1"`) {
			t.Fatal(res.Code, res.Body.String())
		}
	}
	if store.operations.Load() != 0 || store.targets.Load() != 0 || store.receipts.Load() != 0 {
		t.Fatal("catalog read touched global snapshot", store)
	}
	q.Set("limit", "101")
	if res := request("/control/data/api/explore/samples?" + q.Encode()); res.Code != 400 {
		t.Fatal(res.Code, res.Body.String())
	}
	q.Del("limit")
	q.Set("selection", strings.TrimSuffix(string(encoded), "}")+`,"actor_id":"forged"}`)
	if res := request("/control/data/api/explore/metadata?" + q.Encode()); res.Code != 400 {
		t.Fatal(res.Code, res.Body.String())
	}
	q.Set("selection", string(encoded))
	for _, test := range []struct {
		cause  error
		status int
		code   string
	}{{context.DeadlineExceeded, 504, "CONSOLE_TIMEOUT"}, {context.Canceled, 408, "CONSOLE_CANCELED"}, {data.Error(data.CodeProvider), 503, "CONSOLE_PROVIDER_FAILED"}} {
		p.cause = test.cause
		res := request("/control/data/api/explore/metadata?" + q.Encode())
		if res.Code != test.status || !strings.Contains(res.Body.String(), test.code) || strings.Contains(res.Body.String(), "Synthetic orders") {
			t.Fatal(res.Code, res.Body.String())
		}
	}
	p.cause = nil
	p.after = func() { revoked = true }
	res := request("/control/data/api/explore/samples?" + q.Encode())
	if res.Code != 403 || strings.Contains(res.Body.String(), "order-1") {
		t.Fatal(res.Code, res.Body.String())
	}
	p.after = nil
	revoked = false
	m.config.Enabled = func() bool { return false }
	m.host.config.Enabled = m.config.Enabled
	res = request("/control/data/api/explore/metadata?" + q.Encode())
	if res.Code != 403 {
		t.Fatal(res.Code, res.Body.String())
	}
	m.config.Enabled = func() bool { return true }
	m.host.config.Enabled = m.config.Enabled
	if err = m.Close(); err != nil {
		t.Fatal(err)
	}
	res = request("/control/data/api/explore/metadata?" + q.Encode())
	if res.Code != 403 {
		t.Fatal(res.Code, res.Body.String())
	}
}
func TestDataExplorationOwnedNamedQueriesAndBootstrap(t *testing.T) {
	m, p, _, ctx, _ := snapshotFixture(t, nil, snapshotPolicy{})
	bus := NewCommandBus(true)
	handle, err := RegisterDataExplorationQueries(bus, m.config.Service)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := handle.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	}()
	selection := data.ExploreSelection{Dataset: p.descriptor.Dataset, Scenario: p.descriptor.Scenarios[0], TargetID: "preview", Context: data.ExploreCatalog}
	encoded, err := json.Marshal(data.ExploreMetadataQuery{Selection: selection})
	if err != nil {
		t.Fatal(err)
	}
	payload := map[string]any{}
	if err = json.Unmarshal(encoded, &payload); err != nil {
		t.Fatal(err)
	}
	result, err := bus.DispatchByNameWithOutcome(ctx, "data.explore.metadata", payload, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	if err != nil {
		t.Fatal(err)
	}
	if out, ok := result.Result.(data.ExploreMetadata); !ok || out.State != data.ExploreUnsupported {
		t.Fatal(result)
	}
	payload["scope_key"] = "forged"
	if _, err = bus.DispatchByNameWithOutcome(ctx, "data.explore.metadata", payload, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline}); err == nil {
		t.Fatal("accepted principal field")
	}
	urls := DataExplorationURLs{Metadata: "/control/data/api/explore/metadata", Samples: "/control/data/api/explore/samples", Related: "/control/data/api/explore/related"}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background()).Maybe()
	c.On("Locals", mock.Anything).Return(nil).Maybe()
	c.On("Path").Return("/control/data").Maybe()
	c.On("Query", mock.Anything, mock.Anything).Return("").Maybe()
	c.On("Query", mock.Anything).Return("").Maybe()
	var view router.ViewContext
	c.On("Render", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		var ok bool
		view, ok = args.Get(1).(router.ViewContext)
		if !ok {
			t.Fatalf("render context = %T", args.Get(1))
		}
	}).Return(nil)
	if err = m.explorationPageRenderer(nil, urls)(c, console.Bootstrap{Identity: console.Identity{ConsoleID: "data"}}); err != nil {
		t.Fatal(err)
	}
	wire, ok := view["console_bootstrap_json"].(string)
	if !ok {
		t.Fatal(view)
	}
	var decoded struct {
		Extensions struct {
			Explorer DataExplorationURLs `json:"data_explorer"`
		} `json:"extensions"`
	}
	if err = json.Unmarshal([]byte(wire), &decoded); err != nil || decoded.Extensions.Explorer != urls {
		t.Fatal(wire, err)
	}
}
