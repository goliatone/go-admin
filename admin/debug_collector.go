package admin

import (
	"context"
	"strings"
	"sync"
	"time"

	router "github.com/goliatone/go-router"
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

	config     DebugConfig
	panelSet   map[string]bool
	panels     []DebugPanel
	panelIndex map[string]DebugPanel
	panelData  map[string]any

	templateData map[string]any
	sessionData  map[string]any
	requestLog   *RingBuffer[RequestEntry]
	sqlLog       *RingBuffer[SQLEntry]
	serverLog    *RingBuffer[LogEntry]
	customData   map[string]any
	customLog    *RingBuffer[CustomLogEntry]
	configData   map[string]any
	routesData   []RouteEntry

	subscribers map[string]chan DebugEvent
}

// RequestEntry captures HTTP request details.
type RequestEntry struct {
	ID        string            `json:"id"`
	Timestamp time.Time         `json:"timestamp"`
	Method    string            `json:"method"`
	Path      string            `json:"path"`
	Status    int               `json:"status"`
	Duration  time.Duration     `json:"duration"`
	Headers   map[string]string `json:"headers,omitempty"`
	Query     map[string]string `json:"query,omitempty"`
	Error     string            `json:"error,omitempty"`
}

// SQLEntry captures database query details.
type SQLEntry struct {
	ID        string        `json:"id"`
	Timestamp time.Time     `json:"timestamp"`
	Query     string        `json:"query"`
	Args      []any         `json:"args,omitempty"`
	Duration  time.Duration `json:"duration"`
	RowCount  int           `json:"row_count"`
	Error     string        `json:"error,omitempty"`
}

