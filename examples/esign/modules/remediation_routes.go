package modules

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/commands"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	gocommand "github.com/goliatone/go-command"
	goerrors "github.com/goliatone/go-errors"
	jobqueue "github.com/goliatone/go-job/queue"
)

type remediationCommandTrigger struct {
	bus          *coreadmin.CommandBus
	defaultScope stores.Scope
	dispatches   stores.RemediationDispatchStore
	now          func() time.Time
}

func newRemediationCommandTrigger(bus *coreadmin.CommandBus, defaultScope stores.Scope, dispatches stores.RemediationDispatchStore) handlers.RemediationTrigger {
	if bus == nil || dispatches == nil {
		return nil
	}
	return &remediationCommandTrigger{
		bus:          bus,
		defaultScope: defaultScope,
		dispatches:   dispatches,
		now: func() time.Time {
			return time.Now().UTC()
		},
	}
}

func (t *remediationCommandTrigger) TriggerRemediation(ctx context.Context, input handlers.RemediationTriggerInput) (handlers.RemediationDispatchReceipt, error) {
	if t == nil || t.bus == nil {
		return handlers.RemediationDispatchReceipt{}, fmt.Errorf("remediation command bus is not configured")
	}
	startedAt := time.Now()
	scope := normalizeRemediationScope(input.Scope, t.defaultScope)
	if strings.TrimSpace(scope.TenantID) == "" || strings.TrimSpace(scope.OrgID) == "" {
		return handlers.RemediationDispatchReceipt{}, fmt.Errorf("tenant_id and org_id are required")
	}
	documentID := strings.TrimSpace(input.DocumentID)
	if documentID == "" {
		return handlers.RemediationDispatchReceipt{}, fmt.Errorf("document_id is required")
	}
	mode, err := resolveRemediationDispatchMode(t.bus, strings.TrimSpace(input.ModeOverride))
	if err != nil {
		return handlers.RemediationDispatchReceipt{}, err
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	cacheKey := remediationIdempotencyKey(scope, documentID, idempotencyKey, string(mode))
	if cacheKey != "" {
		record, err := t.dispatches.GetRemediationDispatchByIdempotencyKey(ctx, scope, cacheKey)
		if err == nil {
			receipt := remediationDispatchReceiptFromRecord(record)
			observability.ObserveRemediationDuplicateSuppressed(ctx)
			observability.ObserveCommandDispatch(ctx, commands.CommandPDFRemediate, receipt.Mode, receipt.Accepted, 0)
			observability.LogOperation(ctx, slog.LevelInfo, "command_dispatch", "pdf_remediate", "duplicate", strings.TrimSpace(receipt.CorrelationID), time.Since(startedAt), nil, map[string]any{
				"command_id":      commands.CommandPDFRemediate,
				"dispatch_id":     strings.TrimSpace(receipt.DispatchID),
				"execution_mode":  strings.TrimSpace(receipt.Mode),
				"accepted":        receipt.Accepted,
				"document_id":     documentID,
				"idempotency_key": idempotencyKey != "",
			})
			return receipt, nil
		}
		if !isNotFoundStoreError(err) {
			return handlers.RemediationDispatchReceipt{}, fmt.Errorf("lookup remediation dispatch idempotency key: %w", err)
		}
	}
	now := time.Now().UTC()
	if t.now != nil {
		now = t.now().UTC()
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = fmt.Sprintf("pdf-remediation-%d", now.UnixNano())
	}
	payload := map[string]any{
		"tenant_id":      strings.TrimSpace(scope.TenantID),
		"org_id":         strings.TrimSpace(scope.OrgID),
		"document_id":    documentID,
		"actor_id":       strings.TrimSpace(input.ActorID),
		"correlation_id": correlationID,
		"command_id":     commands.CommandPDFRemediate,
		"execution_mode": strings.TrimSpace(string(mode)),
		"requested_at":   now.UTC().Format(time.RFC3339Nano),
	}
	receipt, err := t.bus.DispatchByNameWithOptions(ctx, commands.CommandPDFRemediate, payload, nil, gocommand.DispatchOptions{
		Mode:           mode,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
		Metadata: map[string]any{
			"command_id":     commands.CommandPDFRemediate,
			"execution_mode": strings.TrimSpace(string(mode)),
			"correlation_id": correlationID,
			"document_id":    documentID,
		},
	})
	if err != nil {
		reason := classifyRemediationDispatchError(err)
		observability.ObserveCommandDispatchRejected(ctx, commands.CommandPDFRemediate, string(mode), reason)
		if reason == "dedup_store_missing" {
			observability.ObserveDedupStoreMiss(ctx, commands.CommandPDFRemediate)
		}
		observability.LogOperation(ctx, slog.LevelWarn, "command_dispatch", "pdf_remediate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_id":      commands.CommandPDFRemediate,
			"execution_mode":  strings.TrimSpace(string(mode)),
			"dispatch_id":     "",
			"document_id":     documentID,
			"idempotency_key": idempotencyKey != "",
			"reason":          reason,
		})
		return handlers.RemediationDispatchReceipt{}, err
	}
	out := handlers.RemediationDispatchReceipt{
		Accepted:      receipt.Accepted,
		Mode:          firstNonEmpty(strings.TrimSpace(string(receipt.Mode)), strings.TrimSpace(string(mode))),
		CommandID:     firstNonEmpty(strings.TrimSpace(receipt.CommandID), commands.CommandPDFRemediate),
		DispatchID:    strings.TrimSpace(receipt.DispatchID),
		CorrelationID: firstNonEmpty(strings.TrimSpace(receipt.CorrelationID), correlationID),
		EnqueuedAt:    cloneRemediationTimePtr(receipt.EnqueuedAt),
	}
	if strings.TrimSpace(out.DispatchID) == "" {
		out.DispatchID = fmt.Sprintf("inline-%d", now.UnixNano())
	}
	observability.ObserveCommandDispatch(ctx, commands.CommandPDFRemediate, out.Mode, out.Accepted, time.Since(startedAt))
	if !out.Accepted {
		observability.ObserveCommandDispatchRejected(ctx, commands.CommandPDFRemediate, out.Mode, "not_accepted")
	}
	outcome := "accepted"
	level := slog.LevelInfo
	if !out.Accepted {
		outcome = "rejected"
		level = slog.LevelWarn
	}
	observability.LogOperation(ctx, level, "command_dispatch", "pdf_remediate", outcome, out.CorrelationID, time.Since(startedAt), nil, map[string]any{
		"command_id":      commands.CommandPDFRemediate,
		"dispatch_id":     strings.TrimSpace(out.DispatchID),
		"execution_mode":  strings.TrimSpace(out.Mode),
		"accepted":        out.Accepted,
		"document_id":     documentID,
		"idempotency_key": idempotencyKey != "",
		"enqueued_at":     formatRemediationTimestamp(out.EnqueuedAt),
	})
	if _, err := t.dispatches.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
		DispatchID:     strings.TrimSpace(out.DispatchID),
		DocumentID:     documentID,
		IdempotencyKey: cacheKey,
		Mode:           strings.TrimSpace(out.Mode),
		CommandID:      strings.TrimSpace(out.CommandID),
		CorrelationID:  strings.TrimSpace(out.CorrelationID),
		Accepted:       out.Accepted,
		EnqueuedAt:     cloneRemediationTimePtr(out.EnqueuedAt),
		UpdatedAt:      now,
	}); err != nil {
		return handlers.RemediationDispatchReceipt{}, fmt.Errorf("persist remediation dispatch: %w", err)
	}
	return out, nil
}

