package admin

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode"
)

// DoctorSeverity describes diagnostic severity levels.
type DoctorSeverity string

const (
	DoctorSeverityOK    DoctorSeverity = "ok"
	DoctorSeverityInfo  DoctorSeverity = "info"
	DoctorSeverityWarn  DoctorSeverity = "warn"
	DoctorSeverityError DoctorSeverity = "error"
)

var (
	ErrDoctorCheckNotFound     = errors.New("doctor check not found")
	ErrDoctorActionUnavailable = errors.New("doctor action unavailable")
	ErrDoctorActionNotRunnable = errors.New("doctor action not runnable")
)

// DoctorActionKind indicates whether a doctor action is automated or manual guidance.
type DoctorActionKind string

const (
	DoctorActionKindManual DoctorActionKind = "manual"
	DoctorActionKindAuto   DoctorActionKind = "auto"
)

// DoctorActionRun executes a doctor action handler.
type DoctorActionRun func(ctx context.Context, adm *Admin, check DoctorCheckResult, input map[string]any) (DoctorActionExecution, error)

// DoctorAction describes the "how to fix" metadata for a check and optional executable action.
type DoctorAction struct {
	Label                string           `json:"label,omitempty"`
	CTA                  string           `json:"cta,omitempty"`
	Description          string           `json:"description,omitempty"`
	Kind                 DoctorActionKind `json:"kind,omitempty"`
	AllowedStatuses      []DoctorSeverity `json:"allowed_statuses,omitempty"`
	RequiresConfirmation bool             `json:"requires_confirmation,omitempty"`
	ConfirmText          string           `json:"confirm_text,omitempty"`
	Metadata             map[string]any   `json:"metadata,omitempty"`
	Run                  DoctorActionRun  `json:"-"`
}

// DoctorActionState is the frontend-safe action descriptor for an evaluated check result.
type DoctorActionState struct {
	Label                string           `json:"label,omitempty"`
	CTA                  string           `json:"cta,omitempty"`
	Description          string           `json:"description,omitempty"`
	Kind                 DoctorActionKind `json:"kind,omitempty"`
	AllowedStatuses      []DoctorSeverity `json:"allowed_statuses,omitempty"`
	RequiresConfirmation bool             `json:"requires_confirmation,omitempty"`
	ConfirmText          string           `json:"confirm_text,omitempty"`
	Applicable           bool             `json:"applicable"`
	Runnable             bool             `json:"runnable"`
	Metadata             map[string]any   `json:"metadata,omitempty"`
}

// DoctorActionExecution is returned when a doctor action is invoked.
type DoctorActionExecution struct {
	CheckID  string            `json:"check_id"`
	Status   string            `json:"status,omitempty"`
	Message  string            `json:"message,omitempty"`
	Metadata map[string]any    `json:"metadata,omitempty"`
	Snapshot DoctorCheckResult `json:"snapshot,omitempty"`
}

