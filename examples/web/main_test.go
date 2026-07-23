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
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	goerrors "github.com/goliatone/go-errors"
)

func TestExampleEntryNavigationOptionsDocumentReusablePolicy(t *testing.T) {
	options := exampleEntryNavigationOptions()
	if options.Enabled == nil || !*options.Enabled {
		t.Fatalf("expected entry navigation enabled")
	}
	if options.AllowInstanceOverride == nil || !*options.AllowInstanceOverride {
		t.Fatalf("expected per-entry overrides enabled")
	}
	if options.ActivityAction != coreadmin.DefaultEntryNavigationActivityAction {
		t.Fatalf("expected default activity action, got %q", options.ActivityAction)
	}

	required := map[string]coreadmin.EntryNavigationTypeOptions{
		"page": {
			ViewPermission:     admin.PermAdminPagesView,
			EditPermission:     admin.PermAdminPagesEdit,
			PermissionResource: "pages",
		},
		"post": {
			ViewPermission:     admin.PermAdminPostsView,
			EditPermission:     admin.PermAdminPostsEdit,
			PermissionResource: "posts",
		},
		"news": {
			ViewPermission:     admin.PermAdminPostsView,
			EditPermission:     admin.PermAdminPostsEdit,
			PermissionResource: "news",
		},
	}
	for contentType, want := range required {
		got, ok := options.ContentTypes[contentType]
		if !ok {
			t.Fatalf("expected content type %q in entry navigation options", contentType)
		}
		if got.ViewPermission != want.ViewPermission || got.EditPermission != want.EditPermission || got.PermissionResource != want.PermissionResource {
			t.Fatalf("content type %q options = %+v, want %+v", contentType, got, want)
		}
	}

	labels := exampleActivityActionLabels()
	if got := labels[coreadmin.DefaultEntryNavigationActivityAction]; got != "Navigation visibility updated" {
		t.Fatalf("expected entry navigation activity label, got %q", got)
	}
}

func TestExampleDeploymentIdentityConfig(t *testing.T) {
	cfg := exampleDeploymentIdentityConfig(" Example Admin ", " staging ")
	if cfg.AppID != "go-admin-web-example" || cfg.AppName != "Example Admin" || cfg.Environment != "staging" {
		t.Fatalf("unexpected deployment identity example: %+v", cfg)
	}
	if cfg.EnvironmentColors["staging"] != "#f59e0b" {
		t.Fatalf("expected example staging color override: %+v", cfg.EnvironmentColors)
	}
	if cfg.InstanceName != "" || cfg.InstanceID != "" {
		t.Fatalf("example should demonstrate generated instance identity: %+v", cfg)
	}
}

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
