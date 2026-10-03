package data

import (
	"context"
	"encoding/json"
	"net/url"
	"reflect"
	"slices"
	"strings"
	"time"
)

type exploreBinding struct {
	principal  Principal
	read       ExploreRead
	provider   ExplorationProvider
	descriptor Descriptor
}

func (s *Service) bindExplore(ctx context.Context, selection ExploreSelection) (exploreBinding, error) {
	var b exploreBinding
	selection = cloneExploreSelection(selection)
	if err := selection.Validate(); err != nil {
		return b, err
	}
	p, err := s.principal(ctx)
	if err != nil {
		return b, err
	}
	b.principal = p
	b.read = ExploreRead{Selection: selection, Target: TargetKey{ScopeKey: p.ScopeKey, TargetID: selection.TargetID}}
	access := AccessRequest{Action: "view", Target: b.read.Target, Explore: &ExploreAccess{Selection: selection}}
	if err = s.authorize(ctx, p, access); err != nil {
		return b, err
	}
	provider := s.config.Providers[selection.Dataset.Provider]
	if provider == nil {
		return b, Error(CodeGone)
	}
	d, err := provider.Describe(ctx, p, selection.Dataset)
	if err != nil {
		return b, readFailure(ctx, err)
	}
	if d.Dataset != selection.Dataset {
		return b, Error(CodeStale)
	}
	if err = d.ValidateIdentity(); err != nil {
		return b, err
	}
	if !slices.Contains(d.Scenarios, selection.Scenario) {
		return b, Error(CodeStale)
	}
	b.descriptor = d
	if err = s.bindExploreReceipt(ctx, &b); err != nil {
		return b, err
	}
	if exploration, ok := provider.(ExplorationProvider); ok && !nilValue(exploration) {
		b.provider = exploration
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: b.read.Target, Receipt: b.read.Receipt, Explore: access.Explore}); err != nil {
		return b, err
	}
	return b, nil
}
func (s *Service) bindExploreReceipt(ctx context.Context, b *exploreBinding) error {
	selection := b.read.Selection
	if selection.Context == ExploreCatalog {
		return nil
	}
	receipt, err := s.LookupReceipt(ctx, selection.TargetID, selection.ReceiptID)
	if err != nil {
		return err
	}
	if receipt.Dataset != selection.Dataset || receipt.Scenario != selection.Scenario || receipt.ContentRevision != selection.ContentRevision {
		return Error(CodeStale)
	}
	p := b.principal
	if receipt.ModuleHash != p.ModuleHash || receipt.PolicyHash != p.PolicyHash || receipt.PermissionHash != p.PermissionHash {
		return Error(CodeDenied)
	}
	if err = s.config.Target.InspectReceipt(ctx, receipt); err != nil {
		return readFailure(ctx, err)
	}
	b.read.Receipt = &receipt
	if selection.Context != ExploreActive {
		return nil
	}
	state, err := s.Active(ctx, selection.TargetID)
	if err != nil {
		return err
	}
	if state.Transitioning || state.RecoveryRequired || !state.Activation.Ready || state.Activation.ReceiptID != selection.ReceiptID || state.Activation.Generation != *selection.Generation {
		return Error(CodeStale)
	}
	return nil
}

func (s *Service) authorizeExplore(ctx context.Context, b exploreBinding, a ExploreAccess) error {
	if err := s.authorizeExploreGrant(ctx, b, a); err != nil {
		return err
	}
	// A relationship grants access to a source record AND destination records.
	// Enforce both here so transports and direct service consumers cannot omit
	// the source check by forwarding only the destination's delivered columns.
	if a.SourceEntityID != "" {
		a.EntityID = a.SourceEntityID
		a.Fields = nil
		a.RecordKeys = nil
		return s.authorizeExploreGrant(ctx, b, a)
	}
	return nil
}
func (s *Service) authorizeExploreGrant(ctx context.Context, b exploreBinding, a ExploreAccess) error {
	a.Selection = cloneExploreSelection(b.read.Selection)
	policyAccess := cloneExploreAccess(a)
	if err := s.authorize(ctx, b.principal, AccessRequest{Action: "view", Target: b.read.Target, Receipt: b.read.Receipt, Explore: &policyAccess}); err != nil {
		return err
	}
	if b.provider != nil {
		if err := b.provider.AuthorizeExplore(ctx, b.principal, cloneExploreAccess(a)); err != nil {
			return authorizationFailure(ctx, err)
		}
	}
	return nil
}

