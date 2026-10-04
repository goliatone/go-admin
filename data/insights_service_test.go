package data_test

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/data"
	"math"
	"strconv"
	"strings"
	"testing"
	"time"
)

type insightTestProvider struct {
	*exploreTestProvider
	set          data.InsightMetricSet
	result       func(context.Context, data.ExploreRead, data.ExploreInsightsQuery, data.InsightWork) (data.ExploreInsights, error)
	revision     uint64
	revisionRead func(context.Context) (string, error)
}

func (p *insightTestProvider) InsightAuthorizationRevision(ctx context.Context, _ data.Principal) (string, error) {
	if p.revisionRead != nil {
		return p.revisionRead(ctx)
	}
	return strconv.FormatUint(p.revision, 10), ctx.Err()
}

func (p *insightTestProvider) InsightMetricSets(context.Context, data.Principal, data.ExploreRead) ([]data.InsightMetricSet, error) {
	return []data.InsightMetricSet{p.set}, nil
}
func (p *insightTestProvider) ExploreInsights(ctx context.Context, _ data.Principal, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
	return p.result(ctx, r, q, b)
}

func insightFixture(t *testing.T) (*fixture, *insightTestProvider, *data.Service, data.ExploreInsightsQuery) {
	t.Helper()
	f, ep, _ := exploreFixture(t)
	p := &insightTestProvider{exploreTestProvider: ep, set: data.InsightMetricSet{ID: "orders", Metrics: []data.InsightMetricDefinition{{ID: "orders.count", Label: "Orders", Kind: "count", Unit: "orders", Population: "scenario orders"}}, Period: data.ExplorePeriod{Start: "2026-01-01", End: "2026-01-01", Timezone: "UTC"}, MaxQueries: 1, MaxRecords: 3, WorkEvidence: "indexed immutable bounded stage"}}
	p.result = func(_ context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, _ data.InsightWork) (data.ExploreInsights, error) {
		return data.ExploreInsights{ExploreEnvelope: data.ExploreEnvelope{State: data.ExploreAvailable, PresentationRevision: "1", Completeness: "complete"}, Metrics: []data.InsightMetric{{InsightMetricDefinition: p.set.Metrics[0], TimeScope: data.ExplorePeriod{Start: q.From, End: q.To, Timezone: p.set.Period.Timezone}, Value: new(float64(3)), Status: "known", SamplingMethod: "complete stage"}}, Coverage: []data.InsightCoverage{{LocalDay: q.From, Timezone: "UTC", Status: data.Uncovered}}, Work: data.InsightWork{Queries: 1, Records: 3}}, nil
	}
	cfg := f.serviceConfig(f.store)
	cfg.Providers = map[string]data.Provider{"sample": p}
	s, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	return f, p, s, data.ExploreInsightsQuery{Selection: catalogSelection(f), MetricSetID: "orders"}
}
func TestInsightsReadPolicyLegacyUnknownAndNoEffects(t *testing.T) {
	f, p, s, q := insightFixture(t)
	before := f.provider.effects.Load()
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil || out.Provenance != "example" || *out.Metrics[0].Value != 3 || f.provider.effects.Load() != before {
		t.Fatal(out, err)
	}
	legacy, err := f.service.ExploreInsights(t.Context(), q)
	if err != nil || legacy.State != data.ExploreUnsupported {
		t.Fatal(legacy, err)
	}
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		missing, missingErr := old(ctx, r, q, b)
		missing.Metrics = nil
		return missing, missingErr
	}
	out, err = s.ExploreInsights(t.Context(), q)
	if err != nil || out.Metrics[0].Value != nil || out.Metrics[0].Status != "unknown" {
		t.Fatal(out, err)
	}
	p.result = old
	denied := false
	p.auth = func(a data.ExploreAccess) error {
		if denied && len(a.MetricIDs) > 0 {
			return data.Error(data.CodeDenied)
		}
		return nil
	}
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		denied = true
		return old(ctx, r, q, b)
	}
	out, err = s.ExploreInsights(t.Context(), q)
	if data.ErrorCode(err) != data.CodeDenied || len(out.Metrics) > 0 {
		t.Fatal("revoked metrics leaked", out, err)
	}
}
func TestInsightsProviderValidationAndSuppression(t *testing.T) {
	for _, edit := range []func(*data.ExploreInsights){
		func(o *data.ExploreInsights) { o.Metrics[0].Value = new(math.NaN()) },
		func(o *data.ExploreInsights) { o.Metrics[0].Unit = "USD" },
		func(o *data.ExploreInsights) { o.Metrics[0].Status = "unknown" },
		func(o *data.ExploreInsights) { o.Work.Records = 10001 },
		func(o *data.ExploreInsights) { o.Coverage[0].Status = data.CoveredEmpty },
		func(o *data.ExploreInsights) { o.Coverage[0].Status = "covered" },
		func(o *data.ExploreInsights) { o.Metrics = append(o.Metrics, o.Metrics[0]) },
		func(o *data.ExploreInsights) { o.Metrics[0].TimeScope.Timezone = "Europe/Paris" },
	} {
		f, p, s, q := insightFixture(t)
		_ = f
		old := p.result
		p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
			o, e := old(ctx, r, q, b)
			edit(&o)
			return o, e
		}
		out, err := s.ExploreInsights(t.Context(), q)
		if data.ErrorCode(err) != data.CodeProvider || len(out.Metrics) > 0 {
			t.Fatal(out, err)
		}
	}
	_, p, s, q := insightFixture(t)
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		o, e := old(ctx, r, q, b)
		o.Metrics[0].Status = "suppressed"
		o.Metrics[0].Value = nil
		return o, e
	}
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil || out.State != data.ExploreSuppressed || len(out.Metrics) > 0 || len(out.Coverage) > 0 {
		t.Fatal(out, err)
	}
}
func TestInsightsCancellationBudgetAndExactEvidence(t *testing.T) {
	f, p, s, q := insightFixture(t)
	receipt := prepared(t, f, "insights-prepare")
	q.Selection.Context = data.ExplorePrepared
	q.Selection.ReceiptID = receipt.ID
	q.Selection.ContentRevision = receipt.ContentRevision
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		o, e := old(ctx, r, q, b)
		o.Coverage[0].Status = "covered"
		o.Coverage[0].Evidence = &data.InsightEvidence{Selection: r.Selection, Ref: "domain-query"}
		return o, e
	}
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil || out.Provenance != "observed" {
		t.Fatal(out, err)
	}
	good := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		o, e := good(ctx, r, q, b)
		o.Coverage[0].Evidence.Selection.ContentRevision++
		return o, e
	}
	if _, err = s.ExploreInsights(t.Context(), q); data.ErrorCode(err) != data.CodeProvider {
		t.Fatal(err)
	}
	p.result = func(ctx context.Context, _ data.ExploreRead, _ data.ExploreInsightsQuery, _ data.InsightWork) (data.ExploreInsights, error) {
		<-ctx.Done()
		return data.ExploreInsights{}, ctx.Err()
	}
	ctx, cancel := context.WithTimeout(t.Context(), time.Millisecond)
	defer cancel()
	out, err = s.ExploreInsights(ctx, q)
	if !errors.Is(err, context.DeadlineExceeded) || len(out.Metrics) > 0 {
		t.Fatal(out, err)
	}
	p.set.WorkEvidence = ""
	if _, err = s.ExploreInsights(t.Context(), q); data.ErrorCode(err) != data.CodeProvider {
		t.Fatal(err)
	}
}

