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
	return unsupportedEstimate(OCRAnchorResolverID, 0.65, 0.8, 0.9), nil
}

func (OCRAnchorResolver) Resolve(_ context.Context, input ResolveInput) (models.ResolveResult, error) {
	return unresolvedDefinitions(input), nil
}
