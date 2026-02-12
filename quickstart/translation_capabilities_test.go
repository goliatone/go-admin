package quickstart

import (
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestTranslationCapabilityRoutesIncludeExchangeUIKey(t *testing.T) {
	adm, err := admin.New(admin.Config{BasePath: "/admin"}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	routes, keys := translationCapabilityRoutes(adm)
	path := strings.TrimSpace(routes["admin.translations.exchange"])
	if path == "" {
		t.Fatalf("expected exchange ui route key in capabilities routes")
	}
	if !strings.Contains(path, "translations/exchange") {
		t.Fatalf("expected exchange route path to contain translations/exchange, got %q", path)
	}

	found := false
	for _, key := range keys {
		if key == "admin.translations.exchange" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected resolver key admin.translations.exchange in %v", keys)
	}
}