func resolveRemediationDispatchMode(bus *coreadmin.CommandBus, override string) (gocommand.ExecutionMode, error) {
	override = strings.TrimSpace(strings.ToLower(override))
	if override != "" {
		mode, err := gocommand.ParseExecutionMode(override)
		if err != nil {
			return "", err
		}
		return mode, nil
	}
	if bus == nil {
		return gocommand.ExecutionModeInline, nil
	}
	policy := bus.ExecutionPolicy()
	if mode, ok := policy.Resolve(commands.CommandPDFRemediate); ok {
		mode = gocommand.NormalizeExecutionMode(mode)
		if mode != "" {
			if err := gocommand.ValidateExecutionMode(mode); err == nil {
				return mode, nil
			}
		}
	}
	mode := gocommand.NormalizeExecutionMode(policy.DefaultMode)
	if mode == "" {
		mode = gocommand.ExecutionModeInline
	}
	if err := gocommand.ValidateExecutionMode(mode); err != nil {
		return gocommand.ExecutionModeInline, nil
	}
	return mode, nil
}

func normalizeRemediationScope(input, fallback stores.Scope) stores.Scope {
	scope := stores.Scope{
		TenantID: strings.TrimSpace(input.TenantID),
		OrgID:    strings.TrimSpace(input.OrgID),
	}
	if scope.TenantID == "" {
		scope.TenantID = strings.TrimSpace(fallback.TenantID)
	}
	if scope.OrgID == "" {
		scope.OrgID = strings.TrimSpace(fallback.OrgID)
	}
	return scope
}

func remediationIdempotencyKey(scope stores.Scope, documentID, idempotencyKey, mode string) string {
	documentID = strings.TrimSpace(documentID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	mode = strings.TrimSpace(strings.ToLower(mode))
	if idempotencyKey == "" || documentID == "" {
		return ""
	}
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		documentID,
		mode,
		idempotencyKey,
	}, "|")
}

