package quickstart

import (
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

const (
	defaultTemporaryPasswordSessionContextKey = "user"
	defaultTemporaryPasswordChangePath        = "/admin/profile"
)

// TemporaryPasswordGateConfig configures middleware that confines temporary
// password sessions to a password-change/reset flow.
type TemporaryPasswordGateConfig struct {
	SessionContextKey string
	ChangePath        string
	AllowPaths        []string
	RedirectStatus    int
	JSONStatus        int
}

// TemporaryPasswordGate blocks authenticated sessions whose claims require a
// password change. It expects go-auth metadata to be present in the session.
func TemporaryPasswordGate(cfg TemporaryPasswordGateConfig) router.MiddlewareFunc {
	cfg = normalizeTemporaryPasswordGateConfig(cfg)
	return func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			session, err := auth.GetRouterSession(c, cfg.SessionContextKey)
			if err != nil || !SessionRequiresPasswordChange(session) || temporaryPasswordGateAllows(c.Path(), cfg) {
				return next(c)
			}
			if temporaryPasswordGateWantsJSON(c) {
				return c.JSON(cfg.JSONStatus, map[string]any{
					"error":                "password_change_required",
					"password_change_path": cfg.ChangePath,
				})
			}
			return c.Redirect(cfg.ChangePath, cfg.RedirectStatus)
		}
	}
}

// TemporaryPasswordGateForAdmin returns a gate with quickstart admin defaults.
func TemporaryPasswordGateForAdmin(cfg admin.Config, sessionContextKey string) router.MiddlewareFunc {
	basePath := normalizeQuickstartRouteBasePath(cfg.BasePath)
	if basePath == "" {
		basePath = "/admin"
	}
	changePath := prefixBasePath(basePath, "profile")
	return TemporaryPasswordGate(TemporaryPasswordGateConfig{
		SessionContextKey: sessionContextKey,
		ChangePath:        changePath,
		AllowPaths: []string{
			changePath,
			prefixBasePath(basePath, "logout"),
			prefixBasePath(basePath, "password-reset"),
		},
	})
}

// SessionRequiresPasswordChange reports whether a go-auth session carries
// temporary-password metadata that should force a password update.
func SessionRequiresPasswordChange(session *auth.SessionObject) bool {
	if session == nil {
		return false
	}
	metadata, ok := session.GetData()["metadata"].(map[string]any)
	if !ok || len(metadata) == 0 {
		return false
	}
	state := auth.TemporaryPasswordStateFromMetadata(metadata)
	return state.ChangeRequired || state.Temporary
}

func normalizeTemporaryPasswordGateConfig(cfg TemporaryPasswordGateConfig) TemporaryPasswordGateConfig {
	cfg.SessionContextKey = strings.TrimSpace(cfg.SessionContextKey)
	if cfg.SessionContextKey == "" {
		cfg.SessionContextKey = defaultTemporaryPasswordSessionContextKey
	}
	cfg.ChangePath = strings.TrimSpace(cfg.ChangePath)
	if cfg.ChangePath == "" {
		cfg.ChangePath = defaultTemporaryPasswordChangePath
	}
	if cfg.RedirectStatus == 0 {
		cfg.RedirectStatus = http.StatusSeeOther
	}
	if cfg.JSONStatus == 0 {
		cfg.JSONStatus = http.StatusForbidden
	}

	allow := make([]string, 0, len(cfg.AllowPaths)+1)
	allow = append(allow, cfg.ChangePath)
	allow = append(allow, cfg.AllowPaths...)
	cfg.AllowPaths = allow
	return cfg
}

func temporaryPasswordGateAllows(requestPath string, cfg TemporaryPasswordGateConfig) bool {
	requestPath = normalizeTemporaryPasswordGatePath(requestPath)
	for _, allowPath := range cfg.AllowPaths {
		allowPath = normalizeTemporaryPasswordGatePath(allowPath)
		if allowPath == "" {
			continue
		}
		if requestPath == allowPath || strings.HasPrefix(requestPath, strings.TrimRight(allowPath, "/")+"/") {
			return true
		}
	}
	return false
}

func normalizeTemporaryPasswordGatePath(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if !strings.HasPrefix(trimmed, "/") {
		trimmed = "/" + trimmed
	}
	return strings.TrimRight(trimmed, "/")
}

func temporaryPasswordGateWantsJSON(c router.Context) bool {
	accept := strings.ToLower(c.Header("Accept"))
	contentType := strings.ToLower(c.Header("Content-Type"))
	xhr := strings.ToLower(c.Header("X-Requested-With"))
	return strings.Contains(accept, "application/json") ||
		strings.Contains(contentType, "application/json") ||
		xhr == "xmlhttprequest"
}
