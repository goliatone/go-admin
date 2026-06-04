package main

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/quickstart"
	goerrors "github.com/goliatone/go-errors"
)

func TestTriggerTestErrorPanicReturnsInternalError(t *testing.T) {
	err := triggerTestError("panic")
	if err == nil {
		t.Fatal("expected panic test route to return an error")
	}

	var appErr *goerrors.Error
	if !errors.As(err, &appErr) {
		t.Fatalf("expected go-errors.Error, got %T", err)
	}
	if appErr.Code != fiber.StatusInternalServerError {
		t.Fatalf("expected internal server error code, got %d", appErr.Code)
	}
	if appErr.TextCode != "INTENTIONAL_PANIC_TEST_ERROR" {
		t.Fatalf("expected panic-equivalent text code, got %q", appErr.TextCode)
	}
	if got := appErr.Metadata["test_type"]; got != "panic" {
		t.Fatalf("expected panic test metadata, got %#v", got)
	}
}

func TestRepairPersistentTranslationScopeDriftBackfillsDevDatabase(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))
	if _, err := setup.SetupPersistentCMS(ctx, "en", dsn); err != nil {
		t.Fatalf("setup persistent cms: %v", err)
	}
	db, err := stores.SetupContentDatabase(ctx, dsn)
	if err != nil {
		t.Fatalf("open content db: %v", err)
	}
	t.Cleanup(func() {
		if closeErr := db.Close(); closeErr != nil {
			t.Errorf("close db: %v", closeErr)
		}
	})

	if _, err := db.ExecContext(ctx, `INSERT INTO content_families (
		family_id, tenant_id, org_id, content_type, source_locale, readiness_state
	) VALUES (
		'family-startup-repair', '', '', 'pages', 'en', 'ready'
	)`); err != nil {
		t.Fatalf("seed blank-scope family: %v", err)
	}

	report, err := repairPersistentTranslationScopeDrift(ctx, coreadmin.Config{
		ScopeMode:       "single",
		DefaultTenantID: "tenant-startup",
		DefaultOrgID:    "org-startup",
	}, quickstart.NewBunScopeDriftInspector(db))
	if err != nil {
		t.Fatalf("repair startup scope drift: %v", err)
	}
	if report.TotalRepairedCount != 1 {
		t.Fatalf("expected one repaired row, got %+v", report)
	}

	var tenantID, orgID string
	if err := db.QueryRowContext(ctx, `SELECT tenant_id, org_id FROM content_families WHERE family_id = ?`, "family-startup-repair").Scan(&tenantID, &orgID); err != nil {
		t.Fatalf("load repaired family: %v", err)
	}
	if tenantID != "tenant-startup" || orgID != "org-startup" {
		t.Fatalf("scope = (%q, %q), want startup defaults", tenantID, orgID)
	}
}
