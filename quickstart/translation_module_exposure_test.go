package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

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

func TestTranslationModuleExposureFromCapabilitiesIncludesStructuredMissingPermission(t *testing.T) {
	tests := []struct {
		name  string
		entry map[string]any
		want  string
	}{
		{
			name: "permission field",
			entry: map[string]any{
				"enabled":     false,
				"permission":  admin.PermAdminTranslationsView,
				"reason":      "display copy can change",
				"reason_code": admin.ActionDisabledReasonCodePermissionDenied,
			},
			want: admin.PermAdminTranslationsView,
		},
		{
			name: "explicit missing permission field",
			entry: map[string]any{
				"enabled":            false,
				"missing_permission": admin.PermAdminTranslationsImportView,
				"permission":         admin.PermAdminTranslationsView,
				"reason_code":        admin.ActionDisabledReasonCodePermissionDenied,
			},
			want: admin.PermAdminTranslationsImportView,
		},
		{
			name: "reason only is display text",
			entry: map[string]any{
				"enabled":     false,
				"reason":      "missing permission: " + admin.PermAdminTranslationsView,
				"reason_code": admin.ActionDisabledReasonCodePermissionDenied,
			},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			caps := map[string]any{
				"modules": map[string]any{
					"queue": map[string]any{
						"enabled": true,
						"entry":   tt.entry,
					},
				},
			}

			exposure := translationModuleExposureFromCapabilities(caps, "queue")
			if exposure.MissingPermission != tt.want {
				t.Fatalf("expected missing permission %q, got %q", tt.want, exposure.MissingPermission)
			}
		})
	}
}