type remediationDispatchStatusLookup struct {
	documents   stores.DocumentStore
	dispatches  stores.RemediationDispatchStore
	queueStatus jobqueue.DispatchStatusReader
	now         func() time.Time
	transitions *remediationDispatchTransitionTracker
}

func newRemediationDispatchStatusLookup(
	documents stores.DocumentStore,
	dispatches stores.RemediationDispatchStore,
	queueStatus jobqueue.DispatchStatusReader,
) handlers.RemediationDispatchStatusLookup {
	if documents == nil || dispatches == nil {
		return nil
	}
	return remediationDispatchStatusLookup{
		documents:   documents,
		dispatches:  dispatches,
		queueStatus: queueStatus,
		transitions: newRemediationDispatchTransitionTracker(),
		now: func() time.Time {
			return time.Now().UTC()
		},
	}
}

func (l remediationDispatchStatusLookup) LookupRemediationDispatchStatus(ctx context.Context, dispatchID string) (handlers.RemediationDispatchStatus, error) {
	dispatchID = strings.TrimSpace(dispatchID)
	if dispatchID == "" {
		return handlers.RemediationDispatchStatus{}, fmt.Errorf("dispatch_id is required")
	}
	entry, err := l.dispatches.GetRemediationDispatch(ctx, dispatchID)
	if err != nil {
		return handlers.RemediationDispatchStatus{}, fmt.Errorf("dispatch_id %q not found", dispatchID)
	}
	scope := stores.Scope{
		TenantID: strings.TrimSpace(entry.TenantID),
		OrgID:    strings.TrimSpace(entry.OrgID),
	}
	status := handlers.RemediationDispatchStatus{
		DispatchID:  dispatchID,
		Status:      "accepted",
		TenantID:    scope.TenantID,
		OrgID:       scope.OrgID,
		EnqueuedAt:  cloneRemediationTimePtr(entry.EnqueuedAt),
		UpdatedAt:   cloneRemediationTimePtr(entry.EnqueuedAt),
		MaxAttempts: entry.MaxAttempts,
	}
	if l.queueStatus != nil {
		if queueStatus, err := l.queueStatus.GetDispatchStatus(ctx, dispatchID); err == nil {
			mergeQueueDispatchStatus(&status, queueStatus)
		}
	}
	documentID := strings.TrimSpace(entry.DocumentID)
	if documentID != "" && l.documents != nil {
		record, err := l.documents.Get(ctx, scope, documentID)
		if err == nil && strings.TrimSpace(record.RemediationDispatchID) == dispatchID {
			mergeDocumentRemediationStatus(&status, record)
		}
	}
	status.Status = normalizeRemediationStatusValue(status.Status)
	if status.Attempt > status.MaxAttempts {
		status.MaxAttempts = status.Attempt
	}
	if status.MaxAttempts > entry.MaxAttempts {
		entry.MaxAttempts = status.MaxAttempts
		entry.UpdatedAt = time.Now().UTC()
		if l.now != nil {
			entry.UpdatedAt = l.now().UTC()
		}
		if _, err := l.dispatches.SaveRemediationDispatch(ctx, scope, entry); err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "remediation_dispatch", "status_lookup", "persist_error", strings.TrimSpace(entry.CorrelationID), 0, err, map[string]any{
				"dispatch_id":  dispatchID,
				"max_attempts": status.MaxAttempts,
			})
		}
	}
	if status.UpdatedAt == nil {
		now := time.Now().UTC()
		if l.now != nil {
			now = l.now().UTC()
		}
		status.UpdatedAt = &now
	}
	if l.transitions != nil {
		l.transitions.observe(ctx, dispatchID, status.Status)
	}
	return status, nil
}

func mergeQueueDispatchStatus(out *handlers.RemediationDispatchStatus, queueStatus jobqueue.DispatchStatus) {
	if out == nil {
		return
	}
	state := normalizeRemediationStatusValue(string(queueStatus.State))
	if state != "" {
		out.Status = state
	}
	out.Attempt = queueStatus.Attempt
	if out.Attempt > out.MaxAttempts {
		out.MaxAttempts = out.Attempt
	}
	out.NextRunAt = cloneRemediationTimePtr(queueStatus.NextRunAt)
	out.EnqueuedAt = firstRemediationTimePtr(out.EnqueuedAt, cloneRemediationTimePtr(queueStatus.EnqueuedAt))
	out.UpdatedAt = firstRemediationTimePtr(out.UpdatedAt, cloneRemediationTimePtr(queueStatus.UpdatedAt))
	if reason := strings.TrimSpace(queueStatus.TerminalReason); reason != "" {
		out.TerminalReason = reason
	}
}

