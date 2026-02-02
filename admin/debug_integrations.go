package admin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"time"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/google/uuid"
)

const debugMaxBodyBytes = 64 * 1024

// CaptureViewContext stores template data in the debug collector and returns the view context.
// When the debug collector has ToolbarMode enabled, it also injects toolbar template variables:
// - debug_toolbar_enabled: true when toolbar should be shown
// - debug_path: the debug module base path
// - debug_toolbar_panels: comma-separated list of panels for the toolbar
// - debug_slow_threshold_ms: slow query threshold in milliseconds
func CaptureViewContext(collector *DebugCollector, viewCtx router.ViewContext) router.ViewContext {
	return captureViewContext(collector, "", viewCtx)
}

// CaptureViewContextForRequest is like CaptureViewContext but honors ToolbarExcludePaths.
func CaptureViewContextForRequest(collector *DebugCollector, c router.Context, viewCtx router.ViewContext) router.ViewContext {
	if collector == nil {
		return viewCtx
	}
	path := ""
	if c != nil {
		path = c.Path()
	}
	return captureViewContext(collector, path, viewCtx)
}

func captureViewContext(collector *DebugCollector, requestPath string, viewCtx router.ViewContext) router.ViewContext {
	if collector == nil {
		return viewCtx
	}
	collector.CaptureTemplateData(viewCtx)

	// Inject toolbar variables when ToolbarMode is enabled.
	cfg := collector.config
	if cfg.ToolbarMode && debugConfigEnabled(cfg) {
		if requestPath != "" && debugToolbarExcluded(cfg, requestPath) {
			viewCtx["debug_toolbar_enabled"] = false
			return viewCtx
		}
		viewCtx["debug_toolbar_enabled"] = true
		viewCtx["debug_path"] = cfg.BasePath
		viewCtx["debug_toolbar_panels"] = strings.Join(cfg.ToolbarPanels, ",")
		viewCtx["debug_slow_threshold_ms"] = cfg.SlowQueryThreshold.Milliseconds()
	}
	return viewCtx
}

// DebugRequestMiddleware captures request metadata for the debug collector.
func DebugRequestMiddleware(collector *DebugCollector) router.MiddlewareFunc {
	if collector == nil {
		return func(next router.HandlerFunc) router.HandlerFunc {
			return next
		}
	}
	return func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			start := time.Now()

			cfg := collector.config
			contentType := debugContentType(c)
			remoteIP := debugRemoteIP(c)
			requestSize := debugRequestSize(c)
			var requestBody string
			var bodyTruncated bool
			if cfg.CaptureRequestBody && debugIsTextContentType(contentType) && !debugSkipBodyCapture(requestSize, debugMaxBodyBytes) {
				if raw := c.Body(); len(raw) > 0 {
					requestBody, bodyTruncated = debugCaptureBody(raw, debugMaxBodyBytes)
				}
			}

			var respWriter *debugResponseWriter
			var restoreWriter func()
			if cfg.CaptureRequestBody {
				respWriter, restoreWriter = debugWrapResponseWriter(c, debugMaxBodyBytes)
			}

			err := next(c)

			entry := RequestEntry{
				ID:            uuid.NewString(),
				Timestamp:     start,
				Method:        strings.Clone(c.Method()),
				Path:          strings.Clone(c.Path()),
				Duration:      time.Since(start),
				Headers:       debugRequestHeaders(c),
				Query:         debugRequestQueries(c),
				ContentType:   contentType,
				RequestBody:   requestBody,
				RequestSize:   requestSize,
				BodyTruncated: bodyTruncated,
				RemoteIP:      remoteIP,
			}
			responseContentType := ""
			if httpCtx, ok := c.(router.HTTPContext); ok {
				if respWriter != nil {
					entry.ResponseHeaders = debugResponseHeaders(respWriter)
					entry.ResponseSize = respWriter.BodySize()
					if entry.ResponseSize == 0 {
						entry.ResponseSize = debugResponseSize(httpCtx)
					}
					responseContentType = debugNormalizeContentType(respWriter.Header().Get("Content-Type"))
				} else {
					entry.ResponseHeaders = debugResponseHeaders(httpCtx.Response())
					entry.ResponseSize = debugResponseSize(httpCtx)
					if entry.ResponseHeaders != nil {
						responseContentType = debugNormalizeContentType(entry.ResponseHeaders["Content-Type"])
					}
				}
			}
			if cfg.CaptureRequestBody && respWriter != nil && responseContentType != "" && debugIsTextContentType(responseContentType) {
				entry.ResponseBody = respWriter.Body()
			}
			entry.Status = debugRequestStatus(c, err)
			if err != nil {
				entry.Error = err.Error()
			}
			if restoreWriter != nil {
				restoreWriter()
			}
			collector.CaptureRequest(entry)
			return err
		}
	}
}

