package data_test

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/goliatone/go-admin/data"
)

func TestInsightsComparisonFinalCrossSideGrantChange(t *testing.T) {
	f, p, s, q := insightFixture(t)
	c := preparedInsightQuery(t, f, q)
	c.Right = q.Selection
	old := p.result
	reads := 0
	revoked := false
	p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		reads++
		return old(ctx, r, q, b)
	}
	p.auth = func(a data.ExploreAccess) error {
		if len(a.MetricIDs) == 0 {
			return nil
		}
		if a.Selection.Equal(c.Left) && revoked {
			return data.Error(data.CodeDenied)
		}
		if reads == 2 && a.Selection.Equal(c.Right) {
			revoked = true
			p.revision++
		}
		return nil
	}
	out, err := s.CompareSelections(t.Context(), c)
	if data.ErrorCode(err) != data.CodeDenied || !revoked || len(out.Left.Metrics) != 0 || len(out.Right.Metrics) != 0 {
		t.Fatalf("final cross-side revocation leaked: revoked=%v out=%+v err=%v", revoked, out, err)
	}
}

type revisionInsightPolicy struct {
	revision atomic.Uint64
	check    func(data.AccessRequest) error
}

func (p *revisionInsightPolicy) Authorize(_ context.Context, _ data.Principal, a data.AccessRequest) error {
	if p.check != nil {
		return p.check(a)
	}
	return nil
}
func (p *revisionInsightPolicy) InsightAuthorizationRevision(ctx context.Context, _ data.Principal) (string, error) {
	return strconv.FormatUint(p.revision.Load(), 10), ctx.Err()
}

func TestInsightsFenceRejectsPolicyChangesWithUnchangedMetricGrants(t *testing.T) {
	for _, mode := range []string{"provider-filter", "host-filter", "revoke-restore"} {
		t.Run(mode, func(t *testing.T) {
			f, p, _, q := insightFixture(t)
			policy := &revisionInsightPolicy{}
			cfg := f.serviceConfig(f.store)
			cfg.Providers = map[string]data.Provider{"sample": p}
			cfg.Policy = policy
			s, err := data.NewService(cfg)
			if err != nil {
				t.Fatal(err)
			}
			old := p.result
			p.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
				out, readErr := old(ctx, r, q, b)
				switch mode {
				case "provider-filter":
					p.revision++
				case "host-filter":
					policy.revision.Add(1)
				case "revoke-restore":
					p.revision += 2
				}
				return out, readErr
			}
			out, err := s.ExploreInsights(t.Context(), q)
			if data.ErrorCode(err) != data.CodeDenied || len(out.Metrics) != 0 {
				t.Fatal("changed policy observation leaked", out, err)
			}
		})
	}
}

func TestInsightsFenceRevisionFailuresAndCancellation(t *testing.T) {
	for _, mode := range []string{"empty", "oversize", "outage", "canceled"} {
		t.Run(mode, func(t *testing.T) {
			_, p, s, q := insightFixture(t)
			calls := 0
			p.revisionRead = func(ctx context.Context) (string, error) {
				calls++
				if calls == 1 {
					return "original", nil
				}
				switch mode {
				case "empty":
					return "", nil
				case "oversize":
					return strings.Repeat("x", 257), nil
				case "outage":
					return "", data.Error(data.CodeUnavailable)
				default:
					return "", context.Canceled
				}
			}
			out, err := s.ExploreInsights(t.Context(), q)
			if err == nil || len(out.Metrics) != 0 {
				t.Fatal("invalid revision disclosed metrics", out, err)
			}
			if mode == "canceled" && !errors.Is(err, context.Canceled) {
				t.Fatal(err)
			}
			if mode == "outage" && data.ErrorCode(err) != data.CodeUnavailable {
				t.Fatal(err)
			}
			if (mode == "empty" || mode == "oversize") && data.ErrorCode(err) != data.CodeProvider {
				t.Fatal(err)
			}
		})
	}
}

// This provider has the old insight capability, but no authorization revision.
// It must remain useful as an explorer, without querying unsafe aggregates.
type unfencedInsightProvider struct {
	*exploreTestProvider
	inner *insightTestProvider
}

func (p *unfencedInsightProvider) InsightMetricSets(ctx context.Context, principal data.Principal, r data.ExploreRead) ([]data.InsightMetricSet, error) {
	return p.inner.InsightMetricSets(ctx, principal, r)
}
func (p *unfencedInsightProvider) ExploreInsights(ctx context.Context, principal data.Principal, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
	return p.inner.ExploreInsights(ctx, principal, r, q, b)
}

