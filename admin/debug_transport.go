package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strings"
	"time"

	debugpanels "github.com/goliatone/go-admin/admin/internal/debugpanels"
	debugregistry "github.com/goliatone/go-admin/debug"
	templateview "github.com/goliatone/go-admin/internal/templateview"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/google/uuid"
)

const (
	debugEventSnapshot            = "snapshot"
	debugEventSnapshotInvalidated = "snapshot_invalidated"
)

const debugPanelOrderPreferenceKey = "ui.debug.console.panel_order"

const (
	debugSessionViewPermission   = PermAdminDebugSessionView
	debugSessionAttachPermission = PermAdminDebugSessionAttach
	debugSessionWSPathSuffix     = "session/:sessionId/ws"
)

const (
	debugSessionUpgradeAdminContext = "debug_session_admin_context"
	debugSessionUpgradeIP           = "debug_session_ip"
	debugSessionUpgradeUserAgent    = "debug_session_user_agent"
	debugUpgradeAdminContext        = "debug_admin_context"
	debugUpgradeCommandRunAccess    = "debug_command_run_access"
)

var errDebugPanelRequired = goerrors.New("panel is required", goerrors.CategoryValidation).
	WithCode(http.StatusBadRequest).
	WithTextCode(TextCodeMissingPanel)

var errDebugPanelActionRequired = goerrors.New("panel action is required", goerrors.CategoryValidation).
	WithCode(http.StatusBadRequest).
	WithTextCode(TextCodeValidationError)

var errDebugDoctorCheckRequired = goerrors.New("doctor check is required", goerrors.CategoryValidation).
	WithCode(http.StatusBadRequest).
	WithTextCode("MISSING_DOCTOR_CHECK")

type debugCommand struct {
	Type   string   `json:"type"`
	Panels []string `json:"panels,omitempty"`
}

type debugPanelsResponse struct {
	Panels  []debugregistry.PanelDefinition `json:"panels"`
	Version string                          `json:"version,omitempty"`
}

type debugSessionsResponse struct {
	Sessions []DebugUserSession `json:"sessions"`
}

type debugPanelOrderPreferenceResponse struct {
	Available  bool     `json:"available"`
	Found      bool     `json:"found"`
	PanelOrder []string `json:"panel_order"`
	UserID     string   `json:"user_id,omitempty"`
}

type debugSubscription struct {
	events           map[string]bool
	commandRunAccess *commandRunWebSocketAccess
	lifecycleContext context.Context
}

type commandRunWebSocketAccess struct {
	ctx        context.Context
	selector   CommandRunSelector
	authorizer CommandRunScopeAuthorizer
	allowed    bool
}

type debugWebSocketRouter interface {
	WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo
}

func newDebugSubscription(access ...*commandRunWebSocketAccess) *debugSubscription {
	subscription := &debugSubscription{events: map[string]bool{}}
	if len(access) > 0 {
		subscription.commandRunAccess = access[0]
	}
	return subscription
}

func (s *debugSubscription) subscribe(panels []string) {
	if s == nil {
		return
	}
	for _, panel := range debugpanels.NormalizePanelIDs(panels) {
		for _, event := range debugPanelEventTypes(panel) {
			if event == "" {
				continue
			}
			s.events[event] = true
		}
	}
}

func (s *debugSubscription) unsubscribe(panels []string) {
	if s == nil {
		return
	}
	for _, panel := range debugpanels.NormalizePanelIDs(panels) {
		for _, event := range debugPanelEventTypes(panel) {
			delete(s.events, event)
		}
	}
}

func (s *debugSubscription) allows(eventType string) bool {
	if eventType == debugEventSnapshot || eventType == debugEventSnapshotInvalidated {
		return true
	}
	if s == nil || len(s.events) == 0 {
		return true
	}
	return s.events[eventType]
}

func (s *debugSubscription) allowsEvent(event DebugEvent) bool {
	if !s.allows(event.Type) {
		return false
	}
	if event.Type != commandRunDebugEventType {
		return true
	}
	return s != nil && s.commandRunAccess != nil && s.commandRunAccess.allows(event)
}

func (a *commandRunWebSocketAccess) allows(event DebugEvent) bool {
	if a == nil || !a.allowed || event.Type != commandRunDebugEventType {
		return false
	}
	scope, ok := commandRunScopeFromDebugEvent(event)
	if !ok || !a.selector.Matches(scope) {
		return false
	}
	if a.authorizer == nil {
		return true
	}
	allowed, err := a.authorizer.AuthorizeCommandRun(a.ctx, scope)
	return err == nil && allowed
}

func commandRunScopeFromDebugEvent(event DebugEvent) (CommandRunScope, bool) {
	switch payload := event.Payload.(type) {
	case CommandRunRecord:
		return payload.Scope.Normalize(), true
	case *CommandRunRecord:
		if payload != nil {
			return payload.Scope.Normalize(), true
		}
	case CommandRunUpdate:
		return payload.Scope.Normalize(), true
	case *CommandRunUpdate:
		if payload != nil {
			return payload.Scope.Normalize(), true
		}
	case map[string]any:
		rawScope, exists := payload["scope"]
		if !exists {
			return CommandRunScope{}, false
		}
		switch scope := rawScope.(type) {
		case CommandRunScope:
			return scope.Normalize(), true
		case map[string]any:
			return CommandRunScope{
				ApplicationID:  strings.TrimSpace(toString(scope["application_id"])),
				EnvironmentID:  strings.TrimSpace(toString(scope["environment_id"])),
				TenantID:       strings.TrimSpace(toString(scope["tenant_id"])),
				OrganizationID: strings.TrimSpace(toString(scope["organization_id"])),
			}, true
		}
	}
	return CommandRunScope{}, false
}

func debugPanelEventTypes(panel string) []string {
	normalized := strings.ToLower(strings.TrimSpace(panel))
	if normalized == "" {
		return nil
	}
	ensureDebugBuiltinPanels()
	if def, ok := debugregistry.PanelDefinitionFor(normalized); ok && len(def.EventTypes) > 0 {
		return def.EventTypes
	}
	switch normalized {
	case "request", DebugPanelRequests:
		return []string{"request"}
	case "log", DebugPanelLogs:
		return []string{"log"}
	case DebugPanelSQL:
		return []string{DebugPanelSQL}
	case DebugPanelTemplate:
		return []string{DebugPanelTemplate}
	case DebugPanelSession:
		return []string{DebugPanelSession}
	case DebugPanelCustom:
		return []string{DebugPanelCustom}
	default:
		return []string{normalized}
	}
}

