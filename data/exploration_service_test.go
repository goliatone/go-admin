package data_test

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/data"
)

type exploreTestProvider struct {
	*testProvider
	readHook func(data.ExploreRead)
	after    func()
	auth     func(data.ExploreAccess) error
	metadata func() data.ExploreMetadata
	samples  func(data.ExploreSamplesQuery) (data.ExploreSamples, error)
	related  func(data.ExploreRelatedQuery) (data.ExploreSamples, error)
}

func (p *exploreTestProvider) AuthorizeExplore(_ context.Context, _ data.Principal, a data.ExploreAccess) error {
	if p.auth != nil {
		return p.auth(a)
	}
	return nil
}
func (p *exploreTestProvider) ExploreMetadata(context.Context, data.Principal, data.ExploreRead) (data.ExploreMetadata, error) {
	m := p.metadata()
	if p.after != nil {
		p.after()
	}
	return m, nil
}
func (p *exploreTestProvider) ExploreSamples(_ context.Context, _ data.Principal, read data.ExploreRead, q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
	if p.readHook != nil {
		p.readHook(read)
	}
	if p.samples == nil {
		return data.ExploreSamples{}, data.Error(data.CodeUnavailable)
	}
	out, err := p.samples(q)
	if p.after != nil {
		p.after()
	}
	return out, err
}
func (p *exploreTestProvider) ExploreRelated(_ context.Context, _ data.Principal, _ data.ExploreRead, q data.ExploreRelatedQuery) (data.ExploreSamples, error) {
	return p.related(q)
}
func exploreFixture(t *testing.T) (*fixture, *exploreTestProvider, *data.Service) {
	t.Helper()
	f := newFixture(t)
	p := &exploreTestProvider{testProvider: f.provider}
	p.metadata = func() data.ExploreMetadata {
		return data.ExploreMetadata{ExploreEnvelope: data.ExploreEnvelope{State: data.ExploreAvailable, PresentationRevision: "1", Completeness: "complete"}, Title: "Orders", Origin: "synthetic", Entities: []data.ExploreEntity{{ID: "orders", Label: "Orders", Fields: []data.ExploreField{{ID: "id", Label: "Order", Type: "string"}}}}, UsageCompleteness: "unknown"}
	}
	cfg := f.serviceConfig(f.store)
	cfg.Providers = map[string]data.Provider{"sample": p}
	service, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	return f, p, service
}
func TestExploreMetadataLegacyAndRevocation(t *testing.T) {
	f, p, service := exploreFixture(t)
	q := data.ExploreMetadataQuery{Selection: catalogSelection(f)}
	legacy, err := f.service.ExploreMetadata(t.Context(), q)
	if err != nil || legacy.State != data.ExploreUnsupported || legacy.Title != f.input.Dataset.ID || len(legacy.Inventory) != 0 {
		t.Fatal(legacy, err)
	}
	result, err := service.ExploreMetadata(t.Context(), q)
	if err != nil || result.Title != "Orders" || result.Provenance != "example" || result.Selection != q.Selection {
		t.Fatal(result, err)
	}
	p.after = func() { f.revoked.Store(true) }
	result, err = service.ExploreMetadata(t.Context(), q)
	if data.ErrorCode(err) != data.CodeDenied || result.Title != "" {
		t.Fatal("revocation leaked metadata", result, err)
	}
}
func TestExploreMetadataFinalFieldAndLinkPolicy(t *testing.T) {
	f, p, _ := exploreFixture(t)
	cfg := f.serviceConfig(f.store)
	cfg.Providers = map[string]data.Provider{"sample": p}
	hidden := false
	cfg.ExploreSurfaces = map[string]data.ExploreSurface{"report": {Resolve: func(context.Context, data.Principal) (string, error) { hidden = true; return "/orders/report", nil }}}
	old := p.metadata
	p.metadata = func() data.ExploreMetadata {
		m := old()
		m.Usages = []data.ExploreUsage{{SurfaceID: "report", Kind: "report", Label: "Report", Href: "https://evil.example"}}
		return m
	}
	p.auth = func(a data.ExploreAccess) error {
		if hidden && len(a.Fields) > 0 {
			return data.Error(data.CodeDenied)
		}
		return nil
	}
	service, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	result, err := service.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: catalogSelection(f)})
	if data.ErrorCode(err) != data.CodeDenied || len(result.Entities) > 0 {
		t.Fatal("post-resolution field denial leaked result", result, err)
	}
	hidden = false
	p.auth = nil
	result, err = service.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: catalogSelection(f)})
	if err != nil || len(result.Usages) != 1 || result.Usages[0].Href != "/orders/report" {
		t.Fatal(result, err)
	}
	cfg.ExploreSurfaces = nil
	service, err = data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	result, err = service.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: catalogSelection(f)})
	if err != nil || result.Usages[0].Href != "" {
		t.Fatal("provider URL survived", result, err)
	}
}
func TestExploreMetadataBoundsSuppressionAndFailures(t *testing.T) {
	for _, test := range []struct {
		name string
		edit func(*data.ExploreMetadata)
		want string
	}{
		{"oversize", func(m *data.ExploreMetadata) { m.Summary = strings.Repeat("x", data.ExploreMaxMetadataBytes) }, data.CodeProvider},
		{"too many entities", func(m *data.ExploreMetadata) {
			for range 17 {
				m.Entities = append(m.Entities, m.Entities[0])
			}
		}, data.CodeProvider},
		{"undeclared relationship", func(m *data.ExploreMetadata) {
			m.Entities[0].Relationships = []data.ExploreRelationship{{ID: "orders", EntityID: "secret"}}
		}, data.CodeProvider},
	} {
		t.Run(test.name, func(t *testing.T) {
			f, p, s := exploreFixture(t)
			old := p.metadata
			p.metadata = func() data.ExploreMetadata { m := old(); test.edit(&m); return m }
			out, err := s.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: catalogSelection(f)})
			if data.ErrorCode(err) != test.want || out.Title != "" {
				t.Fatal(out, err)
			}
		})
	}
	f, p, s := exploreFixture(t)
	old := p.metadata
	p.metadata = func() data.ExploreMetadata { m := old(); m.State = data.ExploreSuppressed; return m }
	out, err := s.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: catalogSelection(f)})
	if err != nil || len(out.Entities) != 0 || out.Title == "Orders" {
		t.Fatal(out, err)
	}
	for _, cause := range []error{context.Canceled, context.DeadlineExceeded, data.Error(data.CodeUnavailable), data.Error(data.CodeProvider)} {
		p.auth = func(data.ExploreAccess) error { return fmt.Errorf("domain backend: %w", cause) }
		out, err := s.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: catalogSelection(f)})
		if out.Title != "" || err == nil || data.ErrorCode(err) == data.CodeDenied && !errors.Is(err, cause) {
			t.Fatal(out, err)
		}
	}
}