func TestInsightsUnfencedProviderFallback(t *testing.T) {
	f, p, _, q := insightFixture(t)
	cfg := f.serviceConfig(f.store)
	cfg.Providers = map[string]data.Provider{"sample": &unfencedInsightProvider{p.exploreTestProvider, p}}
	s, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	p.result = func(context.Context, data.ExploreRead, data.ExploreInsightsQuery, data.InsightWork) (data.ExploreInsights, error) {
		t.Fatal("unfenced aggregate queried")
		return data.ExploreInsights{}, nil
	}
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil || out.State != data.ExploreUnsupported || len(out.Metrics) > 0 {
		t.Fatal(out, err)
	}
	compare, err := s.CompareSelections(t.Context(), data.CompareSelectionsQuery{Left: q.Selection, Right: q.Selection, MetricSetID: q.MetricSetID})
	if err != nil || compare.Left.State != data.ExploreUnsupported || len(compare.LeftDeclarations.Usages) > 0 || len(compare.Metrics) > 0 {
		t.Fatal(compare, err)
	}
	meta, err := s.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: q.Selection})
	if err != nil || meta.State != data.ExploreAvailable {
		t.Fatal(meta, err)
	}
}

func TestInsightsFenceDoesNotSurviveWireOrSelectionChanges(t *testing.T) {
	_, p, s, q := insightFixture(t)
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(out)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "authorization") {
		t.Fatal("authorization fence exposed")
	}
	var wire data.ExploreInsights
	if err = json.Unmarshal(raw, &wire); err != nil {
		t.Fatal(err)
	}
	if err = s.AuthorizeInsights(t.Context(), []data.ExploreInsights{wire}); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("wire forged observation fence", err)
	}
	modified := out
	modified.Selection.TargetID = "another-target"
	if err = s.ValidateInsightsDelivery(t.Context(), []data.ExploreInsights{modified}); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("rebound fence", err)
	}
	p.revision++
	if err = s.AuthorizeInsights(t.Context(), []data.ExploreInsights{out}); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("reauthorization reset original revision", err)
	}
}

func TestInsightsFinalDeliveryValidatesOriginalActivePin(t *testing.T) {
	f, _, s, q := insightFixture(t)
	receipt := prepared(t, f, "fence-active-prepare")
	receipt = verified(t, f, receipt, "fence-active-verify")
	activated := run(t, f, data.Activate, activationInput(f, receipt, 0, "fence-active-activate"))
	successful(t, activated)
	generation := activated.Activation.Generation
	q.Selection.Context = data.ExploreActive
	q.Selection.ReceiptID = receipt.ID
	q.Selection.ContentRevision = receipt.ContentRevision
	q.Selection.Generation = &generation
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	next := prepared(t, f, "fence-next-prepare")
	next = verified(t, f, next, "fence-next-verify")
	successful(t, run(t, f, data.Activate, activationInput(f, next, generation, "fence-next-activate")))
	if err = s.ValidateInsightsDelivery(t.Context(), []data.ExploreInsights{out}); data.ErrorCode(err) != data.CodeStale {
		t.Fatal("late active pin drift delivered", err)
	}
}

type insightInspectTarget struct {
	data.ManagedTarget
	after func(data.PreparationReceipt)
}

func (t *insightInspectTarget) InspectReceipt(ctx context.Context, r data.PreparationReceipt) error {
	if err := t.ManagedTarget.InspectReceipt(ctx, r); err != nil {
		return err
	}
	if t.after != nil {
		t.after(r)
	}
	return nil
}

func TestInsightsFinalGroupPinsAfterAllSourceCallbacks(t *testing.T) {
	f, p, _, q := insightFixture(t)
	left := prepared(t, f, "fence-left")
	left = verified(t, f, left, "fence-left-verify")
	active := run(t, f, data.Activate, activationInput(f, left, 0, "fence-left-activate"))
	successful(t, active)
	right := prepared(t, f, "fence-right")
	right = verified(t, f, right, "fence-right-verify")
	next := prepared(t, f, "fence-switch")
	next = verified(t, f, next, "fence-switch-verify")
	generation := active.Activation.Generation
	l := q.Selection
	l.Context = data.ExploreActive
	l.ReceiptID = left.ID
	l.ContentRevision = left.ContentRevision
	l.Generation = &generation
	r := q.Selection
	r.Context = data.ExplorePrepared
	r.ReceiptID = right.ID
	r.ContentRevision = right.ContentRevision
	target := &insightInspectTarget{ManagedTarget: f.target}
	cfg := f.serviceConfig(f.store)
	cfg.Target = target
	cfg.Providers = map[string]data.Provider{"sample": p}
	s, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	out, err := s.CompareSelections(t.Context(), data.CompareSelectionsQuery{Left: l, Right: r, MetricSetID: q.MetricSetID})
	if err != nil {
		t.Fatal(err)
	}
	switched := false
	target.after = func(receipt data.PreparationReceipt) {
		if receipt.ID == right.ID && !switched {
			switched = true
			successful(t, run(t, f, data.Activate, activationInput(f, next, generation, "fence-switch-activate")))
		}
	}
	err = s.ValidateInsightsDelivery(t.Context(), []data.ExploreInsights{out.Left, out.Right})
	if !switched || data.ErrorCode(err) != data.CodeStale {
		t.Fatal("late right source callback invalidated left pin", switched, err)
	}
}