func (m *DebugModule) registerDebugRoutes(admin *Admin) {
	if admin == nil || admin.router == nil || m == nil || m.collector == nil {
		return
	}
	basePath := m.debugBasePath(admin)
	browserAccess := debugAccessMiddleware(admin, m.config, m.permission)
	apiAccess := debugAPIAccessMiddleware(admin, m.config, m.permission)
	sessionAPIAccess := debugAPIAccessMiddleware(admin, m.config, debugSessionViewPermission)

	if m.config.LayoutMode != DebugLayoutDashboard || !featureEnabled(admin.featureGate, FeatureDashboard) {
		m.registerDebugDashboardRoute(admin, basePath, browserAccess)
	}
	m.registerDebugCoreAPIRoutes(admin, apiAccess, sessionAPIAccess)
	m.registerDebugPreferenceRoutes(admin, apiAccess)
	m.registerDebugJSErrorRoute(admin)
}

func (m *DebugModule) debugBasePath(admin *Admin) string {
	if m.basePath != "" {
		return m.basePath
	}
	return normalizeDebugConfig(m.config, adminBasePath(admin.config)).BasePath
}

func (m *DebugModule) registerDebugGet(admin *Admin, path string, handler router.HandlerFunc, middleware router.MiddlewareFunc) {
	if path == "" {
		return
	}
	if middleware != nil {
		admin.router.Get(path, handler, middleware)
		return
	}
	admin.router.Get(path, handler)
}

func (m *DebugModule) registerDebugPost(admin *Admin, path string, handler router.HandlerFunc, middleware router.MiddlewareFunc) {
	if path == "" {
		return
	}
	if middleware != nil {
		admin.router.Post(path, handler, middleware)
		return
	}
	admin.router.Post(path, handler)
}

func (m *DebugModule) registerDebugPut(admin *Admin, path string, handler router.HandlerFunc, middleware router.MiddlewareFunc) {
	if path == "" {
		return
	}
	if middleware != nil {
		admin.router.Put(path, handler, middleware)
		return
	}
	admin.router.Put(path, handler)
}

func (m *DebugModule) registerDebugDashboardRoute(admin *Admin, basePath string, access router.MiddlewareFunc) {
	debugBase := debugRoutePath(admin, m.config, "admin.debug", "index")
	if debugBase == "" {
		debugBase = basePath
	}
	m.registerDebugGet(admin, debugBase, func(c router.Context) error {
		return m.handleDebugDashboard(admin, c)
	}, access)
}

func (m *DebugModule) registerDebugCoreAPIRoutes(admin *Admin, access router.MiddlewareFunc, sessionAccess router.MiddlewareFunc) {
	m.registerDebugGet(admin, debugAPIRoutePath(admin, m.config, "panels"), m.handleDebugPanels, access)
	m.registerDebugGet(admin, debugAPIRoutePath(admin, m.config, "snapshot"), m.handleDebugSnapshot, access)
	m.registerDebugGet(admin, debugAPIRoutePath(admin, m.config, "sessions"), m.handleDebugSessions, sessionAccess)
	m.registerDebugPost(admin, debugAPIRoutePath(admin, m.config, "clear"), m.handleDebugClear, access)
	m.registerDebugPost(admin, debugAPIRoutePath(admin, m.config, "clear.panel"), m.handleDebugClearPanel, access)
	m.registerDebugPost(admin, debugAPIRoutePath(admin, m.config, "panel.action"), m.handleDebugPanelAction, access)
	m.registerDebugPost(admin, debugAPIRoutePath(admin, m.config, "doctor.action"), m.handleDebugDoctorAction, access)
}

func (m *DebugModule) registerDebugPreferenceRoutes(admin *Admin, access router.MiddlewareFunc) {
	path := debugAPIRoutePath(admin, m.config, "preferences.panel_order")
	m.registerDebugGet(admin, path, func(c router.Context) error {
		return m.handleDebugPanelOrderPreference(admin, c)
	}, access)
	m.registerDebugPut(admin, path, func(c router.Context) error {
		return m.handleDebugPanelOrderPreferenceSave(admin, c)
	}, access)
}

func (m *DebugModule) registerDebugJSErrorRoute(admin *Admin) {
	if path := debugAPIRoutePath(admin, m.config, "errors"); path != "" && debugJSErrorRouteEnabled(admin, m.config) {
		admin.router.Post(path, func(c router.Context) error {
			return m.handleJSErrorReport(admin, c)
		})
	}
}

func (m *DebugModule) registerDebugWebSocket(admin *Admin) {
	if admin == nil || admin.router == nil || m == nil || m.collector == nil {
		return
	}
	ws, ok := admin.router.(debugWebSocketRouter)
	if !ok {
		m.collector.SetLiveTransportEnabled(false)
		return
	}
	if m.admin == nil {
		m.admin = admin
	}
	basePath := m.basePath
	if basePath == "" {
		basePath = normalizeDebugConfig(m.config, adminBasePath(admin.config)).BasePath
	}
	cfg := router.DefaultWebSocketConfig()
	cfg.OnPreUpgrade = func(c router.Context) (router.UpgradeData, error) {
		adminCtx, err := debugAuthorizeRequestWithContext(admin, m.config, m.permission, c)
		if err != nil {
			return nil, err
		}
		return router.UpgradeData{
			debugUpgradeAdminContext:     adminCtx,
			debugUpgradeCommandRunAccess: m.commandRunAccess(adminCtx.Context),
		}, nil
	}
	wsPath := debugRoutePath(admin, m.config, "admin.debug", "ws")
	if wsPath == "" {
		wsPath = joinBasePath(basePath, "ws")
	}
	ws.WebSocket(wsPath, cfg, func(c router.WebSocketContext) error {
		return m.handleDebugWebSocket(c)
	})
	m.collector.SetLiveTransportEnabled(true)
}

