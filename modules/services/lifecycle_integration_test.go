package services

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"testing"
	"time"

	goadmin "github.com/goliatone/go-admin/admin"
	goadaptergojob "github.com/goliatone/go-services/adapters/gojob"
	gocore "github.com/goliatone/go-services/core"
	sqlstore "github.com/goliatone/go-services/store/sql"
	"github.com/uptrace/bun"
)

type flakyLifecycleSubscriber struct {
	mu          sync.Mutex
	failForRuns int
	calls       int
}

func (s *flakyLifecycleSubscriber) Handle(_ context.Context, _ gocore.LifecycleEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls++
	if s.calls <= s.failForRuns {
		return errors.New("projector transient failure")
	}
	return nil
}

func (s *flakyLifecycleSubscriber) Calls() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.calls
}

type flakyNotificationSender struct {
	mu       sync.Mutex
	failFor  int
	sendCall int
}

func (s *flakyNotificationSender) Send(_ context.Context, _ gocore.NotificationSendRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sendCall++
	if s.sendCall <= s.failFor {
		return errors.New("notification send transient failure")
	}
	return nil
}

func (s *flakyNotificationSender) Calls() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sendCall
}

type failingActivitySink struct {
	mu           sync.Mutex
	retentionRun int
	retentionDel int
}

func (s *failingActivitySink) Record(context.Context, gocore.ServiceActivityEntry) error {
	return errors.New("primary sink unavailable")
}

func (s *failingActivitySink) List(context.Context, gocore.ServicesActivityFilter) (gocore.ServicesActivityPage, error) {
	return gocore.ServicesActivityPage{}, nil
}

func (s *failingActivitySink) Prune(context.Context, gocore.ActivityRetentionPolicy) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.retentionRun++
	return s.retentionDel, nil
}

func TestServicesLifecycle_OutboxLagReplayAndStatus(t *testing.T) {
	subscriber := &flakyLifecycleSubscriber{failForRuns: 1}
	lifecycle := DefaultConfig().Lifecycle
	lifecycle.Dispatcher.InitialBackoff = 20 * time.Millisecond
	lifecycle.Dispatcher.MaxAttempts = 4

	_, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithLifecycleConfig(lifecycle),
		WithLifecycleSubscriber("test.flaky", subscriber),
	)
	prepareLifecycleTables(t, module)
	outbox := mustOutboxStore(t, module)

	event := gocore.LifecycleEvent{
		ID:         "evt-lag-1",
		Name:       "sync.failed",
		ProviderID: "github",
		ScopeType:  "user",
		ScopeID:    "user-1",
		OccurredAt: time.Now().UTC(),
		Metadata:   map[string]any{"status": "error"},
		Payload:    map[string]any{"resource": "repo"},
	}
	if err := outbox.Enqueue(context.Background(), event); err != nil {
		t.Fatalf("enqueue lifecycle event: %v", err)
	}

	statusBefore := performJSONRequest(t, server, http.MethodGet, base+"/status", nil, nil)
	if statusBefore.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", statusBefore.Code, statusBefore.Body.String())
	}
	pendingBefore := statusCountValue(t, statusBefore.Body.Bytes(), "lifecycle", "outbox", "status_counts", "pending")
	if pendingBefore < 1 {
		t.Fatalf("expected pending outbox count >= 1, got %d", pendingBefore)
	}

	err := module.Worker().HandleExecutionMessage(context.Background(), &gocore.JobExecutionMessage{
		JobID:      goadaptergojob.JobIDOutboxDispatch,
		Parameters: map[string]any{"batch_size": 5},
	})
	if err == nil {
		t.Fatalf("expected first dispatch to fail due flaky subscriber")
	}

	time.Sleep(40 * time.Millisecond)
	err = module.Worker().HandleExecutionMessage(context.Background(), &gocore.JobExecutionMessage{
		JobID:      goadaptergojob.JobIDOutboxDispatch,
		Parameters: map[string]any{"batch_size": 5},
	})
	if err != nil {
		t.Fatalf("expected replay dispatch to succeed, got %v", err)
	}
	if subscriber.Calls() != 2 {
		t.Fatalf("expected subscriber to run twice, got %d", subscriber.Calls())
	}

	statusAfter := performJSONRequest(t, server, http.MethodGet, base+"/status", nil, nil)
	if statusAfter.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", statusAfter.Code, statusAfter.Body.String())
	}
	delivered := statusCountValue(t, statusAfter.Body.Bytes(), "lifecycle", "outbox", "status_counts", "delivered")
	if delivered < 1 {
		t.Fatalf("expected delivered outbox count >= 1, got %d", delivered)
	}
}

