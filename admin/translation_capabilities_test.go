package admin

import (
	"context"
	"strings"
	"testing"
)

type translationPermissionAuthorizer struct {
	allowed map[string]bool
}

func (a translationPermissionAuthorizer) Can(_ context.Context, action string, _ string) bool {
	return a.allowed[strings.TrimSpace(action)]
}

func TestTranslationCapabilitiesNormalizesProfilesByFeatureMode(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name     string
		features []FeatureKey
		expected string
	}{
		{
			name:     "none",
			features: nil,
			expected: "none",
		},
		{
			name:     "core",
			features: []FeatureKey{FeatureCMS},
			expected: "core",
		},
		{
			name:     "core+exchange",
			features: []FeatureKey{FeatureCMS, FeatureTranslationExchange},
			expected: "core+exchange",
		},
		{
			name:     "core+queue",
			features: []FeatureKey{FeatureCMS, FeatureTranslationQueue},
			expected: "core+queue",
		},
		{
			name:     "full",
			features: []FeatureKey{FeatureCMS, FeatureTranslationExchange, FeatureTranslationQueue},
			expected: "full",
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
				FeatureGate: featureGateFromKeys(tc.features...),
			})
			caps := TranslationCapabilitiesForContext(adm, context.Background())
			if got := strings.TrimSpace(toString(caps["profile"])); got != tc.expected {
				t.Fatalf("expected profile %q, got %q", tc.expected, got)
			}
			if got := strings.TrimSpace(toString(caps["capability_mode"])); got != tc.expected {
				t.Fatalf("expected capability_mode %q, got %q", tc.expected, got)
			}
		})
	}
}

func TestTranslationCapabilitiesExposeActionPermissionStates(t *testing.T) {
	t.Parallel()

	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationExchange, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsImportView:     true,
			PermAdminTranslationsExport:         true,
			PermAdminTranslationsImportValidate: true,
			PermAdminTranslationsImportApply:    false,
			PermAdminTranslationsView:           true,
			PermAdminTranslationsClaim:          true,
			PermAdminTranslationsAssign:         true,
			PermAdminTranslationsEdit:           false,
			PermAdminTranslationsApprove:        false,
			PermAdminTranslationsManage:         false,
		},
	})

	caps := TranslationCapabilitiesForContext(adm, context.Background())
	modules, _ := caps["modules"].(map[string]any)
	if len(modules) == 0 {
		t.Fatalf("expected modules payload, got %v", caps["modules"])
	}

	exchange, _ := modules["exchange"].(map[string]any)
	if visible, _ := exchange["visible"].(bool); !visible {
		t.Fatalf("expected exchange visible for import-view grants")
	}
	exchangeActions, _ := exchange["actions"].(map[string]any)
	importApply, _ := exchangeActions["import.apply"].(map[string]any)
	if enabled, _ := importApply["enabled"].(bool); enabled {
		t.Fatalf("expected import.apply disabled when permission missing")
	}
	if code := strings.TrimSpace(toString(importApply["reason_code"])); code != ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected import.apply reason code %q, got %q", ActionDisabledReasonCodePermissionDenied, code)
	}

	queue, _ := modules["queue"].(map[string]any)
	if visible, _ := queue["visible"].(bool); !visible {
		t.Fatalf("expected queue visible when queue view is granted")
	}
	queueActions, _ := queue["actions"].(map[string]any)
	submitReview, _ := queueActions["submit_review"].(map[string]any)
	if enabled, _ := submitReview["enabled"].(bool); enabled {
		t.Fatalf("expected submit_review disabled without edit permission")
	}
	if code := strings.TrimSpace(toString(submitReview["reason_code"])); code != ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected submit_review reason code %q, got %q", ActionDisabledReasonCodePermissionDenied, code)
	}
}

