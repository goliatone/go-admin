package persistence

import (
	"context"
	"io/fs"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	auth "github.com/goliatone/go-auth"
	goservices "github.com/goliatone/go-services"
	users "github.com/goliatone/go-users"
)

type migrationPair struct {
	up   bool
	down bool
}

func TestPhase8MigrationValidationTargetsIncludeSQLiteAndPostgres(t *testing.T) {
	expected := map[string]bool{
		"sqlite":   true,
		"postgres": true,
	}
	if len(defaultValidationTargets) != len(expected) {
		t.Fatalf("expected %d validation targets, got %d (%v)", len(expected), len(defaultValidationTargets), defaultValidationTargets)
	}
	for _, target := range defaultValidationTargets {
		if !expected[strings.ToLower(strings.TrimSpace(target))] {
			t.Fatalf("unexpected validation target %q", target)
		}
	}
}

func TestPhase8MigrationContractHasUpDownPairingPerDialectTree(t *testing.T) {
	roots := orderedSourceRootsForPhase8(t)
	for label, root := range roots {
		treePairs, err := collectMigrationPairsByTree(root)
		if err != nil {
			t.Fatalf("%s: collect migration pairs: %v", label, err)
		}
		if len(treePairs) == 0 {
			t.Fatalf("%s: expected migrations to be discovered", label)
		}
		for tree, pairs := range treePairs {
			if len(pairs) == 0 {
				t.Fatalf("%s/%s: expected migration pairs", label, tree)
			}
			for version, pair := range pairs {
				if !pair.up || !pair.down {
					t.Fatalf("%s/%s: expected up/down pairing for version %q (up=%v down=%v)", label, tree, version, pair.up, pair.down)
				}
			}
		}
	}
}

func TestPhase8MigrationContractVersionParityAcrossDialectTrees(t *testing.T) {
	roots := orderedSourceRootsForPhase8(t)
	for label, root := range roots {
		treePairs, err := collectMigrationPairsByTree(root)
		if err != nil {
			t.Fatalf("%s: collect migration pairs: %v", label, err)
		}
		sqliteVersions := effectiveVersionsForDialect(treePairs, "sqlite")
		postgresVersions := effectiveVersionsForDialect(treePairs, "postgres")
		if len(sqliteVersions) == 0 && len(postgresVersions) == 0 {
			continue
		}
		if !sameStringSet(sqliteVersions, postgresVersions) {
			t.Fatalf(
				"%s: expected effective version parity between sqlite and postgres trees\nsqlite versions=%v\npostgres versions=%v",
				label,
				sqliteVersions,
				postgresVersions,
			)
		}
	}
}

func TestPhase8AppLocalPostgresReviewSessionMigrationOverridesConstraintDrop(t *testing.T) {
	roots := orderedSourceRootsForPhase8(t)
	root, ok := roots[migrationSourceLabelAppLocal]
	if !ok || root == nil {
		t.Fatalf("expected %s migration root", migrationSourceLabelAppLocal)
	}

	upPath := path.Join("postgres", "0023_esign_review_sessions.up.sql")
	upSQL, err := fs.ReadFile(root, upPath)
	if err != nil {
		t.Fatalf("read %s: %v", upPath, err)
	}
	upText := string(upSQL)
	if !strings.Contains(upText, "DROP CONSTRAINT IF EXISTS uq_agreement_review_participants_recipient") {
		t.Fatalf("expected postgres review-session migration to drop the unique constraint before recreating the partial index")
	}
	if strings.Contains(upText, "DROP INDEX IF EXISTS uq_agreement_review_participants_recipient") {
		t.Fatalf("expected postgres review-session migration to avoid dropping the backing index directly")
	}
}

