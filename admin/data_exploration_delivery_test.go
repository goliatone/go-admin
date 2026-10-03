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
	router "github.com/goliatone/go-router"
)

type explorationDeliveryProvider struct {
	*explorationHTTPProvider
	relatedHook func()
	authHook    func(data.ExploreAccess) error
}

func (p *explorationDeliveryProvider) AuthorizeExplore(_ context.Context, _ data.Principal, a data.ExploreAccess) error {
	if p.authHook != nil {
		return p.authHook(a)
	}
	return nil
}
func (p *explorationDeliveryProvider) ExploreMetadata(ctx context.Context, pr data.Principal, read data.ExploreRead) (data.ExploreMetadata, error) {
	m, e := p.explorationHTTPProvider.ExploreMetadata(ctx, pr, read)
	if e != nil {
		return m, e
	}
	m.Entities[0].Relationships = []data.ExploreRelationship{{ID: "customer", EntityID: "customers"}}
	m.Entities = append(m.Entities, data.ExploreEntity{ID: "customers", Fields: []data.ExploreField{{ID: "id", Label: "Customer", Type: "string"}}})
	return m, e
}
func (p *explorationDeliveryProvider) ExploreRelated(context.Context, data.Principal, data.ExploreRead, data.ExploreRelatedQuery) (data.ExploreSamples, error) {
	if p.relatedHook != nil {
		p.relatedHook()
	}
	n := uint64(1)
	return data.ExploreSamples{ExploreEnvelope: data.ExploreEnvelope{State: data.ExploreAvailable, PresentationRevision: "1", Completeness: "complete"}, EntityID: "customers", Columns: []data.ExploreField{{ID: "id", Label: "Customer", Type: "string"}}, Rows: []data.ExploreRow{{RecordKey: "customer-opaque", Cells: map[string]data.ExploreCell{"id": {State: "value", Value: "protected-customer"}}}}, Total: &n, SamplingMethod: "fixture"}, nil
}
func explorationDeliveryHTTP(t *testing.T, policy snapshotPolicy) (*DataModule, *explorationDeliveryProvider, func(string) *httptest.ResponseRecorder, console.Identity) {
	t.Helper()
	m, base, store, ctx, identity := snapshotFixture(t, nil, policy)
	p := &explorationDeliveryProvider{explorationHTTPProvider: &explorationHTTPProvider{snapshotProvider: base}}
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"sample": p}, Target: dataRegistrationTarget{}, Store: store, Policy: policy, Resolve: func(c context.Context) (data.Principal, error) { return snapshotPrincipal(t, c), nil }})
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
	m.host.config.RequestIdentity = func(c router.Context) (console.Identity, error) { c.SetContext(ctx); return identity, nil }
	selection := data.ExploreSelection{Dataset: base.descriptor.Dataset, Scenario: base.descriptor.Scenarios[0], TargetID: "preview", Context: data.ExploreCatalog}
	encoded, err := json.Marshal(selection)
	if err != nil {
		t.Fatal(err)
	}
	request := func(kind string) *httptest.ResponseRecorder {
		q := url.Values{"selection": {string(encoded)}, "entity_id": {"orders"}, "record_key": {"opaque"}, "relationship_id": {"customer"}}
		res := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/control/data/api/explore/"+kind+"?"+q.Encode(), nil))
		return res
	}
	return m, p, request, identity
}
func TestDataExplorationRelatedDeliveryGrants(t *testing.T) {
	cases := []struct {
		name   string
		denied func(data.ExploreAccess) bool
	}{
		{"allowed", func(data.ExploreAccess) bool { return false }},
		{"source entity", func(a data.ExploreAccess) bool { return a.EntityID == "orders" }},
		{"source record", func(a data.ExploreAccess) bool { return a.EntityID == "orders" && a.RecordKey == "opaque" }},
		{"source relationship", func(a data.ExploreAccess) bool { return a.EntityID == "orders" && a.RelationshipID == "customer" }},
		{"destination entity", func(a data.ExploreAccess) bool { return a.EntityID == "customers" }},
		{"destination field", func(a data.ExploreAccess) bool { return a.EntityID == "customers" && len(a.Fields) > 0 }},
		{"destination record", func(a data.ExploreAccess) bool { return a.EntityID == "customers" && len(a.RecordKeys) > 0 }},
	}
	for _, domain := range []string{"host", "provider"} {
		for _, test := range cases {
			t.Run(domain+"/"+test.name, func(t *testing.T) {
				revoked, armed := false, false
				check := func(a data.ExploreAccess) error {
					if revoked && test.denied(a) {
						return data.Error(data.CodeDenied)
					}
					return nil
				}
				policy := snapshotPolicy{}
				if domain == "host" {
					policy.check = func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
						if a.Explore != nil {
							return check(*a.Explore)
						}
						return nil
					}
				}
				m, p, request, id := explorationDeliveryHTTP(t, policy)
				if domain == "provider" {
					p.authHook = check
				}
				p.relatedHook = func() { armed = true }
				m.config.ResolveIdentity = func(context.Context) (console.Identity, error) {
					if armed {
						revoked = true
					}
					return id, nil
				}
				res := request("related")
				want := 403
				if test.name == "allowed" {
					want = 200
				}
				if res.Code != want || want == 403 && strings.Contains(res.Body.String(), "protected-customer") {
					t.Fatalf("related delivery grant failed: status=%d body=%s", res.Code, res.Body.String())
				}
			})
		}
	}
}

