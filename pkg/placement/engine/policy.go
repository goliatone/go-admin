package engine

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

// PlacementPolicy resolves effective run policy with precedence-aware overrides.
type PlacementPolicy interface {
	Resolve(ctx context.Context, input PolicyResolveInput) (models.Policy, error)
}

// PolicyResolveInput captures precedence context for policy resolution.
type PolicyResolveInput struct {
	OrgID           string
	UserID          string
	PerRunOverride  *models.Policy
	RegisteredOrder []string
}

// StaticPolicyResolver provides in-memory system/org/user policy overlays.
type StaticPolicyResolver struct {
	System models.Policy
	Org    map[string]models.Policy
	User   map[string]models.Policy
}

// DefaultPolicy returns the baseline placement policy.
func DefaultPolicy() models.Policy {
	return models.Policy{
		Weights: models.ScoringWeights{
			Accuracy: 0.6,
			Cost:     0.25,
			Latency:  0.15,
		},
		Limits: models.ExecutionLimits{},
	}
}

// NewStaticPolicyResolver creates a policy resolver with baseline defaults.
func NewStaticPolicyResolver(system models.Policy) *StaticPolicyResolver {
	return &StaticPolicyResolver{
		System: system,
		Org:    map[string]models.Policy{},
		User:   map[string]models.Policy{},
	}
}

func (r *StaticPolicyResolver) SetOrgPolicy(orgID string, policy models.Policy) {
	if r == nil {
		return
	}
	orgID = strings.TrimSpace(orgID)
	if orgID == "" {
		return
	}
	if r.Org == nil {
		r.Org = map[string]models.Policy{}
	}
	r.Org[orgID] = policy
}

func (r *StaticPolicyResolver) SetUserPolicy(userID string, policy models.Policy) {
	if r == nil {
		return
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return
	}
	if r.User == nil {
		r.User = map[string]models.Policy{}
	}
	r.User[userID] = policy
}

func (r *StaticPolicyResolver) Resolve(_ context.Context, input PolicyResolveInput) (models.Policy, error) {
	policy := r.System
	if policy.Weights == (models.ScoringWeights{}) {
		policy = DefaultPolicy()
	}
	if orgPolicy, ok := r.Org[strings.TrimSpace(input.OrgID)]; ok {
		policy = mergePolicy(policy, orgPolicy)
	}
	if userPolicy, ok := r.User[strings.TrimSpace(input.UserID)]; ok {
		policy = mergePolicy(policy, userPolicy)
	}
	if input.PerRunOverride != nil {
		policy = mergePolicy(policy, *input.PerRunOverride)
	}
	if len(policy.EnabledResolvers) == 0 {
		policy.EnabledResolvers = append([]string{}, input.RegisteredOrder...)
	}
	policy.EnabledResolvers = sanitizeResolverIDs(policy.EnabledResolvers)
	policy.HardOrder = sanitizeResolverIDs(policy.HardOrder)
	if policy.Weights == (models.ScoringWeights{}) {
		policy.Weights = DefaultPolicy().Weights
	}
	return policy, nil
}

func mergePolicy(base models.Policy, overlay models.Policy) models.Policy {
	out := base
	if len(overlay.EnabledResolvers) > 0 {
		out.EnabledResolvers = append([]string{}, overlay.EnabledResolvers...)
	}
	if len(overlay.HardOrder) > 0 {
		out.HardOrder = append([]string{}, overlay.HardOrder...)
	}
	if overlay.Weights.Accuracy != 0 {
		out.Weights.Accuracy = overlay.Weights.Accuracy
	}
	if overlay.Weights.Cost != 0 {
		out.Weights.Cost = overlay.Weights.Cost
	}
	if overlay.Weights.Latency != 0 {
		out.Weights.Latency = overlay.Weights.Latency
	}
	if overlay.Limits.MaxBudget > 0 {
		out.Limits.MaxBudget = overlay.Limits.MaxBudget
	}
	if overlay.Limits.MaxTime > 0 {
		out.Limits.MaxTime = overlay.Limits.MaxTime
	}
	return out
}

func sanitizeResolverIDs(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, id := range in {
		id = strings.ToLower(strings.TrimSpace(id))
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}
