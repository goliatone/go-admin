package admin

import "testing"

func TestNormalizeErrorConfigAppRoots(t *testing.T) {
	cfg := normalizeErrorConfig(ErrorConfig{
		AppRoots: []string{"  /app/service/../service  ", "", "./cmd/admin/.."},
	}, DebugConfig{})

	if len(cfg.AppRoots) != 2 {
		t.Fatalf("AppRoots len = %d, want 2", len(cfg.AppRoots))
	}
	if cfg.AppRoots[0] != "/app/service" {
		t.Fatalf("first root = %q, want /app/service", cfg.AppRoots[0])
	}
	if cfg.AppRoots[1] != "cmd" {
		t.Fatalf("second root = %q, want cmd", cfg.AppRoots[1])
	}
}
