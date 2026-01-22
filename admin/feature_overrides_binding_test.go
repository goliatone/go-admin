package admin

import (
	"context"
	"testing"

	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

type stubMutableGate struct {
	setCalls   []gateSetCall
	unsetCalls []gateUnsetCall
}

type gateSetCall struct {
	key     string
	scope   fggate.ScopeSet
	enabled bool
	actor   fggate.ActorRef
}

type gateUnsetCall struct {
	key   string
	scope fggate.ScopeSet
	actor fggate.ActorRef
}

func (s *stubMutableGate) Enabled(context.Context, string, ...fggate.ResolveOption) (bool, error) {
	return false, nil
}

func (s *stubMutableGate) Set(_ context.Context, key string, scope fggate.ScopeSet, enabled bool, actor fggate.ActorRef) error {
	s.setCalls = append(s.setCalls, gateSetCall{
		key:     key,
		scope:   scope,
		enabled: enabled,
		actor:   actor,
	})
	return nil
}

func (s *stubMutableGate) Unset(_ context.Context, key string, scope fggate.ScopeSet, actor fggate.ActorRef) error {
	s.unsetCalls = append(s.unsetCalls, gateUnsetCall{
		key:   key,
		scope: scope,
		actor: actor,
	})
	return nil
}

func TestFeatureOverridesBindingSetCapturesScope(t *testing.T) {
	gate := &stubMutableGate{}
	adm, err := New(Config{}, Dependencies{FeatureGate: gate})
	require.NoError(t, err)

	binding := newFeatureOverridesBinding(adm)
	require.NotNil(t, binding)

	actor := &auth.ActorContext{ActorID: "actor-1", Subject: "user-1", Role: "admin"}
	ctx := auth.WithActorContext(context.Background(), actor)
	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(ctx)

	cases := []struct {
		name        string
		body        map[string]any
		scopeName   string
		scopeID     string
		scopeTarget fggate.ScopeSet
	}{
		{
			name:      "system",
			body:      map[string]any{"key": "users.signup", "enabled": true, "scope": "system"},
			scopeName: "system",
			scopeID:   "",
			scopeTarget: fggate.ScopeSet{
				System: true,
			},
		},
		{
			name:      "tenant",
			body:      map[string]any{"key": "users.signup", "enabled": true, "scope": "tenant", "tenant_id": "tenant-1"},
			scopeName: "tenant",
			scopeID:   "tenant-1",
			scopeTarget: fggate.ScopeSet{
				TenantID: "tenant-1",
			},
		},
		{
			name:      "org",
			body:      map[string]any{"key": "users.signup", "enabled": true, "scope": "org", "org_id": "org-1"},
			scopeName: "org",
			scopeID:   "org-1",
			scopeTarget: fggate.ScopeSet{
				OrgID: "org-1",
			},
		},
		{
			name:      "user",
			body:      map[string]any{"key": "users.signup", "enabled": true, "scope": "user", "user_id": "user-1"},
			scopeName: "user",
			scopeID:   "user-1",
			scopeTarget: fggate.ScopeSet{
				UserID: "user-1",
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			gate.setCalls = nil

			payload, err := binding.Set(mockCtx, tc.body)
			require.NoError(t, err)
			require.Len(t, gate.setCalls, 1)

			call := gate.setCalls[0]
			require.Equal(t, "users.signup", call.key)
			require.Equal(t, tc.scopeTarget, call.scope)
			require.True(t, call.enabled)
			require.Equal(t, "actor-1", call.actor.ID)

			require.Equal(t, tc.scopeName, payload["scope"])
			require.Equal(t, "users.signup", payload["key"])
			require.Equal(t, true, payload["enabled"])
			if tc.scopeID == "" {
				_, ok := payload["scope_id"]
				require.False(t, ok)
			} else {
				require.Equal(t, tc.scopeID, payload["scope_id"])
			}
		})
	}
}

func TestFeatureOverridesBindingUnsetCallsGate(t *testing.T) {
	gate := &stubMutableGate{}
	adm, err := New(Config{}, Dependencies{FeatureGate: gate})
	require.NoError(t, err)

	binding := newFeatureOverridesBinding(adm)
	require.NotNil(t, binding)

	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(context.Background())

	payload, err := binding.Unset(mockCtx, map[string]any{
		"key":       "users.signup",
		"scope":     "tenant",
		"tenant_id": "tenant-2",
	})
	require.NoError(t, err)
	require.Len(t, gate.unsetCalls, 1)

	call := gate.unsetCalls[0]
	require.Equal(t, "users.signup", call.key)
	require.Equal(t, fggate.ScopeSet{TenantID: "tenant-2"}, call.scope)
	require.Equal(t, "tenant", payload["scope"])
	require.Equal(t, "tenant-2", payload["scope_id"])
}

func TestFeatureOverridesBindingRejectsAliases(t *testing.T) {
	gate := &stubMutableGate{}
	adm, err := New(Config{}, Dependencies{FeatureGate: gate})
	require.NoError(t, err)

	binding := newFeatureOverridesBinding(adm)
	require.NotNil(t, binding)

	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(context.Background())

	_, err = binding.Set(mockCtx, map[string]any{
		"key":     "users.self_registration",
		"enabled": true,
		"scope":   "system",
	})
	require.Error(t, err)
	require.Empty(t, gate.setCalls)

	var typedErr *goerrors.Error
	require.True(t, goerrors.As(err, &typedErr))
	require.Equal(t, "FEATURE_ALIAS_DISABLED", typedErr.TextCode)
}
