package engine

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/placement/models"
	"github.com/goliatone/go-admin/pkg/placement/resolvers"
	"github.com/google/uuid"
)

// PlacementOrchestrator executes placement resolvers under policy constraints.
type PlacementOrchestrator interface {
	Run(ctx context.Context, input RunInput) (models.Run, error)
}

// RunInput captures a placement execution request.
type RunInput struct {
	RunID              string
	AgreementID        string
	CreatedByUserID    string
	OrgID              string
	UserID             string
	PolicyOverride     *models.Policy
	DocumentBytes      []byte
	DocumentPageCount  int
	FieldDefinitions   []models.FieldDefinition
	ExistingPlacements []models.ExistingPlacement
	NativeFormFields   []models.NativeFormField
}

// Orchestrator is the default placement orchestrator implementation.
type Orchestrator struct {
	registry *resolvers.Registry
	policies PlacementPolicy
	now      func() time.Time
}

// NewOrchestrator constructs a policy-aware placement orchestrator.
func NewOrchestrator(registry *resolvers.Registry, policies PlacementPolicy) *Orchestrator {
	return &Orchestrator{
		registry: registry,
		policies: policies,
		now:      func() time.Time { return time.Now().UTC() },
	}
}

func (o *Orchestrator) Run(ctx context.Context, input RunInput) (models.Run, error) {
	if o == nil || o.registry == nil {
		return models.Run{}, errors.New("placement orchestrator not configured")
	}
	startedAt := o.now()
	run := models.Run{
		ID:              primitives.FirstNonEmpty(strings.TrimSpace(input.RunID), uuid.NewString()),
		AgreementID:     strings.TrimSpace(input.AgreementID),
		CreatedByUserID: strings.TrimSpace(input.CreatedByUserID),
		CreatedAt:       startedAt,
		Status:          models.RunStatusFailed,
		ReasonCode:      models.RunReasonResolverError,
	}

	policy, err := o.resolvePolicy(ctx, input)
	if err != nil {
		return run, err
	}
	run.Policy = policy
	order := o.resolveOrder(policy)
	run.ResolverOrder = append([]string{}, order...)

	unresolved := unresolvedDefinitionIDs(input.FieldDefinitions, input.ExistingPlacements)
	if len(unresolved) == 0 {
		run.Status = models.RunStatusCompleted
		run.ReasonCode = models.RunReasonResolvedAll
		run.CompletedAt = startedAt
		return run, nil
	}

	resolverInput := resolvers.ResolveInput{
		DocumentBytes:      append([]byte{}, input.DocumentBytes...),
		DocumentPageCount:  input.DocumentPageCount,
		ExistingPlacements: append([]models.ExistingPlacement{}, input.ExistingPlacements...),
		NativeFormFields:   append([]models.NativeFormField{}, input.NativeFormFields...),
	}
	allDefinitions := mapDefinitions(input.FieldDefinitions)
	accepted := map[string]models.Suggestion{}
	estimates := make([]models.Estimate, 0, len(order))
	for _, resolverID := range order {
		entry, ok := o.registry.Resolve(resolverID)
		if !ok {
			continue
		}
		estimate, estimateErr := entry.Resolver.Estimate(ctx, resolverInput)
		if estimateErr != nil {
			estimates = append(estimates, models.Estimate{ResolverID: resolverID, Supported: false, Reason: estimateErr.Error()})
			continue
		}
		estimate.ResolverID = resolverID
		estimates = append(estimates, estimate)
	}
	run.Estimates = append(run.Estimates, estimates...)
	run.Scores = RankScores(estimates, policy.Weights)

	executionOrder := executionResolverOrder(policy, run.Scores)
	for _, resolverID := range executionOrder {
		entry, ok := o.registry.Resolve(resolverID)
		if !ok {
			continue
		}
		estimate := findEstimate(estimates, resolverID)
		if !estimate.Supported {
			continue
		}
		if policy.Limits.MaxBudget > 0 && run.BudgetUsed+estimate.Cost > policy.Limits.MaxBudget {
			run.Status = models.RunStatusBudgetExhausted
			run.ReasonCode = models.RunReasonBudgetExhausted
			break
		}
		if policy.Limits.MaxTime > 0 && time.Since(startedAt) >= policy.Limits.MaxTime {
			run.Status = models.RunStatusTimedOut
			run.ReasonCode = models.RunReasonTimedOut
			break
		}

		currentUnresolved := unresolvedDefinitions(unresolved, accepted, allDefinitions)
		if len(currentUnresolved) == 0 {
			break
		}
		remainingBudget := 0.0
		if policy.Limits.MaxBudget > 0 {
			remainingBudget = policy.Limits.MaxBudget - run.BudgetUsed
		}
		remainingTime := time.Duration(0)
		if policy.Limits.MaxTime > 0 {
			remainingTime = policy.Limits.MaxTime - time.Since(startedAt)
			if remainingTime < 0 {
				remainingTime = 0
			}
		}
		callInput := resolverInput
		callInput.FieldDefinitions = currentUnresolved
		callInput.BudgetRemaining = remainingBudget
		callInput.TimeRemaining = remainingTime

		resolverCtx := ctx
		var cancel context.CancelFunc
		if remainingTime > 0 {
			resolverCtx, cancel = context.WithTimeout(ctx, remainingTime)
		}
		result, resolveErr := entry.Resolver.Resolve(resolverCtx, callInput)
		if cancel != nil {
			cancel()
		}
		run.ExecutedResolvers = append(run.ExecutedResolvers, resolverID)
		run.BudgetUsed += estimate.Cost
		if resolveErr != nil {
			run.Status = models.RunStatusPartial
			run.ReasonCode = models.RunReasonResolverError
			break
		}
		mergeSuggestions(accepted, result.Suggestions)
		if result.Terminate {
			run.Status = models.RunStatusPartial
			run.ReasonCode = primitives.FirstNonEmpty(strings.TrimSpace(result.TerminationReason), models.RunReasonResolverShortStop)
			break
		}
	}

	run.CompletedAt = o.now()
	run.Elapsed = run.CompletedAt.Sub(startedAt)
	run.Suggestions = materializeSuggestions(accepted)
	run.UnresolvedDefinitionIDs = unresolvedAfterMerge(unresolved, accepted)
	run.SelectedSource = selectSource(run.Suggestions)
	if run.Status == "" || run.Status == models.RunStatusFailed {
		if len(run.UnresolvedDefinitionIDs) == 0 {
			run.Status = models.RunStatusCompleted
			run.ReasonCode = models.RunReasonResolvedAll
		} else {
			run.Status = models.RunStatusPartial
			run.ReasonCode = models.RunReasonUnresolvedFields
		}
	}
	if run.Status == models.RunStatusBudgetExhausted || run.Status == models.RunStatusTimedOut {
		if len(run.Suggestions) > 0 {
			run.Status = models.RunStatusPartial
		}
	}
	return run, nil
}

