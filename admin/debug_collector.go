package admin

import (
	"context"
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
	"github.com/google/uuid"
)

const debugSubscriberBuffer = 64

// DebugPanel defines a pluggable debug panel.
type DebugPanel interface {
	ID() string
	Label() string
	Icon() string
	Collect(ctx context.Context) map[string]any
}

// DebugPanelUIProvider optionally adds a declarative rich UI schema to a panel.
type DebugPanelUIProvider interface {
	UI() *debugregistry.PanelUI
}

// DebugPanelActionProvider optionally adds action handlers to a rich panel.
type DebugPanelActionProvider interface {
	Actions() map[string]debugregistry.PanelActionHandler
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

	subscribers            map[string]*debugEventSubscriber
	deliveryFailureHandler func(DebugEvent)
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
	ID        string         `json:"id,omitempty"`
	Timestamp time.Time      `json:"timestamp"`
	SessionID string         `json:"session_id,omitempty"`
	UserID    string         `json:"user_id,omitempty"`
	Level     string         `json:"level"`
	Message   string         `json:"message"`
	Logger    string         `json:"logger,omitempty"`
	Caller    *LogCaller     `json:"caller,omitempty"`
	TraceID   string         `json:"trace_id,omitempty"`
	SpanID    string         `json:"span_id,omitempty"`
	RequestID string         `json:"request_id,omitempty"`
	Fields    map[string]any `json:"fields,omitempty"`
	Source    string         `json:"source,omitempty"`
}