func (m *DebugModule) registerDebugSessionWebSocket(admin *Admin) {
	if admin == nil || admin.router == nil || m == nil || m.collector == nil {
		return
	}
	ws, ok := admin.router.(debugWebSocketRouter)
	if !ok {
		return
	}
	basePath := m.basePath
	if basePath == "" {
		basePath = normalizeDebugConfig(m.config, adminBasePath(admin.config)).BasePath
	}
	cfg := router.DefaultWebSocketConfig()
	cfg.OnPreUpgrade = func(c router.Context) (router.UpgradeData, error) {
		if c == nil {
			return nil, ErrForbidden
		}
		adminCtx, err := debugAuthorizeRequestWithContext(admin, m.config, debugSessionAttachPermission, c)
		if err != nil {
			return nil, err
		}
		return router.UpgradeData{
			debugSessionUpgradeAdminContext: adminCtx,
			debugSessionUpgradeIP:           strings.TrimSpace(c.IP()),
			debugSessionUpgradeUserAgent:    strings.TrimSpace(c.Header("User-Agent")),
		}, nil
	}
	wsPath := debugRoutePath(admin, m.config, "admin.debug", "session.ws")
	if wsPath == "" {
		wsPath = joinBasePath(basePath, debugSessionWSPathSuffix)
	}
	ws.WebSocket(wsPath, cfg, func(c router.WebSocketContext) error {
		return m.handleDebugSessionWebSocket(admin, c)
	})
}

func (m *DebugModule) handleDebugPanels(c router.Context) error {
	if m == nil || m.collector == nil {
		return writeJSON(c, debugPanelsResponse{Panels: []debugregistry.PanelDefinition{}})
	}
	response := debugPanelsResponse{Panels: m.collector.PanelDefinitionsWithContext(c.Context())}
	if version := debugregistry.RegistryVersion(); version != "" {
		response.Version = version
	}
	return writeJSON(c, response)
}

func (m *DebugModule) handleDebugSnapshot(c router.Context) error {
	if m == nil || m.collector == nil {
		return writeJSON(c, map[string]any{})
	}
	return writeJSON(c, m.collector.SnapshotWithContext(c.Context()))
}

func (m *DebugModule) handleDebugSessions(c router.Context) error {
	if m == nil || m.sessionStore == nil {
		return writeJSON(c, debugSessionsResponse{Sessions: []DebugUserSession{}})
	}
	if ttl := m.config.SessionInactivityExpiry; ttl > 0 {
		if _, err := m.sessionStore.Expire(c.Context(), ttl); err != nil {
			return writeError(c, err)
		}
	}
	sessions, err := m.sessionStore.ListActive(c.Context())
	if err != nil {
		return writeError(c, err)
	}
	if len(sessions) == 0 {
		return writeJSON(c, debugSessionsResponse{Sessions: []DebugUserSession{}})
	}
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].LastActivity.After(sessions[j].LastActivity)
	})
	return writeJSON(c, debugSessionsResponse{Sessions: sessions})
}

func (m *DebugModule) handleDebugPanelOrderPreference(admin *Admin, c router.Context) error {
	userID, prefService, ctx := debugPanelOrderPreferenceContext(admin, c)
	if userID == "" || prefService == nil {
		return writeJSON(c, debugPanelOrderPreferenceResponse{Available: false, PanelOrder: []string{}})
	}
	prefs, err := prefService.Get(ctx, userID)
	if err != nil {
		return writeError(c, err)
	}
	_, found := prefs.Raw[debugPanelOrderPreferenceKey]
	return writeJSON(c, debugPanelOrderPreferenceResponse{
		Available:  true,
		Found:      found,
		PanelOrder: normalizeDebugPanelOrderPreference(m, prefs.Raw[debugPanelOrderPreferenceKey]),
		UserID:     userID,
	})
}

func (m *DebugModule) handleDebugPanelOrderPreferenceSave(admin *Admin, c router.Context) error {
	userID, prefService, ctx := debugPanelOrderPreferenceContext(admin, c)
	if userID == "" || prefService == nil {
		return writeJSON(c, debugPanelOrderPreferenceResponse{Available: false, PanelOrder: []string{}})
	}
	var payload struct {
		PanelOrder any `json:"panel_order"`
	}
	rawBody := strings.TrimSpace(string(c.Body()))
	if rawBody != "" {
		if err := json.Unmarshal([]byte(rawBody), &payload); err != nil {
			return writeError(c, goerrors.New("invalid JSON payload", goerrors.CategoryValidation).
				WithCode(http.StatusBadRequest).
				WithTextCode("INVALID_PAYLOAD"))
		}
	}
	order := normalizeDebugPanelOrderPreference(m, payload.PanelOrder)
	if _, err := prefService.Save(ctx, userID, UserPreferences{
		UserID: userID,
		Raw: map[string]any{
			debugPanelOrderPreferenceKey: order,
		},
	}); err != nil {
		return writeError(c, err)
	}
	return writeJSON(c, debugPanelOrderPreferenceResponse{
		Available:  true,
		Found:      true,
		PanelOrder: order,
		UserID:     userID,
	})
}

func debugPanelOrderPreferenceContext(admin *Admin, c router.Context) (string, *PreferencesService, context.Context) {
	if admin == nil || c == nil {
		return "", nil, context.Background()
	}
	ctx := c.Context()
	if ctx == nil {
		ctx = context.Background()
	}
	if !authenticatedRequestFromContext(ctx) {
		return "", admin.PreferencesService(), ctx
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = strings.TrimSpace(admin.config.DefaultLocale)
	}
	adminCtx := admin.adminContextFromRequest(c, locale)
	return strings.TrimSpace(adminCtx.UserID), admin.PreferencesService(), adminCtx.Context
}

func normalizeDebugPanelOrderPreference(m *DebugModule, value any) []string {
	candidates := debugPanelOrderPreferenceCandidates(value)
	if len(candidates) == 0 {
		return []string{}
	}
	allowed := debugPanelOrderAllowedSet(m)
	out := make([]string, 0, len(candidates))
	seen := map[string]bool{}
	for _, candidate := range candidates {
		panelID := debugpanels.NormalizePanelID(candidate)
		if panelID == "" || seen[panelID] || !debugPanelOrderPreferenceIDValid(panelID) || !allowed[panelID] {
			continue
		}
		seen[panelID] = true
		out = append(out, panelID)
	}
	if len(out) == 0 {
		return []string{}
	}
	return out
}

func debugPanelOrderPreferenceCandidates(value any) []string {
	switch typed := value.(type) {
	case []string:
		return typed
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if val, ok := item.(string); ok {
				out = append(out, val)
			}
		}
		return out
	default:
		return nil
	}
}

