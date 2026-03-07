package persistence

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type testBunDBProvider struct {
	db *bun.DB
}

func (p testBunDBProvider) DB() *bun.DB {
	return p.db
}

func newSQLiteBunDBForRepositoryFactoryTests(t *testing.T) *bun.DB {
	t.Helper()
	dsn := "file:" + filepath.Join(t.TempDir(), "repository-factory.db") + "?_fk=1&_busy_timeout=5000"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("sql.Open: %v", err)
	}
	bunDB := bun.NewDB(sqlDB, sqlitedialect.New())
	t.Cleanup(func() {
		_ = bunDB.Close()
		_ = sqlDB.Close()
	})
	return bunDB
}

func TestNewRepositoryFactoryFromDBInitializesAggregateRepositories(t *testing.T) {
	db := newSQLiteBunDBForRepositoryFactoryTests(t)
	factory, err := NewRepositoryFactoryFromDB(db)
	if err != nil {
		t.Fatalf("NewRepositoryFactoryFromDB: %v", err)
	}
	if factory.DB() == nil {
		t.Fatalf("expected factory DB")
	}

	repositories := map[string]any{
		"documents":                   factory.Documents(),
		"agreements":                  factory.Agreements(),
		"participants":                factory.Participants(),
		"recipients":                  factory.Recipients(),
		"fields":                      factory.Fields(),
		"field_definitions":           factory.FieldDefinitions(),
		"field_instances":             factory.FieldInstances(),
		"signing_tokens":              factory.SigningTokens(),
		"field_values":                factory.FieldValues(),
		"audit_events":                factory.AuditEvents(),
		"signature_artifacts":         factory.SignatureArtifacts(),
		"agreement_artifacts":         factory.AgreementArtifacts(),
		"email_logs":                  factory.EmailLogs(),
		"job_runs":                    factory.JobRuns(),
		"google_import_runs":          factory.GoogleImportRuns(),
		"outbox_messages":             factory.OutboxMessages(),
		"integration_credentials":     factory.IntegrationCredentials(),
		"integration_mapping_specs":   factory.MappingSpecs(),
		"integration_bindings":        factory.IntegrationBindings(),
		"integration_sync_runs":       factory.IntegrationSyncRuns(),
		"integration_checkpoints":     factory.IntegrationCheckpoints(),
		"integration_conflicts":       factory.IntegrationConflicts(),
		"integration_change_events":   factory.IntegrationChangeEvents(),
		"integration_mutation_claims": factory.IntegrationMutationClaims(),
		"placement_runs":              factory.PlacementRuns(),
	}
	for name, repo := range repositories {
		if repo == nil {
			t.Fatalf("expected repository %q to be initialized", name)
		}
	}

	tableAssertions := []struct {
		name     string
		table    string
		provider any
	}{
		{name: "documents", table: "documents", provider: factory.Documents()},
		{name: "agreements", table: "agreements", provider: factory.Agreements()},
		{name: "recipients", table: "recipients", provider: factory.Recipients()},
		{name: "participants", table: "participants", provider: factory.Participants()},
		{name: "fields", table: "fields", provider: factory.Fields()},
		{name: "field_definitions", table: "field_definitions", provider: factory.FieldDefinitions()},
		{name: "field_instances", table: "field_instances", provider: factory.FieldInstances()},
		{name: "signing_tokens", table: "signing_tokens", provider: factory.SigningTokens()},
		{name: "field_values", table: "field_values", provider: factory.FieldValues()},
		{name: "audit_events", table: "audit_events", provider: factory.AuditEvents()},
		{name: "signature_artifacts", table: "signature_artifacts", provider: factory.SignatureArtifacts()},
		{name: "agreement_artifacts", table: "agreement_artifacts", provider: factory.AgreementArtifacts()},
		{name: "email_logs", table: "email_logs", provider: factory.EmailLogs()},
		{name: "job_runs", table: "job_runs", provider: factory.JobRuns()},
		{name: "google_import_runs", table: "google_import_runs", provider: factory.GoogleImportRuns()},
		{name: "outbox_messages", table: "outbox_messages", provider: factory.OutboxMessages()},
		{name: "integration_credentials", table: "integration_credentials", provider: factory.IntegrationCredentials()},
		{name: "integration_mapping_specs", table: "integration_mapping_specs", provider: factory.MappingSpecs()},
		{name: "integration_bindings", table: "integration_bindings", provider: factory.IntegrationBindings()},
		{name: "integration_sync_runs", table: "integration_sync_runs", provider: factory.IntegrationSyncRuns()},
		{name: "integration_checkpoints", table: "integration_checkpoints", provider: factory.IntegrationCheckpoints()},
		{name: "integration_conflicts", table: "integration_conflicts", provider: factory.IntegrationConflicts()},
		{name: "integration_change_events", table: "integration_change_events", provider: factory.IntegrationChangeEvents()},
		{name: "integration_mutation_claims", table: "integration_mutation_claims", provider: factory.IntegrationMutationClaims()},
		{name: "placement_runs", table: "placement_runs", provider: factory.PlacementRuns()},
	}
	for _, tc := range tableAssertions {
		tableNamer, ok := tc.provider.(interface{ TableName() string })
		if !ok {
			t.Fatalf("expected repository %q to expose TableName()", tc.name)
		}
		if got := tableNamer.TableName(); got != tc.table {
			t.Fatalf("expected repository %q table %q, got %q", tc.name, tc.table, got)
		}
	}
}

func TestRepositoryFactoryBuildAcceptsDBProvider(t *testing.T) {
	db := newSQLiteBunDBForRepositoryFactoryTests(t)
	factory := NewRepositoryFactory()
	_, err := factory.Build(testBunDBProvider{db: db})
	if err != nil {
		t.Fatalf("Build(DB provider): %v", err)
	}
	if factory.Documents() == nil {
		t.Fatalf("expected documents repository")
	}
}

func TestRepositoryFactoryBuildRejectsNilCandidate(t *testing.T) {
	factory := NewRepositoryFactory()
	if _, err := factory.Build(nil); err == nil {
		t.Fatalf("expected build error for nil candidate")
	}
}