func (o *Orchestrator) resolvePolicy(ctx context.Context, input RunInput) (models.Policy, error) {
	if o.policies == nil {
		fallback := DefaultPolicy()
		fallback.EnabledResolvers = append([]string{}, o.registry.OrderedIDs()...)
		fallback.HardOrder = append([]string{}, fallback.EnabledResolvers...)
		return fallback, nil
	}
	return o.policies.Resolve(ctx, PolicyResolveInput{
		OrgID:           strings.TrimSpace(input.OrgID),
		UserID:          strings.TrimSpace(input.UserID),
		PerRunOverride:  input.PolicyOverride,
		RegisteredOrder: o.registry.OrderedIDs(),
	})
}

func (o *Orchestrator) resolveOrder(policy models.Policy) []string {
	if len(policy.HardOrder) > 0 {
		return append([]string{}, policy.HardOrder...)
	}
	if len(policy.EnabledResolvers) > 0 {
		return append([]string{}, policy.EnabledResolvers...)
	}
	return o.registry.OrderedIDs()
}

func mapDefinitions(definitions []models.FieldDefinition) map[string]models.FieldDefinition {
	out := make(map[string]models.FieldDefinition, len(definitions))
	for _, definition := range definitions {
		id := strings.TrimSpace(definition.ID)
		if id == "" {
			continue
		}
		out[id] = definition
	}
	return out
}

