package release

import (
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
)

func TestChecklistValidateRejectsUnapprovedSignoffs(t *testing.T) {
	checklist := Checklist{
		ReleaseID: "esign-2026.02.10-rc1",
		Track:     "A",
		Phase:     "12",
		Signoffs: map[string]Signoff{
			TeamBackend: {Approved: true, Approver: "be-lead", ApprovedAt: time.Now().UTC().Format(time.RFC3339)},
			TeamQA:      {Approved: false, Approver: "qa-lead", ApprovedAt: time.Now().UTC().Format(time.RFC3339)},
		},
		Security: SecurityReviewSummary{
			HighSeverityOpen: 0,
		},
		Runtime: RuntimeReadinessSummary{},
		Productization: ProductizationExitSummary{
			RecipientJourneyFromSignLink: false,
			InvitationLinkActionable:     false,
			CompletionLinkActionable:     false,
			PrimaryCTANotContractJSON:    false,
			CISmokeWorkflowPassed:        false,
		},
		SLOSnapshot: observability.MetricsSnapshot{
			AdminReadP95MS:          200,
			SendP95MS:               400,
			EmailDispatchStartP99MS: 10_000,
			FinalizeP99MS:           50_000,
			JobSuccessTotal:         995,
			JobFailureTotal:         5,
		},
	}

	issues := checklist.Validate()
	if len(issues) == 0 {
		t.Fatal("expected checklist validation issues")
	}
	joined := strings.Join(issues, " | ")
	if !strings.Contains(joined, "missing fe signoff") {
		t.Fatalf("expected missing FE signoff issue, got %s", joined)
	}
	if !strings.Contains(joined, "qa signoff is not approved") {
		t.Fatalf("expected QA unapproved issue, got %s", joined)
	}
	if !strings.Contains(joined, "missing ops signoff") {
		t.Fatalf("expected missing OPS signoff issue, got %s", joined)
	}
}

func TestChecklistValidatePassesForApprovedChecklist(t *testing.T) {
	checklist := Checklist{
		ReleaseID: "esign-2026.02.10-rc1",
		Track:     "A",
		Phase:     "12",
		Signoffs: map[string]Signoff{
			TeamBackend:  {Approved: true, Approver: "be-lead", ApprovedAt: "2026-02-10T17:00:00Z"},
			TeamFrontend: {Approved: true, Approver: "fe-lead", ApprovedAt: "2026-02-10T17:05:00Z"},
			TeamQA:       {Approved: true, Approver: "qa-lead", ApprovedAt: "2026-02-10T17:10:00Z"},
			TeamOps:      {Approved: true, Approver: "ops-lead", ApprovedAt: "2026-02-10T17:15:00Z"},
		},
		Security: SecurityReviewSummary{
			HighSeverityOpen: 0,
		},
		Runtime: RuntimeReadinessSummary{
			UsesMockDependencies:    false,
			RequiresManualPatches:   false,
			APIOnlyFallbackDetected: false,
		},
		Productization: ProductizationExitSummary{
			RecipientJourneyFromSignLink: true,
			InvitationLinkActionable:     true,
			CompletionLinkActionable:     true,
			PrimaryCTANotContractJSON:    true,
			CISmokeWorkflowPassed:        true,
			CISmokeRef:                   "ci/esign-smoke/123",
		},
		SLOSnapshot: observability.MetricsSnapshot{
			AdminReadP95MS:          250,
			SendP95MS:               500,
			EmailDispatchStartP99MS: 20_000,
			FinalizeP99MS:           80_000,
			JobSuccessTotal:         999,
			JobFailureTotal:         1,
		},
	}

	issues := checklist.Validate()
	if len(issues) != 0 {
		t.Fatalf("expected no checklist issues, got %+v", issues)
	}
}

func TestValidateChecklistFileTemplateShowsPendingApprovals(t *testing.T) {
	path := filepath.Join("phase12_release_checklist.json")
	_, issues, err := ValidateChecklistFile(path)
	if err != nil {
		t.Fatalf("ValidateChecklistFile: %v", err)
	}
	if len(issues) == 0 {
		t.Fatal("expected pending checklist template to fail validation")
	}
}

