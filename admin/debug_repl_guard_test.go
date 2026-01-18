package admin

import (
	"context"
	"errors"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type allowOverrideStrategy struct {
	called bool
}

func (s *allowOverrideStrategy) Allows(_ context.Context, _ DebugREPLRequest) (bool, error) {
	s.called = true
	return true, nil
}

func newDebugREPLMockContext(t *testing.T, ctx context.Context, ip string) *router.MockContext {
	t.Helper()
	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(ctx)
	mockCtx.On("IP").Return(ip)
	mockCtx.On("Path").Return("/admin/debug/repl")
	mockCtx.On("SetContext", mock.Anything).Return()
	return mockCtx
}

func TestDebugREPLAuthorizeRequest(t *testing.T) {
	t.Run("denies when debug disabled", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: allowAuthorizer{}})
		cfg := DebugConfig{
			Enabled: false,
			Panels:  []string{DebugPanelShell},
			Repl: DebugREPLConfig{
				Enabled:      true,
				ShellEnabled: true,
				ReadOnly:     BoolPtr(false),
			},
		}
		mockCtx := newDebugREPLMockContext(t, context.Background(), "127.0.0.1")
		_, err := debugREPLAuthorizeRequest(adm, cfg, DebugREPLKindShell, true, mockCtx)
		if !errors.Is(err, ErrForbidden) {
			t.Fatalf("expected forbidden for disabled debug, got %v", err)
		}
	})

	t.Run("rejects exec when read-only", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: allowAuthorizer{}})
		cfg := DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelShell},
			Repl: DebugREPLConfig{
				Enabled:      true,
				ShellEnabled: true,
				ReadOnly:     BoolPtr(true),
			},
		}
		mockCtx := newDebugREPLMockContext(t, context.Background(), "127.0.0.1")
		_, err := debugREPLAuthorizeRequest(adm, cfg, DebugREPLKindShell, true, mockCtx)
		if !errors.Is(err, ErrForbidden) {
			t.Fatalf("expected forbidden for read-only exec, got %v", err)
		}
	})

	t.Run("allows override when repl disabled", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: allowAuthorizer{}})
		override := &allowOverrideStrategy{}
		cfg := DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelConsole},
			Repl: DebugREPLConfig{
				Enabled:          false,
				AppEnabled:       true,
				ReadOnly:         BoolPtr(true),
				OverrideStrategy: override,
			},
		}
		mockCtx := newDebugREPLMockContext(t, context.Background(), "127.0.0.1")
		if _, err := debugREPLAuthorizeRequest(adm, cfg, DebugREPLKindApp, false, mockCtx); err != nil {
			t.Fatalf("expected override to allow repl, got %v", err)
		}
		if !override.called {
			t.Fatalf("expected override strategy to be called")
		}
	})

	t.Run("enforces role allowlist", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: allowAuthorizer{}})
		actor := &auth.ActorContext{ActorID: "user-1", Role: "ops"}
		ctx := auth.WithActorContext(context.Background(), actor)
		mockCtx := newDebugREPLMockContext(t, ctx, "127.0.0.1")
		cfg := DebugConfig{
			Enabled: true,
			Panels:  []string{DebugPanelShell},
			Repl: DebugREPLConfig{
				Enabled:      true,
				ShellEnabled: true,
				AllowedRoles: []string{"admin"},
				ReadOnly:     BoolPtr(false),
			},
		}
		_, err := debugREPLAuthorizeRequest(adm, cfg, DebugREPLKindShell, false, mockCtx)
		if !errors.Is(err, ErrForbidden) {
			t.Fatalf("expected forbidden for role mismatch, got %v", err)
		}
	})

	t.Run("rejects disallowed IPs", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: allowAuthorizer{}})
		cfg := DebugConfig{
			Enabled:    true,
			Panels:     []string{DebugPanelShell},
			AllowedIPs: []string{"10.0.0.1"},
			Repl: DebugREPLConfig{
				Enabled:      true,
				ShellEnabled: true,
				ReadOnly:     BoolPtr(false),
			},
		}
		mockCtx := newDebugREPLMockContext(t, context.Background(), "127.0.0.1")
		_, err := debugREPLAuthorizeRequest(adm, cfg, DebugREPLKindShell, false, mockCtx)
		if !errors.Is(err, ErrForbidden) {
			t.Fatalf("expected forbidden for disallowed IP, got %v", err)
		}
	})
}
