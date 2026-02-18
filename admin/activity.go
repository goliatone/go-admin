package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strconv"
	"strings"
	"sync"
	"time"

	auth "github.com/goliatone/go-auth"
	usersactivity "github.com/goliatone/go-users/activity"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

// ActivityEntry represents an activity feed entry.
type ActivityEntry struct {
	ID        string         `json:"id"`
	Actor     string         `json:"actor,omitempty"`
	Action    string         `json:"action,omitempty"`
	Object    string         `json:"object,omitempty"`
	Channel   string         `json:"channel,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
}

// ActivityRecord mirrors the go-users activity record contract for compatibility.
type ActivityRecord struct {
	ID         string         `json:"id"`
	UserID     string         `json:"user_id,omitempty"`
	ActorID    string         `json:"actor_id,omitempty"`
	Verb       string         `json:"verb,omitempty"`
	ObjectType string         `json:"object_type,omitempty"`
	ObjectID   string         `json:"object_id,omitempty"`
	Channel    string         `json:"channel,omitempty"`
	IP         string         `json:"ip,omitempty"`
	TenantID   string         `json:"tenant_id,omitempty"`
	OrgID      string         `json:"org_id,omitempty"`
	Data       map[string]any `json:"data,omitempty"`
	OccurredAt time.Time      `json:"occurred_at"`
}

// ActivityFilter narrows feed listings.
type ActivityFilter struct {
	Actor   string
	Action  string
	Object  string
	Channel string
}

const (
	ActivityActorTypeKey       = "actor_type"
	ActivityActorTypeKeyLegacy = "actorType"
	ActivityActorTypeSystem    = "system"
	ActivityActorTypeJob       = "job"
	ActivityActorTypeTask      = "task"
)

// ActivitySink records activity entries.
type ActivitySink interface {
	Record(ctx context.Context, entry ActivityEntry) error
	List(ctx context.Context, limit int, filters ...ActivityFilter) ([]ActivityEntry, error)
}

// ActivityLogger matches the go-users ActivitySink shape (`Log` + ActivityRecord).
type ActivityLogger interface {
	Log(context.Context, ActivityRecord) error
}

// ActivityRecordLister exposes listing ActivityRecords (for adapters backed by go-users).
type ActivityRecordLister interface {
	ListRecords(context.Context, int, ...ActivityFilter) ([]ActivityRecord, error)
}

// ActivityFeed stores activities in memory.
type ActivityFeed struct {
	mu      sync.Mutex
	nextID  int
	entries []ActivityEntry
	limit   int
}

// NewActivityFeed constructs a feed.
func NewActivityFeed(opts ...func(*ActivityFeed)) *ActivityFeed {
	feed := &ActivityFeed{nextID: 1}
	for _, opt := range opts {
		if opt != nil {
			opt(feed)
		}
	}
	return feed
}

// WithActivityRetention caps the number of stored entries (0 = unlimited).
func WithActivityRetention(limit int) func(*ActivityFeed) {
	return func(f *ActivityFeed) {
		if limit > 0 {
			f.limit = limit
		}
	}
}

// Record appends an activity entry.
func (f *ActivityFeed) Record(ctx context.Context, entry ActivityEntry) error {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	if entry.ID == "" {
		entry.ID = strconv.Itoa(f.nextID)
		f.nextID++
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}
	f.entries = append([]ActivityEntry{entry}, f.entries...)
	if f.limit > 0 && len(f.entries) > f.limit {
		f.entries = f.entries[:f.limit]
	}
	return nil
}

// List returns the most recent entries.
func (f *ActivityFeed) List(ctx context.Context, limit int, filters ...ActivityFilter) ([]ActivityEntry, error) {
	_ = ctx
	f.mu.Lock()
	defer f.mu.Unlock()
	filtered := filterEntries(f.entries, filters)
	if limit <= 0 || limit > len(filtered) {
		limit = len(filtered)
	}
	out := make([]ActivityEntry, limit)
	copy(out, filtered[:limit])
	return out, nil
}

// Log implements a go-users-compatible logger.
func (f *ActivityFeed) Log(ctx context.Context, record ActivityRecord) error {
	return f.Record(ctx, entryFromRecord(record))
}

// ListRecords returns ActivityRecords for adapter use.
func (f *ActivityFeed) ListRecords(ctx context.Context, limit int, filters ...ActivityFilter) ([]ActivityRecord, error) {
	entries, err := f.List(ctx, limit, filters...)
	if err != nil {
		return nil, err
	}
	out := make([]ActivityRecord, 0, len(entries))
	for _, entry := range entries {
		out = append(out, recordFromEntry(entry))
	}
	return out, nil
}

// ActivitySinkAdapter bridges a go-users style logger into the ActivitySink contract.
type ActivitySinkAdapter struct {
	logger   ActivityLogger
	lister   ActivityRecordLister
	fallback ActivitySink
}

// NewActivitySinkAdapter builds an adapter that logs via the provided logger and, when
// possible, lists via lister; a fallback in-memory buffer preserves UI feeds.
func NewActivitySinkAdapter(logger ActivityLogger, lister ActivityRecordLister) *ActivitySinkAdapter {
	return &ActivitySinkAdapter{
		logger:   logger,
		lister:   lister,
		fallback: NewActivityFeed(WithActivityRetention(250)),
	}
}

// Record converts ActivityEntry to ActivityRecord before delegating to the logger.
func (a *ActivitySinkAdapter) Record(ctx context.Context, entry ActivityEntry) error {
	if a == nil {
		return nil
	}
	if a.logger != nil {
		record := recordFromEntry(entry)
		if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
			if record.TenantID == "" {
				record.TenantID = strings.TrimSpace(actor.TenantID)
			}
			if record.OrgID == "" {
				record.OrgID = strings.TrimSpace(actor.OrganizationID)
			}
		}
		if err := a.logger.Log(ctx, record); err != nil {
			return err
		}
	}
	if a.fallback != nil {
		_ = a.fallback.Record(ctx, entry)
	}
	return nil
}

// List returns entries from the lister when present, otherwise from the fallback buffer.
func (a *ActivitySinkAdapter) List(ctx context.Context, limit int, filters ...ActivityFilter) ([]ActivityEntry, error) {
	if a == nil {
		return nil, nil
	}
	if a.lister != nil {
		records, err := a.lister.ListRecords(ctx, limit, filters...)
		if err != nil {
			return nil, err
		}
		return entriesFromRecords(records, limit), nil
	}
	if a.fallback == nil {
		return nil, nil
	}
	return a.fallback.List(ctx, limit, filters...)
}

type enrichedActivitySink struct {
	sink              ActivitySink
	enricher          usersactivity.ActivityEnricher
	errorHandler      usersactivity.EnrichmentErrorHandler
	sessionIDProvider usersactivity.SessionIDProvider
	sessionIDKey      string
}

func newEnrichedActivitySink(sink ActivitySink, enricher usersactivity.ActivityEnricher, handler usersactivity.EnrichmentErrorHandler, provider usersactivity.SessionIDProvider, key string) ActivitySink {
	if sink == nil {
		return nil
	}
	if enricher == nil && provider == nil {
		return sink
	}
	return &enrichedActivitySink{
		sink:              sink,
		enricher:          enricher,
		errorHandler:      handler,
		sessionIDProvider: provider,
		sessionIDKey:      key,
	}
}

func (s *enrichedActivitySink) Record(ctx context.Context, entry ActivityEntry) error {
	if s == nil || s.sink == nil {
		return nil
	}
	record := recordFromEntry(entry)
	record = attachSessionIDToRecord(ctx, record, s.sessionIDProvider, s.sessionIDKey)
	if s.enricher != nil {
		usersRecord := toUsersActivityRecord(record)
		enriched, err := applyUsersEnricher(ctx, usersRecord, s.enricher, s.errorHandler)
		if err != nil {
			return err
		}
		record = fromUsersActivityRecord(enriched)
	}
	entry = entryFromRecord(record)
	return s.sink.Record(ctx, entry)
}

func (s *enrichedActivitySink) List(ctx context.Context, limit int, filters ...ActivityFilter) ([]ActivityEntry, error) {
	if s == nil || s.sink == nil {
		return nil, nil
	}
	return s.sink.List(ctx, limit, filters...)
}

func filterEntries(entries []ActivityEntry, filters []ActivityFilter) []ActivityEntry {
	if len(filters) == 0 {
		return entries
	}
	out := []ActivityEntry{}
	for _, entry := range entries {
		if !matchesFilters(entry, filters) {
			continue
		}
		out = append(out, entry)
	}
	return out
}

func matchesFilters(entry ActivityEntry, filters []ActivityFilter) bool {
	for _, f := range filters {
		if f.Actor != "" && entry.Actor != f.Actor {
			return false
		}
		if f.Action != "" && entry.Action != f.Action {
			return false
		}
		if f.Object != "" && entry.Object != f.Object {
			return false
		}
		if f.Channel != "" && entry.Channel != f.Channel {
			return false
		}
	}
	return true
}

func recordFromEntry(entry ActivityEntry) ActivityRecord {
	objectType, objectID := splitObject(entry.Object)
	record := ActivityRecord{
		ID:         entry.ID,
		ActorID:    entry.Actor,
		UserID:     entry.Actor,
		Verb:       entry.Action,
		ObjectType: objectType,
		ObjectID:   objectID,
		Channel:    strings.TrimSpace(entry.Channel),
		Data:       entry.Metadata,
		OccurredAt: entry.CreatedAt,
	}
	return record
}

func entryFromRecord(record ActivityRecord) ActivityEntry {
	return ActivityEntry{
		ID:        record.ID,
		Actor:     primitives.FirstNonEmptyRaw(record.ActorID, record.UserID),
		Action:    record.Verb,
		Object:    joinObject(record.ObjectType, record.ObjectID),
		Channel:   record.Channel,
		Metadata:  primitives.CloneAnyMap(record.Data),
		CreatedAt: record.OccurredAt,
	}
}

func entriesFromRecords(records []ActivityRecord, limit int) []ActivityEntry {
	out := []ActivityEntry{}
	for _, rec := range records {
		out = append(out, entryFromRecord(rec))
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	return out
}

func splitObject(object string) (string, string) {
	if object == "" {
		return "", ""
	}
	if !strings.Contains(object, ":") {
		return object, ""
	}
	parts := strings.SplitN(object, ":", 2)
	return parts[0], parts[1]
}

func joinObject(objectType, objectID string) string {
	switch {
	case objectType != "" && objectID != "":
		return objectType + ":" + objectID
	case objectID != "":
		return objectID
	default:
		return objectType
	}
}

func actorFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if actor.ActorID != "" {
			return actor.ActorID
		}
		if actor.Subject != "" {
			return actor.Subject
		}
	}
	return ""
}

func tagActivityActorType(metadata map[string]any, actorType string) map[string]any {
	actorType = strings.TrimSpace(actorType)
	if actorType == "" {
		return metadata
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	if _, ok := metadata[ActivityActorTypeKey]; ok {
		return metadata
	}
	metadata[ActivityActorTypeKey] = actorType
	return metadata
}

func attachSessionIDToRecord(ctx context.Context, record ActivityRecord, provider usersactivity.SessionIDProvider, key string) ActivityRecord {
	if provider == nil {
		return record
	}
	sessionID, ok := provider.SessionID(ctx)
	if !ok {
		return record
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return record
	}
	key = strings.TrimSpace(key)
	if key == "" {
		key = usersactivity.DataKeySessionID
	}
	out := record
	out.Data = primitives.CloneAnyMap(record.Data)
	if out.Data == nil {
		out.Data = map[string]any{}
	}
	if _, exists := out.Data[key]; exists {
		return out
	}
	out.Data[key] = sessionID
	return out
}

type usersRecordCapture struct {
	record userstypes.ActivityRecord
}

func (c *usersRecordCapture) Log(_ context.Context, record userstypes.ActivityRecord) error {
	c.record = record
	return nil
}

func applyUsersEnricher(ctx context.Context, record userstypes.ActivityRecord, enricher usersactivity.ActivityEnricher, handler usersactivity.EnrichmentErrorHandler) (userstypes.ActivityRecord, error) {
	if enricher == nil {
		return record, nil
	}
	capture := &usersRecordCapture{}
	sink := &usersactivity.EnrichedSink{
		Sink:         capture,
		Enricher:     enricher,
		ErrorHandler: handler,
	}
	if err := sink.Log(ctx, record); err != nil {
		return record, err
	}
	return capture.record, nil
}

func toUsersActivityRecord(record ActivityRecord) userstypes.ActivityRecord {
	data := primitives.CloneAnyMap(record.Data)
	if data == nil {
		data = map[string]any{}
	}

	actor := strings.TrimSpace(record.ActorID)
	actorID := parseUUIDValue(actor)
	if actorID == uuid.Nil && actor != "" && data["actor"] == nil {
		data["actor"] = actor
	}

	userID := parseUUIDValue(record.UserID)
	if userID == uuid.Nil && actorID != uuid.Nil {
		userID = actorID
	}

	occurred := record.OccurredAt
	if occurred.IsZero() {
		occurred = time.Now().UTC()
	}

	return userstypes.ActivityRecord{
		ID:         parseUUIDValue(record.ID),
		UserID:     userID,
		ActorID:    actorID,
		Verb:       strings.TrimSpace(record.Verb),
		ObjectType: strings.TrimSpace(record.ObjectType),
		ObjectID:   strings.TrimSpace(record.ObjectID),
		Channel:    strings.TrimSpace(record.Channel),
		IP:         record.IP,
		TenantID:   parseUUIDValue(record.TenantID),
		OrgID:      parseUUIDValue(record.OrgID),
		Data:       data,
		OccurredAt: occurred,
	}
}

func fromUsersActivityRecord(record userstypes.ActivityRecord) ActivityRecord {
	data := primitives.CloneAnyMap(record.Data)
	if data == nil {
		data = map[string]any{}
	}

	actor := ""
	if record.ActorID != uuid.Nil {
		actor = record.ActorID.String()
	} else if val, ok := data["actor"].(string); ok {
		actor = strings.TrimSpace(val)
	}

	userID := safeUUIDString(record.UserID)
	tenantID := safeUUIDString(record.TenantID)
	orgID := safeUUIDString(record.OrgID)

	return ActivityRecord{
		ID:         safeUUIDString(record.ID),
		UserID:     userID,
		ActorID:    actor,
		Verb:       strings.TrimSpace(record.Verb),
		ObjectType: strings.TrimSpace(record.ObjectType),
		ObjectID:   strings.TrimSpace(record.ObjectID),
		Channel:    strings.TrimSpace(record.Channel),
		IP:         record.IP,
		TenantID:   tenantID,
		OrgID:      orgID,
		Data:       data,
		OccurredAt: record.OccurredAt,
	}
}

func parseUUIDValue(value string) uuid.UUID {
	id, _ := uuid.Parse(strings.TrimSpace(value))
	return id
}

func safeUUIDString(value uuid.UUID) string {
	if value == uuid.Nil {
		return ""
	}
	return value.String()
}