func TestTranslationCapabilitiesExposeSharedContracts(t *testing.T) {
	t.Parallel()

	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationExchange, FeatureTranslationQueue),
	})
	caps := TranslationCapabilitiesForContext(adm, context.Background())
	contracts, ok := caps["contracts"].(map[string]any)
	if !ok || len(contracts) == 0 {
		t.Fatalf("expected shared contracts payload, got %T", caps["contracts"])
	}

	statusEnums := extractMap(contracts["status_enums"])
	coreEnums := extractMap(statusEnums["core"])
	readinessStates := toStringSlice(coreEnums["readiness_state"])
	if len(readinessStates) == 0 {
		t.Fatalf("expected core readiness enums in shared contract, got %+v", statusEnums)
	}

	reasonCodes := toStringSlice(contracts["disabled_reason_codes"])
	if len(reasonCodes) == 0 {
		t.Fatalf("expected disabled reason-code registry in shared contract")
	}
	foundFeatureDisabled := false
	for _, code := range reasonCodes {
		if strings.TrimSpace(code) == ActionDisabledReasonCodeFeatureDisabled {
			foundFeatureDisabled = true
			break
		}
	}
	if !foundFeatureDisabled {
		t.Fatalf("expected feature-disabled reason code in registry, got %+v", reasonCodes)
	}

	drift := extractMap(contracts["source_target_drift"])
	if key := strings.TrimSpace(toString(drift["key"])); key != translationSourceTargetDriftKey {
		t.Fatalf("expected source_target_drift key %q, got %q", translationSourceTargetDriftKey, key)
	}
}

func TestTranslationCapabilitiesDegradationHidesDisabledModules(t *testing.T) {
	t.Parallel()

	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	caps := TranslationCapabilitiesForContext(adm, context.Background())
	modules, _ := caps["modules"].(map[string]any)
	exchange, _ := modules["exchange"].(map[string]any)
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := exchange["enabled"].(bool); enabled {
		t.Fatalf("expected exchange disabled in core profile")
	}
	if enabled, _ := queue["enabled"].(bool); enabled {
		t.Fatalf("expected queue disabled in core profile")
	}
	if visible, _ := exchange["visible"].(bool); visible {
		t.Fatalf("expected exchange hidden when module capability is off")
	}
	if visible, _ := queue["visible"].(bool); visible {
		t.Fatalf("expected queue hidden when module capability is off")
	}
}

func TestTranslationCapabilitiesDegradationVisibleDisabledForPartialPermissions(t *testing.T) {
	t.Parallel()

	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureTranslationExchange, FeatureTranslationQueue),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			PermAdminTranslationsImportView:     true,
			PermAdminTranslationsExport:         true,
			PermAdminTranslationsImportValidate: true,
			PermAdminTranslationsImportApply:    false,
			PermAdminTranslationsView:           true,
			PermAdminTranslationsClaim:          true,
			PermAdminTranslationsAssign:         false,
			PermAdminTranslationsEdit:           true,
			PermAdminTranslationsApprove:        false,
			PermAdminTranslationsManage:         false,
		},
	})

	caps := TranslationCapabilitiesForContext(adm, context.Background())
	modules, _ := caps["modules"].(map[string]any)

	exchange, _ := modules["exchange"].(map[string]any)
	if visible, _ := exchange["visible"].(bool); !visible {
		t.Fatalf("expected exchange visible when module view permission is granted")
	}
	exchangeActions, _ := exchange["actions"].(map[string]any)
	importApply, _ := exchangeActions["import.apply"].(map[string]any)
	if enabled, _ := importApply["enabled"].(bool); enabled {
		t.Fatalf("expected exchange import.apply visible-disabled when permission missing")
	}

	queue, _ := modules["queue"].(map[string]any)
	if visible, _ := queue["visible"].(bool); !visible {
		t.Fatalf("expected queue visible when queue view permission is granted")
	}
	queueActions, _ := queue["actions"].(map[string]any)
	assign, _ := queueActions["assign"].(map[string]any)
	if enabled, _ := assign["enabled"].(bool); enabled {
		t.Fatalf("expected queue assign visible-disabled when permission missing")
	}
	if code := strings.TrimSpace(toString(assign["reason_code"])); code != ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected permission denied reason code, got %q", code)
	}
}
