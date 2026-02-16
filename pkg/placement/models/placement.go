package models

// Placement source values attached to accepted placement instances.
const (
	PlacementSourceAuto   = "auto"
	PlacementSourceManual = "manual"
)

// Geometry captures canonical page-space placement coordinates.
type Geometry struct {
	PageNumber int
	X          float64
	Y          float64
	Width      float64
	Height     float64
}

// FieldDefinition is a logical definition input for placement suggestions.
type FieldDefinition struct {
	ID            string
	ParticipantID string
	FieldType     string
	Label         string
	Required      bool
}

// ExistingPlacement represents already-authored field placements.
type ExistingPlacement struct {
	FieldDefinitionID string
	Geometry          Geometry
}

// NativeFormField represents an extracted native form field from a PDF source.
type NativeFormField struct {
	Name          string
	FieldTypeHint string
	Geometry      Geometry
}