func TestChecklistValidateRejectsAPIOnlyFallback(t *testing.T) {
	checklist := Checklist{
		ReleaseID: "esign-2026.02.10-rc1",
		Track:     "A",
		Phase:     "12",
		Signoffs: map[string]Signoff{
			TeamBackend:  {Approved: true, Approver: "be-lead", ApprovedAt: "2026-02-10T17:00:00Z"},
			TeamFrontend: {Approved: true, Approver: "fe-lead", ApprovedAt: "2026-02-10T17:05:00Z"},
			TeamQA:       {Approved: true, Approver: "qa-lead", ApprovedAt: "2026-02-10T17:10:00Z"},
			TeamOps:      {Approved: true, Approver: "ops-lead", ApprovedAt: "2026-02-10T17:15:00Z"},
		},
		Security: SecurityReviewSummary{HighSeverityOpen: 0},
		Runtime: RuntimeReadinessSummary{
			UsesMockDependencies:    false,
			RequiresManualPatches:   false,
			APIOnlyFallbackDetected: true,
		},
		Productization: ProductizationExitSummary{
			RecipientJourneyFromSignLink: true,
			InvitationLinkActionable:     true,
			CompletionLinkActionable:     true,
			PrimaryCTANotContractJSON:    true,
			CISmokeWorkflowPassed:        true,
			CISmokeRef:                   "ci/esign-smoke/124",
		},
		SLOSnapshot: observability.MetricsSnapshot{
			AdminReadP95MS:          250,
			SendP95MS:               500,
			EmailDispatchStartP99MS: 20_000,
			FinalizeP99MS:           80_000,
			JobSuccessTotal:         999,
			JobFailureTotal:         1,
		},
	}

	issues := checklist.Validate()
	joined := strings.Join(issues, " | ")
	if !strings.Contains(joined, "API-only fallback") {
		t.Fatalf("expected API-only fallback validation issue, got %s", joined)
	}
}

func TestChecklistValidateRejectsMissingProductizationAssertions(t *testing.T) {
	checklist := Checklist{
		ReleaseID: "esign-2026.02.10-rc1",
		Track:     "A",
		Phase:     "20",
		Signoffs: map[string]Signoff{
			TeamBackend:  {Approved: true, Approver: "be-lead", ApprovedAt: "2026-02-10T17:00:00Z"},
			TeamFrontend: {Approved: true, Approver: "fe-lead", ApprovedAt: "2026-02-10T17:05:00Z"},
			TeamQA:       {Approved: true, Approver: "qa-lead", ApprovedAt: "2026-02-10T17:10:00Z"},
			TeamOps:      {Approved: true, Approver: "ops-lead", ApprovedAt: "2026-02-10T17:15:00Z"},
		},
		Security: SecurityReviewSummary{HighSeverityOpen: 0},
		Runtime: RuntimeReadinessSummary{
			UsesMockDependencies:    false,
			RequiresManualPatches:   false,
			APIOnlyFallbackDetected: false,
		},
		Productization: ProductizationExitSummary{
			RecipientJourneyFromSignLink: false,
			InvitationLinkActionable:     true,
			CompletionLinkActionable:     false,
			PrimaryCTANotContractJSON:    false,
			CISmokeWorkflowPassed:        false,
		},
		SLOSnapshot: observability.MetricsSnapshot{
			AdminReadP95MS:          250,
			SendP95MS:               500,
			EmailDispatchStartP99MS: 20_000,
			FinalizeP99MS:           80_000,
			JobSuccessTotal:         999,
			JobFailureTotal:         1,
		},
	}

	issues := checklist.Validate()
	joined := strings.Join(issues, " | ")
	if !strings.Contains(joined, "15.4 recipient journey") {
		t.Fatalf("expected recipient journey assertion issue, got %s", joined)
	}
	if !strings.Contains(joined, "15.4 completion link actionable") {
		t.Fatalf("expected completion link assertion issue, got %s", joined)
	}
	if !strings.Contains(joined, "JSON contract endpoint") {
		t.Fatalf("expected primary CTA contract endpoint issue, got %s", joined)
	}
	if !strings.Contains(joined, "CI smoke") {
		t.Fatalf("expected CI smoke assertion issue, got %s", joined)
	}
}
