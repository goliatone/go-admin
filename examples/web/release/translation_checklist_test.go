package release

import (
	"os"
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

func TestValidateTranslationChecklistFileApprovedSamplePasses(t *testing.T) {
	path := filepath.Join("testdata", "translation_release_checklist_approved_sample.json")
	checklist, issues, err := ValidateTranslationChecklistFile(path)
	if err != nil {
		t.Fatalf("ValidateTranslationChecklistFile: %v", err)
	}
	if len(issues) != 0 {
		t.Fatalf("expected approved sample to pass validation, got %+v", issues)
	}

	for label, ref := range map[string]string{
		"contracts_ref":          checklist.Evidence.ContractsRef,
		"migrations_ref":         checklist.Evidence.MigrationsRef,
		"scope_ref":              checklist.Evidence.ScopeRef,
		"security_ref":           checklist.Evidence.SecurityRef,
		"observability_ref":      checklist.Evidence.ObservabilityRef,
		"performance_ref":        checklist.Evidence.PerformanceRef,
		"extraction_dry_run_ref": checklist.Evidence.ExtractionDryRunRef,
		"accessibility_ref":      checklist.Evidence.AccessibilityRef,
		"e2e_ref":                checklist.Evidence.E2ERef,
		"staging_soak_ref":       checklist.Evidence.StagingSoakRef,
	} {
		assertRepoLocalChecklistRefExists(t, path, label, ref)
	}
}

func assertRepoLocalChecklistRefExists(t *testing.T, checklistPath, label, ref string) {
	t.Helper()
	ref = strings.TrimSpace(ref)
	if ref == "" {
		t.Fatalf("expected %s to be populated", label)
	}
	resolved := filepath.Join(filepath.Dir(checklistPath), ref)
	info, err := os.Stat(resolved)
	if err != nil {
		t.Fatalf("expected %s to resolve at %s: %v", label, resolved, err)
	}
	if info.IsDir() {
		t.Fatalf("expected %s to resolve to a file, got directory %s", label, resolved)
	}
}