func debugNormalizeContentType(contentType string) string {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	if contentType == "" {
		return ""
	}
	if idx := strings.Index(contentType, ";"); idx >= 0 {
		contentType = strings.TrimSpace(contentType[:idx])
	}
	return contentType
}

func debugContentType(c router.Context) string {
	if c == nil {
		return ""
	}
	if httpCtx, ok := c.(router.HTTPContext); ok {
		if req := httpCtx.Request(); req != nil {
			return strings.TrimSpace(req.Header.Get("Content-Type"))
		}
	}
	return strings.TrimSpace(c.Header("Content-Type"))
}

func debugRemoteIP(c router.Context) string {
	if c == nil {
		return ""
	}
	if httpCtx, ok := c.(router.HTTPContext); ok {
		if req := httpCtx.Request(); req != nil {
			if addr := strings.TrimSpace(req.RemoteAddr); addr != "" {
				return addr
			}
		}
	}
	type ipGetter interface {
		IP() string
	}
	if getter, ok := c.(ipGetter); ok {
		if ip := strings.TrimSpace(getter.IP()); ip != "" {
			return ip
		}
	}
	return ""
}

func debugIsTextContentType(contentType string) bool {
	contentType = debugNormalizeContentType(contentType)
	if contentType == "" {
		return false
	}
	switch contentType {
	case "application/json", "application/xml", "text/xml", "text/plain", "text/html", "application/x-www-form-urlencoded":
		return true
	}
	if strings.HasPrefix(contentType, "text/") {
		return true
	}
	if strings.HasSuffix(contentType, "+json") || strings.HasSuffix(contentType, "+xml") {
		return true
	}
	return false
}

func debugCaptureBody(raw []byte, maxBytes int64) (string, bool) {
	if len(raw) == 0 {
		return "", false
	}
	if maxBytes <= 0 {
		return "", false
	}
	if int64(len(raw)) <= maxBytes {
		return string(raw), false
	}
	return string(raw[:maxBytes]), true
}

func debugResponseHeaders(w http.ResponseWriter) map[string]string {
	if w == nil {
		return nil
	}
	headers := map[string]string{}
	for key, values := range w.Header() {
		if len(values) == 0 {
			continue
		}
		headers[key] = strings.Join(values, ", ")
	}
	if len(headers) == 0 {
		return nil
	}
	return normalizeHeaderMap(headers)
}

func debugRequestSize(c router.Context) int64 {
	if c == nil {
		return 0
	}
	httpCtx, ok := c.(router.HTTPContext)
	if !ok {
		return 0
	}
	req := httpCtx.Request()
	if req == nil {
		return 0
	}
	if req.ContentLength > 0 {
		return req.ContentLength
	}
	if req.ContentLength == 0 {
		if header := strings.TrimSpace(req.Header.Get("Content-Length")); header != "" {
			if size, err := strconv.ParseInt(header, 10, 64); err == nil && size > 0 {
				return size
			}
		}
	}
	return 0
}

func debugResponseSize(httpCtx router.HTTPContext) int64 {
	if httpCtx == nil {
		return 0
	}
	res := httpCtx.Response()
	if res == nil {
		return 0
	}
	header := strings.TrimSpace(res.Header().Get("Content-Length"))
	if header == "" {
		return 0
	}
	size, err := strconv.ParseInt(header, 10, 64)
	if err != nil || size < 0 {
		return 0
	}
	return size
}

func debugSkipBodyCapture(size int64, maxBytes int64) bool {
	if maxBytes <= 0 || size <= 0 {
		return false
	}
	return size > maxBytes
}

func debugRequestHeaders(c router.Context) map[string]string {
	httpCtx, ok := c.(router.HTTPContext)
	if !ok {
		return nil
	}
	req := httpCtx.Request()
	if req == nil {
		return nil
	}
	headers := map[string]string{}
	for key, values := range req.Header {
		if len(values) == 0 {
			continue
		}
		headers[key] = strings.Join(values, ", ")
	}
	if len(headers) == 0 {
		return nil
	}
	return normalizeHeaderMap(headers)
}

