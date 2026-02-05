package quickstart

import (
	"log/slog"
	"os"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// DebugEnvOption customizes which environment variables map to debug config.
type DebugEnvOption struct {
	EnabledKey            string
	AllowedIPsKey         string
	CaptureSQLKey         string
	CaptureLogsKey        string
	CaptureJSErrorsKey    string
	CaptureRequestBodyKey string
	ToolbarModeKey        string
	ToolbarPanelsKey      string
	LayoutModeKey         string
	ReplEnabledKey        string
	ReplReadOnlyKey       string
}

// WithDebugConfig merges a debug config into the admin config.
func WithDebugConfig(debugCfg admin.DebugConfig) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		cfg.Debug = debugCfg
	}
}

// WithDebugFromEnv maps ADMIN_DEBUG* environment variables into the admin config.
func WithDebugFromEnv(opts ...DebugEnvOption) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		envOpts := mergeDebugEnvOptions(opts...)
		debugCfg := cfg.Debug

		enabled, enabledOK := envBoolKey(envOpts.EnabledKey)
		if enabledOK {
			debugCfg.Enabled = enabled
			if enabled {
				debugCfg.ToolbarMode = true
				debugCfg.CaptureSQL = true
				debugCfg.CaptureLogs = true
				debugCfg.CaptureJSErrors = true
				debugCfg.CaptureRequestBody = true
			}
		}

		if allowedIPs, ok := envCSVKey(envOpts.AllowedIPsKey); ok {
			debugCfg.AllowedIPs = allowedIPs
		}
		if value, ok := envBoolKey(envOpts.CaptureSQLKey); ok {
			debugCfg.CaptureSQL = value
		}
		if value, ok := envBoolKey(envOpts.CaptureLogsKey); ok {
			debugCfg.CaptureLogs = value
		}
		if value, ok := envBoolKey(envOpts.CaptureJSErrorsKey); ok {
			debugCfg.CaptureJSErrors = value
		}
		if value, ok := envBoolKey(envOpts.CaptureRequestBodyKey); ok {
			debugCfg.CaptureRequestBody = value
		}
		if value, ok := envBoolKey(envOpts.ToolbarModeKey); ok {
			debugCfg.ToolbarMode = value
		}
		if panels, ok := envCSVKey(envOpts.ToolbarPanelsKey); ok {
			debugCfg.ToolbarPanels = panels
		}
		if mode, ok := envStringKey(envOpts.LayoutModeKey); ok {
			switch strings.ToLower(mode) {
			case "admin":
				debugCfg.LayoutMode = admin.DebugLayoutAdmin
			case "standalone":
				debugCfg.LayoutMode = admin.DebugLayoutStandalone
			}
		}
		if enabled, ok := envBoolKey(envOpts.ReplEnabledKey); ok {
			debugCfg.Repl.Enabled = enabled
			if enabled && !debugCfg.Repl.AppEnabled && !debugCfg.Repl.ShellEnabled {
				debugCfg.Repl.AppEnabled = true
				debugCfg.Repl.ShellEnabled = true
			}
		}
		if value, ok := envBoolKey(envOpts.ReplReadOnlyKey); ok {
			debugCfg.Repl.ReadOnly = admin.BoolPtr(value)
		}

		cfg.Debug = debugCfg
	}
}

// AttachDebugMiddleware registers the debug request capture middleware on the router.
func AttachDebugMiddleware[T any](r router.Router[T], cfg admin.Config, adm *admin.Admin) {
	if r == nil || adm == nil {
		return
	}
	if !cfg.Debug.Enabled {
		return
	}
	if adm.Debug() == nil {
		return
	}
	basePath := strings.TrimSpace(cfg.BasePath)
	r.Use(func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			if basePath != "" && !strings.HasPrefix(c.Path(), basePath) {
				return next(c)
			}
			if collector := adm.Debug(); collector != nil {
				return admin.DebugRequestMiddleware(collector)(next)(c)
			}
			return next(c)
		}
	})
}

