package models

// Placement source values attached to accepted placement instances.
const (
	PlacementSourceAuto   = "auto"
	PlacementSourceManual = "manual"
)

// Geometry captures canonical page-space placement coordinates.
type Geometry struct {
	PageNumber int     `json:"page_number"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	Width      float64 `json:"width"`
	Height     float64 `json:"height"`
}

// FieldDefinition is a logical definition input for placement suggestions.
type FieldDefinition struct {
	ID            string `json:"id"`
	ParticipantID string `json:"participant_id"`
	FieldType     string `json:"field_type"`
	Label         string `json:"label"`
	Required      bool   `json:"required"`
}

// ExistingPlacement represents already-authored field placements.
type ExistingPlacement struct {
	FieldDefinitionID string   `json:"field_definition_id"`
	Geometry          Geometry `json:"geometry"`
}

// NativeFormField represents an extracted native form field from a PDF source.
type NativeFormField struct {
	Name          string   `json:"name"`
	FieldTypeHint string   `json:"field_type_hint"`
	Geometry      Geometry `json:"geometry"`
}
