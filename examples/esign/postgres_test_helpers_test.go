package main

import (
	"os"
	"strings"
	"testing"
)

func requirePostgresRuntimeTestDSN(t *testing.T) string {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("ESIGN_TEST_POSTGRES_DSN"))
	if dsn != "" {
		return dsn
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("CI")), "true") || strings.TrimSpace(os.Getenv("ESIGN_REQUIRE_POSTGRES_TESTS")) == "1" {
		t.Fatalf("ESIGN_TEST_POSTGRES_DSN is required for postgres runtime coverage")
	}
	t.Skip("set ESIGN_TEST_POSTGRES_DSN to run postgres runtime coverage")
	return ""
}