func mergeDocumentRemediationStatus(out *handlers.RemediationDispatchStatus, record stores.DocumentRecord) {
	if out == nil {
		return
	}
	documentStatus := mapDocumentRemediationStatus(record.RemediationStatus)
	currentStatus := normalizeRemediationStatusValue(out.Status)
	if currentStatus != "retrying" && currentStatus != "dead_letter" && documentStatus != "" {
		out.Status = documentStatus
	}
	out.EnqueuedAt = firstRemediationTimePtr(out.EnqueuedAt, cloneRemediationTimePtr(record.RemediationRequestedAt))
	out.StartedAt = firstRemediationTimePtr(out.StartedAt, cloneRemediationTimePtr(record.RemediationStartedAt))
	out.CompletedAt = firstRemediationTimePtr(out.CompletedAt, cloneRemediationTimePtr(record.RemediationCompletedAt))
	updatedAt := record.UpdatedAt.UTC()
	out.UpdatedAt = &updatedAt
	failureReason := strings.TrimSpace(record.RemediationFailure)
	if failureReason != "" {
		out.TerminalReason = failureReason
	}
}

func mapDocumentRemediationStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "requested", "accepted":
		return "accepted"
	case "started", "running":
		return "running"
	case "retrying":
		return "retrying"
	case "succeeded", "success":
		return "succeeded"
	case "failed":
		return "failed"
	case "canceled", "cancelled":
		return "canceled"
	case "dead_letter", "deadletter":
		return "dead_letter"
	default:
		return ""
	}
}

func normalizeRemediationStatusValue(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "accepted", "requested":
		return "accepted"
	case "running", "started":
		return "running"
	case "retrying":
		return "retrying"
	case "succeeded", "success", "completed":
		return "succeeded"
	case "failed", "error":
		return "failed"
	case "canceled", "cancelled":
		return "canceled"
	case "dead_letter", "deadletter":
		return "dead_letter"
	default:
		return "accepted"
	}
}

func cloneRemediationTimePtr(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	cp := value.UTC()
	return &cp
}

func firstRemediationTimePtr(values ...*time.Time) *time.Time {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func remediationDispatchReceiptFromRecord(record stores.RemediationDispatchRecord) handlers.RemediationDispatchReceipt {
	return handlers.RemediationDispatchReceipt{
		Accepted:      record.Accepted,
		Mode:          strings.TrimSpace(record.Mode),
		CommandID:     strings.TrimSpace(record.CommandID),
		DispatchID:    strings.TrimSpace(record.DispatchID),
		CorrelationID: strings.TrimSpace(record.CorrelationID),
		EnqueuedAt:    cloneRemediationTimePtr(record.EnqueuedAt),
	}
}

func isNotFoundStoreError(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) && coded != nil {
		return coded.Category == goerrors.CategoryNotFound || strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND")
	}
	return false
}

func classifyRemediationDispatchError(err error) string {
	if err == nil {
		return ""
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) && coded != nil {
		code := strings.TrimSpace(strings.ToLower(coded.TextCode))
		if code != "" {
			if strings.Contains(code, "dedup") && strings.Contains(code, "store") {
				return "dedup_store_missing"
			}
			return normalizeMetricKey(code)
		}
	}
	msg := strings.TrimSpace(strings.ToLower(err.Error()))
	if strings.Contains(msg, "dedup") && strings.Contains(msg, "store") {
		return "dedup_store_missing"
	}
	return "dispatch_failed"
}

func normalizeMetricKey(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return "unknown"
	}
	value = strings.ReplaceAll(value, " ", "_")
	value = strings.ReplaceAll(value, ",", "_")
	value = strings.ReplaceAll(value, "=", "_")
	return value
}

func formatRemediationTimestamp(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

type remediationDispatchTransitionTracker struct {
	mu         sync.Mutex
	byDispatch map[string]string
}

func newRemediationDispatchTransitionTracker() *remediationDispatchTransitionTracker {
	return &remediationDispatchTransitionTracker{
		byDispatch: map[string]string{},
	}
}

func (t *remediationDispatchTransitionTracker) observe(ctx context.Context, dispatchID, status string) {
	if t == nil {
		return
	}
	dispatchID = strings.TrimSpace(dispatchID)
	status = normalizeRemediationStatusValue(status)
	if dispatchID == "" || status == "" {
		return
	}

	t.mu.Lock()
	prev := strings.TrimSpace(t.byDispatch[dispatchID])
	if prev == status {
		t.mu.Unlock()
		return
	}
	t.byDispatch[dispatchID] = status
	t.mu.Unlock()

	switch status {
	case "retrying", "canceled", "dead_letter":
		observability.ObserveRemediationDispatchStateTransition(ctx, status)
	}
}
