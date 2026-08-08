package admin

import (
	"context"
	"fmt"
	"strings"

	notifstorage "github.com/goliatone/go-notifications/pkg/storage"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

type notificationSchemaTable struct {
	name    string
	columns []string
}

// notificationSchemaTables and notificationSchemaIndexes intentionally pin
// runtime readiness to the complete go-notifications v0.16 migration
// contract. Dependency upgrades that change the persistent contract must
// update this list and its integration tests together.
var notificationSchemaTables = []notificationSchemaTable{
	{name: "notification_definitions", columns: []string{"id", "code", "name", "channels", "metadata", "template_keys", "policy"}},
	{name: "notification_templates", columns: []string{"id", "code", "channel", "locale", "body", "subject", "source", "schema", "metadata"}},
	{name: "notification_events", columns: []string{"id", "definition_code", "recipients", "channels", "locale", "context", "correlation_id", "request_id", "idempotency_scope", "idempotency_key", "request_fingerprint", "transient_dependent", "publication_id", "digest_key", "retry_claim_until", "scheduled_at", "status"}},
	{name: "notification_messages", columns: []string{"id", "event_id", "retry_operation_id", "channel", "template_code", "provider_plan", "receiver", "status", "metadata"}},
	{name: "notification_delivery_attempts", columns: []string{"id", "message_id", "retry_operation_id", "adapter", "status", "error", "error_code", "payload"}},
	{name: "notification_preferences", columns: []string{"id", "subject_id", "subject_type", "definition_code", "channel", "enabled"}},
	{name: "notification_subscription_groups", columns: []string{"id", "code", "name", "metadata"}},
	{name: "notification_inbox_items", columns: []string{"id", "user_id", "message_id", "title", "body", "unread", "action_url"}},
	{name: "notification_publications", columns: []string{"id", "kind", "digest_key", "queue_key", "run_at", "status", "claim_until", "attempts", "error_code"}},
	{name: "notification_retry_operations", columns: []string{"id", "event_id", "retry_scope", "idempotency_key", "correlation_id", "request_id", "status", "claim_until", "error_code"}},
}

var notificationSchemaIndexes = []string{
	"notification_templates_lookup_idx",
	"notification_templates_variant_uidx",
	"notification_messages_event_idx",
	"notification_delivery_attempts_message_idx",
	"notification_preferences_subject_idx",
	"notification_inbox_items_user_idx",
	"notification_events_idempotency_uidx",
	"notification_events_publication_idx",
	"notification_publications_pending_idx",
	"notification_publications_digest_idx",
	"notification_publications_open_digest_uidx",
	"notification_retry_operations_identity_uidx",
	"notification_retry_operations_event_idx",
	"notification_events_retention_idx",
	"notification_messages_retention_idx",
	"notification_delivery_attempts_retention_idx",
	"notification_inbox_items_retention_idx",
	"notification_publications_retention_idx",
	"notification_retry_operations_retention_idx",
	"notification_events_scope_created_idx",
	"notification_events_scope_definition_created_idx",
	"notification_messages_inspection_idx",
	"notification_delivery_attempts_inspection_idx",
}

// NewBunNotificationRuntime builds a coherent persistent notification runtime
// after the go-notifications migrations have been applied. It fails before
// provider construction when the required schema is unavailable.
func NewBunNotificationRuntime(ctx context.Context, db *bun.DB, opts ...notifstorage.Option) (*NotificationRuntimeOptions, error) {
	if db == nil {
		return nil, requiredFieldDomainError("notification database", map[string]any{"component": "notifications"})
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := validateNotificationSchema(ctx, db); err != nil {
		return nil, err
	}
	providers := notifstorage.NewBunProviders(db, opts...)
	if err := validateNotificationProviders(providers); err != nil {
		return nil, err
	}
	return &NotificationRuntimeOptions{Storage: providers}, nil
}

func validateNotificationSchema(ctx context.Context, db *bun.DB) error {
	for _, table := range notificationSchemaTables {
		query := "SELECT " + strings.Join(table.columns, ", ") + " FROM " + table.name + " WHERE 1 = 0"
		if _, err := db.ExecContext(ctx, query); err != nil { //nolint:gosec // identifiers are fixed internal migration-contract constants.
			return notificationSchemaUnavailableError()
		}
	}
	for _, index := range notificationSchemaIndexes {
		exists, err := notificationSchemaIndexExists(ctx, db, index)
		if err != nil || !exists {
			return notificationSchemaUnavailableError()
		}
	}
	return nil
}

func notificationSchemaIndexExists(ctx context.Context, db *bun.DB, index string) (bool, error) {
	var count int
	switch db.Dialect().Name() {
	case dialect.SQLite:
		err := db.NewRaw("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = ?", index).Scan(ctx, &count)
		return count == 1, err
	case dialect.PG:
		err := db.NewRaw("SELECT COUNT(*) FROM pg_indexes WHERE schemaname = current_schema() AND indexname = ?", index).Scan(ctx, &count)
		return count == 1, err
	default:
		return false, fmt.Errorf("unsupported notification schema dialect %q", db.Dialect().Name())
	}
}

func notificationSchemaUnavailableError() error {
	return serviceUnavailableDomainError("notification migrations must run before runtime construction", map[string]any{"component": "notifications"})
}