func preparedInsightQuery(t *testing.T, f *fixture, q data.ExploreInsightsQuery) data.CompareSelectionsQuery {
	t.Helper()
	receipt := prepared(t, f, "compare-prepare")
	selection := q.Selection
	selection.Context = data.ExplorePrepared
	selection.ReceiptID = receipt.ID
	selection.ContentRevision = receipt.ContentRevision
	return data.CompareSelectionsQuery{Left: selection, Right: selection, MetricSetID: q.MetricSetID}
}
func TestInsightsComparisonObservedDeltaExamplesAndZero(t *testing.T) {
	f, p, s, q := insightFixture(t)
	c := preparedInsightQuery(t, f, q)
	out, err := s.CompareSelections(t.Context(), c)
	if err != nil || len(out.Metrics) != 1 || *out.Metrics[0].Delta != 0 || out.Left.Provenance != "observed" {
		t.Fatal(out, err)
	}
	c.Right = q.Selection
	out, err = s.CompareSelections(t.Context(), c)
	if err != nil || out.Metrics[0].Delta != nil || out.Metrics[0].Reason != "not_observed" {
		t.Fatal(out, err)
	}
	c = preparedInsightQuery(t, f, q)
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		o, e := old(ctx, r, q, b)
		o.Metrics[0].Value = new(float64(0))
		return o, e
	}
	out, err = s.CompareSelections(t.Context(), c)
	if err != nil || *out.Metrics[0].Delta != 0 || out.Metrics[0].PercentChange != nil || out.Metrics[0].Reason != "zero_baseline" {
		t.Fatal(out, err)
	}
}
func TestInsightsComparisonCumulativeBudgetRevocationAndSuppression(t *testing.T) {
	f, p, s, q := insightFixture(t)
	c := preparedInsightQuery(t, f, q)
	p.set.MaxQueries = 5
	calls := 0
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		calls++
		return old(ctx, r, q, b)
	}
	out, err := s.CompareSelections(t.Context(), c)
	if data.ErrorCode(err) != data.CodeUnavailable || calls != 1 || len(out.Left.Metrics) > 0 {
		t.Fatal(out, err, calls)
	}
	p.set.MaxQueries = 1
	calls = 0
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		calls++
		if calls == 2 {
			f.revoked.Store(true)
		}
		return old(ctx, r, q, b)
	}
	out, err = s.CompareSelections(t.Context(), c)
	if data.ErrorCode(err) != data.CodeDenied || len(out.Left.Metrics) > 0 {
		t.Fatal(out, err)
	}
	f.revoked.Store(false)
	calls = 0
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		calls++
		o, e := old(ctx, r, q, b)
		if calls == 2 {
			o.Metrics[0].Status = "suppressed"
			o.Metrics[0].Value = nil
		}
		return o, e
	}
	out, err = s.CompareSelections(t.Context(), c)
	if err != nil || len(out.Left.Metrics) > 0 || len(out.Right.Metrics) > 0 || len(out.Metrics) > 0 || len(out.Left.Coverage) > 0 {
		t.Fatal(out, err)
	}
}
func TestInsightsComparisonActiveDriftAcrossOtherSide(t *testing.T) {
	f, p, s, q := insightFixture(t)
	receipt := prepared(t, f, "insight-active")
	receipt = verified(t, f, receipt, "insight-verify")
	activated := run(t, f, data.Activate, activationInput(f, receipt, 0, "insight-activate"))
	successful(t, activated)
	selection := q.Selection
	selection.Context = data.ExploreActive
	selection.ReceiptID = receipt.ID
	selection.ContentRevision = receipt.ContentRevision
	g := activated.Activation.Generation
	selection.Generation = &g
	c := data.CompareSelectionsQuery{Left: selection, Right: q.Selection, MetricSetID: q.MetricSetID}
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		if r.Selection.Context == data.ExploreCatalog {
			next := prepared(t, f, "insight-next")
			next = verified(t, f, next, "insight-next-verify")
			successful(t, run(t, f, data.Activate, activationInput(f, next, g, "insight-next-activate")))
		}
		return old(ctx, r, q, b)
	}
	out, err := s.CompareSelections(t.Context(), c)
	if data.ErrorCode(err) != data.CodeStale || len(out.Left.Metrics) > 0 {
		t.Fatal(out, err)
	}
}

