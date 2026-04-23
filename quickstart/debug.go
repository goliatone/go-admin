package quickstart

import (
	"log/slog"
	"os"
	"reflect"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// DebugOption applies explicit debug configuration overrides.
type DebugOption struct {
	Enabled                    *bool          `json:"enabled"`
	AllowedIPs                 []string       `json:"allowed_i_ps"`
	AllowedOrigins             []string       `json:"allowed_origins"`
	AppID                      string         `json:"app_id"`
	AppName                    string         `json:"app_name"`
	Environment                string         `json:"environment"`
	RemoteEnabled              *bool          `json:"remote_enabled"`
	TokenTTL                   *time.Duration `json:"token_ttl"`
	SessionTracking            *bool          `json:"session_tracking"`
	SessionIncludeGlobalPanels *bool          `json:"session_include_global_panels"`
	SessionCookieName          string         `json:"session_cookie_name"`
	SessionInactivityExpiry    *time.Duration `json:"session_inactivity_expiry"`
	CaptureSQL                 *bool          `json:"capture_sql"`
	CaptureLogs                *bool          `json:"capture_logs"`
	CaptureJSErrors            *bool          `json:"capture_js_errors"`
	CaptureRequestBody         *bool          `json:"capture_request_body"`
	ToolbarMode                *bool          `json:"toolbar_mode"`
	ToolbarPanels              []string       `json:"toolbar_panels"`
	LayoutMode                 string         `json:"layout_mode"`
	ReplEnabled                *bool          `json:"repl_enabled"`
	ReplReadOnly               *bool          `json:"repl_read_only"`
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

// WithDebugOptions applies explicit debug options into admin config.
func WithDebugOptions(opt DebugOption) AdminConfigOption {
	return func(cfg *admin.Config) {
		if cfg == nil {
			return
		}
		debugCfg := cfg.Debug
		applyDebugCoreOptions(&debugCfg, opt)
		applyDebugSessionOptions(&debugCfg, opt)
		applyDebugCaptureOptions(&debugCfg, opt)
		applyDebugToolbarOptions(&debugCfg, opt)
		applyDebugReplOptions(&debugCfg, opt)
		cfg.Debug = debugCfg
	}
}

func applyDebugCoreOptions(debugCfg *admin.DebugConfig, opt DebugOption) {
	if opt.Enabled != nil {
		debugCfg.Enabled = *opt.Enabled
		if *opt.Enabled {
			debugCfg.ToolbarMode = true
			debugCfg.CaptureSQL = true
			debugCfg.CaptureLogs = true
			debugCfg.CaptureJSErrors = true
			debugCfg.CaptureRequestBody = true
		}
	}
	if opt.AllowedIPs != nil {
		debugCfg.AllowedIPs = append([]string{}, opt.AllowedIPs...)
	}
	if opt.AllowedOrigins != nil {
		debugCfg.AllowedOrigins = append([]string{}, opt.AllowedOrigins...)
	}
	if value := strings.TrimSpace(opt.AppID); value != "" {
		debugCfg.AppID = value
	}
	if value := strings.TrimSpace(opt.AppName); value != "" {
		debugCfg.AppName = value
	}
	if value := strings.TrimSpace(opt.Environment); value != "" {
		debugCfg.Environment = value
	}
	if opt.RemoteEnabled != nil {
		debugCfg.RemoteEnabled = *opt.RemoteEnabled
	}
	if opt.TokenTTL != nil {
		debugCfg.TokenTTL = *opt.TokenTTL
	}
}

func applyDebugSessionOptions(debugCfg *admin.DebugConfig, opt DebugOption) {
	if opt.SessionTracking != nil {
		debugCfg.SessionTracking = *opt.SessionTracking
	}
	if opt.SessionIncludeGlobalPanels != nil {
		debugCfg.SessionIncludeGlobalPanels = new(*opt.SessionIncludeGlobalPanels)
	}
	if value := strings.TrimSpace(opt.SessionCookieName); value != "" {
		debugCfg.SessionCookieName = value
	}
	if opt.SessionInactivityExpiry != nil {
		debugCfg.SessionInactivityExpiry = *opt.SessionInactivityExpiry
	}
}

func applyDebugCaptureOptions(debugCfg *admin.DebugConfig, opt DebugOption) {
	if opt.CaptureSQL != nil {
		debugCfg.CaptureSQL = *opt.CaptureSQL
	}
	if opt.CaptureLogs != nil {
		debugCfg.CaptureLogs = *opt.CaptureLogs
	}
	if opt.CaptureJSErrors != nil {
		debugCfg.CaptureJSErrors = *opt.CaptureJSErrors
	}
	if opt.CaptureRequestBody != nil {
		debugCfg.CaptureRequestBody = *opt.CaptureRequestBody
	}
}

func applyDebugToolbarOptions(debugCfg *admin.DebugConfig, opt DebugOption) {
	if opt.ToolbarMode != nil {
		debugCfg.ToolbarMode = *opt.ToolbarMode
	}
	if opt.ToolbarPanels != nil {
		debugCfg.ToolbarPanels = append([]string{}, opt.ToolbarPanels...)
	}
	if mode := strings.ToLower(strings.TrimSpace(opt.LayoutMode)); mode != "" {
		switch mode {
		case "admin":
			debugCfg.LayoutMode = admin.DebugLayoutAdmin
		case "standalone":
			debugCfg.LayoutMode = admin.DebugLayoutStandalone
		}
	}
}

func applyDebugReplOptions(debugCfg *admin.DebugConfig, opt DebugOption) {
	if opt.ReplEnabled != nil {
		debugCfg.Repl.Enabled = *opt.ReplEnabled
		if *opt.ReplEnabled && !debugCfg.Repl.AppEnabled && !debugCfg.Repl.ShellEnabled {
			debugCfg.Repl.AppEnabled = true
			debugCfg.Repl.ShellEnabled = true
		}
	}
	if opt.ReplReadOnly != nil {
		debugCfg.Repl.ReadOnly = new(*opt.ReplReadOnly)
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
	adm.AttachDebugLogBridge()
	if _, ok := slog.Default().Handler().(*admin.DebugLogHandler); ok {
		return
	}
	delegate := safeDebugLogDelegate(slog.Default().Handler())
	handler := admin.NewDebugLogHandler(collector, delegate)
	slog.SetDefault(slog.New(handler))
}

func safeDebugLogDelegate(delegate slog.Handler) slog.Handler {
	if delegate == nil {
		return slog.NewTextHandler(os.Stderr, nil)
	}
	delegateType := reflect.TypeOf(delegate)
	if delegateType != nil && strings.Contains(delegateType.String(), "slog.defaultHandler") {
		// slog's default handler writes via the standard logger, which creates a cycle
		// once slog.SetDefault wires log.Printf back into slog.
		return slog.NewTextHandler(os.Stderr, nil)
	}
	return delegate
}
