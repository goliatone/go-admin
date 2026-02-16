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
	DocumentBytes      []byte
	DocumentPageCount  int
	FieldDefinitions   []models.FieldDefinition
	ExistingPlacements []models.ExistingPlacement
	NativeFormFields   []models.NativeFormField
	BudgetRemaining    float64
	TimeRemaining      time.Duration
}

// ResolverCapability advertises resolver strategy capabilities.
type ResolverCapability struct {
	Description      string
	Deterministic    bool
	SupportsNative   bool
	SupportsText     bool
	SupportsOCR      bool
	SupportsML       bool
	EstimatedCost    string
	EstimatedLatency string
}
