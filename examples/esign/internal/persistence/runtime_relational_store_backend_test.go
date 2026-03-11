package persistence

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestRuntimeRelationalStoreBackendLoadPayloadKeysReminderStatesByScopeAgreementRecipient(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "runtime-reminder-keying.db") + "?_fk=1&_busy_timeout=5000"
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = dsn
	cfg.Postgres.DSN = ""

	ctx := context.Background()
	bootstrap, err := Bootstrap(ctx, cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	defer func() { _ = bootstrap.Close() }()

	now := time.Now().UTC().Truncate(time.Second)
	nextDueAt := now.Add(time.Hour)
	record := &stores.AgreementReminderStateRecord{
		ID:            "ars-1",
		TenantID:      "tenant-1",
		OrgID:         "org-1",
		AgreementID:   "agreement-1",
		RecipientID:   "recipient-1",
		Status:        stores.AgreementReminderStatusActive,
		PolicyVersion: appcfg.ReminderPolicyVersion,
		NextDueAt:     &nextDueAt,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if _, err := bootstrap.BunDB.NewInsert().Model(record).Exec(ctx); err != nil {
		t.Fatalf("insert reminder state: %v", err)
	}

	backend, err := newRuntimeRelationalStoreBackend(bootstrap)
	if err != nil {
		t.Fatalf("newRuntimeRelationalStoreBackend: %v", err)
	}
	payload, err := backend.LoadPayload(ctx, nil)
	if err != nil {
		t.Fatalf("LoadPayload: %v", err)
	}

	var snapshot legacySQLiteSnapshot
	if err := json.Unmarshal(payload, &snapshot); err != nil {
		t.Fatalf("json.Unmarshal(payload): %v", err)
	}

	expected := strings.Join([]string{record.TenantID, record.OrgID, record.AgreementID, record.RecipientID}, "|")
	if _, ok := snapshot.AgreementReminderStates[expected]; !ok {
		t.Fatalf("expected reminder state key %q, got keys=%v", expected, mapKeys(snapshot.AgreementReminderStates))
	}

	legacyIDKey := strings.Join([]string{record.TenantID, record.OrgID, record.ID}, "|")
	if _, ok := snapshot.AgreementReminderStates[legacyIDKey]; ok {
		t.Fatalf("did not expect legacy id-keyed reminder state %q", legacyIDKey)
	}
}

func TestValidateRuntimeSnapshotRejectsMalformedReminderStateKey(t *testing.T) {
	snapshot := runtimeStoreSnapshot{
		AgreementReminderStates: map[string]stores.AgreementReminderStateRecord{
			"tenant-1|org-1|state-id": {
				ID:          "state-id",
				TenantID:    "tenant-1",
				OrgID:       "org-1",
				AgreementID: "agreement-1",
				RecipientID: "recipient-1",
			},
		},
	}
	err := validateRuntimeSnapshot(snapshot)
	if err == nil || !strings.Contains(err.Error(), "invalid reminder state key") {
		t.Fatalf("expected malformed reminder state key error, got %v", err)
	}
}

func TestValidateRuntimeSnapshotRejectsDanglingJobRunDedupeIndex(t *testing.T) {
	now := time.Now().UTC()
	snapshot := runtimeStoreSnapshot{
		JobRuns: map[string]stores.JobRunRecord{
			"tenant-1|org-1|job-1": {
				ID:        "job-1",
				TenantID:  "tenant-1",
				OrgID:     "org-1",
				CreatedAt: now,
				UpdatedAt: now,
			},
		},
		JobRunDedupeIndex: map[string]string{
			"tenant-1|org-1|jobs.esign.sample|dedupe-a": "job-missing",
		},
	}
	err := validateRuntimeSnapshot(snapshot)
	if err == nil || !strings.Contains(err.Error(), "job run dedupe index") {
		t.Fatalf("expected job run dedupe validation error, got %v", err)
	}
}

func mapKeys[T any](in map[string]T) []string {
	out := make([]string, 0, len(in))
	for key := range in {
		out = append(out, key)
	}
	return out
}