func debugRequestQueries(c router.Context) map[string]string {
	queries := cloneStringMap(c.Queries())
	if len(queries) == 0 {
		return nil
	}
	return queries
}

func debugRequestStatus(c router.Context, err error) int {
	if code := debugStatusFromContext(c); code != 0 {
		return code
	}
	return debugStatusFromError(err)
}

func debugStatusFromContext(c router.Context) int {
	if c == nil {
		return 0
	}
	type statusCoder interface {
		StatusCode() int
	}
	if sc, ok := c.(statusCoder); ok {
		if code := sc.StatusCode(); code != 0 {
			return code
		}
	}
	type responseStatusGetter interface {
		ResponseStatus() int
	}
	if sg, ok := c.(responseStatusGetter); ok {
		if code := sg.ResponseStatus(); code != 0 {
			return code
		}
	}
	if httpCtx, ok := c.(router.HTTPContext); ok {
		if resp := httpCtx.Response(); resp != nil {
			type statusCodeRaw interface {
				StatusCodeRaw() int
			}
			if sc, ok := resp.(statusCodeRaw); ok {
				if code := sc.StatusCodeRaw(); code != 0 {
					return code
				}
				return 0
			}
			if sc, ok := resp.(statusCoder); ok {
				if code := sc.StatusCode(); code != 0 {
					return code
				}
			}
		}
	}
	return 0
}

func debugStatusFromError(err error) int {
	if err == nil {
		return http.StatusOK
	}
	var routerErr *goerrors.Error
	if errors.As(err, &routerErr) {
		if routerErr.Code != 0 {
			return routerErr.Code
		}
	}
	type statusCoder interface {
		StatusCode() int
	}
	if se, ok := err.(statusCoder); ok {
		if code := se.StatusCode(); code != 0 {
			return code
		}
	}
	type coder interface {
		Code() int
	}
	if ce, ok := err.(coder); ok {
		if code := ce.Code(); code != 0 {
			return code
		}
	}
	return http.StatusInternalServerError
}

// DebugLogHandler forwards slog records into the debug collector.
type DebugLogHandler struct {
	collector *DebugCollector
	next      slog.Handler
	attrs     []slog.Attr
	groups    []string
}

// NewDebugLogHandler creates a slog.Handler that forwards to the debug collector and an optional delegate.
func NewDebugLogHandler(collector *DebugCollector, next slog.Handler) *DebugLogHandler {
	return &DebugLogHandler{collector: collector, next: next}
}

func (h *DebugLogHandler) Enabled(ctx context.Context, level slog.Level) bool {
	if h == nil {
		return false
	}
	nextEnabled := false
	if h.next != nil {
		nextEnabled = h.next.Enabled(ctx, level)
	}
	collectorEnabled := h.collector != nil
	return nextEnabled || collectorEnabled
}

func (h *DebugLogHandler) Handle(ctx context.Context, r slog.Record) error {
	if h == nil {
		return nil
	}
	if h.collector != nil {
		entry := LogEntry{
			Timestamp: r.Time,
			Level:     r.Level.String(),
			Message:   r.Message,
			Fields:    debugSlogFields(h.attrs, h.groups, r),
			Source:    debugSlogSource(r),
		}
		h.collector.CaptureLog(entry)
	}
	if h.next != nil && h.next.Enabled(ctx, r.Level) {
		return h.next.Handle(ctx, r)
	}
	return nil
}

func (h *DebugLogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	if h == nil {
		return nil
	}
	next := h.next
	if next != nil {
		next = next.WithAttrs(attrs)
	}
	merged := make([]slog.Attr, 0, len(h.attrs)+len(attrs))
	merged = append(merged, h.attrs...)
	merged = append(merged, attrs...)
	groups := append([]string{}, h.groups...)
	return &DebugLogHandler{
		collector: h.collector,
		next:      next,
		attrs:     merged,
		groups:    groups,
	}
}

func (h *DebugLogHandler) WithGroup(name string) slog.Handler {
	if h == nil {
		return nil
	}
	next := h.next
	if next != nil {
		next = next.WithGroup(name)
	}
	groups := append([]string{}, h.groups...)
	if strings.TrimSpace(name) != "" {
		groups = append(groups, name)
	}
	attrs := append([]slog.Attr{}, h.attrs...)
	return &DebugLogHandler{
		collector: h.collector,
		next:      next,
		attrs:     attrs,
		groups:    groups,
	}
}