func testSample(q data.ExploreSamplesQuery) data.ExploreSamples {
	total := uint64(1)
	return data.ExploreSamples{ExploreEnvelope: data.ExploreEnvelope{State: data.ExploreAvailable, PresentationRevision: "1", Completeness: "complete"}, EntityID: q.EntityID, Columns: []data.ExploreField{{ID: "id", Label: "Order", Type: "string"}}, Rows: []data.ExploreRow{{RecordKey: "opaque", Cells: map[string]data.ExploreCell{"id": {State: "value", Value: "order-1"}}}}, Total: &total, SamplingMethod: "bounded fixture"}
}
func TestExploreSamplesReadOnlyAndFinalDomainPolicy(t *testing.T) {
	f, p, s := exploreFixture(t)
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
		if q.Limit != data.ExploreDefaultLimit {
			t.Fatal(q.Limit)
		}
		return testSample(q), nil
	}
	before := f.provider.effects.Load()
	out, err := s.ExploreSamples(t.Context(), q)
	if err != nil || len(out.Rows) != 1 || out.Selection != q.Selection || before != f.provider.effects.Load() {
		t.Fatal(out, err)
	}
	p.after = func() { f.revoked.Store(true) }
	out, err = s.ExploreSamples(t.Context(), q)
	if err == nil || len(out.Rows) > 0 {
		t.Fatal("revoked read leaked", out, err)
	}
	f.revoked.Store(false)
	p.after = nil
	denied := false
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
		denied = true
		return testSample(q), nil
	}
	p.auth = func(a data.ExploreAccess) error {
		if denied && len(a.Fields) > 0 {
			return data.Error(data.CodeDenied)
		}
		return nil
	}
	out, err = s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeDenied || len(out.Rows) > 0 {
		t.Fatal(out, err)
	}
}
func TestExploreSamplesRejectProviderPayloadAndOpaqueTraversal(t *testing.T) {
	for _, edit := range []func(*data.ExploreSamples){
		func(s *data.ExploreSamples) {
			s.Rows[0].Cells["secret"] = data.ExploreCell{State: "value", Value: "secret"}
		},
		func(s *data.ExploreSamples) {
			s.Rows[0].Cells["id"] = data.ExploreCell{State: "redacted", Value: "leak"}
		},
		func(s *data.ExploreSamples) {
			s.Rows[0].Cells["id"] = data.ExploreCell{State: "value", Value: map[string]any{"html": "unsafe"}}
		},
		func(s *data.ExploreSamples) {
			s.Rows[0].Cells["id"] = data.ExploreCell{State: "value", Value: strings.Repeat("x", 2049)}
		},
		func(s *data.ExploreSamples) {
			for range 100 {
				s.Rows = append(s.Rows, s.Rows[0])
			}
		},
		func(s *data.ExploreSamples) { s.Columns = append(s.Columns, s.Columns[0]) },
		func(s *data.ExploreSamples) { s.State = data.ExploreSuppressed },
		func(s *data.ExploreSamples) { s.State = data.ExploreEmpty },
	} {
		f, p, s := exploreFixture(t)
		q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
		p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
			out := testSample(q)
			edit(&out)
			return out, nil
		}
		out, err := s.ExploreSamples(t.Context(), q)
		if data.ErrorCode(err) != data.CodeProvider || len(out.Rows) > 0 {
			t.Fatal(out, err)
		}
	}
	f, p, s := exploreFixture(t)
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
	called := false
	p.related = func(q data.ExploreRelatedQuery) (data.ExploreSamples, error) {
		called = true
		return testSample(q.ExploreSamplesQuery), nil
	}
	_, err := s.ExploreRelated(t.Context(), data.ExploreRelatedQuery{ExploreSamplesQuery: q, RecordKey: "opaque", RelationshipID: "undeclared"})
	if data.ErrorCode(err) != data.CodeGone || called {
		t.Fatal(err, called)
	}
	old := p.metadata
	p.metadata = func() data.ExploreMetadata {
		m := old()
		m.Entities[0].Relationships = []data.ExploreRelationship{{ID: "siblings", EntityID: "orders"}}
		return m
	}
	out, err := s.ExploreRelated(t.Context(), data.ExploreRelatedQuery{ExploreSamplesQuery: q, RecordKey: "opaque", RelationshipID: "siblings"})
	if err != nil || len(out.Rows) != 1 || !called {
		t.Fatal(out, err)
	}
}
func TestExploreReceiptGenerationAndForeignScope(t *testing.T) {
	f, p, s := exploreFixture(t)
	receipt := prepared(t, f, "explore-prepare")
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
	q.Selection.Context = data.ExplorePrepared
	q.Selection.ReceiptID = receipt.ID
	q.Selection.ContentRevision = receipt.ContentRevision
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) { return testSample(q), nil }
	out, err := s.ExploreSamples(t.Context(), q)
	if err != nil || out.Provenance != "observed" || out.Selection.ReceiptID != receipt.ID {
		t.Fatal(out, err)
	}
	q.Selection.ContentRevision++
	_, err = s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeStale {
		t.Fatal(err)
	}
	q.Selection.ContentRevision--
	f.principal.ScopeKey = "foreign"
	_, err = s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeGone {
		t.Fatal(err)
	}
	f.principal.ScopeKey = "org"
	receipt = verified(t, f, receipt, "explore-verify")
	res := run(t, f, data.Activate, activationInput(f, receipt, 0, "explore-activate"))
	successful(t, res)
	q.Selection.Context = data.ExploreActive
	g := res.Activation.Generation
	q.Selection.Generation = &g
	if _, err = s.ExploreSamples(t.Context(), q); err != nil {
		t.Fatal(err)
	}
	g++
	out, err = s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeStale || len(out.Rows) > 0 {
		t.Fatal(out, err)
	}
	g--
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
		next := prepared(t, f, "explore-race-prepare")
		next = verified(t, f, next, "explore-race-verify")
		successful(t, run(t, f, data.Activate, activationInput(f, next, g, "explore-race-activate")))
		return testSample(q), nil
	}
	out, err = s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeStale || len(out.Rows) > 0 {
		t.Fatal("generation race leaked", out, err)
	}
}
func TestExploreSamplesCancellationFailureAndEmpty(t *testing.T) {
	f, p, s := exploreFixture(t)
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
	for _, cause := range []error{context.Canceled, context.DeadlineExceeded, data.Error(data.CodeProvider), data.Error(data.CodeUnavailable)} {
		p.samples = func(data.ExploreSamplesQuery) (data.ExploreSamples, error) {
			return testSample(q), fmt.Errorf("sample: %w", cause)
		}
		out, err := s.ExploreSamples(t.Context(), q)
		if err == nil || len(out.Rows) > 0 {
			t.Fatal(out, err)
		}
		if errors.Is(cause, context.Canceled) || errors.Is(cause, context.DeadlineExceeded) {
			if !errors.Is(err, cause) {
				t.Fatal(err)
			}
		}
	}
	p.samples = func(data.ExploreSamplesQuery) (data.ExploreSamples, error) {
		total := uint64(0)
		out := testSample(q)
		out.State = data.ExploreEmpty
		out.Rows = nil
		out.Total = &total
		return out, nil
	}
	out, err := s.ExploreSamples(t.Context(), q)
	if err != nil || out.Rows == nil || *out.Total != 0 {
		t.Fatal(out, err)
	}
}

