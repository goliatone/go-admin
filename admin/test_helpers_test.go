package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-command/registry"
)

func mustNewAdmin(t *testing.T, cfg Config, deps Dependencies) *Admin {
	t.Helper()
	_ = registry.Stop(context.Background())
	adm, err := New(cfg, deps)
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm != nil && adm.Commands() != nil {
		t.Cleanup(func() {
			adm.Commands().Reset()
		})
	}
	return adm
}
