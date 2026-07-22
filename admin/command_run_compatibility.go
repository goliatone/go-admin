package admin

import (
	"context"
	"strings"
	"time"
)

func commandStatusEventFromCommandRunRecord(record CommandRunRecord) CommandStatusEvent {
	status := CommandStatusEvent{
		RunID:         record.RunID,
		Revision:      record.Revision,
		CorrelationID: record.CorrelationID,
		DispatchID:    record.DispatchID,
		CommandID:     record.CommandID,
		State:         commandStatusStateFromPhase(record.Phase),
		Mode:          record.Mode,
		Message:       record.Message,
		At:            record.OccurredAt.UTC().Format(time.RFC3339Nano),
	}
	if record.Failure != nil {
		status.Code = record.Failure.Code
	}
	return status
}

func commandStatusStateFromPhase(phase CommandRunPhase) string {
	switch phase {
	case CommandRunPhaseSubmitted:
		return "accepted"
	case CommandRunPhaseStarted, CommandRunPhaseCheckpoint, CommandRunPhaseProgress:
		return "running"
	case CommandRunPhaseSucceeded:
		return "completed"
	case CommandRunPhaseFailed:
		return "failed"
	case CommandRunPhaseCanceled:
		return "canceled"
	case CommandRunPhaseRejected:
		return "rejected"
	default:
		return ""
	}
}

func commandRunPhaseFromStatus(state string) (CommandRunPhase, bool) {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case "submitting", "submitted", "accepted":
		return CommandRunPhaseSubmitted, true
	case "started", "running":
		return CommandRunPhaseStarted, true
	case "checkpoint":
		return CommandRunPhaseCheckpoint, true
	case "progress":
		return CommandRunPhaseProgress, true
	case "completed", "succeeded", "success":
		return CommandRunPhaseSucceeded, true
	case "failed", "failure":
		return CommandRunPhaseFailed, true
	case "canceled", "cancelled":
		return CommandRunPhaseCanceled, true
	case "rejected":
		return CommandRunPhaseRejected, true
	default:
		return "", false
	}
}

func (r *CommandRunRuntime) setLauncherCompatibility(enabled bool) {
	if r == nil {
		return
	}
	r.mu.Lock()
	r.launcherCompatibility = enabled
	r.mu.Unlock()
}

func (r *CommandRunRuntime) hasActiveLauncherCompatibility() bool {
	if r == nil {
		return false
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.started && !r.closed && r.config.Role.Has(CommandRunRoleGateway) && r.launcherCompatibility
}

func (a *Admin) commandRunLifecycleAuthoritative() bool {
	if a == nil {
		return false
	}
	runtime := a.CommandRunRuntime()
	if runtime == nil {
		return false
	}
	runtime.mu.Lock()
	defer runtime.mu.Unlock()
	return runtime.started && !runtime.closed && runtime.config.Role.Has(CommandRunRoleMonolith) && runtime.observer != nil
}

func (r *CommandRunRuntime) publishCompatibilityStatus(ctx context.Context, event CommandStatusEvent) bool {
	if r == nil {
		return false
	}
	r.mu.Lock()
	started := r.started && !r.closed && r.config.Role.Has(CommandRunRolePublisher)
	publisher := r.publisher
	observer := r.observer
	store := r.store
	config := r.config
	r.mu.Unlock()
	if !started || publisher == nil || observer == nil {
		return false
	}
	phase, ok := commandRunPhaseFromStatus(event.State)
	if !ok {
		return false
	}
	if ctx == nil {
		ctx = context.Background()
	}
	ctx = context.WithoutCancel(ctx)

	runID := strings.TrimSpace(event.RunID)
	commandID := strings.TrimSpace(event.CommandID)
	scope := CommandRunScope{ApplicationID: config.ApplicationID, EnvironmentID: config.EnvironmentID}
	minimumRevision := event.Revision
	if store != nil {
		if rows, err := store.List(ctx, CommandRunSelector{Global: true}); err == nil {
			for _, record := range rows {
				identityMatches := runID != "" && record.RunID == runID
				if !identityMatches && event.DispatchID != "" {
					identityMatches = record.DispatchID == strings.TrimSpace(event.DispatchID)
				}
				if !identityMatches && event.CorrelationID != "" {
					identityMatches = record.CorrelationID == strings.TrimSpace(event.CorrelationID)
				}
				if !identityMatches {
					continue
				}
				runID = record.RunID
				if commandID == "" {
					commandID = record.CommandID
				}
				scope = record.Scope
				if record.Revision > minimumRevision {
					minimumRevision = record.Revision
				}
				break
			}
		}
	}
	if runID == "" {
		runID = strings.TrimSpace(event.DispatchID)
	}
	if runID == "" {
		runID = strings.TrimSpace(event.CorrelationID)
	}
	if runID == "" || commandID == "" {
		return false
	}
	occurredAt := time.Now().UTC()
	if parsed, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(event.At)); err == nil {
		occurredAt = parsed.UTC()
	}
	revision := observer.nextRevisionAfter(runID, minimumRevision)
	update := CommandRunUpdate{
		SchemaVersion: CommandRunSchemaVersion,
		EventID:       commandRunEventID(runID, revision, phase, occurredAt),
		RunID:         runID,
		Revision:      revision,
		CommandID:     commandID,
		DispatchID:    strings.TrimSpace(event.DispatchID),
		CorrelationID: strings.TrimSpace(event.CorrelationID),
		Phase:         phase,
		OccurredAt:    occurredAt,
		Mode:          strings.TrimSpace(event.Mode),
		Message:       strings.TrimSpace(event.Message),
		Scope:         scope,
	}
	if phase == CommandRunPhaseFailed || phase == CommandRunPhaseRejected {
		update.Failure = &CommandRunFailure{Category: "command", Code: strings.TrimSpace(event.Code)}
	}
	resolved, err := observer.resolveScope(ctx, update)
	if err != nil {
		observer.reportError(err)
		return false
	}
	update.Scope = resolved
	update, err = NormalizeCommandRunUpdate(update, config.ContractLimits)
	if err != nil {
		observer.reportError(err)
		return false
	}
	publishCtx, cancel := context.WithTimeout(ctx, config.PublishTimeout)
	defer cancel()
	if err := publisher.PublishCommandRun(publishCtx, update); err != nil {
		observer.reportError(err)
		return false
	}
	return true
}
