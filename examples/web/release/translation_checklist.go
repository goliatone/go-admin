package release

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

const (
	TranslationTeamBackend  = "be"
	TranslationTeamFrontend = "fe"
	TranslationTeamQA       = "qa"
	TranslationTeamOps      = "ops"
)

var translationRequiredTeams = []string{
	TranslationTeamBackend,
	TranslationTeamFrontend,
	TranslationTeamQA,
	TranslationTeamOps,
}

type TranslationSignoff struct {
	Approved   bool   `json:"approved"`
	Approver   string `json:"approver"`
	ApprovedAt string `json:"approved_at"`
	Ticket     string `json:"ticket"`
}

type TranslationRolloutDefaults struct {
	Profile      string   `json:"profile"`
	Exchange     bool     `json:"exchange"`
	Queue        bool     `json:"queue"`
	KillSwitches []string `json:"kill_switches"`
}

type TranslationGateEvidence struct {
	ContractsRef        string `json:"contracts_ref"`
	MigrationsRef       string `json:"migrations_ref"`
	ScopeRef            string `json:"scope_ref"`
	SecurityRef         string `json:"security_ref"`
	ObservabilityRef    string `json:"observability_ref"`
	PerformanceRef      string `json:"performance_ref"`
	ExtractionDryRunRef string `json:"extraction_dry_run_ref"`
	AccessibilityRef    string `json:"accessibility_ref"`
	E2ERef              string `json:"e2e_ref"`
	StagingSoakRef      string `json:"staging_soak_ref"`
}

type TranslationRollbackPlaybook struct {
	FeatureFlagsOff   []string `json:"feature_flags_off"`
	RestoreAppBuild   bool     `json:"restore_app_build"`
	RestoreDBSnapshot bool     `json:"restore_db_snapshot"`
	Notes             string   `json:"notes"`
}

type TranslationChecklist struct {
	ReleaseID string `json:"release_id"`
	Phase     string `json:"phase"`

	RolloutDefaults TranslationRolloutDefaults    `json:"rollout_defaults"`
	Signoffs        map[string]TranslationSignoff `json:"signoffs"`
	Evidence        TranslationGateEvidence       `json:"evidence"`
	Rollback        TranslationRollbackPlaybook   `json:"rollback"`
}

func (c TranslationChecklist) Validate() []string {
	issues := make([]string, 0)
	if strings.TrimSpace(c.ReleaseID) == "" {
		issues = append(issues, "release_id is required")
	}
	if strings.TrimSpace(c.Phase) == "" {
		issues = append(issues, "phase is required")
	}
	if strings.TrimSpace(c.RolloutDefaults.Profile) != "full" {
		issues = append(issues, "rollout default profile must be full")
	}
	if !c.RolloutDefaults.Exchange {
		issues = append(issues, "exchange must be enabled in rollout defaults")
	}
	if !c.RolloutDefaults.Queue {
		issues = append(issues, "queue must be enabled in rollout defaults")
	}
	if !containsAll(c.RolloutDefaults.KillSwitches, "translations.exchange", "translations.queue") {
		issues = append(issues, "kill_switches must include translations.exchange and translations.queue")
	}
	if c.Signoffs == nil {
		issues = append(issues, "signoffs are required")
	} else {
		for _, team := range translationRequiredTeams {
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
	for label, ref := range map[string]string{
		"contracts_ref":          c.Evidence.ContractsRef,
		"migrations_ref":         c.Evidence.MigrationsRef,
		"scope_ref":              c.Evidence.ScopeRef,
		"security_ref":           c.Evidence.SecurityRef,
		"observability_ref":      c.Evidence.ObservabilityRef,
		"performance_ref":        c.Evidence.PerformanceRef,
		"extraction_dry_run_ref": c.Evidence.ExtractionDryRunRef,
		"accessibility_ref":      c.Evidence.AccessibilityRef,
		"e2e_ref":                c.Evidence.E2ERef,
		"staging_soak_ref":       c.Evidence.StagingSoakRef,
	} {
		if strings.TrimSpace(ref) == "" {
			issues = append(issues, fmt.Sprintf("%s is required", label))
		}
	}
	if !c.Rollback.RestoreAppBuild {
		issues = append(issues, "rollback must restore previous app build")
	}
	if !c.Rollback.RestoreDBSnapshot {
		issues = append(issues, "rollback must restore database snapshot")
	}
	if !containsAll(c.Rollback.FeatureFlagsOff, "translations.exchange", "translations.queue") {
		issues = append(issues, "rollback feature_flags_off must include translations.exchange and translations.queue")
	}
	if strings.TrimSpace(c.Rollback.Notes) == "" {
		issues = append(issues, "rollback notes are required")
	}
	return issues
}

func TranslationRequiredSignoffTeams() []string {
	return slices.Clone(translationRequiredTeams)
}

func LoadTranslationChecklist(path string) (TranslationChecklist, error) {
	raw, err := primitives.ReadTrustedFile(path)
	if err != nil {
		return TranslationChecklist{}, err
	}
	var checklist TranslationChecklist
	if err := json.Unmarshal(raw, &checklist); err != nil {
		return TranslationChecklist{}, err
	}
	return checklist, nil
}

func ValidateTranslationChecklistFile(path string) (TranslationChecklist, []string, error) {
	checklist, err := LoadTranslationChecklist(path)
	if err != nil {
		return TranslationChecklist{}, nil, err
	}
	return checklist, checklist.Validate(), nil
}

func containsAll(values []string, required ...string) bool {
	if len(required) == 0 {
		return true
	}
	lookup := map[string]struct{}{}
	for _, value := range values {
		lookup[strings.TrimSpace(value)] = struct{}{}
	}
	for _, key := range required {
		if _, ok := lookup[strings.TrimSpace(key)]; !ok {
			return false
		}
	}
	return true
}
