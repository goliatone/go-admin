package setup

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

// SetupActivityWithGoUsers provisions a go-users-compatible activity sink.
// It returns an admin.ActivitySink that logs to a go-users ActivitySink/Repository
// while retaining the admin UI fallback buffer via ActivitySinkAdapter.
func SetupActivityWithGoUsers() admin.ActivitySink {
	backend := newGoUsersActivityAdapter()
	return admin.NewActivitySinkAdapter(backend, backend)
}

// goUsersActivityAdapter bridges admin ActivityRecords to a go-users sink/repository.
type goUsersActivityAdapter struct {
	store *goUsersActivityStore
}

func newGoUsersActivityAdapter() *goUsersActivityAdapter {
	return &goUsersActivityAdapter{
		store: &goUsersActivityStore{},
	}
}

// Log records activity by converting the admin record to a go-users ActivityRecord.
func (a *goUsersActivityAdapter) Log(ctx context.Context, record admin.ActivityRecord) error {
	if a == nil || a.store == nil {
		return nil
	}
	return a.store.Log(ctx, toUsersRecord(record))
}

// ListRecords returns activity records from the go-users compatible store.
func (a *goUsersActivityAdapter) ListRecords(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityRecord, error) {
	if a == nil || a.store == nil {
		return nil, nil
	}

	filter := toUsersFilter(limit, filters...)
	page, err := a.store.ListActivity(ctx, filter)
	if err != nil {
		return nil, err
	}

	records := make([]admin.ActivityRecord, 0, len(page.Records))
	for _, rec := range page.Records {
		records = append(records, fromUsersRecord(rec))
		if limit > 0 && len(records) >= limit {
			break
		}
	}
	return records, nil
}

// goUsersActivityStore is an in-memory ActivitySink/Repository compatible with go-users.
type goUsersActivityStore struct {
	mu      sync.Mutex
	records []types.ActivityRecord
}

var (
	_ types.ActivitySink       = (*goUsersActivityStore)(nil)
	_ types.ActivityRepository = (*goUsersActivityStore)(nil)
)

func (s *goUsersActivityStore) Log(_ context.Context, record types.ActivityRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	if record.ID == uuid.Nil {
		record.ID = uuid.New()
	}
	if record.OccurredAt.IsZero() {
		record.OccurredAt = now
	}
	if record.Channel == "" {
		record.Channel = "admin"
	}
	record.Verb = strings.TrimSpace(record.Verb)
	record.ObjectType = strings.TrimSpace(record.ObjectType)
	record.ObjectID = strings.TrimSpace(record.ObjectID)

	s.records = append([]types.ActivityRecord{cloneUsersRecord(record)}, s.records...)
	return nil
}

func (s *goUsersActivityStore) ListActivity(_ context.Context, filter types.ActivityFilter) (types.ActivityPage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	filtered := make([]types.ActivityRecord, 0, len(s.records))
	for _, rec := range s.records {
		if !matchesFilter(rec, filter) {
			continue
		}
		filtered = append(filtered, rec)
	}

	limit := filter.Pagination.Limit
	if limit <= 0 {
		limit = len(filtered)
	}
	if limit > len(filtered) {
		limit = len(filtered)
	}
	offset := filter.Pagination.Offset
	if offset < 0 {
		offset = 0
	}
	if offset > len(filtered) {
		offset = len(filtered)
	}
	end := offset + limit
	if end > len(filtered) {
		end = len(filtered)
	}
	return types.ActivityPage{
		Records:    cloneUsersRecords(filtered[offset:end]),
		Total:      len(filtered),
		NextOffset: end,
		HasMore:    end < len(filtered),
	}, nil
}

func (s *goUsersActivityStore) ActivityStats(context.Context, types.ActivityStatsFilter) (types.ActivityStats, error) {
	return types.ActivityStats{}, nil
}

func matchesFilter(record types.ActivityRecord, filter types.ActivityFilter) bool {
	if filter.ActorID != uuid.Nil && record.ActorID != filter.ActorID {
		return false
	}
	if filter.UserID != uuid.Nil && record.UserID != filter.UserID {
		return false
	}
	if len(filter.Verbs) > 0 && !contains(filter.Verbs, record.Verb) {
		return false
	}
	if filter.ObjectType != "" && !strings.EqualFold(filter.ObjectType, record.ObjectType) {
		return false
	}
	if filter.ObjectID != "" && filter.ObjectID != record.ObjectID {
		return false
	}
	if filter.Channel != "" && !strings.EqualFold(filter.Channel, record.Channel) {
		return false
	}
	return true
}

