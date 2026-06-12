package admin

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-command/registry"
	fggate "github.com/goliatone/go-featuregate/gate"
)

func mustNewAdmin(t *testing.T, cfg Config, deps Dependencies) *Admin {
	t.Helper()
	return mustNewAdminWithDeps(t, cfg, deps)
}

func mustNewAdminWithoutAuthorizer(t *testing.T, cfg Config, deps Dependencies) *Admin {
	t.Helper()
	return mustNewAdminWithDeps(t, cfg, deps)
}

func mustNewAdminWithDeps(t *testing.T, cfg Config, deps Dependencies) *Admin {
	t.Helper()
	if err := registry.Stop(context.Background()); err != nil {
		t.Fatalf("stop command registry: %v", err)
	}
	if cfg.AuthConfig == nil {
		cfg.AuthConfig = &AuthConfig{AllowUnauthenticatedRoutes: true}
	}
	adm, err := New(cfg, deps)
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm != nil && adm.Commands() != nil {
		t.Cleanup(func() {
			adm.Commands().Reset()
			if err := registry.Stop(context.Background()); err != nil {
				t.Fatalf("stop command registry cleanup: %v", err)
			}
		})
	}
	return adm
}

func featureGateFromFlags(flags map[string]bool) fggate.FeatureGate {
	return newFeatureGateFromFlags(flags)
}

func featureGateFromKeys(keys ...FeatureKey) fggate.FeatureGate {
	if len(keys) == 0 {
		return newFeatureGateFromFlags(nil)
	}
	flags := make(map[string]bool, len(keys))
	for _, key := range keys {
		if key == "" {
			continue
		}
		flags[string(key)] = true
	}
	return newFeatureGateFromFlags(flags)
}

func testHTTPRequest(method, target string, body io.Reader) *http.Request {
	return httptest.NewRequestWithContext(context.Background(), method, target, body)
}

func mustMarshalJSON(t *testing.T, value any) []byte {
	t.Helper()
	body, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal JSON: %v", err)
	}
	return body
}

func mustUnmarshalJSON(t *testing.T, body []byte, target any) {
	t.Helper()
	if err := json.Unmarshal(body, target); err != nil {
		t.Fatalf("unmarshal JSON: %v", err)
	}
}

func mustMapAny(t *testing.T, value any, label string) map[string]any {
	t.Helper()
	result, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("%s: expected map[string]any, got %T", label, value)
	}
	return result
}

func mustAnySlice(t *testing.T, value any, label string) []any {
	t.Helper()
	result, ok := value.([]any)
	if !ok {
		t.Fatalf("%s: expected []any, got %T", label, value)
	}
	return result
}

func mustString(t *testing.T, value any, label string) string {
	t.Helper()
	result, ok := value.(string)
	if !ok {
		t.Fatalf("%s: expected string, got %T", label, value)
	}
	return result
}

func mustBool(t *testing.T, value any, label string) bool {
	t.Helper()
	result, ok := value.(bool)
	if !ok {
		t.Fatalf("%s: expected bool, got %T", label, value)
	}
	return result
}
