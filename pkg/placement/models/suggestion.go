package models

// Suggestion captures one candidate placement for a field definition.
type Suggestion struct {
	ID                string         `json:"id"`
	FieldDefinitionID string         `json:"field_definition_id"`
	ResolverID        string         `json:"resolver_id"`
	Confidence        float64        `json:"confidence"`
	Geometry          Geometry       `json:"geometry"`
	Label             string         `json:"label"`
	Metadata          map[string]any `json:"metadata"`
}

// NormalizedConfidence clamps confidence into [0,1].
func (s Suggestion) NormalizedConfidence() float64 {
	if s.Confidence < 0 {
		return 0
	}
	if s.Confidence > 1 {
		return 1
	}
	return s.Confidence
}