func debugSlogFields(attrs []slog.Attr, groups []string, r slog.Record) map[string]any {
	if len(attrs) == 0 && r.NumAttrs() == 0 {
		return nil
	}
	out := map[string]any{}
	for _, attr := range attrs {
		debugAddSlogAttr(out, groups, attr)
	}
	r.Attrs(func(attr slog.Attr) bool {
		debugAddSlogAttr(out, groups, attr)
		return true
	})
	if len(out) == 0 {
		return nil
	}
	return out
}

func debugAddSlogAttr(dest map[string]any, groups []string, attr slog.Attr) {
	if dest == nil {
		return
	}
	attr.Value = attr.Value.Resolve()
	if attr.Value.Kind() == slog.KindGroup {
		nested := groups
		if strings.TrimSpace(attr.Key) != "" {
			nested = append(nested, attr.Key)
		}
		for _, groupAttr := range attr.Value.Group() {
			debugAddSlogAttr(dest, nested, groupAttr)
		}
		return
	}
	key := strings.TrimSpace(attr.Key)
	if key == "" {
		return
	}
	target := dest
	if len(groups) > 0 {
		target = debugEnsureGroup(dest, groups)
	}
	target[key] = attr.Value.Any()
}

func debugEnsureGroup(dest map[string]any, groups []string) map[string]any {
	current := dest
	for _, group := range groups {
		group = strings.TrimSpace(group)
		if group == "" {
			continue
		}
		next, ok := current[group]
		child, okChild := next.(map[string]any)
		if !ok || !okChild {
			child = map[string]any{}
			current[group] = child
		}
		current = child
	}
	return current
}

func debugSlogSource(r slog.Record) string {
	if r.PC == 0 {
		return ""
	}
	frames := runtime.CallersFrames([]uintptr{r.PC})
	frame, _ := frames.Next()
	if frame.File == "" && frame.Function == "" {
		return ""
	}
	if frame.Function != "" {
		return frame.Function
	}
	if frame.Line > 0 {
		return fmt.Sprintf("%s:%d", frame.File, frame.Line)
	}
	return frame.File
}

// RouteEntry captures router information for the routes panel.
type RouteEntry struct {
	Method     string   `json:"method"`
	Path       string   `json:"path"`
	Name       string   `json:"name,omitempty"`
	Handler    string   `json:"handler,omitempty"`
	Middleware []string `json:"middleware,omitempty"`
	Summary    string   `json:"summary,omitempty"`
	Tags       []string `json:"tags,omitempty"`
}

type debugRouteLister interface {
	Routes() []router.RouteDefinition
}

func debugRoutesFromRouter(rt any) []RouteEntry {
	if rt == nil {
		return nil
	}
	lister, ok := rt.(debugRouteLister)
	if !ok {
		return nil
	}
	return debugRouteEntries(lister.Routes())
}

func debugRouteEntries(routes []router.RouteDefinition) []RouteEntry {
	if len(routes) == 0 {
		return nil
	}
	entries := make([]RouteEntry, 0, len(routes))
	for _, route := range routes {
		entry := RouteEntry{
			Method:  string(route.Method),
			Path:    route.Path,
			Name:    strings.TrimSpace(route.Name),
			Summary: strings.TrimSpace(route.Summary),
		}
		if len(route.Tags) > 0 {
			entry.Tags = cloneStringSlice(route.Tags)
		}
		handlerNames := debugHandlerNames(route.Handlers)
		if len(handlerNames) > 0 {
			entry.Handler = handlerNames[len(handlerNames)-1]
			if len(handlerNames) > 1 {
				entry.Middleware = cloneStringSlice(handlerNames[:len(handlerNames)-1])
			}
		}
		entries = append(entries, entry)
	}
	return entries
}

func debugHandlerNames(handlers []router.NamedHandler) []string {
	if len(handlers) == 0 {
		return nil
	}
	out := make([]string, 0, len(handlers))
	for _, handler := range handlers {
		name := strings.TrimSpace(handler.Name)
		if name == "" {
			continue
		}
		out = append(out, name)
	}
	return out
}

