package admin

import "testing"

func mustNewAdmin(t *testing.T, cfg Config, deps Dependencies) *Admin {
	t.Helper()
	adm, err := New(cfg, deps)
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	return adm
}