func TestServicesLifecycle_NotificationRetryAndDuplicateIdempotency(t *testing.T) {
	sender := &flakyNotificationSender{failFor: 1}
	lifecycle := DefaultConfig().Lifecycle
	lifecycle.Dispatcher.InitialBackoff = 20 * time.Millisecond
	lifecycle.Dispatcher.MaxAttempts = 4
	lifecycle.Projectors.Notifications.Enabled = true
	lifecycle.Projectors.Notifications.DefinitionMap = map[string]string{
		"sync.failed": "services.sync.failed",
	}

	_, module, _, _ := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithLifecycleConfig(lifecycle),
		WithLifecycleNotificationSender(sender),
	)
	prepareLifecycleTables(t, module)
	outbox := mustOutboxStore(t, module)
	db := mustRepositoryDB(t, module)

	event := gocore.LifecycleEvent{
		ID:         "evt-notify-1",
		Name:       "sync.failed",
		ProviderID: "github",
		ScopeType:  "user",
		ScopeID:    "user-42",
		OccurredAt: time.Now().UTC(),
		Metadata:   map[string]any{"status": "error"},
	}
	if err := outbox.Enqueue(context.Background(), event); err != nil {
		t.Fatalf("enqueue lifecycle event: %v", err)
	}

	err := module.Worker().HandleExecutionMessage(context.Background(), &gocore.JobExecutionMessage{JobID: goadaptergojob.JobIDOutboxDispatch})
	if err == nil {
		t.Fatalf("expected first notification dispatch to fail")
	}

	time.Sleep(40 * time.Millisecond)
	err = module.Worker().HandleExecutionMessage(context.Background(), &gocore.JobExecutionMessage{JobID: goadaptergojob.JobIDOutboxDispatch})
	if err != nil {
		t.Fatalf("expected notification replay dispatch to succeed, got %v", err)
	}
	if sender.Calls() != 2 {
		t.Fatalf("expected sender call count=2 after retry, got %d", sender.Calls())
	}

	if err := outbox.Enqueue(context.Background(), event); err != nil {
		t.Fatalf("enqueue duplicate lifecycle event: %v", err)
	}
	if err := module.Worker().HandleExecutionMessage(context.Background(), &gocore.JobExecutionMessage{JobID: goadaptergojob.JobIDOutboxDispatch}); err != nil {
		t.Fatalf("dispatch duplicate event: %v", err)
	}
	if sender.Calls() != 2 {
		t.Fatalf("expected duplicate dispatch to be idempotent, got sender calls=%d", sender.Calls())
	}

	var sentCount int
	if err := db.NewSelect().
		Table("service_notification_dispatches").
		ColumnExpr("COUNT(*)").
		Where("status = ?", "sent").
		Scan(context.Background(), &sentCount); err != nil {
		t.Fatalf("count sent dispatches: %v", err)
	}
	if sentCount != 1 {
		t.Fatalf("expected exactly one sent dispatch ledger record, got %d", sentCount)
	}
}

