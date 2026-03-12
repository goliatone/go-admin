package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/stretchr/testify/require"
)

func TestTranslationQAMenuItemsExposePhaseOneAndTwoRoutesForFullProfile(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithFeatureDefaults(map[string]bool{
			string(coreadmin.FeatureCMS): true,
		}),
		quickstart.WithTranslationPolicyConfig(exampleTranslationPolicyConfig()),
		quickstart.WithTranslationProductConfig(buildTranslationProductConfig(
			quickstart.TranslationProfileFull,
			noopExchangeStore{},
			coreadmin.NewInMemoryTranslationAssignmentRepository(),
			appcfg.TranslationConfig{
				Profile:  "full",
				Exchange: boolPtr(true),
				Queue:    boolPtr(true),
			},
		)),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}

	items := translationQAMenuItems(adm, cfg)
	if len(items) != 6 {
		t.Fatalf("expected 6 QA items for full profile, got %d", len(items))
	}

	assertMenuItemPath(t, items, "example.translation.qa.family", "/admin/translations/families/"+exampleTranslationQAFamilyID)
	assertMenuItemLabel(t, items, "example.translation.qa.family", "Family Detail + Create Locale (QA)")
	assertMenuItemPath(t, items, "example.translation.qa.content_summary", translationQAContentSummaryPath("/admin"))
	assertMenuItemPath(t, items, "example.translation.qa.fallback_edit", translationQAFallbackEditPath("/admin"))
	assertMenuItemPath(t, items, "example.translation.qa.matrix", "/admin/translations/matrix")
	assertMenuItemPath(t, items, "example.translation.qa.queue", "/admin/translations/queue")
	assertMenuItemPath(t, items, "example.translation.qa.editor", "/admin/translations/assignments/"+exampleTranslationQAAssignmentID+"/edit")
}

func TestTranslationQAMenuItemsKeepCoreRoutesWhenQueueDisabled(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithFeatureDefaults(map[string]bool{
			string(coreadmin.FeatureCMS): true,
		}),
		quickstart.WithTranslationPolicyConfig(exampleTranslationPolicyConfig()),
		quickstart.WithTranslationProductConfig(buildTranslationProductConfig(
			quickstart.TranslationProfileCore,
			noopExchangeStore{},
			coreadmin.NewInMemoryTranslationAssignmentRepository(),
			appcfg.TranslationConfig{Profile: "core"},
		)),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}

	items := translationQAMenuItems(adm, cfg)
	if len(items) != 4 {
		t.Fatalf("expected 4 QA items for core profile, got %d", len(items))
	}

	assertMenuItemPath(t, items, "example.translation.qa.family", "/admin/translations/families/"+exampleTranslationQAFamilyID)
	assertMenuItemLabel(t, items, "example.translation.qa.family", "Family Detail + Create Locale (QA)")
	assertMenuItemPath(t, items, "example.translation.qa.content_summary", translationQAContentSummaryPath("/admin"))
	assertMenuItemPath(t, items, "example.translation.qa.fallback_edit", translationQAFallbackEditPath("/admin"))
	assertMenuItemPath(t, items, "example.translation.qa.matrix", "/admin/translations/matrix")
	if findMenuItemByID(items, "example.translation.qa.queue") != nil {
		t.Fatalf("expected queue QA item to be absent when queue capability disabled")
	}
	if findMenuItemByID(items, "example.translation.qa.editor") != nil {
		t.Fatalf("expected editor QA item to be absent when queue capability disabled")
	}
}

func TestRegisterTranslationQARoutesRedirectToSeededContentSummaryAndFallbackEditTargets(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db"))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err)
	require.NotNil(t, cmsOpts.Container)

	page, err := findPageBySlug(ctx, cmsOpts.Container.ContentService(), exampleTranslationQueueSourceSlug)
	require.NoError(t, err)
	require.NotNil(t, page)
	require.NotEmpty(t, strings.TrimSpace(page.ID))

	cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
	server, r := quickstart.NewFiberServer(nil, cfg, nil, false, quickstart.WithFiberLogger(false))
	registerTranslationQARoutes(r, cfg, cmsOpts.Container.ContentService(), nil)
	server.Init()

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{
			name:     "content summary",
			path:     translationQAContentSummaryPath(cfg.BasePath),
			expected: fmt.Sprintf("/admin/content/pages/%s?locale=%s", page.ID, exampleTranslationQueueTargetLocale),
		},
		{
			name:     "fallback edit",
			path:     translationQAFallbackEditPath(cfg.BasePath),
			expected: fmt.Sprintf("/admin/content/pages/%s/edit?locale=%s", page.ID, exampleTranslationQueueTargetLocale),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			res, err := server.WrappedRouter().Test(req, -1)
			require.NoError(t, err)
			defer func() {
				_ = res.Body.Close()
			}()

			require.Equal(t, http.StatusFound, res.StatusCode)
			require.Equal(t, tc.expected, res.Header.Get("Location"))
		})
	}
}

func assertMenuItemPath(t *testing.T, items []coreadmin.MenuItem, id, want string) {
	t.Helper()
	item := findMenuItemByID(items, id)
	if item == nil {
		t.Fatalf("expected menu item %q", id)
	}
	got, _ := item.Target["path"].(string)
	if got != want {
		t.Fatalf("expected %s path %q, got %q", id, want, got)
	}
}

func assertMenuItemLabel(t *testing.T, items []coreadmin.MenuItem, id, want string) {
	t.Helper()
	item := findMenuItemByID(items, id)
	if item == nil {
		t.Fatalf("expected menu item %q", id)
	}
	if item.Label != want {
		t.Fatalf("expected %s label %q, got %q", id, want, item.Label)
	}
}

func findMenuItemByID(items []coreadmin.MenuItem, id string) *coreadmin.MenuItem {
	for idx := range items {
		if items[idx].ID == id {
			return &items[idx]
		}
	}
	return nil
}
