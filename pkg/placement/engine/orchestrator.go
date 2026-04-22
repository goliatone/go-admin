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
	RunID              string                     `json:"run_id"`
	AgreementID        string                     `json:"agreement_id"`
	CreatedByUserID    string                     `json:"created_by_user_id"`
	OrgID              string                     `json:"org_id"`
	UserID             string                     `json:"user_id"`
	PolicyOverride     *models.Policy             `json:"policy_override"`
	DocumentBytes      []byte                     `json:"document_bytes"`
	DocumentPageCount  int                        `json:"document_page_count"`
	FieldDefinitions   []models.FieldDefinition   `json:"field_definitions"`
	ExistingPlacements []models.ExistingPlacement `json:"existing_placements"`
	NativeFormFields   []models.NativeFormField   `json:"native_form_fields"`
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
	run := newPlacementRun(input, startedAt)
	policy, err := o.resolvePolicy(ctx, input)
	if err != nil {
		return run, err
	}
	run.Policy = policy
	order := o.resolveOrder(policy)
	run.ResolverOrder = append([]string{}, order...)

	unresolved := unresolvedDefinitionIDs(input.FieldDefinitions, input.ExistingPlacements)
	if len(unresolved) == 0 {
		completeRunWithoutWork(&run, startedAt)
		return run, nil
	}

	resolverInput := buildResolverInput(input)
	allDefinitions := mapDefinitions(input.FieldDefinitions)
	accepted := map[string]models.Suggestion{}
	estimates := o.estimateResolvers(ctx, order, resolverInput)
	run.Estimates = append(run.Estimates, estimates...)
	run.Scores = RankScores(estimates, policy.Weights)

	executionOrder := executionResolverOrder(policy, run.Scores)
	o.executeResolvers(ctx, &run, resolverExecution{
		policy:         policy,
		startedAt:      startedAt,
		unresolved:     unresolved,
		accepted:       accepted,
		allDefinitions: allDefinitions,
		estimates:      estimates,
		resolverInput:  resolverInput,
		order:          executionOrder,
	})
	o.finalizeRun(&run, unresolved, accepted, startedAt)
	return run, nil
}

func newPlacementRun(input RunInput, startedAt time.Time) models.Run {
	return models.Run{
		ID:              primitives.FirstNonEmpty(strings.TrimSpace(input.RunID), uuid.NewString()),
		AgreementID:     strings.TrimSpace(input.AgreementID),
		CreatedByUserID: strings.TrimSpace(input.CreatedByUserID),
		CreatedAt:       startedAt,
		Status:          models.RunStatusFailed,
		ReasonCode:      models.RunReasonResolverError,
	}
}

func completeRunWithoutWork(run *models.Run, completedAt time.Time) {
	run.Status = models.RunStatusCompleted
	run.ReasonCode = models.RunReasonResolvedAll
	run.CompletedAt = completedAt
}

func buildResolverInput(input RunInput) resolvers.ResolveInput {
	return resolvers.ResolveInput{
		DocumentBytes:      append([]byte{}, input.DocumentBytes...),
		DocumentPageCount:  input.DocumentPageCount,
		ExistingPlacements: append([]models.ExistingPlacement{}, input.ExistingPlacements...),
		NativeFormFields:   append([]models.NativeFormField{}, input.NativeFormFields...),
	}
}

func (o *Orchestrator) estimateResolvers(
	ctx context.Context,
	order []string,
	resolverInput resolvers.ResolveInput,
) []models.Estimate {
	estimates := make([]models.Estimate, 0, len(order))
	for _, resolverID := range order {
		entry, ok := o.registry.Resolve(resolverID)
		if !ok {
			continue
		}
		estimate, err := entry.Resolver.Estimate(ctx, resolverInput)
		if err != nil {
			estimates = append(estimates, models.Estimate{ResolverID: resolverID, Supported: false, Reason: err.Error()})
			continue
		}
		estimate.ResolverID = resolverID
		estimates = append(estimates, estimate)
	}
	return estimates
}

type resolverExecution struct {
	policy         models.Policy
	startedAt      time.Time
	unresolved     []string
	accepted       map[string]models.Suggestion
	allDefinitions map[string]models.FieldDefinition
	estimates      []models.Estimate
	resolverInput  resolvers.ResolveInput
	order          []string
}

func (o *Orchestrator) executeResolvers(ctx context.Context, run *models.Run, exec resolverExecution) {
	for _, resolverID := range exec.order {
		if !o.executeResolver(ctx, run, exec, resolverID) {
			return
		}
	}
}