func debugPanelOrderAllowedSet(m *DebugModule) map[string]bool {
	allowed := map[string]bool{
		"sessions": true,
	}
	if m != nil {
		for _, panelID := range m.config.Panels {
			if normalized := debugpanels.NormalizePanelID(panelID); normalized != "" {
				allowed[normalized] = true
			}
		}
		if m.collector != nil {
			for _, def := range m.collector.PanelDefinitions() {
				if normalized := debugpanels.NormalizePanelID(def.ID); normalized != "" {
					allowed[normalized] = true
				}
			}
		}
	}
	return allowed
}

func debugPanelOrderPreferenceIDValid(panelID string) bool {
	if panelID == "" {
		return false
	}
	for _, r := range panelID {
		switch {
		case r >= 'a' && r <= 'z':
		case r >= '0' && r <= '9':
		case r == '-' || r == '_' || r == '.' || r == ':':
		default:
			return false
		}
	}
	return true
}

func (m *DebugModule) handleDebugDashboard(admin *Admin, c router.Context) error {
	if m == nil {
		return ErrForbidden
	}
	basePath := strings.TrimSpace(m.adminBasePath)
	if basePath == "" {
		basePath = "/"
	}
	debugPath := m.basePath
	if debugPath == "" {
		debugPath = normalizeDebugConfig(m.config, basePath).BasePath
	}
	viewCtx := router.ViewContext{
		"title":                        "Debug Console",
		"base_path":                    basePath,
		"debug_path":                   debugPath,
		"panels":                       m.config.Panels,
		"repl_commands":                debugREPLCommandsForRequest(admin, m.config, c),
		"panel_order_preferences_path": debugAPIRoutePath(admin, m.config, "preferences.panel_order"),
		"max_log_entries":              m.config.MaxLogEntries,
		"max_sql_queries":              m.config.MaxSQLQueries,
		"slow_query_threshold_ms":      m.config.SlowQueryThreshold.Milliseconds(),
	}
	viewCtx = buildDebugViewContext(admin, m.config, c, viewCtx)
	return templateview.RenderTemplateView(c, debugPageTemplate(m.config, c), viewCtx)
}

func (m *DebugModule) handleDebugClear(c router.Context) error {
	if m == nil || m.collector == nil {
		return writeJSON(c, map[string]string{"status": "ok"})
	}
	m.collector.ClearWithContext(c.Context())
	m.publishSnapshotInvalidation()
	return writeJSON(c, map[string]string{"status": "ok"})
}

func (m *DebugModule) handleDebugClearPanel(c router.Context) error {
	panelID := strings.TrimSpace(c.Param("panel", ""))
	if panelID == "" {
		return writeError(c, errDebugPanelRequired)
	}
	if m == nil || m.collector == nil {
		return writeJSON(c, map[string]string{"status": "ok"})
	}
	if !m.collector.ClearPanelWithContext(c.Context(), panelID) {
		return writeError(c, ErrNotFound)
	}
	m.publishSnapshotInvalidation()
	return writeJSON(c, map[string]string{"status": "ok", "panel": panelID})
}

func (m *DebugModule) handleDebugPanelAction(c router.Context) error {
	panelID := debugpanels.NormalizePanelID(c.Param("panel", ""))
	if panelID == "" {
		return writeError(c, errDebugPanelRequired)
	}
	actionID := strings.ToLower(strings.TrimSpace(c.Param("action", "")))
	if actionID == "" {
		return writeError(c, errDebugPanelActionRequired)
	}
	if m == nil || m.collector == nil {
		return writeError(c, ErrNotFound)
	}
	if len(c.Body()) > 1<<20 {
		return writeError(c, goerrors.New("panel action payload too large", goerrors.CategoryValidation).
			WithCode(http.StatusRequestEntityTooLarge).
			WithTextCode(TextCodeValidationError))
	}
	payload := map[string]any{}
	rawBody := strings.TrimSpace(string(c.Body()))
	if rawBody != "" {
		if err := json.Unmarshal([]byte(rawBody), &payload); err != nil {
			return writeError(c, goerrors.New("invalid JSON payload", goerrors.CategoryValidation).
				WithCode(http.StatusBadRequest).
				WithTextCode("INVALID_PAYLOAD"))
		}
	}
	result, err := m.collector.RunPanelAction(c.Context(), debugregistry.PanelActionRequest{
		PanelID:  panelID,
		ActionID: actionID,
		Payload:  payload,
	})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return writeError(c, ErrNotFound)
		}
		return writeError(c, err)
	}
	if result.Refresh {
		m.publishSnapshotInvalidation()
	}
	return writeJSON(c, result)
}

func (m *DebugModule) handleDebugDoctorAction(c router.Context) error {
	checkID := strings.TrimSpace(c.Param("check", ""))
	if checkID == "" {
		return writeError(c, errDebugDoctorCheckRequired)
	}
	if m == nil || m.admin == nil {
		return writeError(c, ErrNotFound)
	}

	payload := map[string]any{}
	rawBody := strings.TrimSpace(string(c.Body()))
	if rawBody != "" {
		var decoded map[string]any
		if err := json.Unmarshal([]byte(rawBody), &decoded); err != nil {
			return writeError(c, goerrors.New("invalid JSON payload", goerrors.CategoryValidation).
				WithCode(http.StatusBadRequest).
				WithTextCode("INVALID_PAYLOAD"))
		}
		payload = decoded
	}

	result, err := m.admin.RunDoctorAction(c.Context(), checkID, payload)
	if err != nil {
		switch {
		case errors.Is(err, ErrDoctorCheckNotFound):
			return writeError(c, ErrNotFound)
		case errors.Is(err, ErrDoctorActionUnavailable):
			return writeError(c, goerrors.New("doctor action unavailable", goerrors.CategoryValidation).
				WithCode(http.StatusConflict).
				WithTextCode("DOCTOR_ACTION_UNAVAILABLE"))
		case errors.Is(err, ErrDoctorActionNotRunnable):
			return writeError(c, goerrors.New("doctor action not runnable", goerrors.CategoryValidation).
				WithCode(http.StatusConflict).
				WithTextCode("DOCTOR_ACTION_NOT_RUNNABLE"))
		default:
			return writeError(c, err)
		}
	}
	m.publishSnapshotInvalidation()
	return writeJSON(c, map[string]any{
		"status":  "ok",
		"check":   result.CheckID,
		"message": result.Message,
		"result":  result,
	})
}