func TestPhase8AppLocalPostgresReviewSessionRepairMigrationDropsConstraintBeforeRebuild(t *testing.T) {
	roots := orderedSourceRootsForPhase8(t)
	root, ok := roots[migrationSourceLabelAppLocal]
	if !ok || root == nil {
		t.Fatalf("expected %s migration root", migrationSourceLabelAppLocal)
	}

	upPath := path.Join("postgres", "0024_esign_review_sessions_repair.up.sql")
	upSQL, err := fs.ReadFile(root, upPath)
	if err != nil {
		t.Fatalf("read %s: %v", upPath, err)
	}
	upText := string(upSQL)
	if !strings.Contains(upText, "DROP CONSTRAINT IF EXISTS uq_agreement_review_participants_recipient") {
		t.Fatalf("expected postgres review-session repair migration to drop the unique constraint before recreating the partial index")
	}
	if !strings.Contains(upText, "ADD COLUMN IF NOT EXISTS participant_type") {
		t.Fatalf("expected postgres review-session repair migration to backfill participant_type")
	}
}

func TestPhase8AppLocalPostgresExternalReviewParticipantMigrationRelaxesRecipientFK(t *testing.T) {
	roots := orderedSourceRootsForPhase8(t)
	root, ok := roots[migrationSourceLabelAppLocal]
	if !ok || root == nil {
		t.Fatalf("expected %s migration root", migrationSourceLabelAppLocal)
	}

	upPath := path.Join("postgres", "0025_esign_review_external_participants_fk.up.sql")
	upSQL, err := fs.ReadFile(root, upPath)
	if err != nil {
		t.Fatalf("read %s: %v", upPath, err)
	}
	upText := string(upSQL)
	if !strings.Contains(upText, "DROP CONSTRAINT IF EXISTS fk_agreement_review_participants_recipient") {
		t.Fatalf("expected postgres external-review migration to drop the recipient FK before rebuilding it")
	}
	if !strings.Contains(upText, "ALTER COLUMN recipient_id DROP NOT NULL") {
		t.Fatalf("expected postgres external-review migration to relax recipient_id nullability")
	}
	if !strings.Contains(upText, "participant_type = 'external' AND recipient_id IS NULL AND email <> ''") {
		t.Fatalf("expected postgres external-review migration to enforce external participant identity semantics")
	}
}

func TestPhase8RepositoryStoreParitySQLiteAndPostgresContract(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "phase8-parity.sqlite") + "?_busy_timeout=5000&_foreign_keys=on"
	cfg.Persistence.Postgres.DSN = ""

	handles, err := OpenClient(context.Background(), cfg)
	if err != nil {
		t.Fatalf("OpenClient: %v", err)
	}
	defer func() { _ = handles.Close() }()

	if err := handles.Client.Migrate(context.Background()); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	requiredTables := []string{
		"documents",
		"agreements",
		"esign_drafts",
		"recipients",
		"participants",
		"fields",
		"field_definitions",
		"field_instances",
		"signing_tokens",
		"field_values",
		"draft_audit_events",
		"audit_events",
		"signature_artifacts",
		"signer_profiles",
		"saved_signer_signatures",
		"agreement_artifacts",
		"email_logs",
		"job_runs",
		"google_import_runs",
		"agreement_reminder_states",
		"outbox_messages",
		"integration_credentials",
		"integration_mapping_specs",
		"integration_bindings",
		"integration_sync_runs",
		"integration_checkpoints",
		"integration_conflicts",
		"integration_change_events",
		"integration_mutation_claims",
		"placement_runs",
		"agreement_reviews",
		"agreement_review_participants",
		"agreement_comment_threads",
		"agreement_comment_messages",
		"review_session_tokens",
	}
	for _, table := range requiredTables {
		var count int
		if err := handles.BunDB.NewRaw(
			`SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name = ?`,
			table,
		).Scan(context.Background(), &count); err != nil {
			t.Fatalf("check table %s: %v", table, err)
		}
		if count != 1 {
			t.Fatalf("expected table %q to exist in sqlite parity run", table)
		}
	}

	// Postgres parity is enforced by contract: shared migration sources must keep
	// effective version parity across dialect trees and pass validation targets.
	roots := orderedSourceRootsForPhase8(t)
	for label, root := range roots {
		treePairs, err := collectMigrationPairsByTree(root)
		if err != nil {
			t.Fatalf("%s: collect migration pairs: %v", label, err)
		}
		sqliteVersions := effectiveVersionsForDialect(treePairs, "sqlite")
		postgresVersions := effectiveVersionsForDialect(treePairs, "postgres")
		if len(sqliteVersions) == 0 && len(postgresVersions) == 0 {
			continue
		}
		if !sameStringSet(sqliteVersions, postgresVersions) {
			t.Fatalf("%s: sqlite/postgres effective migration version parity mismatch", label)
		}
	}
}

