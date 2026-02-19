package admin

import (
	"context"
	"testing"

	core "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/runner"
)

var (
	_ func(Config, Dependencies) (*Admin, error)                                                        = New
	_ func(context.Context, string) context.Context                                                     = WithEnvironment
	_ func(context.Context, string) context.Context                                                     = WithLocale
	_ func() *MemoryRepository                                                                          = NewMemoryRepository
	_ func(*CommandBus, command.Commander[struct{}], ...runner.Option) (dispatcher.Subscription, error) = RegisterCommand[struct{}]
)

func TestFacadeContextHelpersForward(t *testing.T) {
	ctx := context.Background()
	ctx = WithEnvironment(ctx, "staging")
	ctx = WithLocale(ctx, "es")

	if got := EnvironmentFromContext(ctx); got != "staging" {
		t.Fatalf("EnvironmentFromContext() = %q, want %q", got, "staging")
	}
	if got := LocaleFromContext(ctx); got != "es" {
		t.Fatalf("LocaleFromContext() = %q, want %q", got, "es")
	}

	coreCtx := core.WithLocale(core.WithEnvironment(context.Background(), "prod"), "en")
	if got, want := EnvironmentFromContext(coreCtx), core.EnvironmentFromContext(coreCtx); got != want {
		t.Fatalf("EnvironmentFromContext(coreCtx) = %q, want %q", got, want)
	}
	if got, want := LocaleFromContext(coreCtx), core.LocaleFromContext(coreCtx); got != want {
		t.Fatalf("LocaleFromContext(coreCtx) = %q, want %q", got, want)
	}
}

func TestFacadeGeneratedAliases(t *testing.T) {
	if TextCodeNotFound != core.TextCodeNotFound {
		t.Fatalf("TextCodeNotFound alias mismatch")
	}
	if CreateTranslationKey != core.CreateTranslationKey {
		t.Fatalf("CreateTranslationKey alias mismatch")
	}
	if ErrNotFound != core.ErrNotFound {
		t.Fatalf("ErrNotFound alias mismatch")
	}
}

func TestFacadeConstructorsAndManualHelper(t *testing.T) {
	if repo := NewMemoryRepository(); repo == nil {
		t.Fatal("NewMemoryRepository() returned nil")
	}
	if menu := NewInMemoryMenuService(); menu == nil {
		t.Fatal("NewInMemoryMenuService() returned nil")
	}
	if content := NewInMemoryContentService(); content == nil {
		t.Fatal("NewInMemoryContentService() returned nil")
	}
	if ptr := IntPtr(42); ptr == nil || *ptr != 42 {
		t.Fatalf("IntPtr(42) = %v", ptr)
	}
}
