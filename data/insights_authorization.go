package data

import (
	"context"
	"time"
)

type insightRevision struct {
	source InsightAuthorizationRevision
	value  string
}

// Server-only observation. It never becomes a browser token or survives JSON.
type insightAuthorization struct {
	service   *Service
	principal Principal
	revisions []insightRevision
	bindings  []exploreBinding
}

func (s *Service) beginInsightAuthorization(ctx context.Context, selections ...ExploreSelection) (*insightAuthorization, error) {
	p, err := s.principal(ctx)
	if err != nil {
		return nil, err
	}
	fence := &insightAuthorization{service: s, principal: p}
	if policy, ok := s.config.Policy.(InsightAuthorizationRevision); ok {
		if err = fence.capture(ctx, policy); err != nil {
			return nil, err
		}
	}
	seen := map[string]bool{}
	for _, selection := range selections {
		id := selection.Dataset.Provider
		if seen[id] {
			continue
		}
		seen[id] = true
		provider := s.config.Providers[id]
		if _, ok := provider.(InsightsProvider); !ok {
			continue
		}
		revision, ok := provider.(InsightAuthorizationRevision)
		if !ok || nilValue(revision) {
			// Preserve explorer/catalog use without claiming safe aggregate support.
			return nil, nil
		}
		if err = fence.capture(ctx, revision); err != nil {
			return nil, err
		}
	}
	return fence, nil
}

func insightRevisionValue(ctx context.Context, source InsightAuthorizationRevision, p Principal) (string, error) {
	value, err := source.InsightAuthorizationRevision(ctx, p)
	if err != nil {
		return "", authorizationFailure(ctx, err)
	}
	if err = ctx.Err(); err != nil {
		return "", err
	}
	if value == "" || len(value) > 256 {
		return "", Error(CodeProvider)
	}
	return value, nil
}

func (f *insightAuthorization) capture(ctx context.Context, source InsightAuthorizationRevision) error {
	value, err := insightRevisionValue(ctx, source, f.principal)
	if err != nil {
		return err
	}
	f.revisions = append(f.revisions, insightRevision{source: source, value: value})
	return nil
}

func (f *insightAuthorization) validateSources(ctx context.Context) error {
	for _, b := range f.bindings {
		if b.principal != f.principal {
			return Error(CodeDenied)
		}
		if err := f.service.validateExploreBinding(ctx, b); err != nil {
			return err
		}
	}
	return ctx.Err()
}

func (f *insightAuthorization) validatePrincipal(ctx context.Context) error {
	p, err := f.service.principal(ctx)
	if err != nil {
		return err
	}
	if p != f.principal {
		return Error(CodeDenied)
	}
	return ctx.Err()
}
func (f *insightAuthorization) seal(ctx context.Context) error {
	// Inspect/Describe/resolver callbacks for a later side may change an earlier
	// side. Once ALL callbacks finish, recheck the authoritative pins as a group.
	for _, b := range f.bindings {
		if err := f.service.validateExploreStoreBinding(ctx, b); err != nil {
			return err
		}
	}
	// All potentially mutating host/provider/source callbacks have now finished.
	// End with observation-only revision reads, not another grant callback.
	for _, revision := range f.revisions {
		value, err := insightRevisionValue(ctx, revision.source, f.principal)
		if err != nil {
			return err
		}
		if value != revision.value {
			return Error(CodeDenied)
		}
	}
	return ctx.Err()
}

// ValidateInsightsDelivery checks the original observations, then runs an optional
// final host/session check, then seals the whole group's source pins and policy
// revisions. Transports must put their LAST host check here: no policy, provider
// or host callbacks may run after this returns and before writing the result.
// Only results loaded by this Service may disclose aggregates; JSON cannot mint
// a fence. The supplied check must retain the request's cancellation/deadline.
func (s *Service) ValidateInsightsDelivery(ctx context.Context, results []ExploreInsights, finalCheck ...InsightDeliveryCheck) error {
	if ctx == nil || s == nil {
		return Error(CodeDenied)
	}
	if len(results) < 1 || len(results) > 2 || len(finalCheck) > 1 {
		return Error(CodeInvalid)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	fences, err := s.insightResultFences(results)
	if err != nil {
		return err
	}
	for _, fence := range fences {
		if err = fence.validateSources(ctx); err != nil {
			return err
		}
	}
	if ctx, err = insightFinalCheck(ctx, finalCheck); err != nil {
		return err
	}
	for _, fence := range fences {
		if err = fence.validatePrincipal(ctx); err != nil {
			return err
		}
	}
	for _, fence := range fences {
		if err = fence.seal(ctx); err != nil {
			return err
		}
	}
	return ctx.Err()
}

func insightFinalCheck(ctx context.Context, checks []InsightDeliveryCheck) (context.Context, error) {
	if len(checks) == 0 {
		return ctx, nil
	}
	if checks[0] == nil {
		return nil, Error(CodeInvalid)
	}
	next, err := checks[0](ctx)
	if err != nil {
		return nil, err
	}
	if err = ctx.Err(); err != nil {
		return nil, err
	}
	if next == nil {
		return nil, Error(CodeDenied)
	}
	return next, next.Err()
}

func (s *Service) insightResultFences(results []ExploreInsights) ([]*insightAuthorization, error) {
	fences := []*insightAuthorization{}
	seen := map[*insightAuthorization]bool{}
	for _, out := range results {
		fence := out.authorization
		if fence == nil {
			if out.State != ExploreUnsupported || len(out.Metrics) != 0 || len(out.Coverage) != 0 {
				return nil, Error(CodeDenied)
			}
			continue
		}
		if fence.service != s || !fence.contains(out.Selection) {
			return nil, Error(CodeDenied)
		}
		if !seen[fence] {
			seen[fence] = true
			fences = append(fences, fence)
		}
	}
	return fences, nil
}
func (f *insightAuthorization) contains(selection ExploreSelection) bool {
	for _, b := range f.bindings {
		if b.read.Selection.Equal(selection) {
			return true
		}
	}
	return false
}
func (f *insightAuthorization) bind(bindings ...exploreBinding) {
	if f != nil {
		f.bindings = bindings
	}
}
