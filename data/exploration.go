package data

import (
	"context"
	"encoding/json"
	"time"
)

const (
	ExploreCatalog           = "catalog_example"
	ExplorePrepared          = "prepared"
	ExploreActive            = "active"
	ExploreAvailable         = "available"
	ExploreUnsupported       = "unsupported"
	ExploreEmpty             = "empty"
	ExploreSuppressed        = "suppressed"
	ExploreDefaultLimit      = 25
	ExploreMaxLimit          = 100
	ExploreMaxSelectionBytes = 4 << 10
	ExploreMaxResponseBytes  = 256 << 10
	ExploreMaxMetadataBytes  = 64 << 10
)

// ExploreSelection pins lifecycle identity; it contains no principal or physical locator.
type ExploreSelection struct {
	Dataset         DatasetRef  `json:"dataset"`
	Scenario        ScenarioRef `json:"scenario"`
	TargetID        string      `json:"target_id"`
	Context         string      `json:"context"`
	ReceiptID       string      `json:"receipt_id,omitempty"`
	ContentRevision uint64      `json:"content_revision,omitempty"`
	Generation      *uint64     `json:"generation,omitempty"`
}

// Equal compares generation values, not pointer addresses.
func (s ExploreSelection) Equal(other ExploreSelection) bool {
	a, b := s.Generation, other.Generation
	s.Generation = nil
	other.Generation = nil
	return s == other && ((a == nil && b == nil) || (a != nil && b != nil && *a == *b))
}

func exploreID(s string) bool { return identifier(s) && len(s) <= 128 }
func (s ExploreSelection) Validate() error {
	if !s.Dataset.Valid() || !s.Scenario.Valid() || s.Scenario.Dataset != s.Dataset || !exploreID(s.TargetID) {
		return Error(CodeInvalid)
	}
	for _, id := range []string{s.Dataset.Provider, s.Dataset.ID, s.Dataset.Version, s.Scenario.ID, s.Scenario.Version} {
		if !exploreID(id) {
			return Error(CodeInvalid)
		}
	}
	switch s.Context {
	case ExploreCatalog:
		if s.ReceiptID != "" || s.ContentRevision != 0 || s.Generation != nil {
			return Error(CodeInvalid)
		}
	case ExplorePrepared, ExploreActive:
		if !exploreID(s.ReceiptID) || s.ContentRevision == 0 || s.ContentRevision > MaxWireCounter {
			return Error(CodeInvalid)
		}
		if (s.Context == ExploreActive) != (s.Generation != nil) || s.Generation != nil && *s.Generation > MaxWireCounter {
			return Error(CodeInvalid)
		}
	default:
		return Error(CodeInvalid)
	}
	b, err := json.Marshal(s)
	if err != nil || len(b) > ExploreMaxSelectionBytes {
		return Error(CodeInvalid)
	}
	return nil
}

type ExploreEnvelope struct {
	Selection            ExploreSelection `json:"selection"`
	PresentationRevision string           `json:"presentation_revision"`
	ObservedAt           time.Time        `json:"observed_at"`
	Provenance           string           `json:"provenance"`
	Completeness         string           `json:"completeness"`
	State                string           `json:"state"`
	Reason               string           `json:"reason,omitempty"`
}
type ExploreField struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
	Type        string `json:"type"`
	Unit        string `json:"unit,omitempty"`
}
type ExploreRelationship struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	EntityID string `json:"entity_id"`
}
type ExploreEntity struct {
	ID            string                `json:"id"`
	Label         string                `json:"label"`
	Description   string                `json:"description,omitempty"`
	Fields        []ExploreField        `json:"fields"`
	Relationships []ExploreRelationship `json:"relationships,omitempty"`
}
type ExploreScenario struct {
	Scenario         ScenarioRef `json:"scenario"`
	Title            string      `json:"title"`
	Summary          string      `json:"summary"`
	ExpectedOutcomes []string    `json:"expected_outcomes"`
}
type ExploreCount struct {
	EntityID string  `json:"entity_id"`
	Scope    string  `json:"scope"`
	Total    *uint64 `json:"total"`
}
type ExplorePeriod struct {
	Start    string `json:"start"`
	End      string `json:"end"`
	Timezone string `json:"timezone"`
}
type ExploreEffect struct {
	Phase       string `json:"phase"`
	Description string `json:"description"`
}

