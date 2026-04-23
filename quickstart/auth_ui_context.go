package quickstart

import (
	"context"
	"maps"
	"net/url"
	"strings"

	"github.com/goliatone/go-admin/admin"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
)

// joinAssetPath safely joins an asset prefix and filename for URL paths.
// It trims trailing slashes from prefix and leading slashes from filename,
// then concatenates with a single slash. If prefix is empty, returns filename as-is.
// Absolute URLs, protocol-relative URLs, data URIs, and rooted paths are treated
// as already resolved asset references and returned unchanged.
func joinAssetPath(prefix, filename string) string {
	prefix = strings.TrimSpace(prefix)
	filename = strings.TrimSpace(filename)
	if isResolvedAssetReference(filename) {
		return filename
	}
	if prefix == "" {
		return filename
	}
	if filename == "" {
		return prefix
	}
	return strings.TrimSuffix(prefix, "/") + "/" + strings.TrimPrefix(filename, "/")
}

func isResolvedAssetReference(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return false
	}
	if strings.HasPrefix(value, "/") || strings.HasPrefix(value, "//") || strings.HasPrefix(value, "data:") {
		return true
	}
	parsed, err := url.Parse(value)
	if err != nil {
		return false
	}
	return parsed.Scheme != ""
}

// AuthUIState captures feature-guarded flags used by auth templates.
type AuthUIState struct {
	PasswordResetEnabled    bool `json:"password_reset_enabled"`
	SelfRegistrationEnabled bool `json:"self_registration_enabled"`
}

// AuthUIStateFromGate derives auth UI flags from the feature gate.
func AuthUIStateFromGate(ctx context.Context, gate fggate.FeatureGate, scope fggate.ScopeChain) AuthUIState {
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
	BasePath                 string `json:"base_path"`
	PasswordResetPath        string `json:"password_reset_path"`
	PasswordResetConfirmPath string `json:"password_reset_confirm_path"`
	RegisterPath             string `json:"register_path"`
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
	ctx = WithPathViewContext(ctx, cfg, PathViewContextConfig{
		BasePath: basePath,
	})
	ctx["password_reset_path"] = paths.PasswordResetPath
	ctx["password_reset_confirm_path"] = paths.PasswordResetConfirmPath
	ctx["register_path"] = paths.RegisterPath
	return ctx
}

// WithAuthUIViewThemeAssets merges theme assets into an existing view context.
// It creates or extends the "theme" map with an "assets" sub-map containing
// the provided asset paths. If assetPrefix is provided, each relative asset filename
// is resolved to a full path by joining with the prefix. Already resolved absolute
// URLs/paths are preserved unchanged.
//
// This function does not add query-string theme/variant handling; it only
// provides static asset paths for auth UI templates.
func WithAuthUIViewThemeAssets(ctx router.ViewContext, assets map[string]string, assetPrefix string) router.ViewContext {
	return withAuthUIViewThemeAssets(ctx, assets, assetPrefix, true)
}

func withAuthUIViewThemeAssets(ctx router.ViewContext, assets map[string]string, assetPrefix string, overwrite bool) router.ViewContext {
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
		maps.Copy(assetsMap, existingAssets)
	}

	// Merge new assets, resolving paths with prefix
	for key, filename := range assets {
		if !overwrite {
			if existing := strings.TrimSpace(assetsMap[key]); existing != "" {
				continue
			}
		}
		assetsMap[key] = joinAssetPath(assetPrefix, filename)
	}

	// Add prefix to assets map if provided
	if assetPrefix != "" {
		if !overwrite {
			if existing := strings.TrimSpace(assetsMap["prefix"]); existing != "" {
				theme["assets"] = assetsMap
				ctx["theme"] = theme
				return ctx
			}
		}
		assetsMap["prefix"] = assetPrefix
	}

	theme["assets"] = assetsMap
	ctx["theme"] = theme

	return ctx
}