var errJSErrorMessageRequired = goerrors.New("message is required", goerrors.CategoryValidation).
	WithCode(http.StatusBadRequest).
	WithTextCode("MISSING_MESSAGE")

func (m *DebugModule) handleJSErrorReport(admin *Admin, c router.Context) error {
	if m == nil || m.collector == nil {
		return writeJSON(c, map[string]string{"status": "ignored"})
	}
	if !debugJSErrorRouteEnabled(admin, m.config) {
		return writeError(c, ErrNotFound)
	}
	var payload struct {
		Type      string         `json:"type"`
		Message   string         `json:"message"`
		Source    string         `json:"source"`
		Line      int            `json:"line"`
		Column    int            `json:"column"`
		Stack     string         `json:"stack"`
		URL       string         `json:"url"`
		UserAgent string         `json:"user_agent"`
		Nonce     string         `json:"nonce"`
		Extra     map[string]any `json:"extra"`
	}
	if err := json.Unmarshal(c.Body(), &payload); err != nil {
		return writeError(c, goerrors.New("invalid JSON payload", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("INVALID_PAYLOAD"))
	}
	// Validate double-submit cookie nonce.
	cookieNonce := c.Cookies(debugNonceCookieName)
	if !debugValidateNonce(cookieNonce, payload.Nonce) {
		return writeError(c, ErrForbidden)
	}
	if strings.TrimSpace(payload.Message) == "" {
		return writeError(c, errJSErrorMessageRequired)
	}
	entry := JSErrorEntry{
		ID:        uuid.NewString(),
		Timestamp: time.Now(),
		Type:      strings.TrimSpace(payload.Type),
		Message:   payload.Message,
		Source:    payload.Source,
		Line:      payload.Line,
		Column:    payload.Column,
		Stack:     payload.Stack,
		URL:       payload.URL,
		UserAgent: payload.UserAgent,
		Extra:     payload.Extra,
	}
	m.collector.CaptureJSError(entry)
	return writeJSON(c, map[string]string{"status": "ok"})
}

func (m *DebugModule) handleDebugWebSocket(c router.WebSocketContext) (result error) {
	if m == nil || m.collector == nil {
		return ErrForbidden
	}
	defer closeDebugWebSocket(c)
	access := m.commandRunAccessFromUpgrade(c)
	reader, err := startDebugCommandReader(c)
	if err != nil {
		return err
	}
	defer func() {
		result = preserveDebugWebSocketPrimaryError(result, reader.Stop())
	}()
	baseCtx := c.Context()
	if baseCtx == nil {
		baseCtx = context.Background()
	}
	lifecycleCtx, cancelLifecycle := context.WithCancel(baseCtx)
	watchStopped := make(chan struct{})
	go func() {
		select {
		case <-reader.done:
			cancelLifecycle()
		case <-watchStopped:
		}
	}()
	defer close(watchStopped)
	defer cancelLifecycle()

	events, unsubscribe := m.subscribeDebugEvents()
	if events == nil {
		return nil
	}
	defer unsubscribe()
	subscriptions := newDebugSubscription(access)
	subscriptions.lifecycleContext = lifecycleCtx
	if err := m.writeDebugSnapshotForLifecycle(c, lifecycleCtx, access); err != nil {
		if errors.Is(err, context.Canceled) {
			return debugWebSocketReadResult(reader.errors)
		}
		return err
	}
	return m.runDebugWebSocketLoop(c, subscriptions, reader.messages, reader.errors, reader.done, events)
}

func (m *DebugModule) subscribeDebugEvents() (<-chan DebugEvent, func()) {
	clientID := uuid.NewString()
	events := m.collector.Subscribe(clientID)
	return events, func() {
		m.collector.Unsubscribe(clientID)
	}
}

func startDebugCommandReader(c router.WebSocketContext) (*debugWebSocketJSONReader[debugCommand], error) {
	return startDebugWebSocketJSONReader[debugCommand](c, 16, true)
}

func (m *DebugModule) runDebugWebSocketLoop(c router.WebSocketContext, subscriptions *debugSubscription, commandCh <-chan debugCommand, readErrors <-chan error, done <-chan struct{}, events <-chan DebugEvent) error {
	for {
		select {
		case <-done:
			return debugWebSocketReadResult(readErrors)
		case <-c.Context().Done():
			return nil
		case cmd, ok := <-commandCh:
			if !ok {
				return debugWebSocketReadResult(readErrors)
			}
			if err := m.handleDebugCommand(c, subscriptions, cmd); err != nil {
				if errors.Is(err, context.Canceled) {
					return debugWebSocketReadResult(readErrors)
				}
				return err
			}
		case event, ok := <-events:
			if !ok {
				return errDebugWebSocketSubscriberClosed
			}
			if err := writeSubscribedDebugEvent(c, subscriptions, event); err != nil {
				return err
			}
		}
	}
}

func writeSubscribedDebugEvent(c router.WebSocketContext, subscriptions *debugSubscription, event DebugEvent) error {
	if !subscriptions.allowsEvent(event) {
		return nil
	}
	return c.WriteJSON(event)
}

func (m *DebugModule) handleDebugSessionWebSocket(admin *Admin, c router.WebSocketContext) (result error) {
	sessionID, includeGlobals, err := m.debugSessionWebSocketConfig(c)
	if err != nil {
		return err
	}
	defer closeDebugWebSocket(c)
	adminCtx := debugSessionAdminContext(c)
	access := m.commandRunAccess(adminCtx.Context)
	reader, err := startDebugCommandReader(c)
	if err != nil {
		return err
	}
	defer func() {
		result = preserveDebugWebSocketPrimaryError(result, reader.Stop())
	}()
	baseCtx := c.Context()
	if baseCtx == nil {
		baseCtx = context.Background()
	}
	lifecycleCtx, cancelLifecycle := context.WithCancel(baseCtx)
	watchStopped := make(chan struct{})
	go func() {
		select {
		case <-reader.done:
			cancelLifecycle()
		case <-watchStopped:
		}
	}()
	defer close(watchStopped)
	defer cancelLifecycle()

	events, cleanup := m.subscribeDebugEvents()
	if events == nil {
		return nil
	}
	defer cleanup()
	subscriptions := newDebugSubscription(access)
	subscriptions.lifecycleContext = lifecycleCtx
	if err := m.writeDebugSessionSnapshotForLifecycle(c, lifecycleCtx, sessionID, includeGlobals, access); err != nil {
		if errors.Is(err, context.Canceled) {
			return debugWebSocketReadResult(reader.errors)
		}
		return err
	}

	m.recordDebugSessionAttach(admin, c, sessionID)

	return m.runDebugSessionWebSocketLoop(c, subscriptions, reader.messages, reader.errors, reader.done, events, sessionID, includeGlobals)
}

func (m *DebugModule) debugSessionWebSocketConfig(c router.WebSocketContext) (string, bool, error) {
	if m == nil || m.collector == nil || c == nil {
		return "", false, ErrForbidden
	}
	sessionID := strings.TrimSpace(c.Param("sessionId"))
	if sessionID == "" {
		return "", false, ErrNotFound
	}
	return sessionID, m.config.SessionIncludeGlobalPanelsEnabled(), nil
}

func (m *DebugModule) recordDebugSessionAttach(admin *Admin, c router.WebSocketContext, sessionID string) {
	adminCtx := debugSessionAdminContext(c)
	attachMeta := debugSessionAttachMeta(c)
	session := m.loadDebugSession(adminCtx.Context, sessionID)
	recordDebugSessionAttach(admin, adminCtx.Context, session, attachMeta)
}

func (m *DebugModule) runDebugSessionWebSocketLoop(c router.WebSocketContext, subscriptions *debugSubscription, commandCh <-chan debugCommand, readErrors <-chan error, done <-chan struct{}, events <-chan DebugEvent, sessionID string, includeGlobals bool) error {
	for {
		select {
		case <-done:
			return debugWebSocketReadResult(readErrors)
		case <-c.Context().Done():
			return nil
		case cmd, ok := <-commandCh:
			if !ok {
				return debugWebSocketReadResult(readErrors)
			}
			if err := m.handleDebugSessionCommand(c, subscriptions, cmd, sessionID, includeGlobals); err != nil {
				if errors.Is(err, context.Canceled) {
					return debugWebSocketReadResult(readErrors)
				}
				return err
			}
		case event, ok := <-events:
			if !ok {
				return errDebugWebSocketSubscriberClosed
			}
			if err := writeDebugSessionEvent(c, subscriptions, event, sessionID, includeGlobals); err != nil {
				return err
			}
		}
	}
}

func writeDebugSessionEvent(c router.WebSocketContext, subscriptions *debugSubscription, event DebugEvent, sessionID string, includeGlobals bool) error {
	if !subscriptions.allowsEvent(event) || !debugSessionEventAllowed(event, sessionID, includeGlobals) {
		return nil
	}
	return c.WriteJSON(event)
}

func debugSessionAdminContext(c router.WebSocketContext) AdminContext {
	adminCtx := debugSessionAdminContextFromUpgrade(c)
	if adminCtx.Context == nil {
		adminCtx.Context = c.Context()
	}
	if adminCtx.UserID == "" {
		adminCtx.UserID = userIDFromContext(adminCtx.Context)
	}
	return adminCtx
}

func debugSessionAttachMeta(c router.WebSocketContext) map[string]any {
	attachMeta := map[string]any{}
	if ip := debugSessionUpgradeString(c, debugSessionUpgradeIP); ip != "" {
		attachMeta["attach_ip"] = ip
	}
	if ua := debugSessionUpgradeString(c, debugSessionUpgradeUserAgent); ua != "" {
		attachMeta["attach_user_agent"] = ua
	}
	return attachMeta
}

func (m *DebugModule) loadDebugSession(ctx context.Context, sessionID string) DebugUserSession {
	session := DebugUserSession{SessionID: sessionID}
	if m == nil || m.sessionStore == nil {
		return session
	}
	if ttl := m.config.SessionInactivityExpiry; ttl > 0 {
		if _, err := m.sessionStore.Expire(ctx, ttl); err != nil {
			return session
		}
	}
	stored, ok, err := m.sessionStore.Get(ctx, sessionID)
	if err != nil {
		return session
	}
	if ok {
		return stored
	}
	return session
}

func (m *DebugModule) handleDebugSessionCommand(c router.WebSocketContext, subscriptions *debugSubscription, cmd debugCommand, sessionID string, includeGlobals bool) error {
	if m == nil {
		return nil
	}
	switch strings.ToLower(strings.TrimSpace(cmd.Type)) {
	case "subscribe":
		subscriptions.subscribe(cmd.Panels)
	case "unsubscribe":
		subscriptions.unsubscribe(cmd.Panels)
	case "snapshot":
		return m.writeDebugSessionSnapshotForLifecycle(c, subscriptions.lifecycleContext, sessionID, includeGlobals, subscriptions.commandRunAccess)
	case "clear":
		m.clearDebugPanels(debugWebSocketAccessContext(c, subscriptions.commandRunAccess), cmd.Panels)
		return m.writeDebugSessionSnapshotForLifecycle(c, subscriptions.lifecycleContext, sessionID, includeGlobals, subscriptions.commandRunAccess)
	}
	return nil
}

func (m *DebugModule) handleDebugCommand(c router.WebSocketContext, subscriptions *debugSubscription, cmd debugCommand) error {
	if m == nil {
		return nil
	}
	switch strings.ToLower(strings.TrimSpace(cmd.Type)) {
	case "subscribe":
		subscriptions.subscribe(cmd.Panels)
	case "unsubscribe":
		subscriptions.unsubscribe(cmd.Panels)
	case "snapshot":
		return m.writeDebugSnapshotForLifecycle(c, subscriptions.lifecycleContext, subscriptions.commandRunAccess)
	case "clear":
		m.clearDebugPanels(debugWebSocketAccessContext(c, subscriptions.commandRunAccess), cmd.Panels)
	}
	return nil
}

func (m *DebugModule) clearDebugPanels(ctx context.Context, panels []string) {
	if m == nil || m.collector == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}
	normalized := debugpanels.NormalizePanelIDs(panels)
	if len(normalized) == 0 {
		m.collector.ClearWithContext(ctx)
		m.publishSnapshotInvalidation()
		return
	}
	for _, panel := range normalized {
		_ = m.collector.ClearPanelWithContext(ctx, panel)
	}
	m.publishSnapshotInvalidation()
}

