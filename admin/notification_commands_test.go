package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	gocommand "github.com/goliatone/go-command"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-notifications/pkg/privacy"
	"github.com/goliatone/go-notifications/pkg/retention"
)

func TestNotificationRetentionPurgeMsgValidation(t *testing.T) {
	valid := validNotificationRetentionPurgeMsg()
	tests := map[string]func(*NotificationRetentionPurgeMsg){
		"confirmation":        func(msg *NotificationRetentionPurgeMsg) { msg.Confirm = false },
		"system scope":        func(msg *NotificationRetentionPurgeMsg) { msg.Scope = "tenant:one" },
		"events cutoff":       func(msg *NotificationRetentionPurgeMsg) { msg.EventsBefore = time.Time{} },
		"messages cutoff":     func(msg *NotificationRetentionPurgeMsg) { msg.MessagesBefore = time.Time{} },
		"attempts cutoff":     func(msg *NotificationRetentionPurgeMsg) { msg.AttemptsBefore = time.Time{} },
		"inbox cutoff":        func(msg *NotificationRetentionPurgeMsg) { msg.InboxBefore = time.Time{} },
		"publications cutoff": func(msg *NotificationRetentionPurgeMsg) { msg.PublicationsBefore = time.Time{} },
		"retry cutoff":        func(msg *NotificationRetentionPurgeMsg) { msg.RetryOperationsBefore = time.Time{} },
		"batch lower bound":   func(msg *NotificationRetentionPurgeMsg) { msg.BatchSize = 0 },
		"batch upper bound":   func(msg *NotificationRetentionPurgeMsg) { msg.BatchSize = 1001 },
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("valid message: %v", err)
	}
	if valid.Type() != NotificationRetentionPurgeCommandName {
		t.Fatalf("unexpected command identity %q", valid.Type())
	}
	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			msg := valid
			mutate(&msg)
			if err := msg.Validate(); err == nil {
				t.Fatal("expected validation error")
			} else {
				var domainErr *goerrors.Error
				if !errors.As(err, &domainErr) || domainErr.Code != 400 || domainErr.TextCode != TextCodeValidationError {
					t.Fatalf("expected safe HTTP validation error, got %T %v", err, err)
				}
			}
		})
	}
}

func TestNotificationRetentionInvalidRequestEmitsSafeRejectedEvidence(t *testing.T) {
	bus := NewCommandBus(true)
	service := &retentionServiceSpy{}
	activity := NewActivityFeed()
	metrics := &notificationMetricsSpy{}
	logger := &notificationLoggerSpy{}
	if _, err := registerNotificationRetentionCommand(bus, service, activity, logger, metrics); err != nil {
		t.Fatalf("register retention command: %v", err)
	}
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "system-admin", Metadata: map[string]any{NotificationSystemAuthorityMetadataKey: true},
	})
	payload := retentionPayload(validNotificationRetentionPurgeMsg())
	payload["batch_size"] = 0
	_, err := bus.DispatchByNameWithOutcome(ctx, NotificationRetentionPurgeCommandName, payload, nil,
		gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	var domainErr *goerrors.Error
	if !errors.As(err, &domainErr) || domainErr.Code != 400 || domainErr.TextCode != TextCodeValidationError {
		t.Fatalf("expected safe HTTP validation error, got %T %v", err, err)
	}
	if service.calls != 0 {
		t.Fatalf("invalid request reached retention service %d times", service.calls)
	}
	entries, _ := activity.List(context.Background(), 10)
	if len(entries) != 1 || entries[0].Action != "notifications.retention.purge.rejected" ||
		len(metrics.records) != 1 || len(logger.entries) != 1 {
		t.Fatalf("expected one rejected evidence set, activity=%+v metrics=%v logs=%v", entries, metrics.records, logger.entries)
	}
	assertSafeNotificationTelemetry(t, entries, metrics.records, logger.entries)
}

func TestNotificationRetentionPurgeCommandDelegatesOnceStoresResultAndEmitsSafeTelemetry(t *testing.T) {
	want := retention.Result{EventsDeleted: 2, MessagesDeleted: 3, HasMore: true, BatchSize: 10}
	service := &retentionServiceSpy{result: want}
	activity := NewActivityFeed()
	metrics := &notificationMetricsSpy{}
	logger := &notificationLoggerSpy{}
	command := &NotificationRetentionPurgeCommand{Service: service, Activity: activity, Metrics: metrics, Logger: logger}
	msg := validNotificationRetentionPurgeMsg()
	collector := gocommand.NewResult[retention.Result]()
	ctx := gocommand.ContextWithResult(context.Background(), collector)
	if err := command.Execute(ctx, msg); err != nil {
		t.Fatalf("execute purge: %v", err)
	}
	if service.calls != 1 || service.request != msg.Request {
		t.Fatalf("expected one exact service delegation, calls=%d request=%+v", service.calls, service.request)
	}
	got, ok := collector.Load()
	if !ok || got != want {
		t.Fatalf("unexpected stored result: %+v ok=%v", got, ok)
	}
	entries, _ := activity.List(context.Background(), 10)
	if len(entries) != 2 || len(metrics.records) != 1 || len(logger.entries) != 1 {
		t.Fatalf("expected attempt/outcome telemetry, activity=%d metrics=%d logs=%d", len(entries), len(metrics.records), len(logger.entries))
	}
	assertSafeNotificationTelemetry(t, entries, metrics.records, logger.entries)
}

