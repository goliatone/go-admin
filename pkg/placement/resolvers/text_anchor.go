package resolvers

import (
	"context"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

const TextAnchorResolverID = "text_anchor_resolver"

// TextAnchorResolver is a contract-first stub for label/anchor placement strategies.
type TextAnchorResolver struct{}

func (TextAnchorResolver) ID() string { return TextAnchorResolverID }

func (TextAnchorResolver) Estimate(_ context.Context, _ ResolveInput) (models.Estimate, error) {
	return models.Estimate{
		ResolverID: TextAnchorResolverID,
		Accuracy:   0.55,
		Cost:       0.45,
		Latency:    0.6,
		Supported:  false,
		Reason:     "stub_not_enabled",
	}, nil
}

func (TextAnchorResolver) Resolve(_ context.Context, input ResolveInput) (models.ResolveResult, error) {
	unresolved := make([]string, 0, len(input.FieldDefinitions))
	for _, definition := range input.FieldDefinitions {
		unresolved = append(unresolved, definition.ID)
	}
	return models.ResolveResult{UnresolvedDefinitionIDs: unresolved}, nil
}