// publishSnapshotInvalidation tells each connected client to request a fresh snapshot over
// its own authenticated connection. Snapshot payloads can contain request-scoped
// panel data and must never be evaluated once and broadcast to every subscriber.
func (m *DebugModule) publishSnapshotInvalidation() {
	if m == nil || m.collector == nil {
		return
	}
	m.collector.publish(debugEventSnapshotInvalidated, nil)
}

func (m *DebugModule) writeDebugSnapshot(c router.WebSocketContext, access ...*commandRunWebSocketAccess) error {
	return m.writeDebugSnapshotForLifecycle(c, nil, access...)
}

func (m *DebugModule) writeDebugSnapshotForLifecycle(c router.WebSocketContext, lifecycle context.Context, access ...*commandRunWebSocketAccess) error {
	if m == nil || m.collector == nil {
		return nil
	}
	ctx, cancel := m.debugSnapshotContext(c, lifecycle, access...)
	defer cancel()
	snapshot := m.collector.SnapshotWithContext(ctx)
	if err := ctx.Err(); err != nil {
		return err
	}
	return c.WriteJSON(DebugEvent{
		Type:      debugEventSnapshot,
		Payload:   snapshot,
		Timestamp: time.Now(),
	})
}

func (m *DebugModule) commandRunAccess(ctx context.Context) *commandRunWebSocketAccess {
	if ctx == nil {
		ctx = context.Background()
	} else {
		ctx = context.WithoutCancel(ctx)
	}
	access := &commandRunWebSocketAccess{ctx: ctx}
	panel := NewCommandRunsDebugPanel(m.admin)
	if !panel.available(ctx) {
		return access
	}
	selector, err := panel.selector(ctx)
	if err != nil {
		if panel.runtime != nil {
			panel.runtime.reportError(err)
		}
		return access
	}
	access.selector = selector
	access.authorizer = panel.runtime.config.ScopeAuthorizer
	access.allowed = true
	return access
}

