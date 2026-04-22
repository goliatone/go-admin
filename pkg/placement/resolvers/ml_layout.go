package resolvers

import (
	"context"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

const MLLayoutResolverID = "ml_layout_resolver"

// MLLayoutResolver is a contract-first stub for model-based layout placement strategies.
type MLLayoutResolver struct{}

func (MLLayoutResolver) ID() string { return MLLayoutResolverID }

func (MLLayoutResolver) Estimate(_ context.Context, _ ResolveInput) (models.Estimate, error) {
	return unsupportedEstimate(MLLayoutResolverID, 0.85, 1.0, 1.0), nil
}

func (MLLayoutResolver) Resolve(_ context.Context, input ResolveInput) (models.ResolveResult, error) {
	return unresolvedDefinitions(input), nil
}
