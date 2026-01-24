package modules

import (
	"context"
	"errors"
	"testing"

	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	fggate "github.com/goliatone/go-featuregate/gate"
)

func TestOrderResolvesDependencies(t *testing.T) {
	child := stubModule{manifest: Manifest{ID: "child"}}
	parent := stubModule{manifest: Manifest{ID: "parent", Dependencies: []string{"child"}}}

	ordered, err := Order([]Module{parent, child})
	if err != nil {
		t.Fatalf("order failed: %v", err)
	}
	if len(ordered) != 2 || ordered[0].Manifest().ID != "child" || ordered[1].Manifest().ID != "parent" {
		t.Fatalf("unexpected order: %#v", ordered)
	}
}

func TestOrderDetectsMissingDependencies(t *testing.T) {
	parent := stubModule{manifest: Manifest{ID: "parent", Dependencies: []string{"missing"}}}
	if _, err := Order([]Module{parent}); err == nil {
		t.Fatalf("expected missing dependency error")
	}
}

func TestOrderDetectsCycles(t *testing.T) {
	a := stubModule{manifest: Manifest{ID: "a", Dependencies: []string{"b"}}}
	b := stubModule{manifest: Manifest{ID: "b", Dependencies: []string{"a"}}}
	if _, err := Order([]Module{a, b}); err == nil {
		t.Fatalf("expected cycle detection error")
	}
}

func TestLoadAppliesCallbacksAndGates(t *testing.T) {
	ctx := context.Background()
	translator := noopTranslator{}
	menuContributor := &stubModule{
		manifest: Manifest{ID: "nav", FeatureFlags: []string{"enabled"}},
		menu:     []navinternal.MenuItem{{Label: "One"}},
	}
	gates := featureGateStub{flags: map[string]bool{"enabled": true}}
	registered := []string{}
	menuSeen := 0
	defaultsCalled := false

	err := Load(ctx, LoadOptions{
		Modules:    []Module{menuContributor},
		Gates:      gates,
		Translator: translator,
		RegisterDefaults: func() error {
			defaultsCalled = true
			return nil
		},
		Register: func(m Module) error {
			registered = append(registered, m.Manifest().ID)
			return nil
		},
		AddMenuItems: func(_ context.Context, items []navinternal.MenuItem) error {
			menuSeen += len(items)
			return nil
		},
	})
	if err != nil {
		t.Fatalf("load failed: %v", err)
	}
	if !defaultsCalled {
		t.Fatalf("expected defaults callback to run")
	}
	if len(registered) != 1 || registered[0] != "nav" {
		t.Fatalf("unexpected registration order: %v", registered)
	}
	if menuSeen != 1 {
		t.Fatalf("expected menu items to propagate, got %d", menuSeen)
	}
	if translated := menuContributor.translator; translated == nil {
		t.Fatalf("translator was not injected")
	}
}

func TestLoadReturnsFeatureDisabledError(t *testing.T) {
	ctx := context.Background()
	mod := stubModule{manifest: Manifest{ID: "needs.flag", FeatureFlags: []string{"missing"}}}
	sentinel := errors.New("sentinel")
	err := Load(ctx, LoadOptions{
		Modules:       []Module{mod},
		Gates:         featureGateStub{flags: map[string]bool{}},
		DisabledError: func(feature, moduleID string) error { return sentinel },
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected sentinel error, got %v", err)
	}
}

type stubModule struct {
	manifest   Manifest
	menu       []navinternal.MenuItem
	translator Translator
}

func (m stubModule) Manifest() Manifest {
	return m.manifest
}

func (m *stubModule) WithTranslator(t Translator) {
	m.translator = t
}

func (m *stubModule) MenuItems(locale string) []navinternal.MenuItem {
	out := []navinternal.MenuItem{}
	for _, item := range m.menu {
		item.Locale = locale
		out = append(out, item)
	}
	return out
}

type featureGateStub struct {
	flags map[string]bool
}

func (f featureGateStub) Enabled(_ context.Context, key string, _ ...fggate.ResolveOption) (bool, error) {
	return f.flags[key], nil
}

type noopTranslator struct{}

func (noopTranslator) Translate(locale, key string, args ...any) (string, error) {
	return key + ":" + locale, nil
}