// A provider declares SurfaceID only. Href is filled by the trusted host registry.
type ExploreUsage struct {
	SurfaceID string          `json:"surface_id"`
	Kind      string          `json:"kind"`
	Label     string          `json:"label"`
	Effects   []ExploreEffect `json:"effects"`
	Href      string          `json:"href,omitempty"`
}
type ExploreMetadata struct {
	ExploreEnvelope
	Title             string            `json:"title"`
	Summary           string            `json:"summary"`
	Origin            string            `json:"origin"`
	Entities          []ExploreEntity   `json:"entities"`
	Scenarios         []ExploreScenario `json:"scenarios"`
	Inventory         []ExploreCount    `json:"inventory"`
	Period            *ExplorePeriod    `json:"period"`
	Prerequisites     []string          `json:"prerequisites"`
	Attribution       []string          `json:"attribution"`
	Usages            []ExploreUsage    `json:"usages"`
	UsageCompleteness string            `json:"usage_completeness"`
}

// Explicit states distinguish unknown/redacted cells from a known null or empty value.
// Value is restricted to the column's scalar type by the service.
type ExploreCell struct {
	State string `json:"state"`
	Value any    `json:"value"`
}
type ExploreRow struct {
	RecordKey string                 `json:"record_key"`
	Cells     map[string]ExploreCell `json:"cells"`
}
type ExploreSamples struct {
	ExploreEnvelope
	EntityID       string         `json:"entity_id"`
	Columns        []ExploreField `json:"columns"`
	Rows           []ExploreRow   `json:"rows"`
	Total          *uint64        `json:"total"`
	NextCursor     *string        `json:"next_cursor"`
	SamplingMethod string         `json:"sampling_method"`
}
type ExploreMetadataQuery struct {
	Selection ExploreSelection `json:"selection"`
}

func (ExploreMetadataQuery) Type() string      { return "data.explore.metadata" }
func (q ExploreMetadataQuery) Validate() error { return q.Selection.Validate() }

type ExploreSamplesQuery struct {
	Selection ExploreSelection `json:"selection"`
	EntityID  string           `json:"entity_id"`
	Cursor    string           `json:"cursor,omitempty"`
	Limit     int              `json:"limit,omitempty"`
}

func (ExploreSamplesQuery) Type() string { return "data.explore.samples" }
func (q ExploreSamplesQuery) Validate() error {
	if err := q.Selection.Validate(); err != nil {
		return err
	}
	if !exploreID(q.EntityID) || len(q.Cursor) > 512 || q.Limit < 0 || q.Limit > ExploreMaxLimit {
		return Error(CodeInvalid)
	}
	return nil
}

type ExploreRelatedQuery struct {
	ExploreSamplesQuery
	RecordKey      string `json:"record_key"`
	RelationshipID string `json:"relationship_id"`
}

func (ExploreRelatedQuery) Type() string { return "data.explore.related" }
func (q ExploreRelatedQuery) Validate() error {
	if err := q.ExploreSamplesQuery.Validate(); err != nil {
		return err
	}
	if !exploreID(q.RecordKey) || !exploreID(q.RelationshipID) {
		return Error(CodeInvalid)
	}
	return nil
}

// ExploreAccess reaches current host AND provider policy, including every delivered
// entity/field/row/link. A denial returns no partial result and no hidden counts.
type ExploreAccess struct {
	Selection      ExploreSelection
	MetricSetID    string
	MetricIDs      []string
	Coverage       bool
	EntityID       string
	Fields         []string
	RecordKeys     []string
	SurfaceIDs     []string
	RelationshipID string
	SourceEntityID string
	RecordKey      string
}
type ExploreRead struct {
	Selection ExploreSelection
	Target    TargetKey
	Receipt   *PreparationReceipt
}

// ExplorationProvider is optional. Every method is read-only, bounded, cancellable
// and domain filtered; cursors/record keys bind actor/scope/full selection/entity.
// Related permits only provider-declared depth-one relationships. AuthorizeExplore
// must recheck current domain/field policy without caching grants. Return detached
// DTOs; do not mutate shared buffers while the service validates/delivers them.
type ExplorationProvider interface {
	AuthorizeExplore(context.Context, Principal, ExploreAccess) error
	ExploreMetadata(context.Context, Principal, ExploreRead) (ExploreMetadata, error)
	ExploreSamples(context.Context, Principal, ExploreRead, ExploreSamplesQuery) (ExploreSamples, error)
	ExploreRelated(context.Context, Principal, ExploreRead, ExploreRelatedQuery) (ExploreSamples, error)
}

// ExploreSurface resolution belongs to the application, not provider/browser URLs.
type ExploreSurface struct {
	Resolve func(context.Context, Principal) (string, error)
}
