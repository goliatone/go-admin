package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// AuthUIState captures feature-guarded flags used by auth templates.
type AuthUIState struct {
	PasswordResetEnabled    bool
	SelfRegistrationEnabled bool
}

// AuthUIStateFromConfig derives auth UI flags from the admin config.
func AuthUIStateFromConfig(cfg admin.Config) AuthUIState {
	return AuthUIState{
		PasswordResetEnabled:    cfg.FeatureFlags["users.password_reset"],
		SelfRegistrationEnabled: cfg.FeatureFlags["users.signup"],
	}
}

// AuthUIPaths captures common auth-related route paths for templates.
type AuthUIPaths struct {
	BasePath          string
	PasswordResetPath string
	RegisterPath      string
}

// AuthUIViewContext builds a view context with auth flags + paths.
func AuthUIViewContext(cfg admin.Config, state AuthUIState, paths AuthUIPaths) router.ViewContext {
	return WithAuthUIViewContext(router.ViewContext{}, cfg, state, paths)
}

// WithAuthUIViewContext merges auth flags + paths into an existing view context.
func WithAuthUIViewContext(ctx router.ViewContext, cfg admin.Config, state AuthUIState, paths AuthUIPaths) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	basePath := strings.TrimSpace(paths.BasePath)
	if basePath == "" {
		basePath = strings.TrimSpace(cfg.BasePath)
	}
	ctx["base_path"] = basePath
	ctx["password_reset_enabled"] = state.PasswordResetEnabled
	ctx["self_registration_enabled"] = state.SelfRegistrationEnabled
	ctx["password_reset_path"] = paths.PasswordResetPath
	ctx["register_path"] = paths.RegisterPath
	return ctx
}