func TestExploreFinalAuthorizationGenerationRaceAndPrunedReceipt(t *testing.T) {
	f, p, s := exploreFixture(t)
	receipt := prepared(t, f, "final-race-prepare")
	receipt = verified(t, f, receipt, "final-race-verify")
	activation := run(t, f, data.Activate, activationInput(f, receipt, 0, "final-race-activate"))
	successful(t, activation)
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
	q.Selection.Context = data.ExploreActive
	q.Selection.ReceiptID = receipt.ID
	q.Selection.ContentRevision = receipt.ContentRevision
	g := activation.Activation.Generation
	q.Selection.Generation = &g
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) { return testSample(q), nil }
	switched := false
	p.auth = func(a data.ExploreAccess) error {
		if len(a.RecordKeys) > 0 && !switched {
			switched = true
			next := prepared(t, f, "final-race-next")
			next = verified(t, f, next, "final-race-next-verify")
			successful(t, run(t, f, data.Activate, activationInput(f, next, g, "final-race-next-activate")))
		}
		return nil
	}
	out, err := s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeStale || len(out.Rows) > 0 {
		t.Fatal("generation changed during final policy but was delivered", out, err)
	}
	p.auth = nil
	q.Selection.Context = data.ExplorePrepared
	q.Selection.Generation = nil
	f.now.Add(int64(8 * 24 * time.Hour))
	if err = f.store.Prune(t.Context()); err != nil {
		t.Fatal(err)
	}
	out, err = s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeGone || len(out.Rows) > 0 {
		t.Fatal("pruned receipt fell back", out, err)
	}
}

