package release

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestTranslationChecklistValidatePassesForApprovedChecklist(t *testing.T) {
	checklist := TranslationChecklist{
		ReleaseID: "translations-2026.03.15-rc1",
		Phase:     "20",
		RolloutDefaults: TranslationRolloutDefaults{
			Profile:      "full",
			Exchange:     true,
			Queue:        true,
			KillSwitches: []string{"translations.exchange", "translations.queue"},
		},
		Signoffs: map[string]TranslationSignoff{
			TranslationTeamBackend:  {Approved: true, Approver: "be-lead", ApprovedAt: "2026-03-15T17:00:00Z"},
			TranslationTeamFrontend: {Approved: true, Approver: "fe-lead", ApprovedAt: "2026-03-15T17:05:00Z"},
			TranslationTeamQA:       {Approved: true, Approver: "qa-lead", ApprovedAt: "2026-03-15T17:10:00Z"},
			TranslationTeamOps:      {Approved: true, Approver: "ops-lead", ApprovedAt: "2026-03-15T17:15:00Z"},
		},
		Evidence: TranslationGateEvidence{
			ContractsRef:        "ci/translations/contracts/321",
			MigrationsRef:       "ci/translations/migrations/321",
			ScopeRef:            "ci/translations/scope/321",
			SecurityRef:         "ci/translations/security/321",
			ObservabilityRef:    "ci/translations/observability/321",
			PerformanceRef:      "ci/translations/performance/321",
			ExtractionDryRunRef: "ci/translations/extraction/321",
			AccessibilityRef:    "ci/translations/accessibility/321",
			E2ERef:              "ci/translations/e2e/321",
			StagingSoakRef:      "staging/translations/soak-2026-03-15",
		},
		Rollback: TranslationRollbackPlaybook{
			FeatureFlagsOff:   []string{"translations.exchange", "translations.queue"},
			RestoreAppBuild:   true,
			RestoreDBSnapshot: true,
			Notes:             "Disable both translation modules, restore the previous app build, then restore the most recent pre-rollout DB snapshot.",
		},
	}

	issues := checklist.Validate()
	if len(issues) != 0 {
		t.Fatalf("expected no issues, got %+v", issues)
	}
}

func TestTranslationChecklistValidateRejectsMissingRollbackAndGateEvidence(t *testing.T) {
	checklist := TranslationChecklist{
		ReleaseID: "translations-2026.03.15-rc1",
		Phase:     "20",
		RolloutDefaults: TranslationRolloutDefaults{
			Profile:      "core+queue",
			Exchange:     false,
			Queue:        true,
			KillSwitches: []string{"translations.queue"},
		},
		Signoffs: map[string]TranslationSignoff{
			TranslationTeamBackend: {Approved: true, Approver: "be-lead", ApprovedAt: "2026-03-15T17:00:00Z"},
		},
		Rollback: TranslationRollbackPlaybook{},
	}

	issues := checklist.Validate()
	joined := strings.Join(issues, " | ")
	for _, expected := range []string{
		"rollout default profile must be full",
		"exchange must be enabled in rollout defaults",
		"kill_switches must include translations.exchange and translations.queue",
		"missing fe signoff",
		"contracts_ref is required",
		"rollback must restore previous app build",
		"rollback must restore database snapshot",
	} {
		if !strings.Contains(joined, expected) {
			t.Fatalf("expected issue %q, got %s", expected, joined)
		}
	}
}

func TestValidateTranslationChecklistFileTemplateShowsPendingApprovals(t *testing.T) {
	path := filepath.Join("translation_release_checklist.json")
	_, issues, err := ValidateTranslationChecklistFile(path)
	if err != nil {
		t.Fatalf("ValidateTranslationChecklistFile: %v", err)
	}
	if len(issues) == 0 {
		t.Fatal("expected template checklist to fail validation")
	}
}
