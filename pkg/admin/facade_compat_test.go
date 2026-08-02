package admin

import (
	"context"
	"errors"
	"testing"

	core "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/runner"
)

var (
	_ func(Config, Dependencies) (*Admin, error)                                                                                       = New
	_ func(context.Context, string) context.Context                                                                                    = WithContentChannel
	_ func(context.Context, string) context.Context                                                                                    = WithEnvironment
	_ func(context.Context) string                                                                                                     = ContentChannelFromContext
	_ func(context.Context, string) context.Context                                                                                    = WithLocale
	_ func(context.Context) context.Context                                                                                            = WithResolvedPermissionsCache
	_ func(Authorizer, context.Context, string, ...string) bool                                                                        = CanAny
	_ func(Authorizer, context.Context, string, ...string) bool                                                                        = CanAll
	_ func() *MemoryRepository                                                                                                         = NewMemoryRepository
	_ func(*CommandBus, command.Commander[struct{}], ...runner.Option) (dispatcher.Subscription, error)                                = RegisterCommand[struct{}]
	_ func(*CommandBus, string, func(context.Context, map[string]any, []string) (facadeResultFactoryMessage, error)) error             = RegisterContextMessageFactory[facadeResultFactoryMessage]
	_ func(*CommandBus, string, func(context.Context, map[string]any, []string) (facadeResultFactoryMessage, error)) error             = RegisterContextMessageResultFactory[facadeResultFactoryMessage, struct{}]
	_ func(*CommandRegistrationSet, command.Commander[facadeResultFactoryMessage], ...runner.Option) error                             = RegisterSetCommand[facadeResultFactoryMessage]
	_ func(*CommandRegistrationSet, string, func(map[string]any, []string) (facadeResultFactoryMessage, error)) error                  = RegisterSetMessageFactory[facadeResultFactoryMessage]
	_ func(*CommandRegistrationSet, string, func(map[string]any, []string) (facadeResultFactoryMessage, error)) error                  = RegisterSetMessageResultFactory[facadeResultFactoryMessage, struct{}]
	_ func(*CommandRegistrationSet, string, func(context.Context, map[string]any, []string) (facadeResultFactoryMessage, error)) error = RegisterSetContextMessageFactory[facadeResultFactoryMessage]
	_ func(*CommandRegistrationSet, string, func(context.Context, map[string]any, []string) (facadeResultFactoryMessage, error)) error = RegisterSetContextMessageResultFactory[facadeResultFactoryMessage, struct{}]
	_ command.CatalogProvider                                                                                                          = (*CommandBus)(nil)
)

type facadeResultFactoryMessage struct{}

func (facadeResultFactoryMessage) Type() string {
	return "facade.result_factory"
}

type facadeOwnedCommand struct {
	calls int
}

func (c *facadeOwnedCommand) Execute(context.Context, facadeResultFactoryMessage) error {
	c.calls++
	return nil
}

func TestFacadeRegisterMessageResultFactoryAvailable(t *testing.T) {
	bus := NewCommandBus(true)
	t.Cleanup(bus.Reset)

	err := RegisterMessageResultFactory[facadeResultFactoryMessage, struct{}](
		bus,
		"facade.result_factory",
		func(map[string]any, []string) (facadeResultFactoryMessage, error) {
			return facadeResultFactoryMessage{}, nil
		},
	)
	if err != nil {
		t.Fatalf("RegisterMessageResultFactory: %v", err)
	}
	if !bus.HasFactory("facade.result_factory") {
		t.Fatal("RegisterMessageResultFactory did not register the facade factory")
	}
}

func TestFacadeContextFactoriesAndOwnedRegistrationSetAvailable(t *testing.T) {
	bus := NewCommandBus(true)
	if err := bus.SetOwnedRuntimeConfig(OwnedCommandRuntimeConfig{}); err != nil {
		t.Fatalf("SetOwnedRuntimeConfig: %v", err)
	}
	set, setErr := bus.NewRegistrationSet("facade.owner")
	if setErr != nil {
		t.Fatalf("NewRegistrationSet: %v", setErr)
	}
	handler := &facadeOwnedCommand{}
	if err := RegisterSetCommand(set, handler); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetContextMessageFactory(set, "facade.owned", func(ctx context.Context, _ map[string]any, _ []string) (facadeResultFactoryMessage, error) {
		if _, ok := command.DispatchOptionsFromContext(ctx); !ok {
			t.Fatal("expected effective options in facade context factory")
		}
		return facadeResultFactoryMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetContextMessageFactory: %v", err)
	}
	handle, commitErr := set.Commit()
	if commitErr != nil {
		t.Fatalf("Commit: %v", commitErr)
	}
	defer func() {
		if closeErr := handle.Close(); closeErr != nil {
			t.Errorf("close registration handle: %v", closeErr)
		}
	}()
	if err := bus.DispatchByName(context.Background(), "facade.owned", nil, nil); err != nil {
		t.Fatalf("DispatchByName: %v", err)
	}
	if handler.calls != 1 {
		t.Fatalf("facade owned handler calls = %d", handler.calls)
	}
}

func TestFacadeContextHelpersForward(t *testing.T) {
	ctx := context.Background()
	ctx = WithContentChannel(ctx, "staging")
	ctx = WithLocale(ctx, "es")

	if got := ContentChannelFromContext(ctx); got != "staging" {
		t.Fatalf("ContentChannelFromContext() = %q, want %q", got, "staging")
	}
	if got := EnvironmentFromContext(ctx); got != "staging" {
		t.Fatalf("EnvironmentFromContext() = %q, want %q", got, "staging")
	}
	if got := LocaleFromContext(ctx); got != "es" {
		t.Fatalf("LocaleFromContext() = %q, want %q", got, "es")
	}

	coreCtx := core.WithLocale(core.WithContentChannel(context.Background(), "prod"), "en")
	if got, want := ContentChannelFromContext(coreCtx), core.ContentChannelFromContext(coreCtx); got != want {
		t.Fatalf("ContentChannelFromContext(coreCtx) = %q, want %q", got, want)
	}
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
	if !errors.Is(ErrNotFound, core.ErrNotFound) {
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
	if ptr := new(42); ptr == nil || *ptr != 42 {
		t.Fatalf("IntPtr(42) = %v", ptr)
	}
}
