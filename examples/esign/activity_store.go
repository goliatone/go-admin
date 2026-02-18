package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"os"
	"path/filepath"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
	"github.com/uptrace/bun/driver/sqliteshim"
)

const (
	esignActivityDefaultLimit = 50
	esignActivityMaxLimit     = 200
)

type eSignActivityStore struct {
	db *sql.DB
}

type eSignActivityRow struct {
	ID         string
	UserID     string
	ActorID    string
	TenantID   string
	OrgID      string
	Verb       string
	ObjectType string
	ObjectID   string
	Channel    string
	IP         string
	DataJSON   string
	OccurredAt string
}

var (
	_ coreadmin.ActivitySink        = (*eSignActivityStore)(nil)
	_ userstypes.ActivityRepository = (*eSignActivityStore)(nil)
)

func newESignActivityDependencies() (coreadmin.Dependencies, error) {
	dsn := resolveESignDatabaseDSN()
	store, err := newSQLiteESignActivityStore(dsn)
	if err != nil {
		return coreadmin.Dependencies{}, err
	}
	return coreadmin.Dependencies{
		ActivitySink:       store,
		ActivityRepository: store,
	}, nil
}

func resolveESignDatabaseDSN() string {
	return stores.ResolveSQLiteDSN()
}

func newSQLiteESignActivityStore(dsn string) (*eSignActivityStore, error) {
	dsn = strings.TrimSpace(dsn)
	if dsn == "" {
		return nil, fmt.Errorf("esign activity sqlite dsn is required")
	}
	ensureSQLiteDSNDir(dsn)

	db, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		return nil, fmt.Errorf("open esign activity sqlite: %w", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping esign activity sqlite: %w", err)
	}
	if err := stores.ConfigureSQLiteConnection(context.Background(), db); err != nil {
		_ = db.Close()
		return nil, err
	}
	if err := ensureESignActivityTable(context.Background(), db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &eSignActivityStore{db: db}, nil
}

func ensureSQLiteDSNDir(dsn string) {
	if !strings.HasPrefix(dsn, "file:") {
		return
	}
	raw := strings.TrimPrefix(dsn, "file:")
	if idx := strings.Index(raw, "?"); idx >= 0 {
		raw = raw[:idx]
	}
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == ":memory:" || strings.HasPrefix(raw, ":memory:") {
		return
	}
	dir := filepath.Dir(raw)
	if dir == "" || dir == "." {
		return
	}
	_ = os.MkdirAll(dir, 0o755)
}

func ensureESignActivityTable(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return fmt.Errorf("esign activity sqlite db is nil")
	}
	statements := []string{
		`CREATE TABLE IF NOT EXISTS esign_activity_log (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL DEFAULT '',
			actor_id TEXT NOT NULL DEFAULT '',
			tenant_id TEXT NOT NULL DEFAULT '',
			org_id TEXT NOT NULL DEFAULT '',
			verb TEXT NOT NULL DEFAULT '',
			object_type TEXT NOT NULL DEFAULT '',
			object_id TEXT NOT NULL DEFAULT '',
			channel TEXT NOT NULL DEFAULT '',
			ip TEXT NOT NULL DEFAULT '',
			data_json TEXT NOT NULL DEFAULT '{}',
			occurred_at TEXT NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_esign_activity_log_occurred_at ON esign_activity_log (occurred_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_esign_activity_log_scope ON esign_activity_log (tenant_id, org_id)`,
		`CREATE INDEX IF NOT EXISTS idx_esign_activity_log_actor ON esign_activity_log (actor_id)`,
		`CREATE INDEX IF NOT EXISTS idx_esign_activity_log_user ON esign_activity_log (user_id)`,
	}
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("ensure esign activity sqlite schema: %w", err)
		}
	}
	return nil
}

