package admin

import (
	"context"
	"fmt"
	debugcollector "github.com/goliatone/go-admin/admin/internal/debugcollector"
	debugpanels "github.com/goliatone/go-admin/admin/internal/debugpanels"
	"github.com/goliatone/go-admin/internal/primitives"
	"slices"
	"strings"
	"sync"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

const debugSubscriberBuffer = 64

// DebugPanel defines a pluggable debug panel.
type DebugPanel interface {
	ID() string
	Label() string
	Icon() string
	Collect(ctx context.Context) map[string]any
}

// DebugCollector aggregates debug data from multiple sources.
type DebugCollector struct {
	mu sync.RWMutex

	config               DebugConfig
	jsErrorRouteEnabled  bool
	liveTransportEnabled bool
	panelSet             map[string]bool
	panels               []DebugPanel
	panelIndex           map[string]DebugPanel
	panelData            map[string]debugPanelSnapshot

	templateData map[string]any
	sessionData  map[string]any
	requestLog   *RingBuffer[RequestEntry]
	sqlLog       *RingBuffer[SQLEntry]
	serverLog    *RingBuffer[LogEntry]
	jsErrorLog   *RingBuffer[JSErrorEntry]
	customData   map[string]any
	customLog    *RingBuffer[CustomLogEntry]
	configData   map[string]any
	routesData   []RouteEntry
	urls         urlkit.Resolver
	sessionStore DebugUserSessionStore

	subscribers map[string]chan DebugEvent
}

type debugPanelSnapshot struct {
	snapshotKey string
	payload     any
}

// RequestEntry captures HTTP request details.
type RequestEntry struct {
	ID              string            `json:"id"`
	Timestamp       time.Time         `json:"timestamp"`
	SessionID       string            `json:"session_id,omitempty"`
	UserID          string            `json:"user_id,omitempty"`
	Method          string            `json:"method"`
	Path            string            `json:"path"`
	Status          int               `json:"status"`
	Duration        time.Duration     `json:"duration"`
	Headers         map[string]string `json:"headers,omitempty"`
	Query           map[string]string `json:"query,omitempty"`
	ContentType     string            `json:"content_type,omitempty"`
	RequestBody     string            `json:"request_body,omitempty"`
	RequestSize     int64             `json:"request_size,omitempty"`
	BodyTruncated   bool              `json:"body_truncated,omitempty"`
	ResponseHeaders map[string]string `json:"response_headers,omitempty"`
	ResponseBody    string            `json:"response_body,omitempty"`
	ResponseSize    int64             `json:"response_size,omitempty"`
	RemoteIP        string            `json:"remote_ip,omitempty"`
	Error           string            `json:"error,omitempty"`
}

// SQLEntry captures database query details.
type SQLEntry struct {
	ID        string        `json:"id"`
	Timestamp time.Time     `json:"timestamp"`
	SessionID string        `json:"session_id,omitempty"`
	UserID    string        `json:"user_id,omitempty"`
	Query     string        `json:"query"`
	Args      []any         `json:"args,omitempty"`
	Duration  time.Duration `json:"duration"`
	RowCount  int           `json:"row_count"`
	Error     string        `json:"error,omitempty"`
}

// LogEntry captures server log messages.
type LogEntry struct {
	Timestamp time.Time      `json:"timestamp"`
	SessionID string         `json:"session_id,omitempty"`
	UserID    string         `json:"user_id,omitempty"`
	Level     string         `json:"level"`
	Message   string         `json:"message"`
	Fields    map[string]any `json:"fields,omitempty"`
	Source    string         `json:"source,omitempty"`
}

// CustomLogEntry captures custom debug logs.
type CustomLogEntry struct {
	Timestamp time.Time      `json:"timestamp"`
	Category  string         `json:"category"`
	Message   string         `json:"message"`
	Fields    map[string]any `json:"fields,omitempty"`
}

// JSErrorEntry captures a frontend JavaScript error reported by the browser.
type JSErrorEntry struct {
	ID        string         `json:"id"`
	Timestamp time.Time      `json:"timestamp"`
	Type      string         `json:"type"`
	Message   string         `json:"message"`
	Source    string         `json:"source,omitempty"`
	Line      int            `json:"line,omitempty"`
	Column    int            `json:"column,omitempty"`
	Stack     string         `json:"stack,omitempty"`
	URL       string         `json:"url,omitempty"`
	UserAgent string         `json:"user_agent,omitempty"`
	Extra     map[string]any `json:"extra,omitempty"`
}

// DebugEvent is sent to WebSocket subscribers.
type DebugEvent struct {
	Type      string    `json:"type"`
	Payload   any       `json:"payload"`
	Timestamp time.Time `json:"timestamp"`
}

// DebugSessionSnapshotOptions controls session-scoped snapshot behavior.
type DebugSessionSnapshotOptions struct {
	IncludeGlobalPanels bool `json:"include_global_panels"`
}

// NewDebugCollector initializes a collector with the provided configuration.
func NewDebugCollector(cfg DebugConfig) *DebugCollector {
	ensureDebugBuiltinPanels()
	cfg = normalizeDebugConfig(cfg, "")
	debugMasker(cfg)
	panelSet := map[string]bool{}
	for _, panel := range cfg.Panels {
		panelSet[debugpanels.NormalizePanelID(panel)] = true
	}
	return &DebugCollector{
		config:               cfg,
		jsErrorRouteEnabled:  cfg.CaptureJSErrors,
		liveTransportEnabled: false,
		panelSet:             panelSet,
		panelIndex:           map[string]DebugPanel{},
		panelData:            map[string]debugPanelSnapshot{},
		templateData:         map[string]any{},
		sessionData:          map[string]any{},
		requestLog:           NewRingBuffer[RequestEntry](cfg.MaxLogEntries),
		sqlLog:               NewRingBuffer[SQLEntry](cfg.MaxSQLQueries),
		serverLog:            NewRingBuffer[LogEntry](cfg.MaxLogEntries),
		jsErrorLog:           NewRingBuffer[JSErrorEntry](cfg.MaxLogEntries),
		customData:           map[string]any{},
		customLog:            NewRingBuffer[CustomLogEntry](cfg.MaxLogEntries),
		subscribers:          map[string]chan DebugEvent{},
	}
}

// WithURLs sets the URL resolver used for debug integrations.
func (c *DebugCollector) WithURLs(urls urlkit.Resolver) *DebugCollector {
	if c == nil {
		return c
	}
	c.mu.Lock()
	c.urls = urls
	c.mu.Unlock()
	return c
}

// WithSessionStore configures the debug user session store.
func (c *DebugCollector) WithSessionStore(store DebugUserSessionStore) *DebugCollector {
	if c == nil {
		return c
	}
	c.mu.Lock()
	c.sessionStore = store
	c.mu.Unlock()
	return c
}

func (c *DebugCollector) SetJSErrorRouteEnabled(enabled bool) *DebugCollector {
	if c == nil {
		return c
	}
	c.mu.Lock()
	c.jsErrorRouteEnabled = enabled
	c.mu.Unlock()
	return c
}

func (c *DebugCollector) SetLiveTransportEnabled(enabled bool) *DebugCollector {
	if c == nil {
		return c
	}
	c.mu.Lock()
	c.liveTransportEnabled = enabled
	c.mu.Unlock()
	return c
}

func (c *DebugCollector) urlResolver() urlkit.Resolver {
	if c == nil {
		return nil
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.urls
}

func (c *DebugCollector) sessionStoreRef() DebugUserSessionStore {
	if c == nil {
		return nil
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.sessionStore
}

func (c *DebugCollector) jsErrorsEnabled() bool {
	if c == nil {
		return false
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.config.CaptureJSErrors && c.jsErrorRouteEnabled
}

func (c *DebugCollector) toolbarLiveTransportEnabled() bool {
	if c == nil {
		return false
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.liveTransportEnabled
}

// RegisterPanel adds a custom debug panel.
func (c *DebugCollector) RegisterPanel(panel DebugPanel) {
	if c == nil || panel == nil {
		return
	}
	id := debugpanels.NormalizePanelID(panel.ID())
	if id == "" {
		return
	}
	c.mu.Lock()
	if _, exists := c.panelIndex[id]; exists {
		c.mu.Unlock()
		return
	}
	c.panels = append(c.panels, panel)
	c.panelIndex[id] = panel
	c.mu.Unlock()
	registerDebugPanelFromInterface(panel)
}

func (c *DebugCollector) panelMeta(panelID string) (debugPanelMeta, bool) {
	if c == nil {
		return debugPanelMeta{}, false
	}
	panelID = debugpanels.NormalizePanelID(panelID)
	if panelID == "" {
		return debugPanelMeta{}, false
	}
	ensureDebugBuiltinPanels()
	if def, ok := debugregistry.PanelDefinitionFor(panelID); ok {
		meta := debugPanelMeta{
			Label: strings.TrimSpace(def.Label),
			Icon:  strings.TrimSpace(def.Icon),
			Span:  def.Span,
		}
		if meta.Label == "" {
			meta.Label = debugpanels.PanelLabel(panelID)
		}
		if meta.Span <= 0 {
			meta.Span = debugPanelDefaultSpan
		}
		return meta, true
	}
	c.mu.RLock()
	panel := c.panelIndex[panelID]
	c.mu.RUnlock()
	if panel == nil {
		return debugPanelMeta{}, false
	}
	meta := debugPanelMeta{
		Label: strings.TrimSpace(panel.Label()),
		Icon:  strings.TrimSpace(panel.Icon()),
	}
	if spanProvider, ok := panel.(interface{ Span() int }); ok {
		meta.Span = spanProvider.Span()
	}
	return meta, true
}

// CaptureTemplateData stores the current template context.
func (c *DebugCollector) CaptureTemplateData(viewCtx router.ViewContext) {
	if c == nil || !c.panelEnabled(DebugPanelTemplate) {
		return
	}
	data := debugMaskMap(c.config, primitives.CloneAnyMap(map[string]any(viewCtx)))
	c.mu.Lock()
	c.templateData = data
	c.mu.Unlock()
	c.publish(DebugPanelTemplate, data)
}

// CaptureSession stores session information.
func (c *DebugCollector) CaptureSession(session map[string]any) {
	if c == nil || !c.panelEnabled(DebugPanelSession) {
		return
	}
	data := debugMaskMap(c.config, primitives.CloneAnyMap(session))
	c.mu.Lock()
	c.sessionData = data
	c.mu.Unlock()
	c.publish(DebugPanelSession, data)
}

// CaptureRequest logs an HTTP request.
func (c *DebugCollector) CaptureRequest(entry RequestEntry) {
	if c == nil || !c.panelEnabled(DebugPanelRequests) {
		return
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}
	if len(entry.Headers) > 0 {
		entry.Headers = debugMaskStringMap(c.config, normalizeHeaderMap(entry.Headers))
	}
	if len(entry.Query) > 0 {
		entry.Query = debugMaskStringMap(c.config, entry.Query)
	}
	responseContentType := ""
	if len(entry.ResponseHeaders) > 0 {
		normalized := normalizeHeaderMap(entry.ResponseHeaders)
		if normalized != nil {
			responseContentType = normalized["Content-Type"]
			entry.ResponseHeaders = debugMaskStringMap(c.config, normalized)
		} else {
			entry.ResponseHeaders = debugMaskStringMap(c.config, entry.ResponseHeaders)
		}
	}
	if entry.RequestBody != "" {
		entry.RequestBody = debugMaskBodyString(c.config, entry.ContentType, entry.RequestBody)
	}
	if entry.ResponseBody != "" {
		entry.ResponseBody = debugMaskBodyString(c.config, responseContentType, entry.ResponseBody)
	}
	log := c.requestLog
	if log != nil {
		log.Add(entry)
	}
	c.publish("request", entry)
}

// CaptureSQL logs a database query.
func (c *DebugCollector) CaptureSQL(entry SQLEntry) {
	if c == nil || !c.config.CaptureSQL || !c.panelEnabled(DebugPanelSQL) {
		return
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}
	if len(entry.Args) > 0 {
		entry.Args = debugMaskSlice(c.config, entry.Args)
	}
	log := c.sqlLog
	if log != nil {
		log.Add(entry)
	}
	c.publish(DebugPanelSQL, entry)
}

// CaptureLog adds a log entry.
func (c *DebugCollector) CaptureLog(entry LogEntry) {
	if c == nil || !c.config.CaptureLogs || !c.panelEnabled(DebugPanelLogs) {
		return
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}
	if len(entry.Fields) > 0 {
		entry.Fields = debugMaskMap(c.config, entry.Fields)
	}
	log := c.serverLog
	if log != nil {
		log.Add(entry)
	}
	c.publish("log", entry)
}

// CaptureJSError records a frontend JavaScript error.
func (c *DebugCollector) CaptureJSError(entry JSErrorEntry) {
	if c == nil || !c.panelEnabled(DebugPanelJSErrors) {
		return
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}
	entry.Message = debugMaskInlineString(c.config, entry.Message)
	entry.Stack = debugMaskInlineString(c.config, entry.Stack)
	entry.URL = debugMaskInlineString(c.config, entry.URL)
	entry.Source = debugMaskInlineString(c.config, entry.Source)
	if len(entry.Extra) > 0 {
		entry.Extra = debugMaskMap(c.config, entry.Extra)
	}
	if c.jsErrorLog != nil {
		c.jsErrorLog.Add(entry)
	}
	c.publish("jserror", entry)
}

// CaptureConfigSnapshot stores a config snapshot for the config panel.
func (c *DebugCollector) CaptureConfigSnapshot(snapshot map[string]any) {
	if c == nil || !c.panelEnabled(DebugPanelConfig) {
		return
	}
	snapshot = debugMaskMap(c.config, snapshot)
	c.mu.Lock()
	c.configData = primitives.CloneAnyMap(snapshot)
	c.mu.Unlock()
}

// CaptureRoutes stores a routes snapshot for the routes panel.
func (c *DebugCollector) CaptureRoutes(routes []RouteEntry) {
	if c == nil || !c.panelEnabled(DebugPanelRoutes) {
		return
	}
	c.mu.Lock()
	c.routesData = cloneRouteEntries(routes)
	c.mu.Unlock()
}

// PublishPanel stores a custom panel snapshot and publishes it to subscribers.
func (c *DebugCollector) PublishPanel(panelID string, payload any) {
	if c == nil {
		return
	}
	panelID = debugpanels.NormalizePanelID(panelID)
	if panelID == "" || !c.panelEnabled(panelID) {
		return
	}
	snapshotKey := debugPanelSnapshotKey(panelID)
	if snapshotKey == "" {
		return
	}
	masked := debugMaskValue(c.config, payload)
	stored := debugcollector.ClonePanelPayload(masked)
	c.mu.Lock()
	if c.panelData == nil {
		c.panelData = map[string]debugPanelSnapshot{}
	}
	c.panelData[panelID] = debugPanelSnapshot{
		snapshotKey: snapshotKey,
		payload:     stored,
	}
	c.mu.Unlock()

	eventTypes := debugPanelEventTypes(panelID)
	if len(eventTypes) == 0 {
		return
	}
	eventType := strings.TrimSpace(eventTypes[0])
	if eventType == "" {
		return
	}
	c.publish(eventType, stored)
}

// PublishEvent emits a custom debug event by event type.
func (c *DebugCollector) PublishEvent(eventType string, payload any) {
	if c == nil {
		return
	}
	eventType = debugpanels.NormalizePanelID(eventType)
	if eventType == "" || !c.eventTypeEnabled(eventType) {
		return
	}
	masked := debugMaskValue(c.config, payload)
	stored := debugcollector.ClonePanelPayload(masked)
	c.publish(eventType, stored)
}

// Set adds custom debug data.
func (c *DebugCollector) Set(key string, value any) {
	if c == nil || !c.panelEnabled(DebugPanelCustom) {
		return
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return
	}
	value = debugMaskFieldValue(c.config, key, value)
	c.mu.Lock()
	if c.customData == nil {
		c.customData = map[string]any{}
	}
	debugcollector.SetNestedValue(c.customData, key, value)
	c.mu.Unlock()
	c.publish(DebugPanelCustom, map[string]any{"key": key, "value": value})
}

// Get retrieves custom debug data.
func (c *DebugCollector) Get(key string) (any, bool) {
	if c == nil {
		return nil, false
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, false
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	return debugcollector.GetNestedValue(c.customData, key)
}

// Log adds a custom debug message.
func (c *DebugCollector) Log(category, message string, fields ...any) {
	if c == nil || !c.panelEnabled(DebugPanelCustom) {
		return
	}
	payload := debugcollector.FieldsToMap(fields, toString)
	if len(payload) > 0 {
		payload = debugMaskMap(c.config, payload)
	}
	entry := CustomLogEntry{
		Timestamp: time.Now(),
		Category:  strings.TrimSpace(category),
		Message:   strings.TrimSpace(message),
		Fields:    payload,
	}
	if c.customLog != nil {
		c.customLog.Add(entry)
	}
	c.publish(DebugPanelCustom, entry)
}

// Subscribe creates a WebSocket subscriber channel.
func (c *DebugCollector) Subscribe(id string) <-chan DebugEvent {
	if c == nil {
		return nil
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return nil
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if existing, ok := c.subscribers[id]; ok {
		return existing
	}
	ch := make(chan DebugEvent, debugSubscriberBuffer)
	if c.subscribers == nil {
		c.subscribers = map[string]chan DebugEvent{}
	}
	c.subscribers[id] = ch
	return ch
}

// Unsubscribe removes a WebSocket subscriber.
func (c *DebugCollector) Unsubscribe(id string) {
	if c == nil {
		return
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return
	}
	c.mu.Lock()
	ch := c.subscribers[id]
	delete(c.subscribers, id)
	c.mu.Unlock()
	if ch != nil {
		close(ch)
	}
}

// Snapshot returns current state of all panels using a background context.
func (c *DebugCollector) Snapshot() map[string]any {
	return c.SnapshotWithContext(context.Background())
}

// SnapshotWithContext returns current state of all panels using the provided context.
func (c *DebugCollector) SnapshotWithContext(ctx context.Context) map[string]any {
	if c == nil {
		return map[string]any{}
	}
	if ctx == nil {
		ctx = context.Background()
	}
	state := c.snapshotState()
	snapshot := c.collectBuiltinSnapshot(state)
	c.collectPanelDataSnapshot(snapshot, state.panelData)
	c.collectRegisteredPanelSnapshots(ctx, snapshot)
	c.collectCustomPanelSnapshots(ctx, snapshot, state.panels)
	return snapshot
}

type debugSnapshotState struct {
	templateData map[string]any
	sessionData  map[string]any
	customData   map[string]any
	configData   map[string]any
	routesData   []RouteEntry
	panelData    map[string]debugPanelSnapshot
	panels       []DebugPanel
}

func (c *DebugCollector) snapshotState() debugSnapshotState {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return debugSnapshotState{
		templateData: primitives.CloneAnyMap(c.templateData),
		sessionData:  primitives.CloneAnyMap(c.sessionData),
		customData:   primitives.CloneAnyMap(c.customData),
		configData:   primitives.CloneAnyMap(c.configData),
		routesData:   cloneRouteEntries(c.routesData),
		panelData:    clonePanelData(c.panelData),
		panels:       append([]DebugPanel{}, c.panels...),
	}
}

func (c *DebugCollector) collectBuiltinSnapshot(state debugSnapshotState) map[string]any {
	snapshot := map[string]any{}
	c.collectBuiltinStateSnapshots(snapshot, state)
	c.collectBuiltinLogSnapshots(snapshot)
	c.collectBuiltinCustomSnapshots(snapshot, state)
	return snapshot
}

func (c *DebugCollector) collectBuiltinStateSnapshots(snapshot map[string]any, state debugSnapshotState) {
	if c.panelEnabled(DebugPanelTemplate) {
		snapshot[DebugPanelTemplate] = state.templateData
	}
	if c.panelEnabled(DebugPanelSession) {
		snapshot[DebugPanelSession] = state.sessionData
	}
	if c.panelEnabled(DebugPanelConfig) && len(state.configData) > 0 {
		snapshot[DebugPanelConfig] = debugMaskMap(c.config, state.configData)
	}
	if c.panelEnabled(DebugPanelRoutes) && len(state.routesData) > 0 {
		snapshot[DebugPanelRoutes] = state.routesData
	}
}

func (c *DebugCollector) collectBuiltinLogSnapshots(snapshot map[string]any) {
	if c.panelEnabled(DebugPanelRequests) && c.requestLog != nil {
		snapshot[DebugPanelRequests] = c.requestLog.Values()
	}
	if c.panelEnabled(DebugPanelSQL) && c.sqlLog != nil {
		snapshot[DebugPanelSQL] = c.sqlLog.Values()
	}
	if c.panelEnabled(DebugPanelLogs) && c.serverLog != nil {
		snapshot[DebugPanelLogs] = c.serverLog.Values()
	}
	if c.panelEnabled(DebugPanelJSErrors) && c.jsErrorLog != nil {
		snapshot[DebugPanelJSErrors] = c.jsErrorLog.Values()
	}
}

func (c *DebugCollector) collectBuiltinCustomSnapshots(snapshot map[string]any, state debugSnapshotState) {
	if c.panelEnabled(DebugPanelCustom) {
		customSnapshot := map[string]any{"data": state.customData}
		if c.customLog != nil {
			customSnapshot["logs"] = c.customLog.Values()
		}
		snapshot[DebugPanelCustom] = customSnapshot
	}
}

func (c *DebugCollector) collectPanelDataSnapshot(snapshot map[string]any, panelData map[string]debugPanelSnapshot) {
	for panelID, panelSnapshot := range panelData {
		if !c.panelEnabled(panelID) {
			continue
		}
		key := strings.TrimSpace(panelSnapshot.snapshotKey)
		if key == "" {
			key = panelID
		}
		snapshot[key] = panelSnapshot.payload
	}
}

func (c *DebugCollector) collectRegisteredPanelSnapshots(ctx context.Context, snapshot map[string]any) {
	for _, registration := range debugregistry.PanelRegistrations() {
		id := debugpanels.NormalizePanelID(registration.Definition.ID)
		if id == "" || !c.panelEnabled(id) || registration.Snapshot == nil {
			continue
		}
		key := strings.TrimSpace(registration.Definition.SnapshotKey)
		if key == "" {
			key = id
		}
		if _, exists := snapshot[key]; exists {
			continue
		}
		snapshot[key] = debugcollector.ClonePanelPayload(debugMaskValue(c.config, registration.Snapshot(ctx)))
	}
}

func (c *DebugCollector) collectCustomPanelSnapshots(ctx context.Context, snapshot map[string]any, panels []DebugPanel) {
	for _, panel := range panels {
		if panel == nil {
			continue
		}
		id := debugpanels.NormalizePanelID(panel.ID())
		if id == "" || !c.panelEnabled(id) {
			continue
		}
		if _, exists := snapshot[id]; exists {
			continue
		}
		snapshot[id] = debugcollector.ClonePanelPayload(debugMaskValue(c.config, panel.Collect(ctx)))
	}
}

// SessionSnapshot returns session-scoped debug data filtered by session ID.
func (c *DebugCollector) SessionSnapshot(sessionID string, opts DebugSessionSnapshotOptions) map[string]any {
	if c == nil {
		return map[string]any{}
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return map[string]any{}
	}

	c.mu.RLock()
	templateData := primitives.CloneAnyMap(c.templateData)
	configData := primitives.CloneAnyMap(c.configData)
	routesData := cloneRouteEntries(c.routesData)
	c.mu.RUnlock()

	snapshot := map[string]any{}
	if c.panelEnabled(DebugPanelRequests) && c.requestLog != nil {
		snapshot[DebugPanelRequests] = debugcollector.FilterBySession(c.requestLog.Values(), sessionID, func(entry RequestEntry) string { return entry.SessionID })
	}
	if c.panelEnabled(DebugPanelSQL) && c.sqlLog != nil {
		snapshot[DebugPanelSQL] = debugcollector.FilterBySession(c.sqlLog.Values(), sessionID, func(entry SQLEntry) string { return entry.SessionID })
	}
	if c.panelEnabled(DebugPanelLogs) && c.serverLog != nil {
		snapshot[DebugPanelLogs] = debugcollector.FilterBySession(c.serverLog.Values(), sessionID, func(entry LogEntry) string { return entry.SessionID })
	}

	if opts.IncludeGlobalPanels {
		if c.panelEnabled(DebugPanelTemplate) {
			snapshot[DebugPanelTemplate] = templateData
		}
		if c.panelEnabled(DebugPanelConfig) && len(configData) > 0 {
			snapshot[DebugPanelConfig] = debugMaskMap(c.config, configData)
		}
		if c.panelEnabled(DebugPanelRoutes) && len(routesData) > 0 {
			snapshot[DebugPanelRoutes] = routesData
		}
	}
	return snapshot
}

// PanelDefinitions returns metadata for enabled panels.
func (c *DebugCollector) PanelDefinitions() []debugregistry.PanelDefinition {
	if c == nil {
		return nil
	}
	if len(c.config.Panels) == 0 {
		return nil
	}
	ensureDebugBuiltinPanels()
	defs := make([]debugregistry.PanelDefinition, 0, len(c.config.Panels))
	for _, panelID := range c.config.Panels {
		def := debugPanelDefinitionFor(panelID)
		if def.ID == "" {
			continue
		}
		defs = append(defs, def)
	}
	return defs
}

// Clear removes all stored debug data across panels.
func (c *DebugCollector) Clear() {
	if c == nil {
		return
	}
	c.mu.Lock()
	c.templateData = map[string]any{}
	c.sessionData = map[string]any{}
	c.customData = map[string]any{}
	c.configData = map[string]any{}
	c.routesData = nil
	c.panelData = map[string]debugPanelSnapshot{}
	c.mu.Unlock()

	if c.requestLog != nil {
		c.requestLog.Clear()
	}
	if c.sqlLog != nil {
		c.sqlLog.Clear()
	}
	if c.serverLog != nil {
		c.serverLog.Clear()
	}
	if c.jsErrorLog != nil {
		c.jsErrorLog.Clear()
	}
	if c.customLog != nil {
		c.customLog.Clear()
	}
	ctx := context.Background()
	for _, registration := range debugregistry.PanelRegistrations() {
		id := debugpanels.NormalizePanelID(registration.Definition.ID)
		if id == "" || !c.panelEnabled(id) {
			continue
		}
		if registration.Clear != nil {
			_ = registration.Clear(ctx)
		}
	}
}

// ClearPanel removes stored data for a single panel.
func (c *DebugCollector) ClearPanel(panelID string) bool {
	if c == nil {
		return false
	}
	panelID = debugpanels.NormalizePanelID(panelID)
	if panelID == "" || !c.panelEnabled(panelID) {
		return false
	}
	if c.clearBuiltinPanel(panelID) {
		return true
	}
	return c.clearRegisteredOrDynamicPanel(panelID)
}

func (c *DebugCollector) clearBuiltinPanel(panelID string) bool {
	switch panelID {
	case DebugPanelTemplate:
		c.resetPanelData(func() { c.templateData = map[string]any{} })
	case DebugPanelSession:
		c.resetPanelData(func() { c.sessionData = map[string]any{} })
	case DebugPanelRequests:
		if c.requestLog != nil {
			c.requestLog.Clear()
		}
	case DebugPanelSQL:
		if c.sqlLog != nil {
			c.sqlLog.Clear()
		}
	case DebugPanelLogs:
		if c.serverLog != nil {
			c.serverLog.Clear()
		}
	case DebugPanelJSErrors:
		if c.jsErrorLog != nil {
			c.jsErrorLog.Clear()
		}
	case DebugPanelCustom:
		c.resetPanelData(func() { c.customData = map[string]any{} })
		if c.customLog != nil {
			c.customLog.Clear()
		}
	case DebugPanelConfig:
		c.resetPanelData(func() { c.configData = map[string]any{} })
	case DebugPanelRoutes:
		c.resetPanelData(func() { c.routesData = nil })
	default:
		return false
	}
	return true
}

func (c *DebugCollector) clearRegisteredOrDynamicPanel(panelID string) bool {
	reg, regOK := debugregistry.Panel(panelID)
	if regOK && reg.Clear != nil {
		_ = reg.Clear(context.Background())
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	hadData := false
	if c.panelData != nil {
		if _, ok := c.panelData[panelID]; ok {
			delete(c.panelData, panelID)
			hadData = true
		}
	}
	_, legacy := c.panelIndex[panelID]
	return regOK || legacy || hadData
}

func (c *DebugCollector) resetPanelData(reset func()) {
	c.mu.Lock()
	defer c.mu.Unlock()
	reset()
}

func (c *DebugCollector) panelEnabled(id string) bool {
	if c == nil {
		return false
	}
	id = debugpanels.NormalizePanelID(id)
	if id == "" {
		return false
	}
	if len(c.panelSet) == 0 {
		return false
	}
	return c.panelSet[id]
}

func (c *DebugCollector) eventTypeEnabled(eventType string) bool {
	if c == nil {
		return false
	}
	eventType = debugpanels.NormalizePanelID(eventType)
	if eventType == "" {
		return false
	}
	ensureDebugBuiltinPanels()
	panels := debugregistry.PanelsForEventType(eventType)
	if len(panels) == 0 {
		return true
	}
	return slices.ContainsFunc(panels, c.panelEnabled)
}

func (c *DebugCollector) publish(eventType string, payload any) {
	if c == nil || strings.TrimSpace(eventType) == "" {
		return
	}
	c.mu.RLock()
	if len(c.subscribers) == 0 {
		c.mu.RUnlock()
		return
	}
	event := DebugEvent{
		Type:      eventType,
		Payload:   payload,
		Timestamp: time.Now(),
	}
	subscribers := make([]debugSubscriber, 0, len(c.subscribers))
	for id, ch := range c.subscribers {
		subscribers = append(subscribers, debugSubscriber{id: id, ch: ch})
	}
	c.mu.RUnlock()

	for _, subscriber := range subscribers {
		if safeSend(subscriber.ch, event) {
			c.removeSubscriberChannel(subscriber.id, subscriber.ch)
		}
	}
}

type debugSubscriber struct {
	id string
	ch chan DebugEvent
}

func safeSend(ch chan DebugEvent, event DebugEvent) (closed bool) {
	if ch == nil {
		return false
	}
	defer func() {
		if recovered := recover(); recovered != nil {
			if strings.Contains(fmt.Sprint(recovered), "send on closed channel") {
				closed = true
				return
			}
			panic(recovered)
		}
	}()
	select {
	case ch <- event:
	default:
	}
	return false
}

func (c *DebugCollector) removeSubscriberChannel(id string, ch chan DebugEvent) {
	if c == nil || strings.TrimSpace(id) == "" || ch == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if existing, ok := c.subscribers[id]; ok && existing == ch {
		delete(c.subscribers, id)
	}
}

func clonePanelData(input map[string]debugPanelSnapshot) map[string]debugPanelSnapshot {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]debugPanelSnapshot, len(input))
	for key, value := range input {
		out[key] = debugPanelSnapshot{
			snapshotKey: value.snapshotKey,
			payload:     debugcollector.ClonePanelPayload(value.payload),
		}
	}
	return out
}