func (o *Orchestrator) executeResolver(ctx context.Context, run *models.Run, exec resolverExecution, resolverID string) bool {
	entry, ok := o.registry.Resolve(resolverID)
	if !ok {
		return true
	}
	estimate := findEstimate(exec.estimates, resolverID)
	if !estimate.Supported {
		return true
	}
	if stopRunForLimits(run, exec.policy, estimate, exec.startedAt) {
		return false
	}
	callInput, hasWork := buildResolverCallInput(run, exec)
	if !hasWork {
		return false
	}
	result, err := resolveWithTimeout(ctx, entry.Resolver, callInput)
	run.ExecutedResolvers = append(run.ExecutedResolvers, resolverID)
	run.BudgetUsed += estimate.Cost
	if err != nil {
		run.Status = models.RunStatusPartial
		run.ReasonCode = models.RunReasonResolverError
		return false
	}
	mergeSuggestions(exec.accepted, result.Suggestions)
	if result.Terminate {
		run.Status = models.RunStatusPartial
		run.ReasonCode = primitives.FirstNonEmpty(strings.TrimSpace(result.TerminationReason), models.RunReasonResolverShortStop)
		return false
	}
	return true
}

func stopRunForLimits(run *models.Run, policy models.Policy, estimate models.Estimate, startedAt time.Time) bool {
	if policy.Limits.MaxBudget > 0 && run.BudgetUsed+estimate.Cost > policy.Limits.MaxBudget {
		run.Status = models.RunStatusBudgetExhausted
		run.ReasonCode = models.RunReasonBudgetExhausted
		return true
	}
	if policy.Limits.MaxTime > 0 && time.Since(startedAt) >= policy.Limits.MaxTime {
		run.Status = models.RunStatusTimedOut
		run.ReasonCode = models.RunReasonTimedOut
		return true
	}
	return false
}

func buildResolverCallInput(run *models.Run, exec resolverExecution) (resolvers.ResolveInput, bool) {
	currentUnresolved := unresolvedDefinitions(exec.unresolved, exec.accepted, exec.allDefinitions)
	if len(currentUnresolved) == 0 {
		return resolvers.ResolveInput{}, false
	}
	callInput := exec.resolverInput
	callInput.FieldDefinitions = currentUnresolved
	callInput.BudgetRemaining = remainingBudget(exec.policy, run.BudgetUsed)
	callInput.TimeRemaining = remainingTime(exec.policy, exec.startedAt)
	return callInput, true
}

func remainingBudget(policy models.Policy, budgetUsed float64) float64 {
	if policy.Limits.MaxBudget <= 0 {
		return 0
	}
	return policy.Limits.MaxBudget - budgetUsed
}

func remainingTime(policy models.Policy, startedAt time.Time) time.Duration {
	if policy.Limits.MaxTime <= 0 {
		return 0
	}
	return max(policy.Limits.MaxTime-time.Since(startedAt), 0)
}

func resolveWithTimeout(
	ctx context.Context,
	resolver resolvers.PlacementResolver,
	callInput resolvers.ResolveInput,
) (models.ResolveResult, error) {
	resolverCtx := ctx
	var cancel context.CancelFunc
	if callInput.TimeRemaining > 0 {
		resolverCtx, cancel = context.WithTimeout(ctx, callInput.TimeRemaining)
	}
	if cancel != nil {
		defer cancel()
	}
	return resolver.Resolve(resolverCtx, callInput)
}

func (o *Orchestrator) finalizeRun(
	run *models.Run,
	unresolved []string,
	accepted map[string]models.Suggestion,
	startedAt time.Time,
) {
	run.CompletedAt = o.now()
	run.Elapsed = run.CompletedAt.Sub(startedAt)
	run.Suggestions = materializeSuggestions(accepted)
	run.UnresolvedDefinitionIDs = unresolvedAfterMerge(unresolved, accepted)
	run.SelectedSource = selectSource(run.Suggestions)
	setFinalRunStatus(run)
}

func setFinalRunStatus(run *models.Run) {
	if run.Status == "" || run.Status == models.RunStatusFailed {
		if len(run.UnresolvedDefinitionIDs) == 0 {
			run.Status = models.RunStatusCompleted
			run.ReasonCode = models.RunReasonResolvedAll
		} else {
			run.Status = models.RunStatusPartial
			run.ReasonCode = models.RunReasonUnresolvedFields
		}
	}
	if len(run.Suggestions) > 0 && (run.Status == models.RunStatusBudgetExhausted || run.Status == models.RunStatusTimedOut) {
		run.Status = models.RunStatusPartial
	}
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