func (m *DebugModule) commandRunAccessFromUpgrade(c router.WebSocketContext) *commandRunWebSocketAccess {
	if c == nil {
		return m.commandRunAccess(context.Background())
	}
	if raw, ok := c.UpgradeData(debugUpgradeCommandRunAccess); ok {
		if access, ok := raw.(*commandRunWebSocketAccess); ok && access != nil {
			return access
		}
	}
	if raw, ok := c.UpgradeData(debugUpgradeAdminContext); ok {
		if adminCtx, ok := raw.(AdminContext); ok && adminCtx.Context != nil {
			return m.commandRunAccess(adminCtx.Context)
		}
	}
	return m.commandRunAccess(c.Context())
}

func debugWebSocketAccessContext(c router.WebSocketContext, access *commandRunWebSocketAccess) context.Context {
	if access != nil && access.ctx != nil {
		return access.ctx
	}
	if c != nil && c.Context() != nil {
		return c.Context()
	}
	return context.Background()
}

type debugLifecycleValueContext struct {
	context.Context
	values context.Context
}

func (c debugLifecycleValueContext) Value(key any) any {
	if c.values != nil {
		if value := c.values.Value(key); value != nil {
			return value
		}
	}
	return c.Context.Value(key)
}

func (m *DebugModule) debugSnapshotContext(c router.WebSocketContext, lifecycle context.Context, access ...*commandRunWebSocketAccess) (context.Context, context.CancelFunc) {
	if lifecycle == nil && c != nil {
		lifecycle = c.Context()
	}
	if lifecycle == nil {
		lifecycle = context.Background()
	}
	timed, cancel := context.WithTimeout(lifecycle, m.config.snapshotTimeout())
	var values context.Context
	if len(access) > 0 && access[0] != nil {
		values = access[0].ctx
	}
	if values == nil {
		return timed, cancel
	}
	return debugLifecycleValueContext{Context: timed, values: values}, cancel
}

func (m *DebugModule) writeDebugSessionSnapshot(c router.WebSocketContext, sessionID string, includeGlobals bool, access ...*commandRunWebSocketAccess) error {
	return m.writeDebugSessionSnapshotForLifecycle(c, nil, sessionID, includeGlobals, access...)
}

func (m *DebugModule) writeDebugSessionSnapshotForLifecycle(c router.WebSocketContext, lifecycle context.Context, sessionID string, includeGlobals bool, access ...*commandRunWebSocketAccess) error {
	if m == nil || m.collector == nil {
		return nil
	}
	if len(access) == 0 || access[0] == nil {
		if adminCtx := debugSessionAdminContextFromUpgrade(c); adminCtx.Context != nil {
			access = []*commandRunWebSocketAccess{{ctx: context.WithoutCancel(adminCtx.Context)}}
		}
	}
	ctx, cancel := m.debugSnapshotContext(c, lifecycle, access...)
	defer cancel()
	snapshot := m.collector.SessionSnapshotWithContext(ctx, sessionID, DebugSessionSnapshotOptions{
		IncludeGlobalPanels: includeGlobals,
	})
	if err := ctx.Err(); err != nil {
		return err
	}
	return c.WriteJSON(DebugEvent{
		Type:      debugEventSnapshot,
		Payload:   snapshot,
		Timestamp: time.Now(),
	})
}

func debugSessionAdminContextFromUpgrade(c router.WebSocketContext) AdminContext {
	if c == nil {
		return AdminContext{}
	}
	raw, ok := c.UpgradeData(debugSessionUpgradeAdminContext)
	if !ok {
		return AdminContext{}
	}
	if adminCtx, ok := raw.(AdminContext); ok {
		return adminCtx
	}
	return AdminContext{}
}