func effectiveVersionsForDialect(treePairs map[string]map[string]migrationPair, dialect string) []string {
	set := map[string]bool{}
	if defaults, ok := treePairs["default"]; ok {
		for version := range defaults {
			set[version] = true
		}
	}
	dialect = strings.ToLower(strings.TrimSpace(dialect))
	if dialect != "" {
		if dialectPairs, ok := treePairs[dialect]; ok {
			for version := range dialectPairs {
				set[version] = true
			}
		}
	}
	versions := make([]string, 0, len(set))
	for version := range set {
		versions = append(versions, version)
	}
	sort.Strings(versions)
	return versions
}

func orderedSourceRootsForPhase8(t *testing.T) map[string]fs.FS {
	t.Helper()
	cfg := appcfg.Defaults()
	cfg.Services.ModuleEnabled = true
	cfg.Persistence.Migrations.LocalOnly = false

	authRoot, err := resolveMigrationFS(auth.GetMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve auth migrations: %v", err)
	}
	usersRoot, err := resolveMigrationFS(users.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve users migrations: %v", err)
	}
	servicesRoot, err := resolveMigrationFS(goservices.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		t.Fatalf("resolve services migrations: %v", err)
	}
	appLocalRoot, err := resolveAppLocalMigrationFS(cfg)
	if err != nil {
		t.Fatalf("resolve app-local migrations: %v", err)
	}
	return map[string]fs.FS{
		migrationSourceLabelAuth:     authRoot,
		migrationSourceLabelUsers:    usersRoot,
		migrationSourceLabelServices: servicesRoot,
		migrationSourceLabelAppLocal: appLocalRoot,
	}
}

func collectMigrationPairsByTree(root fs.FS) (map[string]map[string]migrationPair, error) {
	treePairs := map[string]map[string]migrationPair{}
	err := fs.WalkDir(root, ".", func(filePath string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d == nil || d.IsDir() {
			return nil
		}
		base := path.Base(filePath)
		tree := migrationTreeFromPath(filePath)
		switch {
		case strings.HasSuffix(base, ".up.sql"):
			version := strings.TrimSuffix(base, ".up.sql")
			setMigrationPair(treePairs, tree, version, true)
		case strings.HasSuffix(base, ".down.sql"):
			version := strings.TrimSuffix(base, ".down.sql")
			setMigrationPair(treePairs, tree, version, false)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return treePairs, nil
}

func setMigrationPair(treePairs map[string]map[string]migrationPair, tree, version string, isUp bool) {
	tree = strings.TrimSpace(tree)
	version = strings.TrimSpace(version)
	if tree == "" || version == "" {
		return
	}
	if _, ok := treePairs[tree]; !ok {
		treePairs[tree] = map[string]migrationPair{}
	}
	pair := treePairs[tree][version]
	if isUp {
		pair.up = true
	} else {
		pair.down = true
	}
	treePairs[tree][version] = pair
}

func migrationTreeFromPath(filePath string) string {
	filePath = strings.TrimSpace(filePath)
	if filePath == "" {
		return "default"
	}
	parts := strings.Split(filePath, "/")
	if len(parts) > 1 {
		switch strings.ToLower(strings.TrimSpace(parts[0])) {
		case "sqlite", "postgres":
			return strings.ToLower(strings.TrimSpace(parts[0]))
		}
	}
	return "default"
}

func versionsForTree(treePairs map[string]map[string]migrationPair, tree string) ([]string, bool) {
	tree = strings.TrimSpace(tree)
	pairs, ok := treePairs[tree]
	if !ok || len(pairs) == 0 {
		return nil, false
	}
	versions := make([]string, 0, len(pairs))
	for version := range pairs {
		versions = append(versions, version)
	}
	sort.Strings(versions)
	return versions, true
}

func sameStringSet(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if strings.TrimSpace(left[i]) != strings.TrimSpace(right[i]) {
			return false
		}
	}
	return true
}
