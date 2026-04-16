package release

import (
	"encoding/json"
	"fmt"
	"slices"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/internal/primitives"
)

const (
	TeamBackend  = "be"
	TeamFrontend = "fe"
	TeamQA       = "qa"
	TeamOps      = "ops"
)

var requiredSignoffTeams = []string{TeamBackend, TeamFrontend, TeamQA, TeamOps}

type Signoff struct {
	Approved   bool   `json:"approved"`
	Approver   string `json:"approver"`
	ApprovedAt string `json:"approved_at"`
	Ticket     string `json:"ticket"`
}

type SecurityReviewSummary struct {
	HighSeverityOpen int    `json:"high_severity_open"`
	ReviewRef        string `json:"review_ref"`
}

type RuntimeReadinessSummary struct {
	UsesMockDependencies    bool   `json:"uses_mock_dependencies"`
	RequiresManualPatches   bool   `json:"requires_manual_patches"`
	APIOnlyFallbackDetected bool   `json:"api_only_fallback_detected"`
	LegacyRuntimePathActive bool   `json:"legacy_runtime_path_active"`
	Notes                   string `json:"notes"`
}

type RolloutEvidenceSummary struct {
	StagingValidationRef string `json:"staging_validation_ref"`
	LoadValidationRef    string `json:"load_validation_ref"`
	SLOValidationRef     string `json:"slo_validation_ref"`
}

type ProductizationExitSummary struct {
	RecipientJourneyFromSignLink bool   `json:"recipient_journey_from_sign_link"`
	InvitationLinkActionable     bool   `json:"invitation_link_actionable"`
	CompletionLinkActionable     bool   `json:"completion_link_actionable"`
	PrimaryCTANotContractJSON    bool   `json:"primary_cta_not_contract_json"`
	CISmokeWorkflowPassed        bool   `json:"ci_smoke_workflow_passed"`
	CISmokeRef                   string `json:"ci_smoke_ref"`
}

type Checklist struct {
	ReleaseID string `json:"release_id"`
	Track     string `json:"track"`
	Phase     string `json:"phase"`

	Signoffs       map[string]Signoff        `json:"signoffs"`
	Security       SecurityReviewSummary     `json:"security"`
	Runtime        RuntimeReadinessSummary   `json:"runtime"`
	Evidence       RolloutEvidenceSummary    `json:"evidence"`
	Productization ProductizationExitSummary `json:"productization_154"`

	SLOSnapshot observability.MetricsSnapshot `json:"slo_snapshot"`
}

func (c Checklist) Validate() []string {
	issues := make([]string, 0)
	if strings.TrimSpace(c.ReleaseID) == "" {
		issues = append(issues, "release_id is required")
	}
	issues = append(issues, c.validateSignoffs()...)
	if c.Security.HighSeverityOpen > 0 {
		issues = append(issues, fmt.Sprintf("security review has %d high severity item(s) open", c.Security.HighSeverityOpen))
	}
	issues = append(issues, c.validateRuntimeReadiness()...)
	issues = append(issues, c.validateProductization()...)
	slo := observability.EvaluateSLO(c.SLOSnapshot)
	if !slo.OverallPass {
		failed := failedSLOMetrics(slo.Targets)
		issues = append(issues, fmt.Sprintf("numeric SLO gate failed for: %s", strings.Join(failed, ", ")))
	}
	return issues
}

func (c Checklist) validateSignoffs() []string {
	if c.Signoffs == nil {
		return []string{"signoffs are required"}
	}
	issues := make([]string, 0)
	for _, team := range requiredSignoffTeams {
		signoff, ok := c.Signoffs[team]
		if !ok {
			issues = append(issues, fmt.Sprintf("missing %s signoff", team))
			continue
		}
		if !signoff.Approved {
			issues = append(issues, fmt.Sprintf("%s signoff is not approved", team))
		}
		if strings.TrimSpace(signoff.Approver) == "" {
			issues = append(issues, fmt.Sprintf("%s approver is required", team))
		}
		if strings.TrimSpace(signoff.ApprovedAt) == "" {
			issues = append(issues, fmt.Sprintf("%s approved_at is required", team))
		}
	}
	return issues
}

func (c Checklist) validateRuntimeReadiness() []string {
	issues := make([]string, 0)
	if c.Runtime.UsesMockDependencies {
		issues = append(issues, "runtime depends on mock/demo-only components")
	}
	if c.Runtime.RequiresManualPatches {
		issues = append(issues, "runtime requires manual data patching")
	}
	if c.Runtime.APIOnlyFallbackDetected {
		issues = append(issues, "runtime still requires API-only fallback for normal signer flow")
	}
	if c.Runtime.LegacyRuntimePathActive {
		issues = append(issues, "runtime still exposes legacy signer flow paths")
	}
	return issues
}

func (c Checklist) validateProductization() []string {
	issues := make([]string, 0)
	if !c.Productization.RecipientJourneyFromSignLink {
		issues = append(issues, "15.4 recipient journey from sign link without API tooling is not verified")
	}
	if !c.Productization.InvitationLinkActionable {
		issues = append(issues, "15.4 invitation link actionable UX assertion is not verified")
	}
	if !c.Productization.CompletionLinkActionable {
		issues = append(issues, "15.4 completion link actionable UX assertion is not verified")
	}
	if !c.Productization.PrimaryCTANotContractJSON {
		issues = append(issues, "15.4 primary recipient CTA still resolves to JSON contract endpoint")
	}
	if !c.Productization.CISmokeWorkflowPassed {
		issues = append(issues, "15.4 CI smoke sender->recipient->completion workflow assertion is not verified")
	}
	return issues
}

func failedSLOMetrics(targets []observability.SLOTargetStatus) []string {
	failed := make([]string, 0)
	for _, target := range targets {
		if !target.Pass {
			failed = append(failed, target.Metric)
		}
	}
	sort.Strings(failed)
	return failed
}

func RequiredSignoffTeams() []string {
	return slices.Clone(requiredSignoffTeams)
}

func LoadChecklist(path string) (Checklist, error) {
	raw, err := primitives.ReadTrustedFile(path)
	if err != nil {
		return Checklist{}, err
	}
	var checklist Checklist
	if err := json.Unmarshal(raw, &checklist); err != nil {
		return Checklist{}, err
	}
	return checklist, nil
}

func ValidateChecklistFile(path string) (Checklist, []string, error) {
	checklist, err := LoadChecklist(path)
	if err != nil {
		return Checklist{}, nil, err
	}
	return checklist, checklist.Validate(), nil
}
