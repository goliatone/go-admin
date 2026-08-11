package client

import (
	"io/fs"
	"os"
	"sort"
	"strings"
	"testing"
)

type adminShellInventoryEntry struct {
	surface  string
	provider string
}

// authenticatedTemplateInventory is the executable source inventory for the
// canonical shell migration. Keep this exact list intentional: adding a new
// authenticated page must select both a surface group and a context provider.
var authenticatedTemplateInventory = map[string]adminShellInventoryEntry{
	"admin-error.html":                               {"shared-error", "error-handler"},
	"admin.html":                                     {"dashboard-client", "quickstart"},
	"dashboard_ssr.html":                             {"dashboard-ssr", "dashboard-chrome"},
	"feature-unavailable.html":                       {"shared", "quickstart"},
	"notifications.html":                             {"notifications", "quickstart"},
	"resources/activity/list.html":                   {"activity", "quickstart"},
	"resources/block-definitions/index.html":         {"content-modeling", "quickstart"},
	"resources/content-types/editor.html":            {"content-modeling", "quickstart"},
	"resources/content/detail.html":                  {"content", "quickstart"},
	"resources/content/form.html":                    {"content", "quickstart"},
	"resources/content/list.html":                    {"content", "quickstart"},
	"resources/debug/index_admin.html":               {"debug", "module"},
	"resources/feature-flags/index.html":             {"feature-flags", "quickstart"},
	"resources/media/detail.html":                    {"media", "module"},
	"resources/media/form.html":                      {"media", "module"},
	"resources/media/gallery.html":                   {"media", "module"},
	"resources/media/list.html":                      {"media", "module"},
	"resources/menus/detail.html":                    {"menus", "quickstart"},
	"resources/menus/form.html":                      {"menus", "quickstart"},
	"resources/menus/list.html":                      {"menus", "quickstart"},
	"resources/preferences/form.html":                {"preferences", "module"},
	"resources/profile/show.html":                    {"profile", "quickstart"},
	"resources/roles/detail.html":                    {"roles", "quickstart"},
	"resources/roles/form.html":                      {"roles", "quickstart"},
	"resources/roles/list.html":                      {"roles", "quickstart"},
	"resources/settings/show.html":                   {"settings", "quickstart"},
	"resources/shared/detail-base-with-sidebar.html": {"shared-crud", "quickstart"},
	"resources/shared/detail-base.html":              {"shared-crud", "quickstart"},
	"resources/shared/list-base.html":                {"shared-crud", "quickstart"},
	"resources/tenants/detail.html":                  {"tenants", "quickstart"},
	"resources/tenants/form.html":                    {"tenants", "quickstart"},
	"resources/tenants/list.html":                    {"tenants", "quickstart"},
	"resources/translations/dashboard.html":          {"translations", "quickstart"},
	"resources/translations/editor.html":             {"translations", "quickstart"},
	"resources/translations/exchange.html":           {"translations", "quickstart"},
	"resources/translations/families.html":           {"translations", "quickstart"},
	"resources/translations/family-assignments.html": {"translations", "quickstart"},
	"resources/translations/family-detail.html":      {"translations", "quickstart"},
	"resources/translations/matrix.html":             {"translations", "quickstart"},
	"resources/translations/shell.html":              {"translations", "quickstart"},
	"resources/user-profiles/detail.html":            {"profiles", "quickstart"},
	"resources/user-profiles/form.html":              {"profiles", "quickstart"},
	"resources/user-profiles/list.html":              {"profiles", "quickstart"},
	"resources/users/detail.html":                    {"users", "quickstart"},
	"resources/users/form.html":                      {"users", "quickstart"},
	"resources/users/list.html":                      {"users", "quickstart"},
}

// packagedDocumentOwners classifies every template that owns an HTML document.
// Leaf templates may extend one of these owners, but adding another doctype is
// an explicit shell decision and must update this inventory.
var packagedDocumentOwners = map[string]string{
	"error.html":                 "standalone-error",
	"export.html":                "standalone-export",
	"layout.html":                "authenticated-shell",
	"login-layout.html":          "unauthenticated-shell",
	"resources/debug/index.html": "standalone-debug",
	"site/base.html":             "public-site-shell",
}