func TestNotificationRetentionPurgeCommandSanitizesServiceFailure(t *testing.T) {
	raw := errors.New("provider exposed recipient@example.test event-id-secret payload-secret")
	service := &retentionServiceSpy{err: raw}
	activity := NewActivityFeed()
	metrics := &notificationMetricsSpy{}
	logger := &notificationLoggerSpy{}
	command := &NotificationRetentionPurgeCommand{Service: service, Activity: activity, Metrics: metrics, Logger: logger}
	_, err := command.Run(context.Background(), validNotificationRetentionPurgeMsg())
	var safe privacy.SafeError
	if !errors.As(err, &safe) || safe.Code != "retention_purge_failed" || strings.Contains(err.Error(), "recipient@example.test") {
		t.Fatalf("expected sanitized failure, got %T %v", err, err)
	}
	entries, _ := activity.List(context.Background(), 10)
	assertSafeNotificationTelemetry(t, entries, metrics.records, logger.entries)
}

func TestNotificationRetentionMetricsCannotChangeSuccessOrFailureOutcomes(t *testing.T) {
	var typedNil *panickingNotificationMetrics
	collectors := map[string]any{
		"typed nil": typedNil,
		"panic":     &panickingNotificationMetrics{},
	}
	for name, rawCollector := range collectors {
		t.Run(name+" success", func(t *testing.T) {
			collector := rawCollector.(*panickingNotificationMetrics)
			want := retention.Result{EventsDeleted: 3, HasMore: true}
			command := &NotificationRetentionPurgeCommand{
				Service: &retentionServiceSpy{result: want}, Metrics: collector,
			}
			got, err := command.Run(context.Background(), validNotificationRetentionPurgeMsg())
			if err != nil || got != want {
				t.Fatalf("metrics changed successful result: got=%+v err=%v", got, err)
			}
		})
		t.Run(name+" failure", func(t *testing.T) {
			collector := rawCollector.(*panickingNotificationMetrics)
			command := &NotificationRetentionPurgeCommand{
				Service: &retentionServiceSpy{err: errors.New("raw provider failure")}, Metrics: collector,
			}
			_, err := command.Run(context.Background(), validNotificationRetentionPurgeMsg())
			var safe privacy.SafeError
			if !errors.As(err, &safe) || safe.Code != "retention_purge_failed" {
				t.Fatalf("metrics changed sanitized failure: %T %v", err, err)
			}
		})
	}
}

type panickingNotificationMetrics struct{}

func (*panickingNotificationMetrics) Record(string, map[string]string) {
	panic("metrics backend unavailable")
}

func TestNotificationRetentionContextFactoryDerivesScopeAndRejectsTenant(t *testing.T) {
	payload := retentionPayload(validNotificationRetentionPurgeMsg())
	systemCtx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "system-admin", Metadata: map[string]any{NotificationSystemAuthorityMetadataKey: true},
	})
	msg, err := buildNotificationRetentionPurgeMsg(systemCtx, payload, nil)
	if err != nil || msg.Scope != "system" || msg.ActorID != "system-admin" {
		t.Fatalf("system factory: msg=%+v err=%v", msg, err)
	}
	tenantCtx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "tenant-admin", TenantID: "tenant-1"})
	if _, err := buildNotificationRetentionPurgeMsg(tenantCtx, payload, nil); err == nil {
		t.Fatal("expected tenant scope rejection before dispatch")
	}
	if _, err := buildNotificationRetentionPurgeMsg(context.Background(), payload, nil); err == nil {
		t.Fatal("expected missing trusted actor rejection")
	}
}

func TestNotificationRetentionCommandRegistersInlineResultFactory(t *testing.T) {
	bus := NewCommandBus(true)
	service := &retentionServiceSpy{result: retention.Result{EventsDeleted: 1}}
	if _, err := registerNotificationRetentionCommand(bus, service, nil, nil, nil); err != nil {
		t.Fatalf("register retention command: %v", err)
	}
	state := bus.CommandRegistration(NotificationRetentionPurgeCommandName)
	if !state.CanDispatch() || !state.SupportsInlineResult() {
		t.Fatalf("unexpected registration state: %+v", state)
	}
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "system-admin", Metadata: map[string]any{NotificationSystemAuthorityMetadataKey: true},
	})
	outcome, err := bus.DispatchByNameWithOutcome(ctx, NotificationRetentionPurgeCommandName,
		retentionPayload(validNotificationRetentionPurgeMsg()), nil,
		gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	if err != nil {
		t.Fatalf("inline outcome dispatch: %v", err)
	}
	result, ok := outcome.Result.(retention.Result)
	if !ok || result.EventsDeleted != 1 || service.calls != 1 {
		t.Fatalf("unexpected inline result: %#v calls=%d", outcome.Result, service.calls)
	}
}