func debugSessionUpgradeString(c router.WebSocketContext, key string) string {
	if c == nil {
		return ""
	}
	if raw, ok := c.UpgradeData(key); ok {
		if value, ok := raw.(string); ok {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func debugSessionEventAllowed(event DebugEvent, sessionID string, includeGlobals bool) bool {
	if event.Type == debugEventSnapshotInvalidated {
		return true
	}
	if event.Type == debugEventSnapshot {
		return false
	}
	if debugSessionEventType(event.Type) {
		return sessionID != "" && debugEventSessionID(event) == sessionID
	}
	return includeGlobals
}

func debugSessionEventType(eventType string) bool {
	switch strings.ToLower(strings.TrimSpace(eventType)) {
	case "request", "log", DebugPanelSQL:
		return true
	default:
		return false
	}
}

func debugEventSessionID(event DebugEvent) string {
	switch payload := event.Payload.(type) {
	case RequestEntry:
		return strings.TrimSpace(payload.SessionID)
	case *RequestEntry:
		if payload == nil {
			return ""
		}
		return strings.TrimSpace(payload.SessionID)
	case SQLEntry:
		return strings.TrimSpace(payload.SessionID)
	case *SQLEntry:
		if payload == nil {
			return ""
		}
		return strings.TrimSpace(payload.SessionID)
	case LogEntry:
		return strings.TrimSpace(payload.SessionID)
	case *LogEntry:
		if payload == nil {
			return ""
		}
		return strings.TrimSpace(payload.SessionID)
	case map[string]any:
		if raw, ok := payload["session_id"]; ok {
			return strings.TrimSpace(toString(raw))
		}
	}
	return ""
}

func debugAccessMiddleware(admin *Admin, cfg DebugConfig, permission string) router.MiddlewareFunc {
	if admin == nil {
		return nil
	}
	wrap := admin.authWrapper()
	return func(next router.HandlerFunc) router.HandlerFunc {
		return wrap(func(c router.Context) error {
			if err := debugAuthorizeRequest(admin, cfg, permission, c); err != nil {
				return writeError(c, err)
			}
			return next(c)
		})
	}
}

// debugAPIAccessMiddleware keeps the Debug JSON transport independent from
// browser-oriented auth error handlers. In particular, a rejected API request
// must not be redirected to an HTML login page and then parsed as JSON by the
// Debug client.
func debugAPIAccessMiddleware(admin *Admin, cfg DebugConfig, permission string) router.MiddlewareFunc {
	if admin == nil {
		return nil
	}
	return func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			if err := debugAuthorizeRequest(admin, cfg, permission, c); err != nil {
				return writeError(c, err)
			}
			if err := enforceAdminAuthenticatorBrowserCSRF(c, admin); err != nil {
				return writeError(c, err)
			}
			return next(c)
		}
	}
}

func debugAuthHandler(admin *Admin, cfg DebugConfig, permission string) router.HandlerFunc {
	if admin == nil {
		return func(c router.Context) error { return ErrForbidden }
	}
	return func(c router.Context) error {
		return debugAuthorizeRequest(admin, cfg, permission, c)
	}
}

func debugAuthorizeRequest(admin *Admin, cfg DebugConfig, permission string, c router.Context) error {
	_, err := debugAuthorizeRequestWithContext(admin, cfg, permission, c)
	return err
}

func debugResolvedPermission(cfg DebugConfig, permission string) string {
	permission = strings.TrimSpace(permission)
	if permission != "" {
		return permission
	}
	return strings.TrimSpace(cfg.Permission)
}

func debugHasAuthenticatedExposure(admin *Admin) bool {
	return admin != nil && admin.authenticator != nil && admin.authorizer != nil
}

func debugHasStandaloneIPAccess(cfg DebugConfig) bool {
	return len(cfg.AllowedIPs) > 0
}

func debugHasExposureBoundary(admin *Admin, cfg DebugConfig) bool {
	return debugHasStandaloneIPAccess(cfg) || debugHasAuthenticatedExposure(admin)
}

func debugJSErrorRouteEnabled(admin *Admin, cfg DebugConfig) bool {
	return cfg.CaptureJSErrors && debugHasExposureBoundary(admin, cfg)
}

func debugAuthorizeRequestWithContext(admin *Admin, cfg DebugConfig, permission string, c router.Context) (AdminContext, error) {
	if admin == nil || c == nil {
		return AdminContext{}, ErrForbidden
	}
	if !debugHasExposureBoundary(admin, cfg) {
		return AdminContext{}, ErrForbidden
	}
	if err := debugCheckIP(cfg.AllowedIPs, c.IP()); err != nil {
		return AdminContext{}, err
	}
	if err := debugAuthenticateRequest(admin, c); err != nil {
		return AdminContext{}, err
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = admin.config.DefaultLocale
	}
	adminCtx := admin.adminContextFromRequest(c, locale)
	c.SetContext(adminCtx.Context)
	if !debugHasAuthenticatedExposure(admin) {
		return adminCtx, nil
	}
	resolvedPermission := debugResolvedPermission(cfg, permission)
	if err := requirePermissionWithAuthorizer(admin.authorizer, adminCtx.Context, resolvedPermission, debugModuleID); err != nil {
		return adminCtx, err
	}
	return adminCtx, nil
}

func debugAuthenticateRequest(admin *Admin, c router.Context) error {
	if admin == nil || c == nil || !debugHasAuthenticatedExposure(admin) {
		return nil
	}
	if authenticatedAdminRequest(c.Context()) {
		return nil
	}
	if requestAuth, ok := admin.authenticator.(RequestAuthenticator); ok && requestAuth != nil {
		if err := requestAuth.AuthenticateRequest(c); err != nil {
			return err
		}
		markAuthenticatedRequest(c)
		return nil
	}
	if admin.authenticator == nil {
		return ErrForbidden
	}
	if err := admin.authenticator.Wrap(c); err != nil {
		return err
	}
	markAuthenticatedRequest(c)
	return nil
}

func debugCheckIP(allowed []string, ip string) error {
	if len(allowed) == 0 {
		return nil
	}
	ip = strings.TrimSpace(ip)
	if ip == "" {
		return ErrForbidden
	}
	for _, allowedIP := range allowed {
		if strings.TrimSpace(allowedIP) == ip {
			return nil
		}
	}
	return ErrForbidden
}

func registerDebugDashboardWebSocket[T any](r router.Router[T], path string, hook *dashcmp.BroadcastHook, authHandler router.HandlerFunc) {
	if r == nil || hook == nil || strings.TrimSpace(path) == "" {
		return
	}
	cfg := router.DefaultWebSocketConfig()
	if authHandler != nil {
		cfg.OnPreUpgrade = func(c router.Context) (router.UpgradeData, error) {
			if err := authHandler(c); err != nil {
				return nil, err
			}
			return nil, nil
		}
	}
	r.WebSocket(path, cfg, func(ws router.WebSocketContext) error {
		events, cancel := hook.Subscribe()
		defer cancel()
		for {
			select {
			case event, ok := <-events:
				if !ok {
					return nil
				}
				if err := ws.WriteJSON(event); err != nil {
					return err
				}
			case <-ws.Context().Done():
				return ws.Close()
			}
		}
	})
}
