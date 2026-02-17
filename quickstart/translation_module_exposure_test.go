package quickstart

import "testing"

func TestTranslationModuleExposureFromCapabilitiesNormalizesNilReasonFields(t *testing.T) {
	caps := map[string]any{
		"modules": map[string]any{
			"queue": map[string]any{
				"enabled": true,
				"entry": map[string]any{
					"enabled": false,
				},
			},
		},
	}
	exposure := translationModuleExposureFromCapabilities(caps, "queue")
	if exposure.EntryEnabled {
		t.Fatalf("expected entry disabled")
	}
	if exposure.Reason != "" {
		t.Fatalf("expected empty reason, got %q", exposure.Reason)
	}
	if exposure.ReasonCode != "" {
		t.Fatalf("expected empty reason_code, got %q", exposure.ReasonCode)
	}
}
