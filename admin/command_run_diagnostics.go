package admin

import (
	"context"
	"errors"
	"sync"
	"time"
)

const commandRunDoctorCheckID = "admin.debug.command_runs"

// CommandRunDiagnosticStatus is a provider-neutral runtime readiness state.
type CommandRunDiagnosticStatus string

const (
	CommandRunDiagnosticDisabled   CommandRunDiagnosticStatus = "disabled"
	CommandRunDiagnosticNotStarted CommandRunDiagnosticStatus = "not_started"
	CommandRunDiagnosticReady      CommandRunDiagnosticStatus = "ready"
	CommandRunDiagnosticDegraded   CommandRunDiagnosticStatus = "degraded"
	CommandRunDiagnosticClosed     CommandRunDiagnosticStatus = "closed"
)

// CommandRunDiagnostics is a bounded, operator-safe runtime snapshot.
type CommandRunDiagnostics struct {
	Enabled      bool                            `json:"enabled"`
	Role         string                          `json:"role"`
	Status       CommandRunDiagnosticStatus      `json:"status"`
	Ready        bool                            `json:"ready"`
	Started      bool                            `json:"started"`
	Closed       bool                            `json:"closed"`
	Local        bool                            `json:"local"`
	Transport    string                          `json:"transport"`
	Capabilities CommandRunTransportCapabilities `json:"capabilities"`

	PublishFailures      uint64 `json:"publish_failures"`
	SubscriptionFailures uint64 `json:"subscription_failures"`
	RejectedEvents       uint64 `json:"rejected_events"`
	DroppedEvents        uint64 `json:"dropped_events"`
	ProjectionFailures   uint64 `json:"projection_failures"`
	ProjectionCount      uint64 `json:"projection_count"`
	OtherFailures        uint64 `json:"other_failures"`

	LastSuccessfulEventAt *time.Time `json:"last_successful_event_at,omitempty"`
	LastFailureAt         *time.Time `json:"last_failure_at,omitempty"`
	LastFailureCode       string     `json:"last_failure_code,omitempty"`
}

type commandRunDiagnosticState struct {
	mu       sync.RWMutex
	snapshot CommandRunDiagnostics
}

func newCommandRunDiagnosticState(config CommandRunRuntimeConfig, capabilities CommandRunTransportCapabilities, local bool) *commandRunDiagnosticState {
	status := CommandRunDiagnosticNotStarted
	if !config.Enabled {
		status = CommandRunDiagnosticDisabled
	}
	role := config.Role.String()
	if !config.Enabled {
		role = "disabled"
	}
	return &commandRunDiagnosticState{snapshot: CommandRunDiagnostics{
		Enabled: config.Enabled, Role: role, Status: status,
		Local: local, Transport: capabilities.Name, Capabilities: capabilities,
	}}
}

func (s *commandRunDiagnosticState) lifecycle(started, ready, closed bool) {
	if s == nil {
		return
	}
	s.mu.Lock()
	s.snapshot.Started = started
	s.snapshot.Ready = ready
	s.snapshot.Closed = closed
	s.snapshot.Status = commandRunDiagnosticStatusFor(s.snapshot)
	s.mu.Unlock()
}

func (s *commandRunDiagnosticState) projected(at time.Time) {
	if s == nil {
		return
	}
	if at.IsZero() {
		at = time.Now().UTC()
	} else {
		at = at.UTC()
	}
	s.mu.Lock()
	s.snapshot.ProjectionCount++
	s.snapshot.LastSuccessfulEventAt = cloneDiagnosticTime(at)
	s.mu.Unlock()
}

func (s *commandRunDiagnosticState) projectionFailed() {
	if s == nil {
		return
	}
	s.mu.Lock()
	s.snapshot.ProjectionFailures++
	s.recordFailureLocked("projection_failed")
	s.mu.Unlock()
}