func TestInsightsAggregateCapsAndMissingCoverage(t *testing.T) {
	for _, kind := range []string{"metrics", "buckets", "days", "response", "work"} {
		t.Run(kind, func(t *testing.T) {
			_, p, s, q := insightFixture(t)
			old := p.result
			if kind == "metrics" {
				for i := range 16 {
					def := p.set.Metrics[0]
					def.ID = def.ID + string(rune('a'+i))
					p.set.Metrics = append(p.set.Metrics, def)
				}
			}
			p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
				o, e := old(ctx, r, q, b)
				switch kind {
				case "buckets":
					for range 33 {
						o.Metrics[0].Buckets = append(o.Metrics[0].Buckets, data.InsightBucket{ID: "x", Status: "known", Value: new(float64(1))})
					}
				case "days":
					for range 91 {
						o.Coverage = append(o.Coverage, o.Coverage[0])
					}
				case "response":
					o.Metrics[0].SamplingMethod = strings.Repeat("x", data.ExploreMaxResponseBytes)
				case "work":
					o.Work.Queries = b.Queries + 1
				}
				return o, e
			}
			out, err := s.ExploreInsights(t.Context(), q)
			if data.ErrorCode(err) != data.CodeProvider || len(out.Metrics) > 0 {
				t.Fatal(out, err)
			}
		})
	}
	_, p, s, q := insightFixture(t)
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		o, e := old(ctx, r, q, b)
		o.Coverage = nil
		return o, e
	}
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil || len(out.Coverage) != 1 || out.Coverage[0].Status != data.Unavailable || out.Coverage[0].Evidence != nil {
		t.Fatal(out, err)
	}
}
func TestInsightsComparisonBothSidePolicyAndOneDeadline(t *testing.T) {
	f, p, s, q := insightFixture(t)
	c := preparedInsightQuery(t, f, q)
	c.Right = q.Selection
	called := 0
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		called++
		return old(ctx, r, q, b)
	}
	p.auth = func(a data.ExploreAccess) error {
		if a.Selection.Context == data.ExploreCatalog && a.MetricSetID != "" {
			return data.Error(data.CodeDenied)
		}
		return nil
	}
	out, err := s.CompareSelections(t.Context(), c)
	if data.ErrorCode(err) != data.CodeDenied || len(out.Left.Metrics) > 0 {
		t.Fatal(out, err)
	}
	p.auth = nil
	called = 0
	var deadline time.Time
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		called++
		d, ok := ctx.Deadline()
		if !ok {
			t.Fatal("unbounded read")
		}
		if called == 1 {
			deadline = d
			return old(ctx, r, q, b)
		}
		if d != deadline {
			t.Fatal("per-side deadline was restarted")
		}
		<-ctx.Done()
		return data.ExploreInsights{}, ctx.Err()
	}
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Millisecond)
	defer cancel()
	out, err = s.CompareSelections(ctx, c)
	if !errors.Is(err, context.DeadlineExceeded) || len(out.Left.Metrics) > 0 {
		t.Fatal(out, err)
	}
}

