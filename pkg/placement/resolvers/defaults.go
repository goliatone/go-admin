package resolvers

// NewDefaultRegistry wires the baseline resolver set with capability metadata.
func NewDefaultRegistry() *Registry {
	registry := NewRegistry()
	registry.Register(NativePDFFormsResolver{}, ResolverCapability{
		Description:      "Extract native PDF form fields and map suggestions to field definitions.",
		Deterministic:    true,
		SupportsNative:   true,
		EstimatedCost:    "low",
		EstimatedLatency: "low",
	})
	registry.Register(TextAnchorResolver{}, ResolverCapability{
		Description:      "Stub for text-anchor matching strategy.",
		Deterministic:    true,
		SupportsText:     true,
		EstimatedCost:    "medium",
		EstimatedLatency: "medium",
	})
	registry.Register(OCRAnchorResolver{}, ResolverCapability{
		Description:      "Stub for OCR-assisted placement strategy.",
		Deterministic:    false,
		SupportsOCR:      true,
		EstimatedCost:    "high",
		EstimatedLatency: "high",
	})
	registry.Register(MLLayoutResolver{}, ResolverCapability{
		Description:      "Stub for model-based layout placement strategy.",
		Deterministic:    false,
		SupportsML:       true,
		EstimatedCost:    "high",
		EstimatedLatency: "high",
	})
	return registry
}
