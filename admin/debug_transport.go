package admin

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/google/uuid"
)

const debugEventSnapshot = "snapshot"

const (
	debugSessionViewPermission   = "admin.debug.session.view"
	debugSessionAttachPermission = "admin.debug.session.attach"
	debugSessionWSPathSuffix     = "session/:sessionId/ws"
)

const (
	debugSessionUpgradeAdminContext = "debug_session_admin_context"
	debugSessionUpgradeIP           = "debug_session_ip"
	debugSessionUpgradeUserAgent    = "debug_session_user_agent"
)

var errDebugPanelRequired = goerrors.New("panel is required", goerrors.CategoryValidation).
	WithCode(http.StatusBadRequest).
	WithTextCode(TextCodeMissingPanel)

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

type debugSubscription struct {
	events map[string]bool
}

type debugWebSocketRouter interface {
	WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo
}

func newDebugSubscription() *debugSubscription {
	return &debugSubscription{events: map[string]bool{}}
}

func (s *debugSubscription) subscribe(panels []string) {
	if s == nil {
		return
	}
	for _, panel := range normalizePanelIDs(panels) {
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
	for _, panel := range normalizePanelIDs(panels) {
		for _, event := range debugPanelEventTypes(panel) {
			delete(s.events, event)
		}
	}
}

func (s *debugSubscription) allows(eventType string) bool {
	if eventType == debugEventSnapshot {
		return true
	}
	if s == nil || len(s.events) == 0 {
		return true
	}
	return s.events[eventType]
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
	basePath := m.basePath
	if basePath == "" {
		basePath = normalizeDebugConfig(m.config, adminBasePath(admin.config)).BasePath
	}
	access := debugAccessMiddleware(admin, m.config, m.permission)
	sessionAccess := debugAccessMiddleware(admin, m.config, debugSessionViewPermission)

	register := func(path string, handler router.HandlerFunc) {
		if path == "" {
			return
		}
		if access != nil {
			admin.router.Get(path, handler, access)
			return
		}
		admin.router.Get(path, handler)
	}
	registerPost := func(path string, handler router.HandlerFunc) {
		if path == "" {
			return
		}
		if access != nil {
			admin.router.Post(path, handler, access)
			return
		}
		admin.router.Post(path, handler)
	}
	registerSession := func(path string, handler router.HandlerFunc) {
		if path == "" {
			return
		}
		if sessionAccess != nil {
			admin.router.Get(path, handler, sessionAccess)
			return
		}
		admin.router.Get(path, handler)
	}

	if !featureEnabled(admin.featureGate, FeatureDashboard) {
		debugBase := debugRoutePath(admin, m.config, "admin.debug", "index")
		if debugBase == "" {
			debugBase = basePath
		}
		register(debugBase, func(c router.Context) error {
			return m.handleDebugDashboard(admin, c)
		})
	}
	register(debugAPIRoutePath(admin, m.config, "panels"), m.handleDebugPanels)
	register(debugAPIRoutePath(admin, m.config, "snapshot"), m.handleDebugSnapshot)
	registerSession(debugAPIRoutePath(admin, m.config, "sessions"), m.handleDebugSessions)
	registerPost(debugAPIRoutePath(admin, m.config, "clear"), m.handleDebugClear)
	registerPost(debugAPIRoutePath(admin, m.config, "clear.panel"), m.handleDebugClearPanel)
	// JS error ingestion endpoint — registered without access middleware so
	// the global error collector on all app pages can report errors.
	if path := debugAPIRoutePath(admin, m.config, "errors"); path != "" {
		admin.router.Post(path, m.handleJSErrorReport)
	}
}

func (m *DebugModule) registerDebugWebSocket(admin *Admin) {
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
	authHandler := debugAuthHandler(admin, m.config, m.permission)
	cfg := router.DefaultWebSocketConfig()
	cfg.OnPreUpgrade = func(c router.Context) (router.UpgradeData, error) {
		if authHandler == nil {
			return nil, nil
		}
		if err := authHandler(c); err != nil {
			return nil, err
		}
		return nil, nil
	}
	wsPath := debugRoutePath(admin, m.config, "admin.debug", "ws")
	if wsPath == "" {
		wsPath = joinBasePath(basePath, "ws")
	}
	ws.WebSocket(wsPath, cfg, func(c router.WebSocketContext) error {
		return m.handleDebugWebSocket(c)
	})
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
	response := debugPanelsResponse{Panels: m.collector.PanelDefinitions()}
	if version := debugregistry.RegistryVersion(); version != "" {
		response.Version = version
	}
	return writeJSON(c, response)
}

func (m *DebugModule) handleDebugSnapshot(c router.Context) error {
	if m == nil || m.collector == nil {
		return writeJSON(c, map[string]any{})
	}
	return writeJSON(c, m.collector.Snapshot())
}

func (m *DebugModule) handleDebugSessions(c router.Context) error {
	if m == nil || m.sessionStore == nil {
		return writeJSON(c, debugSessionsResponse{Sessions: []DebugUserSession{}})
	}
	if ttl := m.config.SessionInactivityExpiry; ttl > 0 {
		_, _ = m.sessionStore.Expire(c.Context(), ttl)
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
		"title":                   "Debug Console",
		"base_path":               basePath,
		"debug_path":              debugPath,
		"panels":                  m.config.Panels,
		"repl_commands":           debugREPLCommandsForRequest(admin, m.config, c),
		"max_log_entries":         m.config.MaxLogEntries,
		"max_sql_queries":         m.config.MaxSQLQueries,
		"slow_query_threshold_ms": m.config.SlowQueryThreshold.Milliseconds(),
	}
	viewCtx = buildDebugViewContext(admin, m.config, c, viewCtx)
	return c.Render(debugPageTemplate(m.config, c), viewCtx)
}

func (m *DebugModule) handleDebugClear(c router.Context) error {
	if m == nil || m.collector == nil {
		return writeJSON(c, map[string]string{"status": "ok"})
	}
	m.collector.Clear()
	m.publishSnapshot()
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
	if !m.collector.ClearPanel(panelID) {
		return writeError(c, ErrNotFound)
	}
	m.publishSnapshot()
	return writeJSON(c, map[string]string{"status": "ok", "panel": panelID})
}

var errJSErrorMessageRequired = goerrors.New("message is required", goerrors.CategoryValidation).
	WithCode(http.StatusBadRequest).
	WithTextCode("MISSING_MESSAGE")

func (m *DebugModule) handleJSErrorReport(c router.Context) error {
	if m == nil || m.collector == nil {
		return writeJSON(c, map[string]string{"status": "ignored"})
	}
	if !m.config.CaptureJSErrors {
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

func (m *DebugModule) handleDebugWebSocket(c router.WebSocketContext) error {
	if m == nil || m.collector == nil {
		return ErrForbidden
	}
	clientID := uuid.NewString()
	events := m.collector.Subscribe(clientID)
	if events == nil {
		return nil
	}
	defer m.collector.Unsubscribe(clientID)

	if err := m.writeDebugSnapshot(c); err != nil {
		return err
	}

	commandCh := make(chan debugCommand, 16)
	done := make(chan struct{})
	go func() {
		defer close(done)
		defer close(commandCh)
		for {
			var cmd debugCommand
			if err := c.ReadJSON(&cmd); err != nil {
				return
			}
			select {
			case commandCh <- cmd:
			default:
			}
		}
	}()

	subscriptions := newDebugSubscription()
	for {
		select {
		case <-done:
			return nil
		case <-c.Context().Done():
			return c.Close()
		case cmd, ok := <-commandCh:
			if !ok {
				return nil
			}
			m.handleDebugCommand(c, subscriptions, cmd)
		case event, ok := <-events:
			if !ok {
				return nil
			}
			if subscriptions.allows(event.Type) {
				if err := c.WriteJSON(event); err != nil {
					return err
				}
			}
		}
	}
}

func (m *DebugModule) handleDebugSessionWebSocket(admin *Admin, c router.WebSocketContext) error {
	if m == nil || m.collector == nil || c == nil {
		return ErrForbidden
	}
	sessionID := strings.TrimSpace(c.Param("sessionId"))
	if sessionID == "" {
		return ErrNotFound
	}
	includeGlobals := m.config.SessionIncludeGlobalPanelsEnabled()

	clientID := uuid.NewString()
	events := m.collector.Subscribe(clientID)
	if events == nil {
		return nil
	}
	defer m.collector.Unsubscribe(clientID)

	if err := m.writeDebugSessionSnapshot(c, sessionID, includeGlobals); err != nil {
		return err
	}

	adminCtx := debugSessionAdminContextFromUpgrade(c)
	if adminCtx.Context == nil {
		adminCtx.Context = c.Context()
	}
	if adminCtx.UserID == "" {
		adminCtx.UserID = userIDFromContext(adminCtx.Context)
	}
	attachMeta := map[string]any{}
	if ip := debugSessionUpgradeString(c, debugSessionUpgradeIP); ip != "" {
		attachMeta["attach_ip"] = ip
	}
	if ua := debugSessionUpgradeString(c, debugSessionUpgradeUserAgent); ua != "" {
		attachMeta["attach_user_agent"] = ua
	}
	session := DebugUserSession{SessionID: sessionID}
	if m.sessionStore != nil {
		if ttl := m.config.SessionInactivityExpiry; ttl > 0 {
			_, _ = m.sessionStore.Expire(adminCtx.Context, ttl)
		}
		if stored, ok, _ := m.sessionStore.Get(adminCtx.Context, sessionID); ok {
			session = stored
		}
	}
	recordDebugSessionAttach(admin, adminCtx.Context, session, attachMeta)

	commandCh := make(chan debugCommand, 16)
	done := make(chan struct{})
	go func() {
		defer close(done)
		defer close(commandCh)
		for {
			var cmd debugCommand
			if err := c.ReadJSON(&cmd); err != nil {
				return
			}
			select {
			case commandCh <- cmd:
			default:
			}
		}
	}()

	subscriptions := newDebugSubscription()
	for {
		select {
		case <-done:
			return nil
		case <-c.Context().Done():
			return c.Close()
		case cmd, ok := <-commandCh:
			if !ok {
				return nil
			}
			m.handleDebugSessionCommand(c, subscriptions, cmd, sessionID, includeGlobals)
		case event, ok := <-events:
			if !ok {
				return nil
			}
			if subscriptions.allows(event.Type) && debugSessionEventAllowed(event, sessionID, includeGlobals) {
				if err := c.WriteJSON(event); err != nil {
					return err
				}
			}
		}
	}
}

func (m *DebugModule) handleDebugSessionCommand(c router.WebSocketContext, subscriptions *debugSubscription, cmd debugCommand, sessionID string, includeGlobals bool) {
	if m == nil {
		return
	}
	switch strings.ToLower(strings.TrimSpace(cmd.Type)) {
	case "subscribe":
		subscriptions.subscribe(cmd.Panels)
	case "unsubscribe":
		subscriptions.unsubscribe(cmd.Panels)
	case "snapshot":
		_ = m.writeDebugSessionSnapshot(c, sessionID, includeGlobals)
	case "clear":
		m.clearDebugPanels(cmd.Panels)
		_ = m.writeDebugSessionSnapshot(c, sessionID, includeGlobals)
	}
}

func (m *DebugModule) handleDebugCommand(c router.WebSocketContext, subscriptions *debugSubscription, cmd debugCommand) {
	if m == nil {
		return
	}
	switch strings.ToLower(strings.TrimSpace(cmd.Type)) {
	case "subscribe":
		subscriptions.subscribe(cmd.Panels)
	case "unsubscribe":
		subscriptions.unsubscribe(cmd.Panels)
	case "snapshot":
		_ = m.writeDebugSnapshot(c)
	case "clear":
		m.clearDebugPanels(cmd.Panels)
	}
}

func (m *DebugModule) clearDebugPanels(panels []string) {
	if m == nil || m.collector == nil {
		return
	}
	normalized := normalizePanelIDs(panels)
	if len(normalized) == 0 {
		m.collector.Clear()
		m.publishSnapshot()
		return
	}
	for _, panel := range normalized {
		_ = m.collector.ClearPanel(panel)
	}
	m.publishSnapshot()
}

func (m *DebugModule) publishSnapshot() {
	if m == nil || m.collector == nil {
		return
	}
	m.collector.publish(debugEventSnapshot, m.collector.Snapshot())
}

func (m *DebugModule) writeDebugSnapshot(c router.WebSocketContext) error {
	if m == nil || m.collector == nil {
		return nil
	}
	return c.WriteJSON(DebugEvent{
		Type:      debugEventSnapshot,
		Payload:   m.collector.Snapshot(),
		Timestamp: time.Now(),
	})
}

func (m *DebugModule) writeDebugSessionSnapshot(c router.WebSocketContext, sessionID string, includeGlobals bool) error {
	if m == nil || m.collector == nil {
		return nil
	}
	snapshot := m.collector.SessionSnapshot(sessionID, DebugSessionSnapshotOptions{
		IncludeGlobalPanels: includeGlobals,
	})
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

func debugAuthHandler(admin *Admin, cfg DebugConfig, permission string) router.HandlerFunc {
	if admin == nil {
		return func(c router.Context) error { return ErrForbidden }
	}
	wrap := admin.authWrapper()
	return wrap(func(c router.Context) error {
		return debugAuthorizeRequest(admin, cfg, permission, c)
	})
}

func debugAuthorizeRequest(admin *Admin, cfg DebugConfig, permission string, c router.Context) error {
	_, err := debugAuthorizeRequestWithContext(admin, cfg, permission, c)
	return err
}

func debugAuthorizeRequestWithContext(admin *Admin, cfg DebugConfig, permission string, c router.Context) (AdminContext, error) {
	if admin == nil || c == nil {
		return AdminContext{}, ErrForbidden
	}
	if err := debugCheckIP(cfg.AllowedIPs, c.IP()); err != nil {
		return AdminContext{}, err
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = admin.config.DefaultLocale
	}
	adminCtx := admin.adminContextFromRequest(c, locale)
	c.SetContext(adminCtx.Context)
	if permission == "" {
		permission = cfg.Permission
	}
	if err := admin.requirePermission(adminCtx, permission, debugModuleID); err != nil {
		return adminCtx, err
	}
	return adminCtx, nil
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