func cloneRouteEntries(routes []RouteEntry) []RouteEntry {
	if len(routes) == 0 {
		return nil
	}
	out := make([]RouteEntry, 0, len(routes))
	for _, route := range routes {
		clone := route
		if len(route.Middleware) > 0 {
			clone.Middleware = cloneStringSlice(route.Middleware)
		}
		if len(route.Tags) > 0 {
			clone.Tags = cloneStringSlice(route.Tags)
		}
		out = append(out, clone)
	}
	return out
}

func cloneStringSlice(in []string) []string {
	if len(in) == 0 {
		return nil
	}
	out := make([]string, len(in))
	copy(out, in)
	return out
}

func debugConfigSnapshot(cfg Config) map[string]any {
	snapshot := map[string]any{}
	if admin := debugAdminConfigSnapshot(cfg); len(admin) > 0 {
		snapshot["admin"] = admin
	}
	if theme := debugThemeSnapshot(cfg); len(theme) > 0 {
		snapshot["theme"] = theme
	}
	if debug := debugDebugConfigSnapshot(cfg.Debug); len(debug) > 0 {
		snapshot["debug"] = debug
	}
	if auth := debugAuthConfigSnapshot(cfg.AuthConfig); len(auth) > 0 {
		snapshot["auth"] = auth
	}
	if permissions := debugPermissionSnapshot(cfg); len(permissions) > 0 {
		snapshot["permissions"] = permissions
	}
	return snapshot
}

func debugToolbarPathListed(paths []string, candidate string) bool {
	if len(paths) == 0 {
		return false
	}
	candidate = normalizeDebugToolbarPath(candidate)
	for _, path := range paths {
		if normalizeDebugToolbarPath(path) == candidate {
			return true
		}
	}
	return false
}

func debugToolbarExcluded(cfg DebugConfig, path string) bool {
	if len(cfg.ToolbarExcludePaths) == 0 {
		return false
	}
	path = normalizeDebugToolbarPath(path)
	if path == "" {
		return false
	}
	for _, entry := range cfg.ToolbarExcludePaths {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if entry == path {
			return true
		}
		if strings.HasSuffix(entry, "/*") {
			prefix := normalizeDebugToolbarPath(strings.TrimSuffix(entry, "/*"))
			if prefix == "" {
				return true
			}
			if path == prefix || strings.HasPrefix(path, prefix+"/") {
				return true
			}
		}
		if strings.HasSuffix(entry, "*") {
			prefix := normalizeDebugToolbarPath(strings.TrimSuffix(entry, "*"))
			if prefix == "" || strings.HasPrefix(path, prefix) {
				return true
			}
		}
	}
	return false
}

func normalizeDebugToolbarPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	if path != "/" {
		path = strings.TrimSuffix(path, "/")
	}
	return path
}

func debugDebugConfigSnapshot(cfg DebugConfig) map[string]any {
	out := map[string]any{
		"Enabled":            cfg.Enabled,
		"CaptureSQL":         cfg.CaptureSQL,
		"CaptureLogs":        cfg.CaptureLogs,
		"CaptureRequestBody": cfg.CaptureRequestBody,
		"StrictQueryHooks":   cfg.StrictQueryHooks,
		"MaxLogEntries":      cfg.MaxLogEntries,
		"MaxSQLQueries":      cfg.MaxSQLQueries,
		"MaskPlaceholder":    cfg.MaskPlaceholder,
		"FeatureKey":         cfg.FeatureKey,
		"Permission":         cfg.Permission,
		"BasePath":           cfg.BasePath,
		"LayoutMode":         cfg.LayoutMode,
		"PageTemplate":       cfg.PageTemplate,
		"StandaloneTemplate": cfg.StandaloneTemplate,
		"DashboardTemplate":  cfg.DashboardTemplate,
		"SlowQueryThreshold": cfg.SlowQueryThreshold,
		"PersistLayout":      cfg.PersistLayout,
		"ToolbarMode":        cfg.ToolbarMode,
	}
	if panels := cloneStringSlice(cfg.Panels); len(panels) > 0 {
		out["Panels"] = panels
	}
	if toolbar := cloneStringSlice(cfg.ToolbarPanels); len(toolbar) > 0 {
		out["ToolbarPanels"] = toolbar
	}
	if excludes := cloneStringSlice(cfg.ToolbarExcludePaths); len(excludes) > 0 {
		out["ToolbarExcludePaths"] = excludes
	}
	if ips := cloneStringSlice(cfg.AllowedIPs); len(ips) > 0 {
		out["AllowedIPs"] = ips
	}
	if mask := cloneStringMap(cfg.MaskFieldTypes); len(mask) > 0 {
		out["MaskFieldTypes"] = mask
	}
	if repl := debugReplConfigSnapshot(cfg.Repl); len(repl) > 0 {
		out["Repl"] = repl
	}
	return out
}