func toUsersRecord(record admin.ActivityRecord) types.ActivityRecord {
	data := cloneAnyMap(record.Data)
	actor := strings.TrimSpace(record.ActorID)
	actorID := parseUUID(actor)
	if actorID == uuid.Nil && actor != "" && data["actor"] == nil {
		data["actor"] = actor
	}

	userID := parseUUID(record.UserID)
	if userID == uuid.Nil && actorID != uuid.Nil {
		userID = actorID
	}

	occurred := record.OccurredAt
	if occurred.IsZero() {
		occurred = time.Now().UTC()
	}

	tenantID := parseUUID(record.TenantID)
	orgID := parseUUID(record.OrgID)

	return types.ActivityRecord{
		ID:         parseUUID(record.ID),
		UserID:     userID,
		ActorID:    actorID,
		Verb:       record.Verb,
		ObjectType: record.ObjectType,
		ObjectID:   record.ObjectID,
		Channel:    defaultChannel(record.Channel),
		IP:         record.IP,
		TenantID:   tenantID,
		OrgID:      orgID,
		Data:       data,
		OccurredAt: occurred,
	}
}

func fromUsersRecord(record types.ActivityRecord) admin.ActivityRecord {
	data := cloneAnyMap(record.Data)

	actor := ""
	if record.ActorID != uuid.Nil {
		actor = record.ActorID.String()
	} else if val, ok := data["actor"].(string); ok {
		actor = strings.TrimSpace(val)
	}

	userID := ""
	if record.UserID != uuid.Nil {
		userID = record.UserID.String()
	}

	tenantID := ""
	if record.TenantID != uuid.Nil {
		tenantID = record.TenantID.String()
	}

	orgID := ""
	if record.OrgID != uuid.Nil {
		orgID = record.OrgID.String()
	}

	return admin.ActivityRecord{
		ID:         safeUUIDString(record.ID),
		UserID:     userID,
		ActorID:    actor,
		Verb:       record.Verb,
		ObjectType: record.ObjectType,
		ObjectID:   record.ObjectID,
		Channel:    defaultChannel(record.Channel),
		IP:         record.IP,
		TenantID:   tenantID,
		OrgID:      orgID,
		Data:       data,
		OccurredAt: record.OccurredAt,
	}
}

func toUsersFilter(limit int, filters ...admin.ActivityFilter) types.ActivityFilter {
	out := types.ActivityFilter{
		Pagination: types.Pagination{Limit: limit},
	}
	for _, filter := range filters {
		if filter.Actor != "" && out.ActorID == uuid.Nil {
			out.ActorID = parseUUID(filter.Actor)
		}
		if filter.Action != "" {
			out.Verbs = append(out.Verbs, filter.Action)
		}
		if filter.Object != "" {
			objType, objID := splitObject(filter.Object)
			if objType != "" {
				out.ObjectType = objType
			}
			if objID != "" {
				out.ObjectID = objID
			}
		}
		if channel := strings.TrimSpace(filter.Channel); channel != "" && out.Channel == "" {
			out.Channel = channel
		}
	}
	if out.Pagination.Limit <= 0 {
		out.Pagination.Limit = 50
	}
	return out
}

func splitObject(object string) (string, string) {
	if object == "" {
		return "", ""
	}
	typ, id, ok := strings.Cut(object, ":")
	if !ok {
		return strings.TrimSpace(object), ""
	}
	return strings.TrimSpace(typ), strings.TrimSpace(id)
}

func parseUUID(value string) uuid.UUID {
	id, _ := uuid.Parse(strings.TrimSpace(value))
	return id
}

func safeUUIDString(value uuid.UUID) string {
	if value == uuid.Nil {
		return ""
	}
	return value.String()
}

func defaultChannel(channel string) string {
	if strings.TrimSpace(channel) == "" {
		return "admin"
	}
	return channel
}

func cloneUsersRecord(record types.ActivityRecord) types.ActivityRecord {
	return types.ActivityRecord{
		ID:         record.ID,
		UserID:     record.UserID,
		ActorID:    record.ActorID,
		Verb:       record.Verb,
		ObjectType: record.ObjectType,
		ObjectID:   record.ObjectID,
		Channel:    record.Channel,
		IP:         record.IP,
		TenantID:   record.TenantID,
		OrgID:      record.OrgID,
		Data:       cloneAnyMap(record.Data),
		OccurredAt: record.OccurredAt,
	}
}

func cloneUsersRecords(records []types.ActivityRecord) []types.ActivityRecord {
	out := make([]types.ActivityRecord, 0, len(records))
	for _, rec := range records {
		out = append(out, cloneUsersRecord(rec))
	}
	return out
}

func cloneAnyMap(src map[string]any) map[string]any {
	if len(src) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(src))
	for k, v := range src {
		out[k] = v
	}
	return out
}

func contains(list []string, target string) bool {
	for _, item := range list {
		if strings.EqualFold(item, target) {
			return true
		}
	}
	return false
}