// Rebind immediately before delivery; missing receipts and route/content drift never
// fall back to production or a different active generation.
func (s *Service) deliverExplore(ctx context.Context, b exploreBinding, accesses ...ExploreAccess) error {
	// Authorize the complete response as one bounded group, including relationship
	// sources. The second pass catches grant changes during the first pass.
	for range 2 {
		current, err := s.bindExplore(ctx, b.read.Selection)
		if err != nil {
			return err
		}
		if current.principal != b.principal {
			return Error(CodeDenied)
		}
		if !reflect.DeepEqual(current.read.Receipt, b.read.Receipt) {
			return Error(CodeStale)
		}
		for _, access := range accesses {
			if err = s.authorizeExplore(ctx, current, access); err != nil {
				return err
			}
		}
	}
	// End with observation, not another policy callback that can outlive the
	// selection it authorized. These reads disclose nothing and run only after
	// the whole response's current target/receipt/domain grants have succeeded.
	return s.validateExploreBinding(ctx, b)
}

func (s *Service) validateExploreBinding(ctx context.Context, b exploreBinding) error {
	p, err := s.principal(ctx)
	if err != nil {
		return err
	}
	if p != b.principal {
		return Error(CodeDenied)
	}
	selection := b.read.Selection
	d, err := s.config.Providers[selection.Dataset.Provider].Describe(ctx, p, selection.Dataset)
	if err != nil {
		return readFailure(ctx, err)
	}
	if d.Dataset != selection.Dataset || !slices.Contains(d.Scenarios, selection.Scenario) {
		return Error(CodeStale)
	}
	if err = d.ValidateIdentity(); err != nil {
		return err
	}
	if b.read.Receipt != nil {
		// Inspect the immutable stage before the final authoritative store reads.
		// Do not use LookupReceipt/Active here: they invoke policy again.
		if err = s.config.Target.InspectReceipt(ctx, *b.providerRead().Receipt); err != nil {
			return readFailure(ctx, err)
		}
	}
	if err = s.validateExploreStoreBinding(ctx, b); err != nil {
		return err
	}
	p, err = s.principal(ctx)
	if err != nil {
		return err
	}
	if p != b.principal {
		return Error(CodeDenied)
	}
	return nil
}
func (s *Service) validateExploreStoreBinding(ctx context.Context, b exploreBinding) error {
	selection := b.read.Selection
	if b.read.Receipt != nil {
		receipt, err := s.config.Store.GetReceipt(ctx, selection.ReceiptID)
		if err != nil {
			return readFailure(ctx, err)
		}
		if receipt.Target != b.read.Target {
			return Error(CodeGone)
		}
		if !reflect.DeepEqual(receipt, *b.read.Receipt) {
			return Error(CodeStale)
		}
	}
	if selection.Context == ExploreActive {
		state, err := s.config.Store.Target(ctx, b.read.Target)
		if err != nil {
			return readFailure(ctx, err)
		}
		if state.Pending != nil || state.RecoveryRequired || !state.Activation.Ready || state.Activation.ReceiptID != selection.ReceiptID || state.Activation.Generation != *selection.Generation {
			return Error(CodeStale)
		}
	}
	return ctx.Err()
}