func debugReplConfigSnapshot(cfg DebugREPLConfig) map[string]any {
	out := map[string]any{
		"Enabled":            cfg.Enabled,
		"ShellEnabled":       cfg.ShellEnabled,
		"AppEnabled":         cfg.AppEnabled,
		"Permission":         cfg.Permission,
		"ExecPermission":     cfg.ExecPermission,
		"ReadOnly":           cfg.ReadOnly,
		"ShellCommand":       cfg.ShellCommand,
		"WorkingDir":         cfg.WorkingDir,
		"MaxSessionSeconds":  cfg.MaxSessionSeconds,
		"AppEvalTimeoutMs":   cfg.AppEvalTimeoutMs,
		"MaxSessionsPerUser": cfg.MaxSessionsPerUser,
		"OverrideStrategy":   debugReplStrategySnapshot(cfg.OverrideStrategy),
	}
	if roles := cloneStringSlice(cfg.AllowedRoles); len(roles) > 0 {
		out["AllowedRoles"] = roles
	}
	if ips := cloneStringSlice(cfg.AllowedIPs); len(ips) > 0 {
		out["AllowedIPs"] = ips
	}
	if args := cloneStringSlice(cfg.ShellArgs); len(args) > 0 {
		out["ShellArgs"] = args
	}
	if env := cloneStringSlice(cfg.Environment); len(env) > 0 {
		out["Environment"] = env
	}
	if pkgs := cloneStringSlice(cfg.AppAllowedPackages); len(pkgs) > 0 {
		out["AppAllowedPackages"] = pkgs
	}
	return out
}

func debugReplStrategySnapshot(strategy DebugREPLOverrideStrategy) any {
	if strategy == nil {
		return nil
	}
	switch typed := strategy.(type) {
	case DenyAllStrategy:
		return "DenyAllStrategy"
	case StaticKeyStrategy:
		out := map[string]any{"type": "StaticKeyStrategy"}
		if !typed.ExpiresAt.IsZero() {
			out["expires_at"] = typed.ExpiresAt
		}
		return out
	case SignedTokenStrategy:
		out := map[string]any{"type": "SignedTokenStrategy"}
		if typed.Audience != "" {
			out["audience"] = typed.Audience
		}
		if typed.Issuer != "" {
			out["issuer"] = typed.Issuer
		}
		return out
	default:
		return fmt.Sprintf("%T", strategy)
	}
}

func debugAdminConfigSnapshot(cfg Config) map[string]any {
	out := map[string]any{}
	if cfg.Title != "" {
		out["title"] = cfg.Title
	}
	if cfg.BasePath != "" {
		out["base_path"] = cfg.BasePath
	}
	if cfg.DefaultLocale != "" {
		out["default_locale"] = cfg.DefaultLocale
	}
	if cfg.NavMenuCode != "" {
		out["nav_menu_code"] = cfg.NavMenuCode
	}
	if cfg.LogoURL != "" {
		out["logo_url"] = cfg.LogoURL
	}
	if cfg.FaviconURL != "" {
		out["favicon_url"] = cfg.FaviconURL
	}
	if cfg.CustomCSS != "" {
		out["custom_css"] = cfg.CustomCSS
	}
	if cfg.CustomJS != "" {
		out["custom_js"] = cfg.CustomJS
	}
	return out
}

func debugThemeSnapshot(cfg Config) map[string]any {
	out := map[string]any{}
	if cfg.Theme != "" {
		out["name"] = cfg.Theme
	}
	if cfg.ThemeVariant != "" {
		out["variant"] = cfg.ThemeVariant
	}
	if cfg.ThemeAssetPrefix != "" {
		out["asset_prefix"] = cfg.ThemeAssetPrefix
	}
	if tokens := cloneStringMap(cfg.ThemeTokens); len(tokens) > 0 {
		out["tokens"] = tokens
	}
	return out
}