func (s *commandRunDiagnosticState) record(err error) {
	if s == nil || err == nil {
		return
	}
	s.mu.Lock()
	switch {
	case errors.Is(err, ErrCommandRunDeliveryDropped), errors.Is(err, ErrCommandRunTransportBackpressure):
		s.snapshot.DroppedEvents++
		s.recordFailureLocked("delivery_dropped")
	case errors.Is(err, ErrCommandRunPublishFailed):
		s.snapshot.PublishFailures++
		s.recordFailureLocked("publish_failed")
	case errors.Is(err, ErrCommandRunSubscriptionFailed):
		s.snapshot.SubscriptionFailures++
		s.recordFailureLocked("subscription_failed")
	case errors.Is(err, ErrCommandRunEnvelopeRejected), errors.Is(err, ErrInvalidCommandRunUpdate):
		s.snapshot.RejectedEvents++
		s.recordFailureLocked("envelope_rejected")
	case errors.Is(err, ErrCommandRunScopeRejected), errors.Is(err, ErrInvalidCommandRunSelector):
		s.snapshot.RejectedEvents++
		s.recordFailureLocked("scope_rejected")
	default:
		s.snapshot.OtherFailures++
		s.recordFailureLocked("other_failure")
	}
	s.snapshot.Status = commandRunDiagnosticStatusFor(s.snapshot)
	s.mu.Unlock()
}

func (s *commandRunDiagnosticState) recordFailureLocked(code string) {
	now := time.Now().UTC()
	s.snapshot.LastFailureAt = &now
	s.snapshot.LastFailureCode = code
}

func (s *commandRunDiagnosticState) clone() CommandRunDiagnostics {
	if s == nil {
		return CommandRunDiagnostics{}
	}
	s.mu.RLock()
	snapshot := s.snapshot
	s.mu.RUnlock()
	snapshot.LastSuccessfulEventAt = cloneDiagnosticTimePointer(snapshot.LastSuccessfulEventAt)
	snapshot.LastFailureAt = cloneDiagnosticTimePointer(snapshot.LastFailureAt)
	snapshot.Status = commandRunDiagnosticStatusFor(snapshot)
	return snapshot
}

func cloneDiagnosticTime(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	cloned := value
	return &cloned
}

func cloneDiagnosticTimePointer(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	return cloneDiagnosticTime(*value)
}

func commandRunDiagnosticStatusFor(snapshot CommandRunDiagnostics) CommandRunDiagnosticStatus {
	switch {
	case !snapshot.Enabled:
		return CommandRunDiagnosticDisabled
	case snapshot.Closed:
		return CommandRunDiagnosticClosed
	case snapshot.SubscriptionFailures > 0 || snapshot.PublishFailures > 0 || snapshot.RejectedEvents > 0 ||
		snapshot.DroppedEvents > 0 || snapshot.ProjectionFailures > 0 || snapshot.OtherFailures > 0:
		return CommandRunDiagnosticDegraded
	case snapshot.Ready:
		return CommandRunDiagnosticReady
	default:
		return CommandRunDiagnosticNotStarted
	}
}

// Diagnostics returns an isolated, provider-neutral runtime snapshot.
func (r *CommandRunRuntime) Diagnostics() CommandRunDiagnostics {
	if r == nil || r.diagnostics == nil {
		return CommandRunDiagnostics{}
	}
	return r.diagnostics.clone()
}

func commandRunDoctorCheck() DoctorCheck {
	return DoctorCheck{
		ID:          commandRunDoctorCheckID,
		Label:       "Command Runs",
		Description: "Checks live command-run transport readiness and bounded failure counters.",
		Help:        "Local transport is intentionally ephemeral. Remote transport warnings identify readiness, delivery, or projection degradation without exposing payloads, tenant identifiers, credentials, or provider causes.",
		Action: NewManualDoctorAction(
			"Verify the configured process role, start host-owned remote drivers before the runtime, and inspect transport connectivity.",
			"Review command-run wiring",
		),
		Run: func(_ context.Context, adm *Admin) DoctorCheckOutput {
			if adm == nil || adm.CommandRunRuntime() == nil {
				return DoctorCheckOutput{Summary: "Command Runs runtime is not configured", Metadata: map[string]any{"enabled": false}}
			}
			diagnostics := adm.CommandRunRuntime().Diagnostics()
			findings := commandRunDoctorFindings(diagnostics)
			return DoctorCheckOutput{
				Findings: findings,
				Metadata: commandRunDoctorMetadata(diagnostics),
			}
		},
	}
}

