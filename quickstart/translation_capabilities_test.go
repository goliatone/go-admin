package quickstart

import (
	"slices"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestTranslationCapabilityRoutesIncludeTranslationUIKeys(t *testing.T) {
	adm, err := admin.New(admin.Config{BasePath: "/admin"}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	routes, keys := translationCapabilityRoutes(adm)
	expected := map[string]string{
		"admin.translations.exchange":                "/admin/translations/exchange",
		"admin.translations.families":                "/admin/translations/families",
		"admin.api.translations.families":            "/admin/api/translations/families",
		"admin.translations.families.id":             "/admin/translations/families/:family_id",
		"admin.api.translations.families.id":         "/admin/api/translations/families/:family_id",
		"admin.api.translations.families.variants":   "/admin/api/translations/families/:family_id/variants",
		"admin.api.translations.assignments.preview": "/admin/api/translations/assignments/:assignment_id/preview",
	}
	for key, wantPath := range expected {
		if got := strings.TrimSpace(routes[key]); got != wantPath {
			t.Fatalf("expected capability route %s=%q, got %q", key, wantPath, got)
		}
		if !slices.Contains(keys, key) {
			t.Fatalf("expected resolver key %s in %v", key, keys)
		}
	}
}

func TestTranslationCapabilityRoutesRespectCoreProfile(t *testing.T) {
	cleanupGlobalCommandRegistry(t)
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProfile(TranslationProfileCore))
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	routes := translationRoutesToStrings(caps["routes"])
	resolverKeys := translationStringSlice(caps["resolver_keys"])

	expectedCoreRoutes := map[string]string{
		"admin.translations.families":        "/admin/translations/families",
		"admin.translations.families.id":     "/admin/translations/families/:family_id",
		"admin.api.translations.families":    "/admin/api/translations/families",
		"admin.api.translations.families.id": "/admin/api/translations/families/:family_id",
	}
	for key, wantPath := range expectedCoreRoutes {
		if got := strings.TrimSpace(routes[key]); got != wantPath {
			t.Fatalf("expected core capability route %s=%q, got %q", key, wantPath, got)
		}
		if !slices.Contains(resolverKeys, key) {
			t.Fatalf("expected core resolver key %s in %v", key, resolverKeys)
		}
	}
	for _, disabledKey := range []string{
		"admin.translations.queue",
		"admin.translations.dashboard",
		"admin.translations.exchange",
		"admin.api.translations.dashboard",
		"admin.api.translations.queue",
		"admin.api.translations.assignments",
		"admin.api.translations.assignments.id",
		"admin.api.translations.assignments.preview",
		"admin.api.translations.export",
	} {
		if got := strings.TrimSpace(routes[disabledKey]); got != "" {
			t.Fatalf("expected disabled module route %s to be hidden in core profile, got %q", disabledKey, got)
		}
		if slices.Contains(resolverKeys, disabledKey) {
			t.Fatalf("expected disabled module resolver key %s to be hidden in core profile: %v", disabledKey, resolverKeys)
		}
	}
}

func TestTranslationCapabilityRoutesHideTranslationRoutesWhenProfileNone(t *testing.T) {
	cleanupGlobalCommandRegistry(t)
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithTranslationProfile(TranslationProfileNone))
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	caps := TranslationCapabilities(adm)
	routes := translationRoutesToStrings(caps["routes"])
	resolverKeys := translationStringSlice(caps["resolver_keys"])

	for key, path := range routes {
		if strings.Contains(key, ".translations.") || strings.Contains(path, "/translations") {
			t.Fatalf("expected profile none to hide translation route %s=%q", key, path)
		}
	}
	for _, key := range resolverKeys {
		if strings.Contains(key, ".translations.") {
			t.Fatalf("expected profile none to hide translation resolver key %s in %v", key, resolverKeys)
		}
	}
}