func unresolvedDefinitionIDs(definitions []models.FieldDefinition, placements []models.ExistingPlacement) []string {
	placed := map[string]bool{}
	for _, placement := range placements {
		placed[strings.TrimSpace(placement.FieldDefinitionID)] = true
	}
	out := make([]string, 0, len(definitions))
	for _, definition := range definitions {
		id := strings.TrimSpace(definition.ID)
		if id == "" || placed[id] {
			continue
		}
		out = append(out, id)
	}
	sort.Strings(out)
	return out
}

func unresolvedDefinitions(unresolved []string, accepted map[string]models.Suggestion, definitions map[string]models.FieldDefinition) []models.FieldDefinition {
	out := make([]models.FieldDefinition, 0, len(unresolved))
	for _, id := range unresolved {
		if _, ok := accepted[id]; ok {
			continue
		}
		definition, ok := definitions[id]
		if !ok {
			continue
		}
		out = append(out, definition)
	}
	return out
}

func findEstimate(estimates []models.Estimate, resolverID string) models.Estimate {
	for _, estimate := range estimates {
		if strings.TrimSpace(estimate.ResolverID) == strings.TrimSpace(resolverID) {
			return estimate
		}
	}
	return models.Estimate{ResolverID: resolverID}
}

func executionResolverOrder(policy models.Policy, scores []models.ResolverScore) []string {
	if len(policy.HardOrder) > 0 {
		return append([]string{}, policy.HardOrder...)
	}
	if len(scores) == 0 {
		return append([]string{}, policy.EnabledResolvers...)
	}
	out := make([]string, 0, len(scores))
	for _, score := range scores {
		if !score.Supported {
			continue
		}
		out = append(out, score.ResolverID)
	}
	if len(out) == 0 {
		return append([]string{}, policy.EnabledResolvers...)
	}
	return out
}

func mergeSuggestions(target map[string]models.Suggestion, suggestions []models.Suggestion) {
	for _, suggestion := range suggestions {
		fieldDefinitionID := strings.TrimSpace(suggestion.FieldDefinitionID)
		if fieldDefinitionID == "" {
			continue
		}
		suggestion.FieldDefinitionID = fieldDefinitionID
		if strings.TrimSpace(suggestion.ID) == "" {
			suggestion.ID = uuid.NewString()
		}
		if existing, exists := target[fieldDefinitionID]; exists {
			if existing.NormalizedConfidence() > suggestion.NormalizedConfidence() {
				continue
			}
			if existing.NormalizedConfidence() == suggestion.NormalizedConfidence() && strings.Compare(existing.ResolverID, suggestion.ResolverID) <= 0 {
				continue
			}
		}
		target[fieldDefinitionID] = suggestion
	}
}

func materializeSuggestions(in map[string]models.Suggestion) []models.Suggestion {
	out := make([]models.Suggestion, 0, len(in))
	for _, suggestion := range in {
		out = append(out, suggestion)
	}
	sort.Slice(out, func(i, j int) bool {
		left := strings.TrimSpace(out[i].FieldDefinitionID)
		right := strings.TrimSpace(out[j].FieldDefinitionID)
		if left == right {
			return strings.Compare(out[i].ResolverID, out[j].ResolverID) < 0
		}
		return strings.Compare(left, right) < 0
	})
	return out
}

func unresolvedAfterMerge(unresolved []string, accepted map[string]models.Suggestion) []string {
	out := make([]string, 0, len(unresolved))
	for _, id := range unresolved {
		if _, ok := accepted[id]; ok {
			continue
		}
		out = append(out, id)
	}
	sort.Strings(out)
	return out
}

func selectSource(suggestions []models.Suggestion) string {
	if len(suggestions) == 0 {
		return ""
	}
	counts := map[string]int{}
	for _, suggestion := range suggestions {
		id := strings.TrimSpace(suggestion.ResolverID)
		if id == "" {
			continue
		}
		counts[id]++
	}
	selected := ""
	best := -1
	for resolverID, count := range counts {
		if count > best || (count == best && strings.Compare(resolverID, selected) < 0) {
			best = count
			selected = resolverID
		}
	}
	return selected
}