func TestInsightsFenceCoversDifferentProviders(t *testing.T) {
	f, left, _, q := insightFixture(t)
	_, right, _, rightQuery := insightFixture(t)
	rightQuery.Selection.Dataset.Provider = "other"
	rightQuery.Selection.Scenario.Dataset = rightQuery.Selection.Dataset
	right.input.Dataset = rightQuery.Selection.Dataset
	right.input.Scenario = rightQuery.Selection.Scenario
	descriptor, err := right.Describe(t.Context(), f.principal, rightQuery.Selection.Dataset)
	if err != nil {
		t.Fatal(err)
	}
	digest, err := descriptor.CompositeDigest()
	if err != nil {
		t.Fatal(err)
	}
	rightQuery.Selection.Dataset.Digest = digest
	rightQuery.Selection.Scenario.Dataset = rightQuery.Selection.Dataset
	right.input.Dataset = rightQuery.Selection.Dataset
	right.input.Scenario = rightQuery.Selection.Scenario
	cfg := f.serviceConfig(f.store)
	cfg.Providers = map[string]data.Provider{"sample": left, "other": right}
	s, err := data.NewService(cfg)
	if err != nil {
		t.Fatal(err)
	}
	old := right.result
	right.result = func(ctx context.Context, r data.ExploreRead, q data.ExploreInsightsQuery, b data.InsightWork) (data.ExploreInsights, error) {
		out, readErr := old(ctx, r, q, b)
		left.revision++
		return out, readErr
	}
	out, err := s.CompareSelections(t.Context(), data.CompareSelectionsQuery{Left: q.Selection, Right: rightQuery.Selection, MetricSetID: q.MetricSetID})
	if data.ErrorCode(err) != data.CodeDenied || len(out.Left.Metrics) > 0 || len(out.Right.Metrics) > 0 {
		t.Fatal("cross-provider policy change leaked", out, err)
	}
}

func TestInsightsSameSelectionUsageGrantUnion(t *testing.T) {
	for _, count := range []int{17, 32} {
		t.Run(strconv.Itoa(count), func(t *testing.T) {
			f, p, s, q := insightFixture(t)
			c := preparedInsightQuery(t, f, q)
			old := p.metadata
			p.metadata = func() data.ExploreMetadata {
				m := old()
				for i := range count {
					m.Usages = append(m.Usages, data.ExploreUsage{SurfaceID: "surface-" + strconv.Itoa(i), Kind: "report", Label: "Report"})
				}
				return m
			}
			out, err := s.CompareSelections(t.Context(), c)
			if err != nil || len(out.LeftDeclarations.Usages) != count || len(out.RightDeclarations.Usages) != count {
				t.Fatal("comparison declarations lost", out, err)
			}
			declaration := data.ExploreAccess{Selection: c.Left}
			for _, u := range out.LeftDeclarations.Usages {
				declaration.SurfaceIDs = append(declaration.SurfaceIDs, u.SurfaceID)
			}
			checked := 0
			p.auth = func(a data.ExploreAccess) error {
				if len(a.MetricIDs) > 0 {
					checked++
					if len(a.SurfaceIDs) != count {
						t.Errorf("expected %d unique grants, got %d", count, len(a.SurfaceIDs))
					}
					seen := map[string]bool{}
					for _, id := range a.SurfaceIDs {
						if seen[id] {
							t.Errorf("duplicate grant %s", id)
						}
						seen[id] = true
					}
				}
				return nil
			}
			if err = s.AuthorizeInsights(t.Context(), []data.ExploreInsights{out.Left, out.Right}, declaration, declaration); err != nil || checked != 2 {
				t.Fatal("identical selections rejected", checked, err)
			}
			overflow := declaration
			overflow.SurfaceIDs = []string{"extra-surface"}
			if count == 32 {
				if err = s.AuthorizeInsights(t.Context(), []data.ExploreInsights{out.Left, out.Right}, declaration, overflow); data.ErrorCode(err) != data.CodeInvalid {
					t.Fatal("33 unique grants accepted", err)
				}
			}
		})
	}
}

type insightFinalContextKey struct{}

func TestInsightsFinalCheckResolvedContext(t *testing.T) {
	_, p, s, q := insightFixture(t)
	out, err := s.ExploreInsights(t.Context(), q)
	if err != nil {
		t.Fatal(err)
	}
	observed := false
	p.revisionRead = func(ctx context.Context) (string, error) {
		observed = ctx.Value(insightFinalContextKey{}) == true
		return "0", ctx.Err()
	}
	err = s.ValidateInsightsDelivery(t.Context(), []data.ExploreInsights{out}, func(ctx context.Context) (context.Context, error) {
		return context.WithValue(ctx, insightFinalContextKey{}, true), nil
	})
	if err != nil || !observed {
		t.Fatal("final host context lost before sealing", observed, err)
	}
	err = s.ValidateInsightsDelivery(t.Context(), []data.ExploreInsights{out}, func(ctx context.Context) (context.Context, error) {
		next, cancel := context.WithCancel(ctx)
		cancel()
		return next, nil
	})
	if !errors.Is(err, context.Canceled) {
		t.Fatal("resolved context cancellation ignored", err)
	}
	err = s.ValidateInsightsDelivery(t.Context(), []data.ExploreInsights{out}, func(context.Context) (context.Context, error) { return nil, nil })
	if data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("nil host context accepted", err)
	}
}
