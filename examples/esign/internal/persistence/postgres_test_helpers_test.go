package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func requirePostgresTestDSN(t *testing.T) string {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("ESIGN_TEST_POSTGRES_DSN"))
	if dsn != "" {
		return isolatedPostgresTestDSN(t, dsn)
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("CI")), "true") || strings.TrimSpace(os.Getenv("ESIGN_REQUIRE_POSTGRES_TESTS")) == "1" {
		t.Fatalf("ESIGN_TEST_POSTGRES_DSN is required for postgres persistence coverage")
	}
	t.Skip("set ESIGN_TEST_POSTGRES_DSN to run postgres persistence coverage")
	return ""
}

var postgresTestSchemaSanitizer = regexp.MustCompile(`[^a-z0-9_]+`)

func isolatedPostgresTestDSN(t *testing.T, baseDSN string) string {
	t.Helper()

	schemaName := postgresTestSchemaName(t.Name())
	parsed, err := url.Parse(baseDSN)
	if err != nil {
		t.Fatalf("parse postgres test dsn: %v", err)
	}

	db, err := sql.Open("postgres", baseDSN)
	if err != nil {
		t.Fatalf("open postgres test admin connection: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		t.Fatalf("ping postgres test admin connection: %v", err)
	}
	if _, err := db.ExecContext(ctx, fmt.Sprintf(`CREATE SCHEMA "%s"`, schemaName)); err != nil {
		_ = db.Close()
		t.Fatalf("create isolated postgres test schema %q: %v", schemaName, err)
	}

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		if _, err := db.ExecContext(cleanupCtx, fmt.Sprintf(`DROP SCHEMA IF EXISTS "%s" CASCADE`, schemaName)); err != nil {
			t.Errorf("drop isolated postgres test schema %q: %v", schemaName, err)
		}
		if err := db.Close(); err != nil {
			t.Errorf("close postgres test admin connection: %v", err)
		}
	})

	query := parsed.Query()
	query.Set("search_path", schemaName)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func postgresTestSchemaName(testName string) string {
	name := strings.ToLower(strings.TrimSpace(testName))
	name = strings.ReplaceAll(name, "/", "_")
	name = postgresTestSchemaSanitizer.ReplaceAllString(name, "_")
	name = strings.Trim(name, "_")
	if name == "" {
		name = "persistence"
	}
	if len(name) > 40 {
		name = name[:40]
	}
	return fmt.Sprintf("test_%s_%d", name, time.Now().UnixNano())
}
