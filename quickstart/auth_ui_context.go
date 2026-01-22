package quickstart

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
)

// joinAssetPath safely joins an asset prefix and filename for URL paths.
// It trims trailing slashes from prefix and leading slashes from filename,
// then concatenates with a single slash. If prefix is empty, returns filename as-is.
func joinAssetPath(prefix, filename string) string {
	prefix = strings.TrimSpace(prefix)
	filename = strings.TrimSpace(filename)
	if prefix == "" {
		return filename
	}
	if filename == "" {
		return prefix
	}
	return strings.TrimSuffix(prefix, "/") + "/" + strings.TrimPrefix(filename, "/")
}

// AuthUIState captures feature-guarded flags used by auth templates.
type AuthUIState struct {
	PasswordResetEnabled    bool
	SelfRegistrationEnabled bool
}

// AuthUIStateFromGate derives auth UI flags from the feature gate.
func AuthUIStateFromGate(ctx context.Context, gate fggate.FeatureGate, scope fggate.ScopeSet) AuthUIState {
	return AuthUIState{
		PasswordResetEnabled:    featureEnabledWithContext(ctx, gate, "users.password_reset", scope),
		SelfRegistrationEnabled: featureEnabledWithContext(ctx, gate, "users.signup", scope),
	}
}

func authUISnapshot(state AuthUIState) map[string]bool {
	return map[string]bool{
		"users.password_reset": state.PasswordResetEnabled,
		"users.signup":         state.SelfRegistrationEnabled,
	}
}

// AuthUIPaths captures common auth-related route paths for templates.
type AuthUIPaths struct {
	BasePath                 string
	PasswordResetPath        string
	PasswordResetConfirmPath string
	RegisterPath             string
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
	ctx["password_reset_path"] = paths.PasswordResetPath
	ctx["password_reset_confirm_path"] = paths.PasswordResetConfirmPath
	ctx["register_path"] = paths.RegisterPath
	return ctx
}

// WithAuthUIViewThemeAssets merges theme assets into an existing view context.
// It creates or extends the "theme" map with an "assets" sub-map containing
// the provided asset paths. If assetPrefix is provided, each asset filename
// is resolved to a full path by joining with the prefix.
//
// This function does not add query-string theme/variant handling; it only
// provides static asset paths for auth UI templates.
func WithAuthUIViewThemeAssets(ctx router.ViewContext, assets map[string]string, assetPrefix string) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	if len(assets) == 0 && assetPrefix == "" {
		return ctx
	}

	// Get or create the theme map
	var theme map[string]map[string]string
	if existing, ok := ctx["theme"].(map[string]map[string]string); ok && existing != nil {
		theme = existing
	} else {
		theme = map[string]map[string]string{}
	}

	// Get or create the assets sub-map
	assetsMap := map[string]string{}
	if existingAssets, ok := theme["assets"]; ok && existingAssets != nil {
		for k, v := range existingAssets {
			assetsMap[k] = v
		}
	}

	// Merge new assets, resolving paths with prefix
	for key, filename := range assets {
		assetsMap[key] = joinAssetPath(assetPrefix, filename)
	}

	// Add prefix to assets map if provided
	if assetPrefix != "" {
		assetsMap["prefix"] = assetPrefix
	}

	theme["assets"] = assetsMap
	ctx["theme"] = theme

	return ctx
}
