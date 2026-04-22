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
	return unsupportedEstimate(TextAnchorResolverID, 0.55, 0.45, 0.6), nil
}

func (TextAnchorResolver) Resolve(_ context.Context, input ResolveInput) (models.ResolveResult, error) {
	return unresolvedDefinitions(input), nil
}
