package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"time"

	gocommand "github.com/goliatone/go-command"
	"github.com/goliatone/go-notifications/pkg/privacy"
	"github.com/goliatone/go-notifications/pkg/retention"
	notifstorage "github.com/goliatone/go-notifications/pkg/storage"
)

// NotificationRetentionPurgeCommandName is the stable public retention command identity.
const NotificationRetentionPurgeCommandName = "notifications.retention.purge"

// NotificationRetentionPurgeMsg carries one confirmed, trusted-scope purge request.
type NotificationRetentionPurgeMsg struct {
	retention.Request
	Confirm bool   `json:"confirm"`
	Scope   string `json:"-"`
	ActorID string `json:"-"`
}

func (NotificationRetentionPurgeMsg) Type() string { return NotificationRetentionPurgeCommandName }

func (m NotificationRetentionPurgeMsg) Validate() error {
	if err := m.validateEnvelope(); err != nil {
		return err
	}
	return m.validateRequest()
}

func (m NotificationRetentionPurgeMsg) validateEnvelope() error {
	if !m.Confirm {
		return validationDomainError("notification retention purge confirmation required", map[string]any{
			"component": "notifications", "field": "confirm",
		})
	}
	if strings.TrimSpace(m.Scope) != "system" {
		return validationDomainError("notification retention purge requires trusted system scope", map[string]any{
			"component": "notifications", "scope": strings.TrimSpace(m.Scope),
		})
	}
	return nil
}

func (m NotificationRetentionPurgeMsg) validateRequest() error {
	if err := m.Request.Validate(); err != nil {
		return validationDomainError("invalid notification retention request", map[string]any{
			"component": "notifications", "field": "retention_request",
		})
	}
	return nil
}

// NotificationRetentionPurgeCommand delegates one bounded pass to the
// configured application service and records only aggregate operational data.
type NotificationRetentionPurgeCommand struct {
	observersMu sync.RWMutex
	Service     NotificationRetentionService
	Activity    ActivitySink
	Logger      Logger
	Metrics     notifstorage.MetricsCollector
}

// WithActivitySink updates the operational activity destination used by future
// purge executions. It is safe to call while commands are being dispatched.
func (c *NotificationRetentionPurgeCommand) WithActivitySink(sink ActivitySink) {
	if c == nil || isNilNotificationDependency(sink) {
		return
	}
	c.observersMu.Lock()
	c.Activity = sink
	c.observersMu.Unlock()
}

var _ gocommand.Commander[NotificationRetentionPurgeMsg] = (*NotificationRetentionPurgeCommand)(nil)

func (c *NotificationRetentionPurgeCommand) Run(ctx context.Context, msg NotificationRetentionPurgeMsg) (retention.Result, error) {
	if c == nil || isNilNotificationDependency(c.Service) {
		return retention.Result{}, NotificationCapabilityUnavailableError{Capability: "retention"}
	}
	if err := msg.validateEnvelope(); err != nil {
		return retention.Result{}, err
	}
	if err := msg.validateRequest(); err != nil {
		c.recordRejection(ctx, msg)
		return retention.Result{}, err
	}
	started := time.Now()
	c.record(ctx, "notifications.retention.purge.attempt", retentionPurgeRequestMetadata(msg))
	result, err := c.Service.Purge(ctx, msg.Request)
	duration := time.Since(started)
	if err != nil {
		safeErr := sanitizeNotificationRetentionError(err)
		category, code := notificationSafeErrorIdentity(safeErr)
		meta := retentionPurgeRequestMetadata(msg)
		meta["duration_ms"] = duration.Milliseconds()
		meta["error_category"] = category
		meta["error_code"] = code
		c.record(ctx, "notifications.retention.purge.failed", meta)
		c.log(ctx, "notification retention purge failed", meta, true)
		c.metric("failed", false, category, code)
		return retention.Result{}, safeErr
	}
	meta := retentionPurgeResultMetadata(msg, result, duration)
	c.record(ctx, "notifications.retention.purge.completed", meta)
	c.log(ctx, "notification retention purge completed", meta, false)
	c.metric("completed", result.HasMore, "", "")
	return result, nil
}

func (c *NotificationRetentionPurgeCommand) Execute(ctx context.Context, msg NotificationRetentionPurgeMsg) error {
	result, err := c.Run(ctx, msg)
	if collector := gocommand.ResultFromContext[retention.Result](ctx); collector != nil {
		if err != nil {
			collector.StoreError(err)
		} else {
			collector.Store(result)
		}
	}
	return err
}

func registerNotificationRetentionCommand(bus *CommandBus, service NotificationRetentionService, activity ActivitySink, logger Logger, metrics notifstorage.MetricsCollector) (*NotificationRetentionPurgeCommand, error) {
	command := &NotificationRetentionPurgeCommand{Service: service, Activity: activity, Logger: logger, Metrics: metrics}
	if _, err := RegisterCommand(bus, command); err != nil {
		return nil, err
	}
	if bus != nil {
		bus.MarkCommandHandlerRegistered(NotificationRetentionPurgeCommandName)
	}
	err := RegisterContextMessageResultFactory[NotificationRetentionPurgeMsg, retention.Result](bus, NotificationRetentionPurgeCommandName,
		func(ctx context.Context, payload map[string]any, ids []string) (NotificationRetentionPurgeMsg, error) {
			msg, err := buildNotificationRetentionPurgeMsg(ctx, payload, ids)
			if err != nil && msg.validateEnvelope() == nil {
				command.recordRejection(ctx, msg)
			}
			return msg, err
		},
	)
	if err != nil {
		return nil, err
	}
	return command, nil
}