// LogEntry captures server log messages.
type LogEntry struct {
	Timestamp time.Time      `json:"timestamp"`
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

// DebugEvent is sent to WebSocket subscribers.
type DebugEvent struct {
	Type      string    `json:"type"`
	Payload   any       `json:"payload"`
	Timestamp time.Time `json:"timestamp"`
}

// NewDebugCollector initializes a collector with the provided configuration.
func NewDebugCollector(cfg DebugConfig) *DebugCollector {
	cfg = normalizeDebugConfig(cfg, "")
	debugMasker(cfg)
	panelSet := map[string]bool{}
	for _, panel := range cfg.Panels {
		panelSet[normalizePanelID(panel)] = true
	}
	return &DebugCollector{
		config:       cfg,
		panelSet:     panelSet,
		panelIndex:   map[string]DebugPanel{},
		panelData:    map[string]any{},
		templateData: map[string]any{},
		sessionData:  map[string]any{},
		requestLog:   NewRingBuffer[RequestEntry](cfg.MaxLogEntries),
		sqlLog:       NewRingBuffer[SQLEntry](cfg.MaxSQLQueries),
		serverLog:    NewRingBuffer[LogEntry](cfg.MaxLogEntries),
		customData:   map[string]any{},
		customLog:    NewRingBuffer[CustomLogEntry](cfg.MaxLogEntries),
		subscribers:  map[string]chan DebugEvent{},
	}
}

// RegisterPanel adds a custom debug panel.
func (c *DebugCollector) RegisterPanel(panel DebugPanel) {
	if c == nil || panel == nil {
		return
	}
	id := normalizePanelID(panel.ID())
	if id == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, exists := c.panelIndex[id]; exists {
		return
	}
	c.panels = append(c.panels, panel)
	c.panelIndex[id] = panel
}

func (c *DebugCollector) panelMeta(panelID string) (debugPanelMeta, bool) {
	if c == nil {
		return debugPanelMeta{}, false
	}
	panelID = normalizePanelID(panelID)
	if panelID == "" {
		return debugPanelMeta{}, false
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
	if c == nil || !c.panelEnabled("template") {
		return
	}
	data := debugMaskMap(c.config, cloneAnyMap(map[string]any(viewCtx)))
	c.mu.Lock()
	c.templateData = data
	c.mu.Unlock()
	c.publish("template", data)
}

// CaptureSession stores session information.
func (c *DebugCollector) CaptureSession(session map[string]any) {
	if c == nil || !c.panelEnabled("session") {
		return
	}
	data := debugMaskMap(c.config, cloneAnyMap(session))
	c.mu.Lock()
	c.sessionData = data
	c.mu.Unlock()
	c.publish("session", data)
}

// CaptureRequest logs an HTTP request.
func (c *DebugCollector) CaptureRequest(entry RequestEntry) {
	if c == nil || !c.panelEnabled("requests") {
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
	log := c.requestLog
	if log != nil {
		log.Add(entry)
	}
	c.publish("request", entry)
}

// CaptureSQL logs a database query.
func (c *DebugCollector) CaptureSQL(entry SQLEntry) {
	if c == nil || !c.config.CaptureSQL || !c.panelEnabled("sql") {
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
	c.publish("sql", entry)
}

// CaptureLog adds a log entry.
func (c *DebugCollector) CaptureLog(entry LogEntry) {
	if c == nil || !c.config.CaptureLogs || !c.panelEnabled("logs") {
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

// CaptureConfigSnapshot stores a config snapshot for the config panel.
func (c *DebugCollector) CaptureConfigSnapshot(snapshot map[string]any) {
	if c == nil || !c.panelEnabled("config") {
		return
	}
	snapshot = debugMaskMap(c.config, snapshot)
	c.mu.Lock()
	c.configData = cloneAnyMap(snapshot)
	c.mu.Unlock()
}

// CaptureRoutes stores a routes snapshot for the routes panel.
func (c *DebugCollector) CaptureRoutes(routes []RouteEntry) {
	if c == nil || !c.panelEnabled("routes") {
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
	panelID = normalizePanelID(panelID)
	if panelID == "" || !c.panelEnabled(panelID) {
		return
	}
	masked := debugMaskValue(c.config, payload)
	stored := clonePanelPayload(masked)
	c.mu.Lock()
	if c.panelData == nil {
		c.panelData = map[string]any{}
	}
	c.panelData[panelID] = stored
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

// Set adds custom debug data.
func (c *DebugCollector) Set(key string, value any) {
	if c == nil || !c.panelEnabled("custom") {
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
	setNestedValue(c.customData, key, value)
	c.mu.Unlock()
	c.publish("custom", map[string]any{"key": key, "value": value})
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
	return getNestedValue(c.customData, key)
}

// Log adds a custom debug message.
func (c *DebugCollector) Log(category, message string, fields ...any) {
	if c == nil || !c.panelEnabled("custom") {
		return
	}
	payload := fieldsToMap(fields)
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
	c.publish("custom", entry)
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

// Snapshot returns current state of all panels.
func (c *DebugCollector) Snapshot() map[string]any {
	if c == nil {
		return map[string]any{}
	}
	c.mu.RLock()
	templateData := cloneAnyMap(c.templateData)
	sessionData := cloneAnyMap(c.sessionData)
	customData := cloneAnyMap(c.customData)
	configData := cloneAnyMap(c.configData)
	routesData := cloneRouteEntries(c.routesData)
	panelData := clonePanelData(c.panelData)
	panels := append([]DebugPanel{}, c.panels...)
	c.mu.RUnlock()

	snapshot := map[string]any{}
	if c.panelEnabled("template") {
		snapshot["template"] = templateData
	}
	if c.panelEnabled("session") {
		snapshot["session"] = sessionData
	}
	if c.panelEnabled("requests") && c.requestLog != nil {
		snapshot["requests"] = c.requestLog.Values()
	}
	if c.panelEnabled("sql") && c.sqlLog != nil {
		snapshot["sql"] = c.sqlLog.Values()
	}
	if c.panelEnabled("logs") && c.serverLog != nil {
		snapshot["logs"] = c.serverLog.Values()
	}
	if c.panelEnabled("custom") {
		customSnapshot := map[string]any{
			"data": customData,
		}
		if c.customLog != nil {
			customSnapshot["logs"] = c.customLog.Values()
		}
		snapshot["custom"] = customSnapshot
	}
	if c.panelEnabled("config") && len(configData) > 0 {
		snapshot["config"] = debugMaskMap(c.config, configData)
	}
	if c.panelEnabled("routes") && len(routesData) > 0 {
		snapshot["routes"] = routesData
	}
	if len(panelData) > 0 {
		for panelID, panelSnapshot := range panelData {
			if c.panelEnabled(panelID) {
				snapshot[panelID] = panelSnapshot
			}
		}
	}

	ctx := context.Background()
	for _, panel := range panels {
		if panel == nil {
			continue
		}
		id := normalizePanelID(panel.ID())
		if id == "" || !c.panelEnabled(id) {
			continue
		}
		if _, exists := snapshot[id]; exists {
			continue
		}
		snapshot[id] = clonePanelPayload(debugMaskValue(c.config, panel.Collect(ctx)))
	}
	return snapshot
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
	c.panelData = map[string]any{}
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
	if c.customLog != nil {
		c.customLog.Clear()
	}
}

// ClearPanel removes stored data for a single panel.
func (c *DebugCollector) ClearPanel(panelID string) bool {
	if c == nil {
		return false
	}
	panelID = normalizePanelID(panelID)
	if panelID == "" || !c.panelEnabled(panelID) {
		return false
	}
	switch panelID {
	case "template":
		c.mu.Lock()
		c.templateData = map[string]any{}
		c.mu.Unlock()
	case "session":
		c.mu.Lock()
		c.sessionData = map[string]any{}
		c.mu.Unlock()
	case "requests":
		if c.requestLog != nil {
			c.requestLog.Clear()
		}
	case "sql":
		if c.sqlLog != nil {
			c.sqlLog.Clear()
		}
	case "logs":
		if c.serverLog != nil {
			c.serverLog.Clear()
		}
	case "custom":
		c.mu.Lock()
		c.customData = map[string]any{}
		c.mu.Unlock()
		if c.customLog != nil {
			c.customLog.Clear()
		}
	case "config":
		c.mu.Lock()
		c.configData = map[string]any{}
		c.mu.Unlock()
	case "routes":
		c.mu.Lock()
		c.routesData = nil
		c.mu.Unlock()
	default:
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.panelData != nil {
			delete(c.panelData, panelID)
		}
		if _, ok := c.panelIndex[panelID]; ok {
			return true
		}
		return false
	}
	return true
}

func (c *DebugCollector) panelEnabled(id string) bool {
	if c == nil {
		return false
	}
	id = normalizePanelID(id)
	if id == "" {
		return false
	}
	if len(c.panelSet) == 0 {
		return false
	}
	return c.panelSet[id]
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
	channels := make([]chan DebugEvent, 0, len(c.subscribers))
	for _, ch := range c.subscribers {
		channels = append(channels, ch)
	}
	c.mu.RUnlock()

	for _, ch := range channels {
		safeSend(ch, event)
	}
}

func safeSend(ch chan DebugEvent, event DebugEvent) {
	if ch == nil {
		return
	}
	defer func() {
		_ = recover()
	}()
	select {
	case ch <- event:
	default:
	}
}

func setNestedValue(dest map[string]any, key string, value any) {
	parts := splitKeyPath(key)
	if len(parts) == 0 {
		return
	}
	current := dest
	for i := 0; i < len(parts)-1; i++ {
		part := parts[i]
		next, ok := current[part]
		if !ok {
			child := map[string]any{}
			current[part] = child
			current = child
			continue
		}
		child, ok := next.(map[string]any)
		if !ok {
			child = map[string]any{}
			current[part] = child
		}
		current = child
	}
	current[parts[len(parts)-1]] = value
}

func getNestedValue(src map[string]any, key string) (any, bool) {
	if len(src) == 0 {
		return nil, false
	}
	parts := splitKeyPath(key)
	if len(parts) == 0 {
		return nil, false
	}
	current := src
	for i := 0; i < len(parts)-1; i++ {
		part := parts[i]
		next, ok := current[part]
		if !ok {
			return nil, false
		}
		child, ok := next.(map[string]any)
		if !ok {
			return nil, false
		}
		current = child
	}
	val, ok := current[parts[len(parts)-1]]
	return val, ok
}

func splitKeyPath(key string) []string {
	raw := strings.FieldsFunc(key, func(r rune) bool {
		return r == '.' || r == '/' || r == ':'
	})
	parts := make([]string, 0, len(raw))
	for _, part := range raw {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func clonePanelData(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = clonePanelPayload(value)
	}
	return out
}

func clonePanelPayload(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return cloneAnyMap(typed)
	case map[string]string:
		out := make(map[string]string, len(typed))
		for key, val := range typed {
			out[key] = val
		}
		return out
	case []any:
		out := make([]any, len(typed))
		copy(out, typed)
		return out
	case []string:
		out := make([]string, len(typed))
		copy(out, typed)
		return out
	default:
		return value
	}
}

func fieldsToMap(fields []any) map[string]any {
	if len(fields) == 0 {
		return nil
	}
	out := map[string]any{}
	for i := 0; i < len(fields); i += 2 {
		key := toString(fields[i])
		if key == "" {
			continue
		}
		if i+1 < len(fields) {
			out[key] = fields[i+1]
		} else {
			out[key] = true
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
