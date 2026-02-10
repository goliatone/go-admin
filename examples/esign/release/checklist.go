package release

import (
	"encoding/json"
	"fmt"
	"os"
	"slices"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/observability"
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
	UsesMockDependencies  bool   `json:"uses_mock_dependencies"`
	RequiresManualPatches bool   `json:"requires_manual_patches"`
	Notes                 string `json:"notes"`
}

type RolloutEvidenceSummary struct {
	StagingValidationRef string `json:"staging_validation_ref"`
	LoadValidationRef    string `json:"load_validation_ref"`
	SLOValidationRef     string `json:"slo_validation_ref"`
}

type Checklist struct {
	ReleaseID string `json:"release_id"`
	Track     string `json:"track"`
	Phase     string `json:"phase"`

	Signoffs map[string]Signoff      `json:"signoffs"`
	Security SecurityReviewSummary   `json:"security"`
	Runtime  RuntimeReadinessSummary `json:"runtime"`
	Evidence RolloutEvidenceSummary  `json:"evidence"`

	SLOSnapshot observability.MetricsSnapshot `json:"slo_snapshot"`
}

func (c Checklist) Validate() []string {
	issues := make([]string, 0)
	if strings.TrimSpace(c.ReleaseID) == "" {
		issues = append(issues, "release_id is required")
	}
	if c.Signoffs == nil {
		issues = append(issues, "signoffs are required")
	} else {
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
	}
	if c.Security.HighSeverityOpen > 0 {
		issues = append(issues, fmt.Sprintf("security review has %d high severity item(s) open", c.Security.HighSeverityOpen))
	}
	if c.Runtime.UsesMockDependencies {
		issues = append(issues, "runtime depends on mock/demo-only components")
	}
	if c.Runtime.RequiresManualPatches {
		issues = append(issues, "runtime requires manual data patching")
	}
	slo := observability.EvaluateSLO(c.SLOSnapshot)
	if !slo.OverallPass {
		failed := make([]string, 0)
		for _, target := range slo.Targets {
			if !target.Pass {
				failed = append(failed, target.Metric)
			}
		}
		sort.Strings(failed)
		issues = append(issues, fmt.Sprintf("numeric SLO gate failed for: %s", strings.Join(failed, ", ")))
	}
	return issues
}

func RequiredSignoffTeams() []string {
	return slices.Clone(requiredSignoffTeams)
}

func LoadChecklist(path string) (Checklist, error) {
	raw, err := os.ReadFile(path)
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