// LogCaller identifies the application frame associated with a log record.
type LogCaller struct {
	Function string `json:"function,omitempty"`
	File     string `json:"file,omitempty"`
	Line     int    `json:"line,omitempty"`
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

type debugSubscriberOffer uint8

const (
	debugSubscriberAccepted debugSubscriberOffer = iota
	debugSubscriberOverflow
	debugSubscriberClosed
)

// debugEventSubscriber decouples publishers from browser writes while keeping
// a bounded amount of recoverable state. Command-run updates are coalesced by
// scoped run identity, so progress bursts cannot displace their terminal state.
type debugEventSubscriber struct {
	mu         sync.Mutex
	out        chan DebugEvent
	wake       chan struct{}
	stop       chan struct{}
	done       chan struct{}
	closeOnce  sync.Once
	pending    []DebugEvent
	maxPending int
	closed     bool
}

func newDebugEventSubscriber(maxPending int) *debugEventSubscriber {
	if maxPending <= 0 {
		maxPending = 1
	}
	subscriber := &debugEventSubscriber{
		out:        make(chan DebugEvent),
		wake:       make(chan struct{}, 1),
		stop:       make(chan struct{}),
		done:       make(chan struct{}),
		pending:    make([]DebugEvent, 0, maxPending),
		maxPending: maxPending,
	}
	go subscriber.run()
	return subscriber
}

func (s *debugEventSubscriber) Events() <-chan DebugEvent {
	if s == nil {
		return nil
	}
	return s.out
}

func (s *debugEventSubscriber) Close() {
	if s == nil {
		return
	}
	s.closeOnce.Do(func() {
		s.mu.Lock()
		s.closed = true
		s.pending = nil
		s.mu.Unlock()
		close(s.stop)
	})
	<-s.done
}

func (s *debugEventSubscriber) Offer(event DebugEvent) debugSubscriberOffer {
	if s == nil {
		return debugSubscriberClosed
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return debugSubscriberClosed
	}

	if incoming, ok := commandRunQueuedStateFromDebugEvent(event); ok {
		for index := range s.pending {
			existing, sameRun := commandRunQueuedStateFromDebugEvent(s.pending[index])
			if !sameRun || existing.key != incoming.key {
				continue
			}
			if commandRunQueuedStateAdvances(existing, incoming) {
				s.pending[index] = event
			}
			return debugSubscriberAccepted
		}
	}

	if len(s.pending) >= s.maxPending {
		return debugSubscriberOverflow
	}
	s.pending = append(s.pending, event)
	select {
	case s.wake <- struct{}{}:
	default:
	}
	return debugSubscriberAccepted
}

func (s *debugEventSubscriber) run() {
	defer close(s.done)
	defer close(s.out)
	for {
		s.mu.Lock()
		if len(s.pending) == 0 {
			s.mu.Unlock()
			select {
			case <-s.wake:
				continue
			case <-s.stop:
				return
			}
		}
		event := s.pending[0]
		copy(s.pending, s.pending[1:])
		s.pending = s.pending[:len(s.pending)-1]
		s.mu.Unlock()

		select {
		case s.out <- event:
		case <-s.stop:
			return
		}
	}
}

type commandRunQueuedState struct {
	key      string
	revision uint64
	terminal bool
}

func commandRunQueuedStateFromDebugEvent(event DebugEvent) (commandRunQueuedState, bool) {
	if event.Type != commandRunDebugEventType {
		return commandRunQueuedState{}, false
	}
	scope, ok := commandRunScopeFromDebugEvent(event)
	if !ok {
		return commandRunQueuedState{}, false
	}
	var runID string
	var revision uint64
	var phase CommandRunPhase
	switch payload := event.Payload.(type) {
	case CommandRunRecord:
		runID, revision, phase = payload.RunID, payload.Revision, payload.Phase
	case *CommandRunRecord:
		if payload == nil {
			return commandRunQueuedState{}, false
		}
		runID, revision, phase = payload.RunID, payload.Revision, payload.Phase
	case CommandRunUpdate:
		runID, revision, phase = payload.RunID, payload.Revision, payload.Phase
	case *CommandRunUpdate:
		if payload == nil {
			return commandRunQueuedState{}, false
		}
		runID, revision, phase = payload.RunID, payload.Revision, payload.Phase
	case map[string]any:
		runID = strings.TrimSpace(toString(payload["run_id"]))
		revision = debugEventUint64(payload["revision"])
		phase = CommandRunPhase(strings.ToLower(strings.TrimSpace(toString(payload["phase"]))))
	default:
		return commandRunQueuedState{}, false
	}
	if runID == "" {
		return commandRunQueuedState{}, false
	}
	scope = scope.Normalize()
	key := strings.Join([]string{
		scope.ApplicationID,
		scope.EnvironmentID,
		scope.TenantID,
		scope.OrganizationID,
		runID,
	}, "\x00")
	return commandRunQueuedState{key: key, revision: revision, terminal: phase.Terminal()}, true
}

func commandRunQueuedStateAdvances(existing, incoming commandRunQueuedState) bool {
	if existing.terminal && !incoming.terminal {
		return false
	}
	if existing.revision > 0 && incoming.revision > 0 && incoming.revision <= existing.revision {
		return false
	}
	return true
}

func debugEventUint64(value any) uint64 {
	switch typed := value.(type) {
	case uint64:
		return typed
	case uint:
		return uint64(typed)
	case uint32:
		return uint64(typed)
	case int:
		if typed >= 0 {
			return uint64(typed)
		}
	case int64:
		if typed >= 0 {
			return uint64(typed)
		}
	case int32:
		if typed >= 0 {
			return uint64(typed)
		}
	case float64:
		if typed >= 0 && typed < 18446744073709551616 && typed == float64(uint64(typed)) {
			return uint64(typed)
		}
	case float32:
		if typed >= 0 && typed == float32(uint64(typed)) {
			return uint64(typed)
		}
	}
	return 0
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
		subscribers:          map[string]*debugEventSubscriber{},
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

// SetDeliveryFailureHandler installs a bounded callback for browser-edge
// delivery failures. The callback must not block; it is invoked after the slow
// subscriber has been detached for authoritative reconnect recovery.
func (c *DebugCollector) SetDeliveryFailureHandler(handler func(DebugEvent)) *DebugCollector {
	if c == nil {
		return c
	}
	c.mu.Lock()
	c.deliveryFailureHandler = handler
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
	if strings.TrimSpace(entry.ID) == "" {
		entry.ID = uuid.NewString()
	}
	entry.Message, entry.Fields = debugNormalizeLogContent(entry.Message, entry.Fields, DebugLogLimits{})
	entry.Message = debugMaskInlineString(c.config, entry.Message)
	entry.Fields = debugMaskLogFields(c.config, entry.Fields)
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
		return existing.Events()
	}
	subscriber := newDebugEventSubscriber(debugSubscriberBuffer)
	if c.subscribers == nil {
		c.subscribers = map[string]*debugEventSubscriber{}
	}
	c.subscribers[id] = subscriber
	return subscriber.Events()
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
	subscriber := c.subscribers[id]
	delete(c.subscribers, id)
	c.mu.Unlock()
	if subscriber != nil {
		subscriber.Close()
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

// panelSnapshotWithContext returns the snapshot payload for one configured
// panel without collecting every other panel. Dashboard widget providers use
// this path so rendering P panels performs P collections instead of P².
func (c *DebugCollector) panelSnapshotWithContext(ctx context.Context, panelID string) (any, bool) {
	if c == nil {
		return nil, false
	}
	panelID = debugpanels.NormalizePanelID(panelID)
	if panelID == "" || !c.panelEnabled(panelID) {
		return nil, false
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if ctx.Err() != nil {
		return nil, false
	}

	state := c.snapshotState()
	snapshot := c.collectBuiltinSnapshot(state)
	c.collectPanelDataSnapshot(snapshot, state.panelData)
	if payload, ok := snapshot[panelID]; ok {
		return payload, true
	}

	ensureDebugBuiltinPanels()
	if registration, ok := debugregistry.Panel(panelID); ok && registration.Snapshot != nil {
		return debugcollector.ClonePanelPayload(debugMaskValue(c.config, registration.Snapshot(ctx))), true
	}

	for _, panel := range state.panels {
		if panel == nil || debugpanels.NormalizePanelID(panel.ID()) != panelID {
			continue
		}
		return debugcollector.ClonePanelPayload(debugMaskValue(c.config, panel.Collect(ctx))), true
	}
	return nil, false
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

// SessionSnapshot returns session-scoped debug data filtered by session ID
// using a background context for global panel collection.
func (c *DebugCollector) SessionSnapshot(sessionID string, opts DebugSessionSnapshotOptions) map[string]any {
	return c.SessionSnapshotWithContext(context.Background(), sessionID, opts)
}

// SessionSnapshotWithContext returns session-scoped debug data and, when
// requested, collects global panels through the authenticated caller context.
// Session-owned request, SQL, and log rows always replace their global
// counterparts so enabling global panels cannot widen those data sets.
func (c *DebugCollector) SessionSnapshotWithContext(ctx context.Context, sessionID string, opts DebugSessionSnapshotOptions) map[string]any {
	if c == nil {
		return map[string]any{}
	}
	if ctx == nil {
		ctx = context.Background()
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return map[string]any{}
	}

	snapshot := map[string]any{}
	if opts.IncludeGlobalPanels {
		snapshot = c.SnapshotWithContext(ctx)
	}
	if c.panelEnabled(DebugPanelRequests) && c.requestLog != nil {
		snapshot[DebugPanelRequests] = debugcollector.FilterBySession(c.requestLog.Values(), sessionID, func(entry RequestEntry) string { return entry.SessionID })
	}
	if c.panelEnabled(DebugPanelSQL) && c.sqlLog != nil {
		snapshot[DebugPanelSQL] = debugcollector.FilterBySession(c.sqlLog.Values(), sessionID, func(entry SQLEntry) string { return entry.SessionID })
	}
	if c.panelEnabled(DebugPanelLogs) && c.serverLog != nil {
		snapshot[DebugPanelLogs] = debugcollector.FilterBySession(c.serverLog.Values(), sessionID, func(entry LogEntry) string { return entry.SessionID })
	}
	return snapshot
}

// PanelDefinitions returns metadata for enabled panels.
func (c *DebugCollector) PanelDefinitions() []debugregistry.PanelDefinition {
	return c.PanelDefinitionsWithContext(context.Background())
}

// PanelDefinitionsWithContext returns metadata for enabled panels using the provided context.
func (c *DebugCollector) PanelDefinitionsWithContext(ctx context.Context) []debugregistry.PanelDefinition {
	if c == nil {
		return nil
	}
	if len(c.config.Panels) == 0 {
		return nil
	}
	ensureDebugBuiltinPanels()
	defs := make([]debugregistry.PanelDefinition, 0, len(c.config.Panels))
	for _, panelID := range c.config.Panels {
		def := debugPanelDefinitionForContext(ctx, panelID)
		if def.ID == "" {
			continue
		}
		defs = append(defs, def)
	}
	return defs
}

// RunPanelAction dispatches a schema-declared action to its registered handler.
func (c *DebugCollector) RunPanelAction(ctx context.Context, req debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
	if c == nil {
		return debugregistry.PanelActionResult{}, ErrNotFound
	}
	panelID := debugpanels.NormalizePanelID(req.PanelID)
	actionID := strings.ToLower(strings.TrimSpace(req.ActionID))
	if panelID == "" || actionID == "" || !c.panelEnabled(panelID) {
		return debugregistry.PanelActionResult{}, ErrNotFound
	}
	registration, ok := debugregistry.Panel(panelID)
	if !ok {
		return debugregistry.PanelActionResult{}, ErrNotFound
	}
	if ctx == nil {
		ctx = context.Background()
	}
	handler := registration.ActionHandlerForContext(ctx, actionID)
	if handler == nil {
		return debugregistry.PanelActionResult{}, ErrNotFound
	}
	req.PanelID = panelID
	req.ActionID = actionID
	result, err := handler(ctx, req)
	if err != nil {
		return debugregistry.PanelActionResult{}, err
	}
	return c.maskPanelActionResult(result), nil
}

func (c *DebugCollector) maskPanelActionResult(result debugregistry.PanelActionResult) debugregistry.PanelActionResult {
	if c == nil {
		return result
	}
	result.Message = debugMaskInlineString(c.config, result.Message)
	result.Data = debugMaskValue(c.config, result.Data)
	if result.Errors != nil {
		result.Errors = debugMaskMap(c.config, result.Errors)
	}
	if result.Event != nil {
		event := *result.Event
		event.Payload = debugMaskValue(c.config, event.Payload)
		result.Event = &event
	}
	return result
}

// Clear removes all stored debug data across panels.
func (c *DebugCollector) Clear() {
	c.ClearWithContext(context.Background())
}

// ClearWithContext removes stored debug data and preserves request scope for
// registered panel clear hooks.
func (c *DebugCollector) ClearWithContext(ctx context.Context) {
	if c == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
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
	for _, registration := range debugregistry.PanelRegistrations() {
		id := debugpanels.NormalizePanelID(registration.Definition.ID)
		if id == "" || !c.panelEnabled(id) {
			continue
		}
		if registration.Clear != nil {
			_ = registration.Clear(ctx) //nolint:errcheck // legacy dynamic payload keeps existing zero-value fallback behavior.
		}
	}
}

// ClearPanel removes stored data for a single panel.
func (c *DebugCollector) ClearPanel(panelID string) bool {
	return c.ClearPanelWithContext(context.Background(), panelID)
}

// ClearPanelWithContext clears a panel while retaining authenticated scope for
// registered clear hooks.
func (c *DebugCollector) ClearPanelWithContext(ctx context.Context, panelID string) bool {
	if c == nil {
		return false
	}
	if ctx == nil {
		ctx = context.Background()
	}
	panelID = debugpanels.NormalizePanelID(panelID)
	if panelID == "" || !c.panelEnabled(panelID) {
		return false
	}
	if c.clearBuiltinPanel(panelID) {
		return true
	}
	return c.clearRegisteredOrDynamicPanel(ctx, panelID)
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

func (c *DebugCollector) clearRegisteredOrDynamicPanel(ctx context.Context, panelID string) bool {
	reg, regOK := debugregistry.Panel(panelID)
	if regOK && reg.Clear != nil {
		_ = reg.Clear(ctx) //nolint:errcheck // legacy bool API keeps existing best-effort behavior.
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
	for id, subscriber := range c.subscribers {
		subscribers = append(subscribers, debugSubscriber{id: id, subscriber: subscriber})
	}
	failureHandler := c.deliveryFailureHandler
	c.mu.RUnlock()

	for _, subscriber := range subscribers {
		switch subscriber.subscriber.Offer(event) {
		case debugSubscriberAccepted:
			continue
		case debugSubscriberClosed:
			c.removeSubscriber(subscriber.id, subscriber.subscriber)
		case debugSubscriberOverflow:
			if c.removeSubscriber(subscriber.id, subscriber.subscriber) {
				subscriber.subscriber.Close()
				if failureHandler != nil && event.Type == commandRunDebugEventType {
					failureHandler(event)
				}
			}
		}
	}
}

type debugSubscriber struct {
	id         string
	subscriber *debugEventSubscriber
}

func (c *DebugCollector) removeSubscriber(id string, subscriber *debugEventSubscriber) bool {
	if c == nil || strings.TrimSpace(id) == "" || subscriber == nil {
		return false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if existing, ok := c.subscribers[id]; ok && existing == subscriber {
		delete(c.subscribers, id)
		return true
	}
	return false
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