func TestAdminWithActivitySinkRewiresRegisteredNotificationRetentionCommand(t *testing.T) {
	original := NewActivityFeed()
	replacement := NewActivityFeed()
	adm, err := New(Config{DefaultLocale: "en"}, Dependencies{
		FeatureGate:  featureGateFromKeys(FeatureNotifications, FeatureCommands),
		ActivitySink: original,
	})
	if err != nil {
		t.Fatalf("construct admin: %v", err)
	}
	adm.WithActivitySink(replacement)
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "system-admin", Metadata: map[string]any{NotificationSystemAuthorityMetadataKey: true},
	})
	if _, err := adm.Commands().DispatchByNameWithOutcome(ctx, NotificationRetentionPurgeCommandName,
		retentionPayload(validNotificationRetentionPurgeMsg()), nil,
		gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline}); err != nil {
		t.Fatalf("dispatch retention purge: %v", err)
	}
	originalEntries, _ := original.List(context.Background(), 20)
	replacementEntries, _ := replacement.List(context.Background(), 20)
	if got := countRetentionCommandActivity(originalEntries); got != 0 {
		t.Fatalf("stale activity sink received %d retention command events", got)
	}
	if got := countRetentionCommandActivity(replacementEntries); got != 2 {
		t.Fatalf("replacement activity sink received %d retention command events, want 2", got)
	}
}

func countRetentionCommandActivity(entries []ActivityEntry) int {
	count := 0
	for _, entry := range entries {
		if strings.HasPrefix(entry.Action, "notifications.retention.purge.") {
			count++
		}
	}
	return count
}

func validNotificationRetentionPurgeMsg() NotificationRetentionPurgeMsg {
	cutoff := time.Now().Add(-time.Hour).UTC()
	return NotificationRetentionPurgeMsg{
		Request: retention.Request{
			EventsBefore: cutoff, MessagesBefore: cutoff, AttemptsBefore: cutoff,
			InboxBefore: cutoff, PublicationsBefore: cutoff, RetryOperationsBefore: cutoff, BatchSize: 10,
		},
		Confirm: true, Scope: "system", ActorID: "system-admin",
	}
}

func retentionPayload(msg NotificationRetentionPurgeMsg) map[string]any {
	return map[string]any{
		"events_before":           msg.EventsBefore.Format(time.RFC3339Nano),
		"messages_before":         msg.MessagesBefore.Format(time.RFC3339Nano),
		"attempts_before":         msg.AttemptsBefore.Format(time.RFC3339Nano),
		"inbox_before":            msg.InboxBefore.Format(time.RFC3339Nano),
		"publications_before":     msg.PublicationsBefore.Format(time.RFC3339Nano),
		"retry_operations_before": msg.RetryOperationsBefore.Format(time.RFC3339Nano),
		"batch_size":              msg.BatchSize, "confirm": msg.Confirm,
		"scope": "tenant:attacker-controlled",
	}
}

type retentionServiceSpy struct {
	calls   int
	request retention.Request
	result  retention.Result
	err     error
}

func (s *retentionServiceSpy) Purge(_ context.Context, request retention.Request) (retention.Result, error) {
	s.calls++
	s.request = request
	return s.result, s.err
}

type notificationMetricsSpy struct{ records []string }

func (s *notificationMetricsSpy) Record(operation string, labels map[string]string) {
	s.records = append(s.records, fmt.Sprintf("%s:%v", operation, labels))
}

type notificationLoggerSpy struct{ entries []string }

func (l *notificationLoggerSpy) append(message string, args ...any) {
	encoded, _ := json.Marshal(args)
	l.entries = append(l.entries, message+string(encoded))
}
func (l *notificationLoggerSpy) Trace(message string, args ...any)  { l.append(message, args...) }
func (l *notificationLoggerSpy) Debug(message string, args ...any)  { l.append(message, args...) }
func (l *notificationLoggerSpy) Info(message string, args ...any)   { l.append(message, args...) }
func (l *notificationLoggerSpy) Warn(message string, args ...any)   { l.append(message, args...) }
func (l *notificationLoggerSpy) Error(message string, args ...any)  { l.append(message, args...) }
func (l *notificationLoggerSpy) Fatal(message string, args ...any)  { l.append(message, args...) }
func (l *notificationLoggerSpy) WithContext(context.Context) Logger { return l }

func assertSafeNotificationTelemetry(t *testing.T, entries []ActivityEntry, metrics, logs []string) {
	t.Helper()
	payload, _ := json.Marshal(struct {
		Entries []ActivityEntry
		Metrics []string
		Logs    []string
	}{entries, metrics, logs})
	serialized := string(payload)
	for _, forbidden := range []string{"recipient@example.test", "event-id-secret", "payload-secret", "system-admin", "raw_error", "event_id", "message_id"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("unsafe telemetry contains %q: %s", forbidden, serialized)
		}
	}
}