func commandRunDoctorFindings(diagnostics CommandRunDiagnostics) []DoctorFinding {
	findings := []DoctorFinding{}
	if !diagnostics.Enabled {
		return findings
	}
	if diagnostics.Local {
		findings = append(findings, DoctorFinding{
			Severity: DoctorSeverityInfo, Component: "command_runs", Code: "command_runs.local_ephemeral",
			Message: "Command Runs uses the intentional in-process ephemeral transport",
			Hint:    "Configure a remote fanout transport only when command execution and web gateways run in separate processes",
		})
	} else if !diagnostics.Ready || diagnostics.Status == CommandRunDiagnosticNotStarted {
		findings = append(findings, DoctorFinding{
			Severity: DoctorSeverityWarn, Component: "command_runs", Code: "command_runs.not_ready",
			Message: "Remote Command Runs transport is not ready",
			Hint:    "Start host-owned transport drivers before starting the command-run runtime",
		})
	}
	for _, failure := range []struct {
		count   uint64
		code    string
		message string
		hint    string
	}{
		{diagnostics.SubscriptionFailures, "command_runs.subscription_failed", "Command Runs subscription failures were reported", "Inspect remote transport connectivity and gateway subscription lifecycle"},
		{diagnostics.PublishFailures, "command_runs.publish_failed", "Command Runs publish failures were reported", "Inspect worker transport connectivity and bounded publish timeouts"},
		{diagnostics.RejectedEvents, "command_runs.events_rejected", "Command Runs events were rejected at a trust boundary", "Verify schema versions and application/environment scope configuration"},
		{diagnostics.DroppedEvents, "command_runs.events_dropped", "Command Runs events were dropped by bounded delivery", "Inspect transport capacity and publish timeout settings"},
		{diagnostics.ProjectionFailures, "command_runs.projection_failed", "Command Runs projection failures were reported", "Inspect the configured command-run store and projection callback"},
		{diagnostics.OtherFailures, "command_runs.other_failure", "Command Runs reported an unclassified safe failure", "Inspect command-run runtime wiring and application error hooks"},
	} {
		if failure.count == 0 {
			continue
		}
		findings = append(findings, DoctorFinding{
			Severity: DoctorSeverityWarn, Component: "command_runs", Code: failure.code,
			Message: failure.message, Hint: failure.hint,
			Metadata: map[string]any{"count": failure.count},
		})
	}
	return findings
}

func commandRunDoctorMetadata(diagnostics CommandRunDiagnostics) map[string]any {
	return map[string]any{
		"enabled":                  diagnostics.Enabled,
		"role":                     diagnostics.Role,
		"status":                   diagnostics.Status,
		"ready":                    diagnostics.Ready,
		"local":                    diagnostics.Local,
		"transport":                diagnostics.Transport,
		"fanout":                   diagnostics.Capabilities.Fanout,
		"durability":               diagnostics.Capabilities.Durability,
		"replay":                   diagnostics.Capabilities.Replay,
		"publish_failures":         diagnostics.PublishFailures,
		"subscription_failures":    diagnostics.SubscriptionFailures,
		"rejected_events":          diagnostics.RejectedEvents,
		"dropped_events":           diagnostics.DroppedEvents,
		"projection_failures":      diagnostics.ProjectionFailures,
		"projection_count":         diagnostics.ProjectionCount,
		"other_failures":           diagnostics.OtherFailures,
		"last_successful_event_at": diagnostics.LastSuccessfulEventAt,
		"last_failure_at":          diagnostics.LastFailureAt,
		"last_failure_code":        diagnostics.LastFailureCode,
	}
}
