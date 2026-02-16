package models

// Suggestion captures one candidate placement for a field definition.
type Suggestion struct {
	ID                string
	FieldDefinitionID string
	ResolverID        string
	Confidence        float64
	Geometry          Geometry
	Label             string
	Metadata          map[string]any
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
