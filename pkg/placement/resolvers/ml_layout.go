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
	return models.Estimate{
		ResolverID: MLLayoutResolverID,
		Accuracy:   0.85,
		Cost:       1.0,
		Latency:    1.0,
		Supported:  false,
		Reason:     "stub_not_enabled",
	}, nil
}

func (MLLayoutResolver) Resolve(_ context.Context, input ResolveInput) (models.ResolveResult, error) {
	unresolved := make([]string, 0, len(input.FieldDefinitions))
	for _, definition := range input.FieldDefinitions {
		unresolved = append(unresolved, definition.ID)
	}
	return models.ResolveResult{UnresolvedDefinitionIDs: unresolved}, nil
}