// multiSetInsightProvider registers several metric sets for one selection.
type multiSetInsightProvider struct {
	*insightTestProvider
	sets []data.InsightMetricSet
}

func (p *multiSetInsightProvider) InsightMetricSets(context.Context, data.Principal, data.ExploreRead) ([]data.InsightMetricSet, error) {
	return p.sets, nil
}

func TestInsightsOmittedMetricSetResolvesFirstRegisteredSet(t *testing.T) {
	f, p, s, q := insightFixture(t)
	q.MetricSetID = ""
	read := []string{}
	old := p.result
	p.result = func(ctx context.Context, r data.ExploreRead, pq data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		read = append(read, pq.MetricSetID)
		return old(ctx, r, pq, b)
	}
	granted := []string{}
	p.auth = func(a data.ExploreAccess) error {
		if len(a.MetricIDs) > 0 {
			granted = append(granted, a.MetricSetID)
		}
		return nil
	}
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil || out.MetricSetID != "orders" || len(out.Metrics) != 1 || *out.Metrics[0].Value != 3 {
		t.Fatal(out, err)
	}
	if len(read) != 1 || read[0] != "orders" {
		t.Fatalf("provider read %v, want the resolved set", read)
	}
	for _, set := range granted {
		if set != "orders" {
			t.Fatalf("metric grants named %v, want the resolved set", granted)
		}
	}
	if err = s.AuthorizeInsights(t.Context(), []data.ExploreInsights{out}); err != nil {
		t.Fatal(err)
	}
	// A forged result that names no set cannot deliver metrics.
	forged := out
	forged.MetricSetID = ""
	if err = s.AuthorizeInsights(t.Context(), []data.ExploreInsights{forged}); err == nil {
		t.Fatal("an unnamed set delivered metrics")
	}

	// The first registered set is the default; an explicit ID still selects exactly.
	second := p.set
	second.ID = "orders-by-day"
	cfg := f.serviceConfig(f.store)
	cfg.Providers = map[string]data.Provider{"sample": &multiSetInsightProvider{insightTestProvider: p, sets: []data.InsightMetricSet{p.set, second}}}
	multi, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if out, err = multi.ExploreInsights(t.Context(), q); err != nil || out.MetricSetID != "orders" {
		t.Fatal(out, err)
	}
	explicit := q
	explicit.MetricSetID = "orders-by-day"
	if out, err = multi.ExploreInsights(t.Context(), explicit); err != nil || out.MetricSetID != "orders-by-day" {
		t.Fatal(out, err)
	}

	// No registered set (or a legacy provider) stays unsupported, names no set
	// and remains deliverable; comparisons still require an explicit set.
	cfg.Providers = map[string]data.Provider{"sample": &multiSetInsightProvider{insightTestProvider: p}}
	none, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	for _, service := range []*data.Service{none, f.service} {
		unsupported, readErr := service.ExploreInsights(t.Context(), q)
		if readErr != nil || unsupported.State != data.ExploreUnsupported || unsupported.MetricSetID != "" || len(unsupported.Metrics) != 0 {
			t.Fatal(unsupported, readErr)
		}
		if readErr = service.AuthorizeInsights(t.Context(), []data.ExploreInsights{unsupported}); readErr != nil {
			t.Fatal(readErr)
		}
	}
	if _, err = s.CompareSelections(t.Context(), data.CompareSelectionsQuery{Left: q.Selection, Right: q.Selection}); err == nil {
		t.Fatal("comparison without a metric set")
	}
}