func (s *eSignActivityStore) Record(ctx context.Context, entry coreadmin.ActivityEntry) error {
	if s == nil || s.db == nil {
		return nil
	}
	row, err := activityRowFromAdminEntry(entry)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(
		ctx,
		`INSERT INTO esign_activity_log
		(id, user_id, actor_id, tenant_id, org_id, verb, object_type, object_id, channel, ip, data_json, occurred_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		row.ID,
		row.UserID,
		row.ActorID,
		row.TenantID,
		row.OrgID,
		row.Verb,
		row.ObjectType,
		row.ObjectID,
		row.Channel,
		row.IP,
		row.DataJSON,
		row.OccurredAt,
	)
	if err != nil {
		return fmt.Errorf("insert esign activity record: %w", err)
	}
	return nil
}

func (s *eSignActivityStore) List(ctx context.Context, limit int, filters ...coreadmin.ActivityFilter) ([]coreadmin.ActivityEntry, error) {
	if s == nil || s.db == nil {
		return []coreadmin.ActivityEntry{}, nil
	}
	limit = normalizeActivityLimit(limit)
	where, args := buildAdminActivityFilters(filters)
	query := `SELECT id, user_id, actor_id, tenant_id, org_id, verb, object_type, object_id, channel, ip, data_json, occurred_at
		FROM esign_activity_log` + where + ` ORDER BY occurred_at DESC LIMIT ?`
	args = append(args, limit)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list esign activity records: %w", err)
	}
	defer rows.Close()

	out := make([]coreadmin.ActivityEntry, 0)
	for rows.Next() {
		row, scanErr := scanActivityRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		record := rowToUsersActivityRecord(row)
		out = append(out, toAdminActivityEntry(record))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate esign activity rows: %w", err)
	}
	return out, nil
}

func (s *eSignActivityStore) ListActivity(ctx context.Context, filter userstypes.ActivityFilter) (userstypes.ActivityPage, error) {
	if s == nil || s.db == nil {
		return userstypes.ActivityPage{Records: []userstypes.ActivityRecord{}}, nil
	}
	limit, offset := normalizeUsersActivityPagination(filter.Pagination.Limit, filter.Pagination.Offset)
	where, args := buildUsersActivityFilters(filter)

	countQuery := `SELECT COUNT(1) FROM esign_activity_log` + where
	total, err := scanActivityCount(ctx, s.db, countQuery, args...)
	if err != nil {
		return userstypes.ActivityPage{}, err
	}

	query := `SELECT id, user_id, actor_id, tenant_id, org_id, verb, object_type, object_id, channel, ip, data_json, occurred_at
		FROM esign_activity_log` + where + ` ORDER BY occurred_at DESC LIMIT ? OFFSET ?`
	listArgs := append(append([]any{}, args...), limit, offset)
	rows, err := s.db.QueryContext(ctx, query, listArgs...)
	if err != nil {
		return userstypes.ActivityPage{}, fmt.Errorf("query esign activity records: %w", err)
	}
	defer rows.Close()

	records := make([]userstypes.ActivityRecord, 0)
	for rows.Next() {
		row, scanErr := scanActivityRow(rows)
		if scanErr != nil {
			return userstypes.ActivityPage{}, scanErr
		}
		records = append(records, rowToUsersActivityRecord(row))
	}
	if err := rows.Err(); err != nil {
		return userstypes.ActivityPage{}, fmt.Errorf("iterate esign activity rows: %w", err)
	}
	nextOffset := offset + len(records)
	return userstypes.ActivityPage{
		Records:    records,
		Total:      total,
		NextOffset: nextOffset,
		HasMore:    nextOffset < total,
	}, nil
}

func (s *eSignActivityStore) ActivityStats(ctx context.Context, filter userstypes.ActivityStatsFilter) (userstypes.ActivityStats, error) {
	stats := userstypes.ActivityStats{
		ByVerb: map[string]int{},
	}
	if s == nil || s.db == nil {
		return stats, nil
	}
	where, args := buildUsersActivityStatsFilters(filter)
	query := `SELECT verb, COUNT(1) FROM esign_activity_log` + where + ` GROUP BY verb`
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return stats, fmt.Errorf("query esign activity stats: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var verb string
		var count int
		if err := rows.Scan(&verb, &count); err != nil {
			return stats, fmt.Errorf("scan esign activity stats row: %w", err)
		}
		verb = strings.TrimSpace(verb)
		if verb == "" {
			continue
		}
		stats.ByVerb[verb] = count
		stats.Total += count
	}
	if err := rows.Err(); err != nil {
		return stats, fmt.Errorf("iterate esign activity stats rows: %w", err)
	}
	return stats, nil
}

func buildAdminActivityFilters(filters []coreadmin.ActivityFilter) (string, []any) {
	where := make([]string, 0)
	args := make([]any, 0)
	for _, filter := range filters {
		if actor := strings.TrimSpace(filter.Actor); actor != "" {
			where = append(where, "actor_id = ?")
			args = append(args, actor)
		}
		if action := strings.TrimSpace(filter.Action); action != "" {
			where = append(where, "verb = ?")
			args = append(args, action)
		}
		if object := strings.TrimSpace(filter.Object); object != "" {
			objectType, objectID := splitObjectRef(object)
			if objectType != "" {
				where = append(where, "object_type = ?")
				args = append(args, objectType)
			}
			if objectID != "" {
				where = append(where, "object_id = ?")
				args = append(args, objectID)
			}
		}
		if channel := strings.TrimSpace(filter.Channel); channel != "" {
			where = append(where, "channel = ?")
			args = append(args, channel)
		}
	}
	if len(where) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(where, " AND "), args
}

func buildUsersActivityFilters(filter userstypes.ActivityFilter) (string, []any) {
	where := make([]string, 0)
	args := make([]any, 0)
	if filter.UserID != uuid.Nil {
		where = append(where, "user_id = ?")
		args = append(args, filter.UserID.String())
	}
	if filter.ActorID != uuid.Nil {
		where = append(where, "actor_id = ?")
		args = append(args, filter.ActorID.String())
	}
	if filter.Scope.TenantID != uuid.Nil {
		where = append(where, "tenant_id = ?")
		args = append(args, filter.Scope.TenantID.String())
	}
	if filter.Scope.OrgID != uuid.Nil {
		where = append(where, "org_id = ?")
		args = append(args, filter.Scope.OrgID.String())
	}
	if verbs := normalizeStringList(filter.Verbs); len(verbs) > 0 {
		clause, inArgs := buildInClause("verb", verbs)
		where = append(where, clause)
		args = append(args, inArgs...)
	}
	if objectType := strings.TrimSpace(filter.ObjectType); objectType != "" {
		where = append(where, "object_type = ?")
		args = append(args, objectType)
	}
	if objectID := strings.TrimSpace(filter.ObjectID); objectID != "" {
		where = append(where, "object_id = ?")
		args = append(args, objectID)
	}
	if channels := normalizeStringList(filter.Channels); len(channels) > 0 {
		clause, inArgs := buildInClause("channel", channels)
		where = append(where, clause)
		args = append(args, inArgs...)
	} else if channel := strings.TrimSpace(filter.Channel); channel != "" {
		where = append(where, "channel = ?")
		args = append(args, channel)
	}
	if denylist := normalizeStringList(filter.ChannelDenylist); len(denylist) > 0 {
		clause, inArgs := buildInClause("channel", denylist)
		where = append(where, "NOT ("+clause+")")
		args = append(args, inArgs...)
	}
	if filter.Since != nil && !filter.Since.IsZero() {
		where = append(where, "occurred_at >= ?")
		args = append(args, filter.Since.UTC().Format(time.RFC3339Nano))
	}
	if filter.Until != nil && !filter.Until.IsZero() {
		where = append(where, "occurred_at <= ?")
		args = append(args, filter.Until.UTC().Format(time.RFC3339Nano))
	}
	if keyword := strings.ToLower(strings.TrimSpace(filter.Keyword)); keyword != "" {
		term := "%" + keyword + "%"
		where = append(where, "(LOWER(verb) LIKE ? OR LOWER(object_type) LIKE ? OR LOWER(object_id) LIKE ?)")
		args = append(args, term, term, term)
	}
	if len(where) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(where, " AND "), args
}

func buildUsersActivityStatsFilters(filter userstypes.ActivityStatsFilter) (string, []any) {
	where := make([]string, 0)
	args := make([]any, 0)
	if filter.UserID != uuid.Nil {
		where = append(where, "user_id = ?")
		args = append(args, filter.UserID.String())
	}
	if filter.ActorID != uuid.Nil {
		where = append(where, "actor_id = ?")
		args = append(args, filter.ActorID.String())
	}
	if filter.Scope.TenantID != uuid.Nil {
		where = append(where, "tenant_id = ?")
		args = append(args, filter.Scope.TenantID.String())
	}
	if filter.Scope.OrgID != uuid.Nil {
		where = append(where, "org_id = ?")
		args = append(args, filter.Scope.OrgID.String())
	}
	if verbs := normalizeStringList(filter.Verbs); len(verbs) > 0 {
		clause, inArgs := buildInClause("verb", verbs)
		where = append(where, clause)
		args = append(args, inArgs...)
	}
	if filter.Since != nil && !filter.Since.IsZero() {
		where = append(where, "occurred_at >= ?")
		args = append(args, filter.Since.UTC().Format(time.RFC3339Nano))
	}
	if filter.Until != nil && !filter.Until.IsZero() {
		where = append(where, "occurred_at <= ?")
		args = append(args, filter.Until.UTC().Format(time.RFC3339Nano))
	}
	if len(where) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(where, " AND "), args
}

func buildInClause(column string, values []string) (string, []any) {
	if len(values) == 0 {
		return "1=0", nil
	}
	placeholders := make([]string, len(values))
	args := make([]any, len(values))
	for idx, value := range values {
		placeholders[idx] = "?"
		args[idx] = value
	}
	return column + " IN (" + strings.Join(placeholders, ", ") + ")", args
}

func normalizeStringList(input []string) []string {
	if len(input) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(input))
	for _, value := range input {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		key := strings.ToLower(value)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, value)
	}
	return out
}

func scanActivityCount(ctx context.Context, db *sql.DB, query string, args ...any) (int, error) {
	var total int
	if err := db.QueryRowContext(ctx, query, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("scan esign activity count: %w", err)
	}
	return total, nil
}

func scanActivityRow(rows *sql.Rows) (eSignActivityRow, error) {
	row := eSignActivityRow{}
	err := rows.Scan(
		&row.ID,
		&row.UserID,
		&row.ActorID,
		&row.TenantID,
		&row.OrgID,
		&row.Verb,
		&row.ObjectType,
		&row.ObjectID,
		&row.Channel,
		&row.IP,
		&row.DataJSON,
		&row.OccurredAt,
	)
	if err != nil {
		return eSignActivityRow{}, fmt.Errorf("scan esign activity row: %w", err)
	}
	return row, nil
}

func activityRowFromAdminEntry(entry coreadmin.ActivityEntry) (eSignActivityRow, error) {
	record := toUsersActivityRecord(entry)
	return rowFromUsersActivityRecord(record)
}

func rowFromUsersActivityRecord(record userstypes.ActivityRecord) (eSignActivityRow, error) {
	dataJSON := "{}"
	if len(record.Data) > 0 {
		encoded, err := json.Marshal(record.Data)
		if err != nil {
			return eSignActivityRow{}, fmt.Errorf("marshal esign activity metadata: %w", err)
		}
		dataJSON = string(encoded)
	}

	id := record.ID
	if id == uuid.Nil {
		id = uuid.New()
	}
	occurredAt := record.OccurredAt.UTC()
	if occurredAt.IsZero() {
		occurredAt = time.Now().UTC()
	}

	return eSignActivityRow{
		ID:         id.String(),
		UserID:     safeUUIDString(record.UserID),
		ActorID:    safeUUIDString(record.ActorID),
		TenantID:   safeUUIDString(record.TenantID),
		OrgID:      safeUUIDString(record.OrgID),
		Verb:       strings.TrimSpace(record.Verb),
		ObjectType: strings.TrimSpace(record.ObjectType),
		ObjectID:   strings.TrimSpace(record.ObjectID),
		Channel:    defaultChannel(record.Channel),
		IP:         strings.TrimSpace(record.IP),
		DataJSON:   dataJSON,
		OccurredAt: occurredAt.Format(time.RFC3339Nano),
	}, nil
}

func rowToUsersActivityRecord(row eSignActivityRow) userstypes.ActivityRecord {
	data := map[string]any{}
	_ = json.Unmarshal([]byte(strings.TrimSpace(row.DataJSON)), &data)

	occurredAt := parseTimestamp(row.OccurredAt)
	if occurredAt.IsZero() {
		occurredAt = time.Now().UTC()
	}
	return userstypes.ActivityRecord{
		ID:         parseUUID(row.ID),
		UserID:     parseUUID(row.UserID),
		ActorID:    parseUUID(row.ActorID),
		TenantID:   parseUUID(row.TenantID),
		OrgID:      parseUUID(row.OrgID),
		Verb:       strings.TrimSpace(row.Verb),
		ObjectType: strings.TrimSpace(row.ObjectType),
		ObjectID:   strings.TrimSpace(row.ObjectID),
		Channel:    strings.TrimSpace(row.Channel),
		IP:         strings.TrimSpace(row.IP),
		Data:       data,
		OccurredAt: occurredAt,
	}
}

func toUsersActivityRecord(entry coreadmin.ActivityEntry) userstypes.ActivityRecord {
	metadata := primitives.CloneAnyMapEmptyOnEmpty(entry.Metadata)

	id := parseUUID(entry.ID)
	if id == uuid.Nil {
		id = uuid.New()
	}

	actorRaw := strings.TrimSpace(entry.Actor)
	actorID := parseUUID(actorRaw)
	userID := actorID
	if actorRaw != "" && actorID == uuid.Nil {
		if _, ok := metadata["actor"]; !ok {
			metadata["actor"] = actorRaw
		}
	}

	objectType, objectID := splitObjectRef(entry.Object)

	occurredAt := entry.CreatedAt.UTC()
	if occurredAt.IsZero() {
		occurredAt = time.Now().UTC()
	}

	return userstypes.ActivityRecord{
		ID:         id,
		UserID:     userID,
		ActorID:    actorID,
		Verb:       strings.TrimSpace(entry.Action),
		ObjectType: objectType,
		ObjectID:   objectID,
		Channel:    defaultChannel(entry.Channel),
		TenantID:   parseUUID(toString(metadata["tenant_id"])),
		OrgID:      parseUUID(toString(metadata["org_id"])),
		Data:       metadata,
		OccurredAt: occurredAt,
	}
}

func toAdminActivityEntry(record userstypes.ActivityRecord) coreadmin.ActivityEntry {
	metadata := primitives.CloneAnyMapEmptyOnEmpty(record.Data)
	actor := safeUUIDString(record.ActorID)
	if actor == "" {
		actor = strings.TrimSpace(toString(metadata["actor"]))
	}
	return coreadmin.ActivityEntry{
		ID:        safeUUIDString(record.ID),
		Actor:     actor,
		Action:    strings.TrimSpace(record.Verb),
		Object:    joinObjectRef(record.ObjectType, record.ObjectID),
		Channel:   strings.TrimSpace(record.Channel),
		Metadata:  metadata,
		CreatedAt: record.OccurredAt,
	}
}

func defaultChannel(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "admin"
	}
	return value
}

func parseTimestamp(value string) time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}
	}
	if parsed, err := time.Parse(time.RFC3339Nano, value); err == nil {
		return parsed.UTC()
	}
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed.UTC()
	}
	return time.Time{}
}

func normalizeUsersActivityPagination(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = esignActivityDefaultLimit
	}
	if limit > esignActivityMaxLimit {
		limit = esignActivityMaxLimit
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func normalizeActivityLimit(limit int) int {
	if limit <= 0 {
		return esignActivityDefaultLimit
	}
	if limit > esignActivityMaxLimit {
		return esignActivityMaxLimit
	}
	return limit
}

func splitObjectRef(value string) (string, string) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", ""
	}
	objectType, objectID, ok := strings.Cut(value, ":")
	if !ok {
		return value, ""
	}
	return strings.TrimSpace(objectType), strings.TrimSpace(objectID)
}

func joinObjectRef(objectType, objectID string) string {
	objectType = strings.TrimSpace(objectType)
	objectID = strings.TrimSpace(objectID)
	if objectType == "" {
		return objectID
	}
	if objectID == "" {
		return objectType
	}
	return objectType + ":" + objectID
}

func parseUUID(value string) uuid.UUID {
	id, _ := uuid.Parse(strings.TrimSpace(value))
	return id
}

func toString(value any) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func safeUUIDString(id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	return id.String()
}
