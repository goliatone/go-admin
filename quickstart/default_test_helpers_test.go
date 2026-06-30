package quickstart

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	fggate "github.com/goliatone/go-featuregate/gate"
)

type allowAllQuickstartAuthorizer struct{}

func (allowAllQuickstartAuthorizer) Can(context.Context, string, string) bool { return true }

type stubModule struct {
	id           string
	deps         []string
	featureFlags []string
	menuItems    []admin.MenuItem
}

func (m stubModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: m.id, Dependencies: m.deps, FeatureFlags: m.featureFlags}
}

func (m stubModule) Register(ctx admin.ModuleContext) error {
	_ = ctx
	return nil
}

func (m stubModule) MenuItems(locale string) []admin.MenuItem {
	_ = locale
	if len(m.menuItems) == 0 {
		return nil
	}
	items := make([]admin.MenuItem, len(m.menuItems))
	copy(items, m.menuItems)
	return items
}

type stubFeatureGate struct {
	flags map[string]bool
}

func (s stubFeatureGate) Enabled(_ context.Context, key string, opts ...fggate.ResolveOption) (bool, error) {
	req := &fggate.ResolveRequest{}
	for _, opt := range opts {
		if opt != nil {
			opt(req)
		}
	}
	if req.ScopeChain == nil || !hasScopeKind(*req.ScopeChain, fggate.ScopeSystem) {
		return false, errors.New("feature gate scope required")
	}
	return s.flags[key], nil
}

func hasScopeKind(chain fggate.ScopeChain, kind fggate.ScopeKind) bool {
	for _, ref := range chain {
		if ref.Kind == kind {
			return true
		}
	}
	return false
}

func toString(value any) string {
	if value == nil {
		return ""
	}
	if typed, ok := value.(string); ok {
		return typed
	}
	return ""
}

func requireTestValue[T any](t *testing.T, value any, label string) T {
	t.Helper()
	typed, ok := value.(T)
	if !ok {
		var zero T
		t.Fatalf("expected %s to be %T, got %T", label, zero, value)
	}
	return typed
}