// DoctorFinding captures one actionable diagnostic item.
type DoctorFinding struct {
	CheckID   string         `json:"check_id,omitempty"`
	Severity  DoctorSeverity `json:"severity"`
	Code      string         `json:"code,omitempty"`
	Component string         `json:"component,omitempty"`
	Message   string         `json:"message"`
	Hint      string         `json:"hint,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

// DoctorCheckOutput is produced by a single diagnostic check.
type DoctorCheckOutput struct {
	Summary  string          `json:"summary,omitempty"`
	Findings []DoctorFinding `json:"findings,omitempty"`
	Metadata map[string]any  `json:"metadata,omitempty"`
}

// DoctorCheck defines a diagnostic check that can run in the debug doctor panel.
type DoctorCheck struct {
	ID          string        `json:"id"`
	Label       string        `json:"label,omitempty"`
	Description string        `json:"description,omitempty"`
	Help        string        `json:"help,omitempty"`
	Action      *DoctorAction `json:"action,omitempty"`
	Run         func(ctx context.Context, adm *Admin) DoctorCheckOutput
}

// DoctorCheckResult is the rendered output for a check run.
type DoctorCheckResult struct {
	ID          string             `json:"id"`
	Label       string             `json:"label"`
	Description string             `json:"description,omitempty"`
	Help        string             `json:"help,omitempty"`
	Status      DoctorSeverity     `json:"status"`
	Summary     string             `json:"summary,omitempty"`
	DurationMS  int64              `json:"duration_ms"`
	Findings    []DoctorFinding    `json:"findings,omitempty"`
	Action      *DoctorActionState `json:"action,omitempty"`
	Metadata    map[string]any     `json:"metadata,omitempty"`
}

// DoctorSummary aggregates overall doctor counts.
type DoctorSummary struct {
	Checks int `json:"checks"`
	OK     int `json:"ok"`
	Info   int `json:"info"`
	Warn   int `json:"warn"`
	Error  int `json:"error"`
}

// DoctorReport is the complete diagnostics snapshot for the app setup.
type DoctorReport struct {
	GeneratedAt time.Time           `json:"generated_at"`
	Verdict     DoctorSeverity      `json:"verdict"`
	Summary     DoctorSummary       `json:"summary"`
	Checks      []DoctorCheckResult `json:"checks"`
	Findings    []DoctorFinding     `json:"findings,omitempty"`
	NextActions []string            `json:"next_actions,omitempty"`
}

// RegisterDoctorChecks registers checks used by RunDoctor and the doctor debug panel.
func (a *Admin) RegisterDoctorChecks(checks ...DoctorCheck) *Admin {
	if a == nil || len(checks) == 0 {
		return a
	}
	a.doctorMu.Lock()
	defer a.doctorMu.Unlock()
	if a.doctorChecks == nil {
		a.doctorChecks = map[string]DoctorCheck{}
	}
	for _, raw := range checks {
		id := normalizeDoctorCheckID(raw.ID)
		if id == "" || raw.Run == nil {
			continue
		}
		raw.ID = id
		if strings.TrimSpace(raw.Label) == "" {
			raw.Label = formatDoctorCheckLabel(id)
		}
		if strings.TrimSpace(raw.Description) == "" {
			raw.Description = raw.Label
		}
		raw.Help = normalizeDoctorHelp(raw.Help, raw.Description, raw.Label)
		raw.Action = normalizeDoctorAction(raw.Action)
		a.doctorChecks[id] = raw
	}
	return a
}

// DoctorChecks returns a stable, sorted copy of registered doctor checks.
func (a *Admin) DoctorChecks() []DoctorCheck {
	if a == nil {
		return nil
	}
	a.doctorMu.RLock()
	if len(a.doctorChecks) == 0 {
		a.doctorMu.RUnlock()
		return nil
	}
	ids := make([]string, 0, len(a.doctorChecks))
	for id := range a.doctorChecks {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	checks := make([]DoctorCheck, 0, len(ids))
	for _, id := range ids {
		checks = append(checks, a.doctorChecks[id])
	}
	a.doctorMu.RUnlock()
	return checks
}

func (a *Admin) doctorCheckByID(checkID string) (DoctorCheck, bool) {
	if a == nil {
		return DoctorCheck{}, false
	}
	checkID = normalizeDoctorCheckID(checkID)
	if checkID == "" {
		return DoctorCheck{}, false
	}
	a.doctorMu.RLock()
	check, ok := a.doctorChecks[checkID]
	a.doctorMu.RUnlock()
	return check, ok
}

// RunDoctorAction executes a check action when configured and runnable.
func (a *Admin) RunDoctorAction(ctx context.Context, checkID string, input map[string]any) (DoctorActionExecution, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	check, ok := a.doctorCheckByID(checkID)
	if !ok {
		return DoctorActionExecution{}, ErrDoctorCheckNotFound
	}
	result := runDoctorCheck(ctx, a, check)
	actionState := result.Action
	if actionState == nil {
		return DoctorActionExecution{}, ErrDoctorActionUnavailable
	}
	if !actionState.Runnable {
		return DoctorActionExecution{}, ErrDoctorActionNotRunnable
	}
	action := normalizeDoctorAction(check.Action)
	if action == nil || action.Run == nil {
		return DoctorActionExecution{}, ErrDoctorActionNotRunnable
	}

	payload := cloneDoctorMetadata(input)
	exec, err := action.Run(ctx, a, result, payload)
	if err != nil {
		return DoctorActionExecution{}, err
	}
	exec.CheckID = result.ID
	exec.Snapshot = result
	exec.Metadata = cloneDoctorMetadata(exec.Metadata)
	if strings.TrimSpace(exec.Status) == "" {
		exec.Status = "ok"
	}
	return exec, nil
}

// RunDoctor executes registered checks and returns a full diagnostics report.
func (a *Admin) RunDoctor(ctx context.Context) DoctorReport {
	report := DoctorReport{
		GeneratedAt: time.Now().UTC(),
		Verdict:     DoctorSeverityOK,
	}
	if ctx == nil {
		ctx = context.Background()
	}

	checks := a.DoctorChecks()
	report.Summary.Checks = len(checks)
	if len(checks) == 0 {
		report.Verdict = DoctorSeverityInfo
		report.NextActions = []string{"No doctor checks are registered"}
		return report
	}

	allFindings := []DoctorFinding{}
	nextActions := map[string]struct{}{}
	for _, check := range checks {
		result := runDoctorCheck(ctx, a, check)

		switch result.Status {
		case DoctorSeverityError:
			report.Summary.Error++
		case DoctorSeverityWarn:
			report.Summary.Warn++
		case DoctorSeverityInfo:
			report.Summary.Info++
		default:
			report.Summary.OK++
		}

		report.Verdict = higherDoctorSeverity(report.Verdict, result.Status)
		report.Checks = append(report.Checks, result)
		for _, finding := range result.Findings {
			allFindings = append(allFindings, finding)
			if (finding.Severity == DoctorSeverityWarn || finding.Severity == DoctorSeverityError) && strings.TrimSpace(finding.Hint) != "" {
				nextActions[finding.Hint] = struct{}{}
			}
		}
	}

	if len(allFindings) > 0 {
		report.Findings = allFindings
	}
	if len(nextActions) > 0 {
		hints := make([]string, 0, len(nextActions))
		for hint := range nextActions {
			hints = append(hints, hint)
		}
		sort.Strings(hints)
		report.NextActions = hints
	}

	return report
}

func runDoctorCheck(ctx context.Context, adm *Admin, check DoctorCheck) DoctorCheckResult {
	start := time.Now()
	output := DoctorCheckOutput{}
	panicErr := recoverDoctorPanic(func() {
		if check.Run != nil {
			output = check.Run(ctx, adm)
		}
	})

	result := DoctorCheckResult{
		ID:          check.ID,
		Label:       strings.TrimSpace(check.Label),
		Description: strings.TrimSpace(check.Description),
		Help:        normalizeDoctorHelp(check.Help, check.Description, check.Label),
		DurationMS:  time.Since(start).Milliseconds(),
		Metadata:    cloneDoctorMetadata(output.Metadata),
	}
	if panicErr != nil {
		output.Findings = append(output.Findings, DoctorFinding{
			Severity:  DoctorSeverityError,
			Code:      "doctor.check.panic",
			Component: check.ID,
			Message:   fmt.Sprintf("diagnostic check panicked: %v", panicErr),
			Hint:      "Inspect check implementation and guard nil dependencies",
		})
	}

	result.Findings = normalizeDoctorFindings(check.ID, output.Findings)
	result.Status = doctorStatusFromFindings(result.Findings)
	result.Summary = strings.TrimSpace(output.Summary)
	if result.Summary == "" {
		result.Summary = defaultDoctorSummary(result.Status, result.Findings)
	}
	result.Action = doctorActionState(check.Action, result.Status)
	return result
}

func recoverDoctorPanic(run func()) (panicErr any) {
	defer func() {
		if recovered := recover(); recovered != nil {
			panicErr = recovered
		}
	}()
	if run != nil {
		run()
	}
	return nil
}

func normalizeDoctorCheckID(id string) string {
	id = strings.ToLower(strings.TrimSpace(id))
	id = strings.ReplaceAll(id, " ", ".")
	return strings.Trim(id, ".")
}

func formatDoctorCheckLabel(id string) string {
	id = normalizeDoctorCheckID(id)
	if id == "" {
		return ""
	}
	parts := strings.FieldsFunc(id, func(r rune) bool {
		return r == '.' || r == '_' || r == '-'
	})
	if len(parts) == 0 {
		parts = []string{id}
	}
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		runes := []rune(strings.ToLower(part))
		runes[0] = unicode.ToUpper(runes[0])
		out = append(out, string(runes))
	}
	return strings.Join(out, " ")
}

func normalizeDoctorHelp(help, description, label string) string {
	help = strings.TrimSpace(help)
	if help != "" {
		return help
	}
	description = strings.TrimSpace(description)
	if description != "" {
		return description
	}
	return strings.TrimSpace(label)
}

// NewManualDoctorAction returns a manual CTA descriptor for checks that require human intervention.
func NewManualDoctorAction(description, cta string) *DoctorAction {
	action := normalizeDoctorAction(&DoctorAction{
		Description: description,
		CTA:         cta,
		Kind:        DoctorActionKindManual,
	})
	return action
}

func normalizeDoctorAction(action *DoctorAction) *DoctorAction {
	if action == nil {
		action = &DoctorAction{}
	}
	out := *action
	out.Label = strings.TrimSpace(out.Label)
	if out.Label == "" {
		out.Label = "Fix"
	}
	out.CTA = strings.TrimSpace(out.CTA)
	if out.CTA == "" {
		if out.Run != nil {
			out.CTA = "Run fix"
		} else {
			out.CTA = "Resolve manually"
		}
	}
	out.Description = strings.TrimSpace(out.Description)
	if out.Description == "" {
		out.Description = "Review findings and apply the suggested remediation."
	}
	switch out.Kind {
	case DoctorActionKindAuto, DoctorActionKindManual:
	default:
		if out.Run != nil {
			out.Kind = DoctorActionKindAuto
		} else {
			out.Kind = DoctorActionKindManual
		}
	}
	out.ConfirmText = strings.TrimSpace(out.ConfirmText)
	if len(out.AllowedStatuses) == 0 {
		out.AllowedStatuses = []DoctorSeverity{DoctorSeverityWarn, DoctorSeverityError}
	} else {
		allowed := make([]DoctorSeverity, 0, len(out.AllowedStatuses))
		seen := map[DoctorSeverity]struct{}{}
		for _, status := range out.AllowedStatuses {
			normalized := normalizeDoctorSeverity(status)
			if _, ok := seen[normalized]; ok {
				continue
			}
			seen[normalized] = struct{}{}
			allowed = append(allowed, normalized)
		}
		if len(allowed) == 0 {
			allowed = []DoctorSeverity{DoctorSeverityWarn, DoctorSeverityError}
		}
		out.AllowedStatuses = allowed
	}
	out.Metadata = cloneDoctorMetadata(out.Metadata)
	return &out
}

func doctorActionState(action *DoctorAction, status DoctorSeverity) *DoctorActionState {
	normalized := normalizeDoctorAction(action)
	if normalized == nil {
		return nil
	}
	applicable := doctorActionApplies(status, normalized.AllowedStatuses)
	return &DoctorActionState{
		Label:                normalized.Label,
		CTA:                  normalized.CTA,
		Description:          normalized.Description,
		Kind:                 normalized.Kind,
		AllowedStatuses:      append([]DoctorSeverity{}, normalized.AllowedStatuses...),
		RequiresConfirmation: normalized.RequiresConfirmation,
		ConfirmText:          normalized.ConfirmText,
		Applicable:           applicable,
		Runnable:             applicable && normalized.Run != nil,
		Metadata:             cloneDoctorMetadata(normalized.Metadata),
	}
}

func doctorActionApplies(status DoctorSeverity, allowed []DoctorSeverity) bool {
	if len(allowed) == 0 {
		return true
	}
	status = normalizeDoctorSeverity(status)
	for _, candidate := range allowed {
		if normalizeDoctorSeverity(candidate) == status {
			return true
		}
	}
	return false
}

func normalizeDoctorFindings(checkID string, findings []DoctorFinding) []DoctorFinding {
	if len(findings) == 0 {
		return nil
	}
	out := make([]DoctorFinding, 0, len(findings))
	for _, finding := range findings {
		finding.CheckID = checkID
		finding.Severity = normalizeDoctorSeverity(finding.Severity)
		finding.Code = strings.TrimSpace(finding.Code)
		finding.Component = strings.TrimSpace(finding.Component)
		finding.Message = strings.TrimSpace(finding.Message)
		finding.Hint = strings.TrimSpace(finding.Hint)
		finding.Metadata = cloneDoctorMetadata(finding.Metadata)
		if finding.Message == "" {
			continue
		}
		out = append(out, finding)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneDoctorMetadata(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func normalizeDoctorSeverity(severity DoctorSeverity) DoctorSeverity {
	switch DoctorSeverity(strings.ToLower(strings.TrimSpace(string(severity)))) {
	case DoctorSeverityError:
		return DoctorSeverityError
	case DoctorSeverityWarn:
		return DoctorSeverityWarn
	case DoctorSeverityInfo:
		return DoctorSeverityInfo
	case DoctorSeverityOK:
		return DoctorSeverityOK
	default:
		return DoctorSeverityWarn
	}
}

func doctorStatusFromFindings(findings []DoctorFinding) DoctorSeverity {
	status := DoctorSeverityOK
	for _, finding := range findings {
		status = higherDoctorSeverity(status, normalizeDoctorSeverity(finding.Severity))
	}
	return status
}

func defaultDoctorSummary(status DoctorSeverity, findings []DoctorFinding) string {
	switch status {
	case DoctorSeverityError:
		if len(findings) > 0 {
			return findings[0].Message
		}
		return "Critical issues detected"
	case DoctorSeverityWarn:
		if len(findings) > 0 {
			return findings[0].Message
		}
		return "Warnings detected"
	case DoctorSeverityInfo:
		if len(findings) > 0 {
			return findings[0].Message
		}
		return "Diagnostic info available"
	default:
		return "No issues detected"
	}
}

func higherDoctorSeverity(a, b DoctorSeverity) DoctorSeverity {
	if doctorSeverityRank(b) > doctorSeverityRank(a) {
		return b
	}
	return a
}

func doctorSeverityRank(status DoctorSeverity) int {
	switch normalizeDoctorSeverity(status) {
	case DoctorSeverityError:
		return 3
	case DoctorSeverityWarn:
		return 2
	case DoctorSeverityInfo:
		return 1
	default:
		return 0
	}
}

func defaultDoctorChecks() []DoctorCheck {
	return []DoctorCheck{
		{
			ID:          "admin.core.dependencies",
			Label:       "Core Dependencies",
			Description: "Validates essential admin wiring before feature checks run.",
			Help:        "Checks foundational services (router, registry, command bus, feature gate, URL manager). Errors block startup-critical behavior; warnings indicate degraded capabilities.",
			Action: NewManualDoctorAction(
				"Validate dependency wiring in bootstrap and make sure required services are injected before Initialize.",
				"Inspect bootstrap wiring",
			),
			Run: func(_ context.Context, adm *Admin) DoctorCheckOutput {
				findings := []DoctorFinding{}
				if adm == nil {
					findings = append(findings, DoctorFinding{
						Severity: DoctorSeverityError,
						Code:     "admin.nil",
						Message:  "Admin instance is nil",
						Hint:     "Initialize admin before running diagnostics",
					})
					return DoctorCheckOutput{Findings: findings}
				}
				if adm.registry == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityError,
						Component: "registry",
						Code:      "registry.missing",
						Message:   "Registry is not configured",
						Hint:      "Ensure admin.New completes with a valid registry",
					})
				}
				if adm.router == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityError,
						Component: "router",
						Code:      "router.missing",
						Message:   "Router is not configured",
						Hint:      "Provide a router dependency before initialize",
					})
				}
				if adm.commandBus == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityWarn,
						Component: "commands",
						Code:      "command_bus.missing",
						Message:   "Command bus is not configured",
						Hint:      "Enable commands feature or inject a command bus dependency",
					})
				}
				if adm.featureGate == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityWarn,
						Component: "feature_gate",
						Code:      "feature_gate.missing",
						Message:   "Feature gate is not configured",
						Hint:      "Inject a feature gate or use quickstart default feature gate",
					})
				}
				if adm.urlManager == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityWarn,
						Component: "urls",
						Code:      "url_manager.missing",
						Message:   "URL manager is not configured",
						Hint:      "Ensure URL manager resolves admin and API routes",
					})
				}
				metadata := map[string]any{
					"modules_loaded":        adm.modulesLoaded,
					"module_startup_policy": string(adm.moduleStartupPolicy),
					"base_path":             adminBasePath(adm.config),
				}
				return DoctorCheckOutput{
					Findings: findings,
					Metadata: metadata,
				}
			},
		},
		{
			ID:          "admin.auth.wiring",
			Label:       "Auth Wiring",
			Description: "Checks authentication and authorization integrations.",
			Help:        "Evaluates authenticator and authorizer integration. Missing authenticator is a warning; missing authorizer is informational but can hide policy gaps.",
			Action: NewManualDoctorAction(
				"Attach an authenticator/authorizer pair aligned with your deployment policy and verify permission evaluation paths.",
				"Review auth integration",
			),
			Run: func(_ context.Context, adm *Admin) DoctorCheckOutput {
				if adm == nil {
					return DoctorCheckOutput{}
				}
				findings := []DoctorFinding{}
				if adm.authenticator == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityWarn,
						Component: "authenticator",
						Code:      "authenticator.missing",
						Message:   "No authenticator configured",
						Hint:      "Attach an authenticator to enforce admin route authentication",
					})
				}
				if adm.authorizer == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityInfo,
						Component: "authorizer",
						Code:      "authorizer.missing",
						Message:   "No authorizer configured",
						Hint:      "Attach an authorizer to enforce permission checks consistently",
					})
				}
				return DoctorCheckOutput{
					Findings: findings,
					Metadata: map[string]any{
						"authenticator_configured": adm.authenticator != nil,
						"authorizer_configured":    adm.authorizer != nil,
					},
				}
			},
		},
		{
			ID:          "admin.features.wiring",
			Label:       "Feature Wiring",
			Description: "Verifies enabled feature flags map to ready services.",
			Help:        "Compares enabled feature flags with runtime service readiness. A warning means a feature is enabled but its backing service is missing.",
			Action: NewManualDoctorAction(
				"Align feature flags with service registration or disable features that are not wired in this environment.",
				"Align feature wiring",
			),
			Run: func(_ context.Context, adm *Admin) DoctorCheckOutput {
				if adm == nil {
					return DoctorCheckOutput{}
				}
				findings := []DoctorFinding{}
				checkFeature := func(feature FeatureKey, ready bool, component string) {
					if !featureEnabled(adm.featureGate, feature) || ready {
						return
					}
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityWarn,
						Component: component,
						Code:      fmt.Sprintf("feature.%s.unwired", strings.TrimSpace(string(feature))),
						Message:   fmt.Sprintf("Feature %q is enabled but %s is not ready", strings.TrimSpace(string(feature)), component),
						Hint:      "Ensure service wiring matches feature gate state",
					})
				}
				checkFeature(FeatureDashboard, adm.dashboard != nil, "dashboard")
				checkFeature(FeatureSettings, adm.settings != nil, "settings")
				checkFeature(FeatureUsers, adm.users != nil, "users")
				checkFeature(FeatureSearch, adm.search != nil, "search")
				checkFeature(FeatureNotifications, adm.notifications != nil, "notifications")
				checkFeature(FeatureJobs, adm.jobs != nil, "jobs")
				checkFeature(FeaturePreferences, adm.preferences != nil, "preferences")
				checkFeature(FeatureProfile, adm.profile != nil, "profile")

				return DoctorCheckOutput{Findings: findings}
			},
		},
		{
			ID:          "admin.cms.wiring",
			Label:       "CMS Wiring",
			Description: "Ensures CMS services are available when CMS is enabled.",
			Help:        "Checks CMS container services and route readiness when CMS is enabled. Errors indicate unavailable core content service; warnings indicate partial CMS capability.",
			Action: NewManualDoctorAction(
				"Confirm CMS container/service bindings and register required routes before enabling CMS-related features.",
				"Review CMS wiring",
			),
			Run: func(_ context.Context, adm *Admin) DoctorCheckOutput {
				if adm == nil {
					return DoctorCheckOutput{}
				}
				if !featureEnabled(adm.featureGate, FeatureCMS) {
					return DoctorCheckOutput{
						Summary: "CMS feature disabled",
						Metadata: map[string]any{
							"cms_enabled": false,
						},
					}
				}
				findings := []DoctorFinding{}
				if adm.contentSvc == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityError,
						Component: "content",
						Code:      "cms.content_service.missing",
						Message:   "CMS content service is unavailable",
						Hint:      "Configure CMS container/content service before enabling CMS feature",
					})
				}
				if adm.contentTypeSvc == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityWarn,
						Component: "content_types",
						Code:      "cms.content_type_service.missing",
						Message:   "CMS content type service is unavailable",
						Hint:      "Attach content type service for dynamic content panel routing",
					})
				}
				if adm.menuSvc == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityWarn,
						Component: "menus",
						Code:      "cms.menu_service.missing",
						Message:   "CMS menu service is unavailable",
						Hint:      "Attach menu service for navigation-backed content menus",
					})
				}
				if adm.widgetSvc == nil {
					findings = append(findings, DoctorFinding{
						Severity:  DoctorSeverityInfo,
						Component: "widgets",
						Code:      "cms.widget_service.missing",
						Message:   "CMS widget service is unavailable",
						Hint:      "Attach widget service if dashboard widgets are expected",
					})
				}
				return DoctorCheckOutput{
					Findings: findings,
					Metadata: map[string]any{
						"cms_enabled":                 true,
						"content_service_configured":  adm.contentSvc != nil,
						"content_types_configured":    adm.contentTypeSvc != nil,
						"menu_service_configured":     adm.menuSvc != nil,
						"widget_service_configured":   adm.widgetSvc != nil,
						"content_aliases_registered":  adm.contentAliasRoutesRegistered,
						"cms_routes_registered":       adm.cmsRoutesRegistered,
						"cms_workflow_defaults_ready": adm.cmsWorkflowDefaults,
					},
				}
			},
		},
	}
}