func buildNotificationRetentionPurgeMsg(ctx context.Context, payload map[string]any, _ []string) (NotificationRetentionPurgeMsg, error) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return NotificationRetentionPurgeMsg{}, validationDomainError("invalid notification retention payload", map[string]any{"component": "notifications"})
	}
	var msg NotificationRetentionPurgeMsg
	if err := json.Unmarshal(encoded, &msg); err != nil {
		return NotificationRetentionPurgeMsg{}, validationDomainError("invalid notification retention payload", map[string]any{"component": "notifications"})
	}
	msg.Scope = notificationScopeFromTrustedContext(ctx)
	msg.ActorID = actorFromContext(ctx)
	return msg, msg.Validate()
}

func notificationScopeFromTrustedContext(ctx context.Context) string {
	if NotificationSystemAuthorityFromContext(ctx) {
		return "system"
	}
	if tenantID := strings.TrimSpace(tenantIDFromContext(ctx)); tenantID != "" {
		return "tenant:" + tenantID
	}
	return ""
}

func retentionPurgeRequestMetadata(msg NotificationRetentionPurgeMsg) map[string]any {
	return map[string]any{
		"scope": "system", "batch_size": msg.BatchSize,
		"events_before":           msg.EventsBefore.UTC().Format(time.RFC3339Nano),
		"messages_before":         msg.MessagesBefore.UTC().Format(time.RFC3339Nano),
		"attempts_before":         msg.AttemptsBefore.UTC().Format(time.RFC3339Nano),
		"inbox_before":            msg.InboxBefore.UTC().Format(time.RFC3339Nano),
		"publications_before":     msg.PublicationsBefore.UTC().Format(time.RFC3339Nano),
		"retry_operations_before": msg.RetryOperationsBefore.UTC().Format(time.RFC3339Nano),
	}
}

func retentionPurgeResultMetadata(msg NotificationRetentionPurgeMsg, result retention.Result, duration time.Duration) map[string]any {
	meta := retentionPurgeRequestMetadata(msg)
	meta["events_deleted"] = result.EventsDeleted
	meta["messages_deleted"] = result.MessagesDeleted
	meta["attempts_deleted"] = result.AttemptsDeleted
	meta["inbox_deleted"] = result.InboxDeleted
	meta["publications_deleted"] = result.PublicationsDeleted
	meta["retry_operations_deleted"] = result.RetryOperationsDeleted
	meta["has_more"] = result.HasMore
	meta["duration_ms"] = duration.Milliseconds()
	return meta
}

func (c *NotificationRetentionPurgeCommand) recordRejection(ctx context.Context, msg NotificationRetentionPurgeMsg) {
	meta := retentionPurgeRequestMetadata(msg)
	meta["error_category"] = "validation"
	meta["error_code"] = "invalid_retention_request"
	c.record(ctx, "notifications.retention.purge.rejected", meta)
	c.log(ctx, "notification retention purge rejected", meta, true)
	c.metric("rejected", false, "validation", "invalid_retention_request")
}

func notificationSafeErrorIdentity(err error) (string, string) {
	var safe privacy.SafeError
	if errors.As(err, &safe) {
		return safe.Category, safe.Code
	}
	return "notification", "retention_purge_failed"
}

func sanitizeNotificationRetentionError(err error) error {
	if err == nil {
		return nil
	}
	var safe privacy.SafeError
	if errors.As(err, &safe) {
		return safe
	}
	return privacy.SafeError{
		Category: "notification", Code: "retention_purge_failed", Message: "notification retention purge failed",
	}
}

func (c *NotificationRetentionPurgeCommand) record(ctx context.Context, action string, metadata map[string]any) {
	if c == nil {
		return
	}
	c.observersMu.RLock()
	activity := c.Activity
	c.observersMu.RUnlock()
	if isNilNotificationDependency(activity) {
		return
	}
	bestEffortNotificationTelemetry(func() {
		if err := activity.Record(ctx, ActivityEntry{
			Action: action,
			Object: "notifications:retention", Channel: "notifications", Metadata: metadata,
		}); err != nil {
			c.log(ctx, "notification retention activity recording failed", map[string]any{
				"action": action,
			}, true)
		}
	})
}

func (c *NotificationRetentionPurgeCommand) log(ctx context.Context, message string, metadata map[string]any, failed bool) {
	if c == nil {
		return
	}
	c.observersMu.RLock()
	baseLogger := c.Logger
	c.observersMu.RUnlock()
	if isNilNotificationDependency(baseLogger) {
		return
	}
	args := make([]any, 0, len(metadata)*2)
	for key, value := range metadata {
		args = append(args, key, value)
	}
	bestEffortNotificationTelemetry(func() {
		logger := baseLogger.WithContext(ctx)
		if isNilNotificationDependency(logger) {
			return
		}
		if failed {
			logger.Warn(message, args...)
			return
		}
		logger.Info(message, args...)
	})
}

func (c *NotificationRetentionPurgeCommand) metric(outcome string, hasMore bool, category, code string) {
	if c == nil {
		return
	}
	c.observersMu.RLock()
	metrics := normalizeNotificationMetrics(c.Metrics)
	c.observersMu.RUnlock()
	if metrics == nil {
		return
	}
	bestEffortNotificationTelemetry(func() {
		metrics.Record(NotificationRetentionPurgeCommandName, map[string]string{
			"outcome": outcome, "has_more": toString(hasMore), "error_category": category, "error_code": code,
		})
	})
}

func bestEffortNotificationTelemetry(record func()) {
	if record == nil {
		return
	}
	defer recoverNotificationTelemetryPanic()
	record()
}

func recoverNotificationTelemetryPanic() {
	// Telemetry must never replace the primary command result. The observer
	// itself is the failing boundary, so there is no safe recursive reporter.
	if recovered := recover(); recovered == nil {
		return
	}
}
