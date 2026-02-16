package resolvers

import (
	"context"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

const OCRAnchorResolverID = "ocr_anchor_resolver"

// OCRAnchorResolver is a contract-first stub for OCR-assisted placement strategies.
type OCRAnchorResolver struct{}

func (OCRAnchorResolver) ID() string { return OCRAnchorResolverID }

func (OCRAnchorResolver) Estimate(_ context.Context, _ ResolveInput) (models.Estimate, error) {
	return models.Estimate{
		ResolverID: OCRAnchorResolverID,
		Accuracy:   0.65,
		Cost:       0.8,
		Latency:    0.9,
		Supported:  false,
		Reason:     "stub_not_enabled",
	}, nil
}

func (OCRAnchorResolver) Resolve(_ context.Context, input ResolveInput) (models.ResolveResult, error) {
	unresolved := make([]string, 0, len(input.FieldDefinitions))
	for _, definition := range input.FieldDefinitions {
		unresolved = append(unresolved, definition.ID)
	}
	return models.ResolveResult{UnresolvedDefinitionIDs: unresolved}, nil
}