func exploreEnvelope(b exploreBinding, state, revision, completeness string) ExploreEnvelope {
	provenance := "observed"
	if b.read.Selection.Context == ExploreCatalog {
		provenance = "example"
	}
	out := ExploreEnvelope{Selection: b.read.Selection, PresentationRevision: revision, ObservedAt: time.Now().UTC(), Provenance: provenance, Completeness: completeness, State: state}
	if state == ExploreUnsupported {
		out.Reason = "not_supported"
	}
	if state == ExploreSuppressed {
		out.Reason = "policy_suppressed"
	}
	return out
}
func boundedExplore(value any, max int) error {
	b, err := json.Marshal(value)
	if err != nil || len(b) > max {
		return Error(CodeProvider)
	}
	return nil
}
func validExploreState(state string) bool {
	return slices.Contains([]string{ExploreAvailable, ExploreUnsupported, ExploreEmpty, ExploreSuppressed}, state)
}
func validCompleteness(c string) bool {
	return slices.Contains([]string{"complete", "partial", "unknown"}, c)
}
func providerEnvelope(b exploreBinding, e ExploreEnvelope) (ExploreEnvelope, error) {
	if !validExploreState(e.State) || !validCompleteness(e.Completeness) || !exploreID(e.PresentationRevision) {
		return ExploreEnvelope{}, Error(CodeProvider)
	}
	out := exploreEnvelope(b, e.State, e.PresentationRevision, e.Completeness)
	// Reasons are enum-like safe states, never provider exception messages.
	if e.State == ExploreUnsupported {
		out.Reason = "not_supported"
	}
	if e.State == ExploreSuppressed {
		out.Reason = "policy_suppressed"
	}
	return out, nil
}
func (s *Service) ExploreMetadata(ctx context.Context, q ExploreMetadataQuery) (ExploreMetadata, error) {
	if ctx == nil {
		return ExploreMetadata{}, Error(CodeDenied)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	b, err := s.bindExplore(ctx, q.Selection)
	if err != nil {
		return ExploreMetadata{}, err
	}
	a := ExploreAccess{Selection: q.Selection}
	if err = s.authorizeExplore(ctx, b, a); err != nil {
		return ExploreMetadata{}, err
	}
	out := ExploreMetadata{ExploreEnvelope: exploreEnvelope(b, ExploreUnsupported, "unknown", "unknown"), Title: q.Selection.Dataset.ID, Origin: "unknown", Entities: []ExploreEntity{}, Scenarios: []ExploreScenario{}, Inventory: []ExploreCount{}, Usages: []ExploreUsage{}, UsageCompleteness: "unknown"}
	if b.provider != nil {
		out, err = b.provider.ExploreMetadata(ctx, b.principal, b.providerRead())
		if err != nil {
			return ExploreMetadata{}, readFailure(ctx, err)
		}
		out.ExploreEnvelope, err = providerEnvelope(b, out.ExploreEnvelope)
		if err != nil {
			return ExploreMetadata{}, err
		}
		if err = validateExploreMetadata(out, q.Selection, b.descriptor.Scenarios); err != nil {
			return ExploreMetadata{}, err
		}
		if out.State == ExploreSuppressed || out.State == ExploreUnsupported {
			out = ExploreMetadata{ExploreEnvelope: out.ExploreEnvelope, Title: q.Selection.Dataset.ID, Origin: "unknown", UsageCompleteness: "unknown"}
		} else {
			for _, e := range out.Entities {
				a.EntityID = e.ID
				a.Fields = nil
				for _, field := range e.Fields {
					a.Fields = append(a.Fields, field.ID)
				}
				if err = s.authorizeExplore(ctx, b, a); err != nil {
					return ExploreMetadata{}, err
				}
			}
			a.EntityID = ""
			a.Fields = nil
			out.Usages, err = s.resolveExploreUsages(ctx, b, out.Usages)
			if err != nil {
				return ExploreMetadata{}, err
			}
		}
	}
	if strings.TrimSpace(out.Title) == "" {
		out.Title = q.Selection.Dataset.ID
	}
	if out.Entities == nil {
		out.Entities = []ExploreEntity{}
	}
	if out.Scenarios == nil {
		out.Scenarios = []ExploreScenario{}
	}
	if out.Inventory == nil {
		out.Inventory = []ExploreCount{}
	}
	if out.Usages == nil {
		out.Usages = []ExploreUsage{}
	}
	if err = boundedExplore(out, ExploreMaxMetadataBytes); err != nil {
		return ExploreMetadata{}, err
	}
	for _, usage := range out.Usages {
		a.SurfaceIDs = append(a.SurfaceIDs, usage.SurfaceID)
	}
	// Check all entities/fields together after surface resolvers do work.
	accesses := []ExploreAccess{cloneExploreAccess(a)}
	for _, e := range out.Entities {
		a.EntityID = e.ID
		a.Fields = nil
		for _, field := range e.Fields {
			a.Fields = append(a.Fields, field.ID)
		}
		accesses = append(accesses, cloneExploreAccess(a))
	}
	if err = s.deliverExplore(ctx, b, accesses...); err != nil {
		return ExploreMetadata{}, err
	}
	return out, nil
}
func validateExploreMetadata(m ExploreMetadata, selection ExploreSelection, scenarios []ScenarioRef) error {
	if len(m.Entities) > 16 || len(m.Usages) > 32 || len(m.Scenarios) > 32 || len(m.Inventory) > 16 || !validCompleteness(m.UsageCompleteness) {
		return Error(CodeProvider)
	}
	ids := map[string]bool{}
	for _, e := range m.Entities {
		if !exploreID(e.ID) || ids[e.ID] || len(e.Fields) > 32 || len(e.Relationships) > 16 {
			return Error(CodeProvider)
		}
		ids[e.ID] = true
		if err := validateExploreColumns(e.Fields); err != nil {
			return err
		}
	}
	for _, e := range m.Entities {
		rels := map[string]bool{}
		for _, r := range e.Relationships {
			if !exploreID(r.ID) || rels[r.ID] || !ids[r.EntityID] {
				return Error(CodeProvider)
			}
			rels[r.ID] = true
		}
	}
	for _, sc := range m.Scenarios {
		if !sc.Scenario.Valid() || sc.Scenario.Dataset != selection.Dataset || !slices.Contains(scenarios, sc.Scenario) {
			return Error(CodeProvider)
		}
	}
	for _, c := range m.Inventory {
		if !ids[c.EntityID] || !slices.Contains([]string{"catalog_inventory", "selected_scenario"}, c.Scope) || c.Total != nil && *c.Total > MaxWireCounter {
			return Error(CodeProvider)
		}
	}
	for _, u := range m.Usages {
		if !exploreID(u.SurfaceID) || !slices.Contains([]string{"screen", "report", "workflow", "target"}, u.Kind) || len(u.Effects) > 3 {
			return Error(CodeProvider)
		}
		for _, effect := range u.Effects {
			if !slices.Contains([]string{"prepare", "verify", "activate"}, effect.Phase) {
				return Error(CodeProvider)
			}
		}
	}
	return nil
}
func (s *Service) resolveExploreUsages(ctx context.Context, b exploreBinding, usages []ExploreUsage) ([]ExploreUsage, error) {
	out := []ExploreUsage{}
	for _, u := range usages {
		u.Href = "" // Ignore every provider-supplied link, including unregistered surfaces.
		a := ExploreAccess{Selection: b.read.Selection, SurfaceIDs: []string{u.SurfaceID}}
		if err := s.authorizeExplore(ctx, b, a); err != nil {
			if ErrorCode(err) == CodeDenied {
				continue
			}
			return nil, err
		}
		if surface, ok := s.config.ExploreSurfaces[u.SurfaceID]; ok {
			href, err := surface.Resolve(ctx, b.principal)
			if err != nil {
				if ErrorCode(authorizationFailure(ctx, err)) == CodeDenied {
					continue
				}
				return nil, readFailure(ctx, err)
			}
			parsed, err := url.Parse(href)
			if err != nil || parsed.IsAbs() || parsed.Host != "" || !strings.HasPrefix(href, "/") || strings.HasPrefix(href, "//") || strings.ContainsAny(href, "\\\r\n") {
				return nil, Error(CodeProvider)
			}
			u.Href = href
		}
		out = append(out, u)
	}
	return out, nil
}

// AuthorizeExploration rechecks a loaded result after transport/host policy work.
// The host constructs a bounded grant group from the typed result, never from
// untrusted principal, receipt or physical routing metadata. All grants must
// select the same read. Related grants always include separate source checks.
func (s *Service) AuthorizeExploration(ctx context.Context, a ExploreAccess, additional ...ExploreAccess) error {
	if len(additional) > 16 {
		return Error(CodeInvalid)
	}
	if ctx == nil {
		return Error(CodeDenied)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	accesses := make([]ExploreAccess, 0, 1+len(additional))
	for _, access := range append([]ExploreAccess{a}, additional...) {
		if !access.Selection.Equal(a.Selection) || len(access.MetricIDs) > InsightsMaxMetrics || len(access.Fields) > 32 || len(access.RecordKeys) > ExploreMaxLimit || len(access.SurfaceIDs) > 32 {
			return Error(CodeInvalid)
		}
		accesses = append(accesses, cloneExploreAccess(access))
	}
	b, err := s.bindExplore(ctx, a.Selection)
	if err != nil {
		return err
	}
	return s.deliverExplore(ctx, b, accesses...)
}

func cloneExploreSelection(selection ExploreSelection) ExploreSelection {
	if selection.Generation != nil {
		generation := *selection.Generation
		selection.Generation = &generation
	}
	return selection
}

// Providers get detached read authority. A provider cannot accidentally rewrite
// the service's pinned generation, receipt or verification through pointer aliases.
func (b exploreBinding) providerRead() ExploreRead {
	read := b.read
	read.Selection = cloneExploreSelection(read.Selection)
	if read.Receipt != nil {
		receipt := *read.Receipt
		if receipt.Verification != nil {
			verification := *receipt.Verification
			verification.Checks = append([]Check(nil), verification.Checks...)
			verification.Coverage = append([]Coverage(nil), verification.Coverage...)
			verification.Artifacts = append([]ArtifactRef(nil), verification.Artifacts...)
			receipt.Verification = &verification
		}
		read.Receipt = &receipt
	}
	return read
}

func cloneExploreAccess(access ExploreAccess) ExploreAccess {
	access.Selection = cloneExploreSelection(access.Selection)
	access.Fields = append([]string(nil), access.Fields...)
	access.RecordKeys = append([]string(nil), access.RecordKeys...)
	access.SurfaceIDs = append([]string(nil), access.SurfaceIDs...)
	access.MetricIDs = append([]string(nil), access.MetricIDs...)
	return access
}
