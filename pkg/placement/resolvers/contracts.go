package resolvers

import (
	"context"
	"time"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

// PlacementResolver estimates and resolves placement suggestions.
type PlacementResolver interface {
	ID() string
	Estimate(ctx context.Context, input ResolveInput) (models.Estimate, error)
	Resolve(ctx context.Context, input ResolveInput) (models.ResolveResult, error)
}

// ResolveInput is the canonical resolver execution input.
type ResolveInput struct {
	DocumentBytes      []byte                     `json:"document_bytes"`
	DocumentPageCount  int                        `json:"document_page_count"`
	FieldDefinitions   []models.FieldDefinition   `json:"field_definitions"`
	ExistingPlacements []models.ExistingPlacement `json:"existing_placements"`
	NativeFormFields   []models.NativeFormField   `json:"native_form_fields"`
	BudgetRemaining    float64                    `json:"budget_remaining"`
	TimeRemaining      time.Duration              `json:"time_remaining"`
}

// ResolverCapability advertises resolver strategy capabilities.
type ResolverCapability struct {
	Description      string `json:"description"`
	Deterministic    bool   `json:"deterministic"`
	SupportsNative   bool   `json:"supports_native"`
	SupportsText     bool   `json:"supports_text"`
	SupportsOCR      bool   `json:"supports_ocr"`
	SupportsML       bool   `json:"supports_ml"`
	EstimatedCost    string `json:"estimated_cost"`
	EstimatedLatency string `json:"estimated_latency"`
}