func TestPackagedDocumentOwnersAreExplicitlyClassified(t *testing.T) {
	tplFS := Templates()
	discovered := make([]string, 0, len(packagedDocumentOwners))
	err := fs.WalkDir(tplFS, ".", func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil || entry == nil || entry.IsDir() || !strings.HasSuffix(path, ".html") {
			return walkErr
		}
		content, err := fs.ReadFile(tplFS, path)
		if err != nil {
			return err
		}
		if strings.Contains(strings.ToLower(string(content)), "<!doctype html>") {
			discovered = append(discovered, path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk packaged templates: %v", err)
	}
	sort.Strings(discovered)

	missing := make([]string, 0)
	for _, path := range discovered {
		if strings.TrimSpace(packagedDocumentOwners[path]) == "" {
			missing = append(missing, path)
		}
	}
	stale := make([]string, 0)
	for path := range packagedDocumentOwners {
		if _, err := fs.Stat(tplFS, path); err != nil {
			stale = append(stale, path)
		}
	}
	sort.Strings(missing)
	sort.Strings(stale)
	if len(missing) != 0 || len(stale) != 0 || len(discovered) != len(packagedDocumentOwners) {
		t.Fatalf("document-owner inventory mismatch: missing=%v stale=%v discovered=%d classified=%d", missing, stale, len(discovered), len(packagedDocumentOwners))
	}
}

func TestAuthenticatedTemplateInventoryIsComplete(t *testing.T) {
	tplFS := Templates()
	discovered := make([]string, 0, len(authenticatedTemplateInventory))
	err := fs.WalkDir(tplFS, ".", func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil || entry == nil || entry.IsDir() || !strings.HasSuffix(path, ".html") {
			return walkErr
		}
		content, err := fs.ReadFile(tplFS, path)
		if err != nil {
			return err
		}
		source := strings.TrimSpace(string(content))
		if strings.HasPrefix(source, `{% extends "layout.html" %}`) ||
			strings.HasPrefix(source, `{% extends "resources/shared/`) {
			discovered = append(discovered, path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk packaged templates: %v", err)
	}
	sort.Strings(discovered)

	missing := make([]string, 0)
	for _, path := range discovered {
		entry, ok := authenticatedTemplateInventory[path]
		if !ok || entry.surface == "" || entry.provider == "" {
			missing = append(missing, path)
		}
	}
	stale := make([]string, 0)
	for path := range authenticatedTemplateInventory {
		if _, err := fs.Stat(tplFS, path); err != nil {
			stale = append(stale, path)
		}
	}
	sort.Strings(missing)
	sort.Strings(stale)
	if len(missing) != 0 || len(stale) != 0 || len(discovered) != len(authenticatedTemplateInventory) {
		t.Fatalf("authenticated template inventory mismatch: missing=%v stale=%v discovered=%d classified=%d", missing, stale, len(discovered), len(authenticatedTemplateInventory))
	}
}

func TestAuthenticatedTemplateInventoryCoversContextProviders(t *testing.T) {
	providers := map[string]bool{}
	for _, entry := range authenticatedTemplateInventory {
		providers[entry.provider] = true
	}
	for _, required := range []string{"quickstart", "module", "dashboard-chrome", "error-handler"} {
		if !providers[required] {
			t.Fatalf("authenticated template inventory is missing provider %q", required)
		}
	}
}

func TestQuickstartContextProviderUsesTypedPageChromeProjection(t *testing.T) {
	source, err := os.ReadFile("../../quickstart/ui_routes.go")
	if err != nil {
		t.Fatalf("read quickstart UI provider: %v", err)
	}
	if !strings.Contains(string(source), "admin.EnrichLayoutViewContextWithChrome(") {
		t.Fatal("central quickstart UI provider must project route presentation through typed page chrome")
	}
}

func TestModuleContextProvidersUseTypedPageChromeProjection(t *testing.T) {
	for _, path := range []string{
		"../../admin/debug_view.go",
		"../../admin/media_module.go",
		"../../admin/preferences_ui.go",
		"../../admin/boot_bindings_dashboard.go",
	} {
		source, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read module UI provider %s: %v", path, err)
		}
		if !strings.Contains(string(source), "LayoutViewContextWithChrome") {
			t.Errorf("module UI provider %s must project presentation through typed page chrome", path)
		}
	}
}

func TestAuthenticatedTemplatesUseCanonicalShellContract(t *testing.T) {
	tplFS := Templates()
	for path := range authenticatedTemplateInventory {
		content, err := fs.ReadFile(tplFS, path)
		if err != nil {
			t.Fatalf("read authenticated template %s: %v", path, err)
		}
		source := strings.TrimSpace(string(content))
		if !strings.HasPrefix(source, `{% extends "layout.html" %}`) &&
			!strings.HasPrefix(source, `{% extends "resources/shared/`) {
			t.Errorf("%s must inherit the canonical authenticated shell", path)
		}
		for _, prohibited := range []string{
			`data-admin-page-header`,
			`partials/admin-page-header.html`,
			`aria-label="Breadcrumb"`,
		} {
			if strings.Contains(source, prohibited) {
				t.Errorf("%s contains competing shell markup %q", path, prohibited)
			}
		}
	}

	breadcrumbRenderers := []string{}
	headerOwners := []string{}
	err := fs.WalkDir(tplFS, ".", func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil || entry == nil || entry.IsDir() || !strings.HasSuffix(path, ".html") {
			return walkErr
		}
		content, err := fs.ReadFile(tplFS, path)
		if err != nil {
			return err
		}
		source := string(content)
		if strings.Contains(source, `aria-label="Breadcrumb"`) {
			breadcrumbRenderers = append(breadcrumbRenderers, path)
		}
		if strings.Contains(source, `data-admin-page-header`) {
			headerOwners = append(headerOwners, path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk packaged templates: %v", err)
	}
	sort.Strings(breadcrumbRenderers)
	sort.Strings(headerOwners)
	if strings.Join(breadcrumbRenderers, ",") != "partials/breadcrumbs.html" {
		t.Fatalf("canonical breadcrumb renderer drift: got %v", breadcrumbRenderers)
	}
	if strings.Join(headerOwners, ",") != "layout.html,partials/admin-page-header.html" {
		t.Fatalf("canonical header owners drift: got %v", headerOwners)
	}
}

func TestCompatibilityPageHeaderAliasesAreNotUsedByPackagedTemplates(t *testing.T) {
	aliases := []string{
		"partials/admin-page-header.html",
		"partials/admin-page-heading.html",
	}
	tplFS := Templates()
	if err := fs.WalkDir(tplFS, ".", func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil || entry == nil || entry.IsDir() || !strings.HasSuffix(path, ".html") {
			return walkErr
		}
		content, err := fs.ReadFile(tplFS, path)
		if err != nil {
			return err
		}
		for _, alias := range aliases {
			if path != alias && strings.Contains(string(content), alias) {
				t.Errorf("%s must not include compatibility page-header alias %s", path, alias)
			}
		}
		return nil
	}); err != nil {
		t.Fatalf("walk packaged templates: %v", err)
	}
}