func debugAuthConfigSnapshot(cfg *AuthConfig) map[string]any {
	if cfg == nil {
		return nil
	}
	out := map[string]any{}
	if cfg.LoginPath != "" {
		out["login_path"] = cfg.LoginPath
	}
	if cfg.LogoutPath != "" {
		out["logout_path"] = cfg.LogoutPath
	}
	if cfg.RedirectPath != "" {
		out["redirect_path"] = cfg.RedirectPath
	}
	return out
}

func debugPermissionSnapshot(cfg Config) map[string]any {
	out := map[string]any{}
	debugSetPermission(out, "settings", cfg.SettingsPermission)
	debugSetPermission(out, "settings_update", cfg.SettingsUpdatePermission)
	debugSetPermission(out, "feature_flags_view", cfg.FeatureFlagsViewPermission)
	debugSetPermission(out, "feature_flags_update", cfg.FeatureFlagsUpdatePermission)
	debugSetPermission(out, "notifications", cfg.NotificationsPermission)
	debugSetPermission(out, "notifications_update", cfg.NotificationsUpdatePermission)
	debugSetPermission(out, "jobs", cfg.JobsPermission)
	debugSetPermission(out, "jobs_trigger", cfg.JobsTriggerPermission)
	debugSetPermission(out, "preferences", cfg.PreferencesPermission)
	debugSetPermission(out, "preferences_update", cfg.PreferencesUpdatePermission)
	debugSetPermission(out, "preferences_manage_tenant", cfg.PreferencesManageTenantPermission)
	debugSetPermission(out, "preferences_manage_org", cfg.PreferencesManageOrgPermission)
	debugSetPermission(out, "preferences_manage_system", cfg.PreferencesManageSystemPermission)
	debugSetPermission(out, "profile", cfg.ProfilePermission)
	debugSetPermission(out, "profile_update", cfg.ProfileUpdatePermission)
	debugSetPermission(out, "users", cfg.UsersPermission)
	debugSetPermission(out, "users_create", cfg.UsersCreatePermission)
	debugSetPermission(out, "users_import", cfg.UsersImportPermission)
	debugSetPermission(out, "users_update", cfg.UsersUpdatePermission)
	debugSetPermission(out, "users_delete", cfg.UsersDeletePermission)
	debugSetPermission(out, "roles", cfg.RolesPermission)
	debugSetPermission(out, "roles_create", cfg.RolesCreatePermission)
	debugSetPermission(out, "roles_update", cfg.RolesUpdatePermission)
	debugSetPermission(out, "roles_delete", cfg.RolesDeletePermission)
	debugSetPermission(out, "tenants", cfg.TenantsPermission)
	debugSetPermission(out, "tenants_create", cfg.TenantsCreatePermission)
	debugSetPermission(out, "tenants_update", cfg.TenantsUpdatePermission)
	debugSetPermission(out, "tenants_delete", cfg.TenantsDeletePermission)
	debugSetPermission(out, "organizations", cfg.OrganizationsPermission)
	debugSetPermission(out, "organizations_create", cfg.OrganizationsCreatePermission)
	debugSetPermission(out, "organizations_update", cfg.OrganizationsUpdatePermission)
	debugSetPermission(out, "organizations_delete", cfg.OrganizationsDeletePermission)
	if len(out) == 0 {
		return nil
	}
	return out
}

func debugSetPermission(dest map[string]any, key, value string) {
	value = strings.TrimSpace(value)
	if value == "" {
		return
	}
	dest[key] = value
}

func (m *DebugModule) captureConfigSnapshot(admin *Admin) {
	if m == nil || m.collector == nil || admin == nil {
		return
	}
	if !m.collector.panelEnabled(DebugPanelConfig) {
		return
	}
	snapshot := debugConfigSnapshot(admin.config)
	if len(snapshot) == 0 {
		return
	}
	m.collector.CaptureConfigSnapshot(snapshot)
}

func (m *DebugModule) captureRoutesSnapshot(admin *Admin) {
	if m == nil || m.collector == nil || admin == nil {
		return
	}
	captureRoutesSnapshotForCollector(m.collector, admin.router)
}

func captureRoutesSnapshotForCollector(collector *DebugCollector, rt any) {
	if collector == nil || !collector.panelEnabled(DebugPanelRoutes) {
		return
	}
	routes := debugRoutesFromRouter(rt)
	if len(routes) == 0 {
		return
	}
	collector.CaptureRoutes(routes)
}