func TestServicesLifecycle_RetentionAndFallbackExecutionPaths(t *testing.T) {
	primary := &failingActivitySink{retentionDel: 7}
	lifecycle := DefaultConfig().Lifecycle
	lifecycle.Dispatcher.InitialBackoff = 20 * time.Millisecond
	lifecycle.Projectors.Activity.BufferSize = 1
	lifecycle.Projectors.Activity.FallbackBufferSize = 8

	_, module, server, base := setupServicesTestRuntime(
		t,
		func(adm *goadmin.Admin) { adm.WithAuthorizer(servicesAllowAuthorizer{}) },
		WithLifecycleConfig(lifecycle),
		WithActivitySinks(primary, nil),
	)
	prepareLifecycleTables(t, module)
	outbox := mustOutboxStore(t, module)

	event := gocore.LifecycleEvent{
		ID:         "evt-fallback-1",
		Name:       "connect.success",
		ProviderID: "github",
		ScopeType:  "user",
		ScopeID:    "user-1",
		OccurredAt: time.Now().UTC(),
		Metadata:   map[string]any{"status": "ok"},
	}
	if err := outbox.Enqueue(context.Background(), event); err != nil {
		t.Fatalf("enqueue lifecycle event: %v", err)
	}
	if err := module.Worker().HandleExecutionMessage(context.Background(), &gocore.JobExecutionMessage{JobID: goadaptergojob.JobIDOutboxDispatch}); err != nil {
		t.Fatalf("dispatch event: %v", err)
	}
	time.Sleep(30 * time.Millisecond)

	status := performJSONRequest(t, server, http.MethodGet, base+"/status", nil, nil)
	if status.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", status.Code, status.Body.String())
	}
	fallbackWrites := statusCountValue(t, status.Body.Bytes(), "lifecycle", "activity", "fallback_writes")
	if fallbackWrites < 1 {
		t.Fatalf("expected fallback writes >= 1, got %d", fallbackWrites)
	}

	cleanup := performJSONRequest(
		t,
		server,
		http.MethodPost,
		base+"/activity/retention/cleanup",
		map[string]any{"async": false},
		map[string]string{"Idempotency-Key": "cleanup-1"},
	)
	if cleanup.Code != http.StatusOK {
		t.Fatalf("expected cleanup 200, got %d body=%s", cleanup.Code, cleanup.Body.String())
	}
	deleted := responseIntField(t, cleanup.Body.Bytes(), "deleted")
	if deleted != 7 {
		t.Fatalf("expected deleted=7, got %d", deleted)
	}
}

func mustOutboxStore(t *testing.T, module *Module) *sqlstore.OutboxStore {
	t.Helper()
	provider, ok := module.RepositoryFactory().(interface{ OutboxStore() *sqlstore.OutboxStore })
	if !ok {
		t.Fatalf("repository factory does not expose OutboxStore")
	}
	outbox := provider.OutboxStore()
	if outbox == nil {
		t.Fatalf("expected outbox store")
	}
	return outbox
}

func prepareLifecycleTables(t *testing.T, module *Module) {
	t.Helper()
	db := mustRepositoryDB(t, module)
	statements := []string{
		`CREATE TABLE IF NOT EXISTS service_lifecycle_outbox (
			id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			event_name TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			scope_type TEXT NOT NULL,
			scope_id TEXT NOT NULL,
			connection_id TEXT,
			payload TEXT NOT NULL,
			metadata TEXT NOT NULL,
			status TEXT NOT NULL,
			attempts INTEGER NOT NULL DEFAULT 0,
			next_attempt_at TIMESTAMP NULL,
			last_error TEXT NOT NULL DEFAULT '',
			occurred_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS service_notification_dispatches (
			id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			projector TEXT NOT NULL,
			definition_code TEXT NOT NULL,
			recipient_key TEXT NOT NULL,
			idempotency_key TEXT NOT NULL UNIQUE,
			status TEXT NOT NULL,
			error TEXT NOT NULL,
			metadata TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL
		);`,
	}
	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			t.Fatalf("prepare lifecycle table: %v", err)
		}
	}
}

func mustRepositoryDB(t *testing.T, module *Module) *bun.DB {
	t.Helper()
	provider, ok := module.RepositoryFactory().(interface{ DB() *bun.DB })
	if !ok {
		t.Fatalf("repository factory does not expose DB")
	}
	db := provider.DB()
	if db == nil {
		t.Fatalf("expected bun db")
	}
	return db
}

func statusCountValue(t *testing.T, raw []byte, path ...string) int {
	t.Helper()
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode payload: %v raw=%s", err, string(raw))
	}
	value := deepLookup(payload, path...)
	if value == nil {
		return 0
	}
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	default:
		return toInt(typed, 0)
	}
}

func responseIntField(t *testing.T, raw []byte, key string) int {
	t.Helper()
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode payload: %v raw=%s", err, string(raw))
	}
	switch typed := payload[key].(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	default:
		return toInt(typed, 0)
	}
}

func deepLookup(root map[string]any, path ...string) any {
	if len(path) == 0 {
		return nil
	}
	current := any(root)
	for _, key := range path {
		node, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = node[key]
	}
	return current
}
