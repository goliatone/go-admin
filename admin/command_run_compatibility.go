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
	started, publisher, observer, store, config := r.compatibilityDependencies()
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

	runID, commandID, scope, minimumRevision := resolveCompatibilityStatusIdentity(ctx, store, config, event)
	if runID == "" {
		runID = strings.TrimSpace(event.DispatchID)
	}
	if runID == "" {
		runID = strings.TrimSpace(event.CorrelationID)
	}
	if runID == "" || commandID == "" {
		return false
	}
	occurredAt := compatibilityStatusOccurredAt(event.At)
	revision := observer.nextRevisionAfter(runID, minimumRevision)
	update := compatibilityStatusUpdate(event, runID, commandID, phase, occurredAt, revision, scope)
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

func (r *CommandRunRuntime) compatibilityDependencies() (
	bool,
	CommandRunPublisher,
	*CommandRunObserverBridge,
	CommandRunStore,
	CommandRunRuntimeConfig,
) {
	if r == nil {
		return false, nil, nil, nil, CommandRunRuntimeConfig{}
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	started := r.started && !r.closed && r.config.Role.Has(CommandRunRolePublisher)
	return started, r.publisher, r.observer, r.store, r.config
}

func resolveCompatibilityStatusIdentity(
	ctx context.Context,
	store CommandRunStore,
	config CommandRunRuntimeConfig,
	event CommandStatusEvent,
) (string, string, CommandRunScope, uint64) {
	runID := strings.TrimSpace(event.RunID)
	commandID := strings.TrimSpace(event.CommandID)
	scope := CommandRunScope{ApplicationID: config.ApplicationID, EnvironmentID: config.EnvironmentID}
	minimumRevision := event.Revision
	if store == nil {
		return runID, commandID, scope, minimumRevision
	}
	rows, err := store.List(ctx, CommandRunSelector{Global: true})
	if err != nil {
		return runID, commandID, scope, minimumRevision
	}
	for _, record := range rows {
		if !commandRunRecordMatchesStatus(record, event, runID) {
			continue
		}
		runID = record.RunID
		if commandID == "" {
			commandID = record.CommandID
		}
		scope = record.Scope
		minimumRevision = max(minimumRevision, record.Revision)
		break
	}
	return runID, commandID, scope, minimumRevision
}

func commandRunRecordMatchesStatus(record CommandRunRecord, event CommandStatusEvent, runID string) bool {
	if runID != "" && record.RunID == runID {
		return true
	}
	if dispatchID := strings.TrimSpace(event.DispatchID); dispatchID != "" && record.DispatchID == dispatchID {
		return true
	}
	correlationID := strings.TrimSpace(event.CorrelationID)
	return correlationID != "" && record.CorrelationID == correlationID
}

func compatibilityStatusOccurredAt(value string) time.Time {
	if parsed, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(value)); err == nil {
		return parsed.UTC()
	}
	return time.Now().UTC()
}

func compatibilityStatusUpdate(
	event CommandStatusEvent,
	runID string,
	commandID string,
	phase CommandRunPhase,
	occurredAt time.Time,
	revision uint64,
	scope CommandRunScope,
) CommandRunUpdate {
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
	return update
}
