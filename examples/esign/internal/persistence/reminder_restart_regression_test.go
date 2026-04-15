package persistence

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestPhase11ReminderStateUpsertAfterRestartUsesLogicalKey(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "phase11-reminder-restart.db") + "?_fk=1&_busy_timeout=5000"
	scope := stores.Scope{TenantID: "tenant-phase11", OrgID: "org-phase11"}

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = dsn
	cfg.Persistence.Postgres.DSN = ""

	first, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("first Bootstrap: %v", err)
	}
	firstStore, firstCleanup, err := NewStoreAdapter(first)
	if err != nil {
		_ = first.Close()
		t.Fatalf("NewStoreAdapter first: %v", err)
	}
	now := time.Now().UTC().Truncate(time.Second)
	nextDue := now.Add(time.Hour)
	created, err := firstStore.UpsertAgreementReminderState(context.Background(), scope, stores.AgreementReminderStateRecord{
		ID:            "ars-phase11",
		AgreementID:   "agreement-phase11",
		RecipientID:   "recipient-phase11",
		Status:        stores.AgreementReminderStatusActive,
		PolicyVersion: appcfg.ReminderPolicyVersion,
		NextDueAt:     &nextDue,
		CreatedAt:     now,
		UpdatedAt:     now,
	})
	if err != nil {
		_ = firstCleanup()
		_ = first.Close()
		t.Fatalf("initial UpsertAgreementReminderState: %v", err)
	}
	_ = firstCleanup()
	if closeErr := first.Close(); closeErr != nil {
		t.Fatalf("close first bootstrap: %v", closeErr)
	}

	second, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("second Bootstrap: %v", err)
	}
	defer func() { _ = second.Close() }()
	secondStore, secondCleanup, err := NewStoreAdapter(second)
	if err != nil {
		t.Fatalf("NewStoreAdapter second: %v", err)
	}
	defer func() { _ = secondCleanup() }()

	found, err := secondStore.GetAgreementReminderState(context.Background(), scope, "agreement-phase11", "recipient-phase11")
	if err != nil {
		t.Fatalf("GetAgreementReminderState after restart: %v", err)
	}
	if found.ID != created.ID {
		t.Fatalf("expected persisted reminder state id %q, got %q", created.ID, found.ID)
	}

	updatedAt := now.Add(2 * time.Minute)
	updated, err := secondStore.UpsertAgreementReminderState(context.Background(), scope, stores.AgreementReminderStateRecord{
		AgreementID:         "agreement-phase11",
		RecipientID:         "recipient-phase11",
		Status:              stores.AgreementReminderStatusActive,
		PolicyVersion:       appcfg.ReminderPolicyVersion,
		NextDueAt:           &nextDue,
		LastReasonCode:      "manual_resend",
		LastManualResendAt:  &updatedAt,
		LastAttemptedSendAt: &updatedAt,
		UpdatedAt:           updatedAt,
	})
	if err != nil {
		t.Fatalf("restart UpsertAgreementReminderState: %v", err)
	}
	if updated.ID != created.ID {
		t.Fatalf("expected logical upsert to reuse id %q, got %q", created.ID, updated.ID)
	}

	var count int
	if err := second.SQLDB.QueryRowContext(
		context.Background(),
		`SELECT COUNT(1) FROM agreement_reminder_states
		 WHERE tenant_id = ? AND org_id = ? AND agreement_id = ? AND recipient_id = ?`,
		scope.TenantID,
		scope.OrgID,
		"agreement-phase11",
		"recipient-phase11",
	).Scan(&count); err != nil {
		t.Fatalf("count reminder states after restart upsert: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one logical reminder row after restart upsert, got %d", count)
	}
}