// AttachDebugLogHandler wires slog to the debug collector when CaptureLogs is enabled.
func AttachDebugLogHandler(cfg admin.Config, adm *admin.Admin) {
	if adm == nil || !cfg.Debug.Enabled || !cfg.Debug.CaptureLogs {
		return
	}
	collector := adm.Debug()
	if collector == nil {
		return
	}
	if _, ok := slog.Default().Handler().(*admin.DebugLogHandler); ok {
		return
	}
	delegate := slog.Default().Handler()
	handler := admin.NewDebugLogHandler(collector, delegate)
	slog.SetDefault(slog.New(handler))
}

func mergeDebugEnvOptions(opts ...DebugEnvOption) DebugEnvOption {
	out := DebugEnvOption{
		EnabledKey:            "ADMIN_DEBUG",
		AllowedIPsKey:         "ADMIN_DEBUG_ALLOWED_IPS",
		CaptureSQLKey:         "ADMIN_DEBUG_SQL",
		CaptureLogsKey:        "ADMIN_DEBUG_LOGS",
		CaptureJSErrorsKey:    "ADMIN_DEBUG_JS_ERRORS",
		CaptureRequestBodyKey: "ADMIN_DEBUG_REQUEST_BODY",
		ToolbarModeKey:        "ADMIN_DEBUG_TOOLBAR",
		ToolbarPanelsKey:      "ADMIN_DEBUG_TOOLBAR_PANELS",
		LayoutModeKey:         "ADMIN_DEBUG_LAYOUT",
		ReplEnabledKey:        "ADMIN_DEBUG_REPL",
		ReplReadOnlyKey:       "ADMIN_DEBUG_REPL_READONLY",
	}
	for _, opt := range opts {
		if key := strings.TrimSpace(opt.EnabledKey); key != "" {
			out.EnabledKey = key
		}
		if key := strings.TrimSpace(opt.AllowedIPsKey); key != "" {
			out.AllowedIPsKey = key
		}
		if key := strings.TrimSpace(opt.CaptureSQLKey); key != "" {
			out.CaptureSQLKey = key
		}
		if key := strings.TrimSpace(opt.CaptureLogsKey); key != "" {
			out.CaptureLogsKey = key
		}
		if key := strings.TrimSpace(opt.CaptureJSErrorsKey); key != "" {
			out.CaptureJSErrorsKey = key
		}
		if key := strings.TrimSpace(opt.CaptureRequestBodyKey); key != "" {
			out.CaptureRequestBodyKey = key
		}
		if key := strings.TrimSpace(opt.ToolbarModeKey); key != "" {
			out.ToolbarModeKey = key
		}
		if key := strings.TrimSpace(opt.ToolbarPanelsKey); key != "" {
			out.ToolbarPanelsKey = key
		}
		if key := strings.TrimSpace(opt.LayoutModeKey); key != "" {
			out.LayoutModeKey = key
		}
		if key := strings.TrimSpace(opt.ReplEnabledKey); key != "" {
			out.ReplEnabledKey = key
		}
		if key := strings.TrimSpace(opt.ReplReadOnlyKey); key != "" {
			out.ReplReadOnlyKey = key
		}
	}
	return out
}

func envBoolKey(key string) (bool, bool) {
	key = strings.TrimSpace(key)
	if key == "" {
		return false, false
	}
	return envBool(key)
}

func envCSVKey(key string) ([]string, bool) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, false
	}
	raw, ok := os.LookupEnv(key)
	if !ok {
		return nil, false
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, true
	}
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ';'
	})
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out, true
}

func envStringKey(key string) (string, bool) {
	key = strings.TrimSpace(key)
	if key == "" {
		return "", false
	}
	raw, ok := os.LookupEnv(key)
	if !ok {
		return "", false
	}
	return strings.TrimSpace(raw), true
}