func TestExploreRelatedDestinationPolicyBeforeQuery(t *testing.T) {
	f, p, s := exploreFixture(t)
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
	old := p.metadata
	p.metadata = func() data.ExploreMetadata {
		m := old()
		m.Entities[0].Relationships = []data.ExploreRelationship{{ID: "customer", EntityID: "customers"}}
		m.Entities = append(m.Entities, data.ExploreEntity{ID: "customers", Fields: []data.ExploreField{{ID: "id", Label: "Customer", Type: "string"}}})
		return m
	}
	called := false
	p.related = func(data.ExploreRelatedQuery) (data.ExploreSamples, error) {
		called = true
		return data.ExploreSamples{}, nil
	}
	p.auth = func(a data.ExploreAccess) error {
		if a.EntityID == "customers" {
			if a.SourceEntityID != "orders" || a.RecordKey != "opaque" {
				t.Fatal("lost relation source", a)
			}
			return data.Error(data.CodeDenied)
		}
		return nil
	}
	out, err := s.ExploreRelated(t.Context(), data.ExploreRelatedQuery{ExploreSamplesQuery: q, RecordKey: "opaque", RelationshipID: "customer"})
	if data.ErrorCode(err) != data.CodeDenied || called || len(out.Rows) > 0 {
		t.Fatal("denied destination was queried", out, err, called)
	}
}