func TestDataExplorationHostRevokedDuringDeliveryAuthorization(t *testing.T) {
	for _, revoke := range []string{"feature", "session", "close"} {
		t.Run(revoke, func(t *testing.T) {
			m, p, request, id := explorationDeliveryHTTP(t, snapshotPolicy{})
			loaded, delivery, revoked := false, false, false
			p.after = func() { loaded = true }
			m.config.Enabled = func() bool { return !revoked || revoke != "feature" }
			m.host.config.Enabled = m.config.Enabled
			m.config.ResolveIdentity = func(context.Context) (console.Identity, error) {
				if revoked && revoke == "session" {
					return console.Identity{}, ErrForbidden
				}
				if loaded {
					delivery = true
				}
				return id, nil
			}
			p.authHook = func(a data.ExploreAccess) error {
				if delivery && len(a.RecordKeys) > 0 && !revoked {
					revoked = true
					if revoke == "close" {
						if err := m.Close(); err != nil {
							t.Fatal(err)
						}
					}
				}
				return nil
			}
			res := request("samples")
			if !revoked || res.Code != 403 || strings.Contains(res.Body.String(), "order-1") {
				t.Fatalf("host revocation leaked delivery: revoked=%t status=%d body=%s", revoked, res.Code, res.Body.String())
			}
		})
	}
}
func TestDataExplorationFeatureRevokedDuringFinalHostRead(t *testing.T) {
	m, p, request, id := explorationDeliveryHTTP(t, snapshotPolicy{})
	loaded, refreshes, enabled := false, 0, true
	p.after = func() { loaded = true }
	m.host.config.Enabled = func() bool { return enabled }
	m.config.ResolveIdentity = func(context.Context) (console.Identity, error) {
		if loaded {
			refreshes++
		}
		return id, nil
	}
	read := m.host.config.Access.Read
	m.host.config.Access.Read = func(ctx context.Context, id console.Identity) error {
		err := read(ctx, id)
		if refreshes == 2 {
			enabled = false
		}
		return err
	}
	res := request("samples")
	if enabled || res.Code != 403 || strings.Contains(res.Body.String(), "order-1") {
		t.Fatalf("feature disabled by final read: enabled=%t status=%d body=%s", enabled, res.Code, res.Body.String())
	}
}