func TestExploreProviderCannotMutatePinnedAuthority(t *testing.T) {
	f, p, s := exploreFixture(t)
	receipt := prepared(t, f, "detach-prepare")
	receipt = verified(t, f, receipt, "detach-verify")
	activation := run(t, f, data.Activate, activationInput(f, receipt, 0, "detach-activate"))
	successful(t, activation)
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
	q.Selection.Context = data.ExploreActive
	q.Selection.ReceiptID = receipt.ID
	q.Selection.ContentRevision = receipt.ContentRevision
	g := activation.Activation.Generation
	q.Selection.Generation = &g
	p.readHook = func(read data.ExploreRead) {
		*read.Selection.Generation++
		read.Receipt.ContentRevision++
		read.Receipt.Verification.Checks[0].Status = data.CheckFailed
	}
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
		*q.Selection.Generation++
		return testSample(q), nil
	}
	out, err := s.ExploreSamples(t.Context(), q)
	if err != nil || !out.Selection.Equal(q.Selection) || g != activation.Activation.Generation {
		t.Fatal("provider mutated service pin", out, err)
	}
}

func TestExploreSampleResponseCapAndMissingStates(t *testing.T) {
	f, p, s := exploreFixture(t)
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders", Limit: 100}
	columns := []data.ExploreField{}
	for i := range 32 {
		columns = append(columns, data.ExploreField{ID: fmt.Sprintf("field-%d", i), Label: "Field", Type: "string"})
	}
	old := p.metadata
	p.metadata = func() data.ExploreMetadata { m := old(); m.Entities[0].Fields = columns; return m }
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
		out := testSample(q)
		out.Columns = columns
		out.Rows = nil
		total := uint64(9)
		out.Total = &total
		for i := range 9 {
			cells := map[string]data.ExploreCell{}
			for _, c := range columns {
				cells[c.ID] = data.ExploreCell{State: "value", Value: strings.Repeat("x", 1000)}
			}
			out.Rows = append(out.Rows, data.ExploreRow{RecordKey: fmt.Sprintf("opaque-%d", i), Cells: cells})
		}
		return out, nil
	}
	out, err := s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeProvider || len(out.Rows) > 0 {
		t.Fatal("response cap silently truncated", out, err)
	}
	columns = columns[:4]
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
		out := testSample(q)
		out.Columns = columns
		out.Rows[0].Cells = map[string]data.ExploreCell{columns[0].ID: {State: "null"}, columns[1].ID: {State: "unknown"}, columns[2].ID: {State: "redacted"}, columns[3].ID: {State: "value", Value: ""}}
		return out, nil
	}
	out, err = s.ExploreSamples(t.Context(), q)
	if err != nil || out.Rows[0].Cells[columns[3].ID].Value != "" {
		t.Fatal(out, err)
	}
	for i, state := range []string{"null", "unknown", "redacted"} {
		cell := out.Rows[0].Cells[columns[i].ID]
		if cell.State != state || cell.Value != nil {
			t.Fatal("missing states collapsed", out)
		}
	}
}
