package services

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"net/http"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
	gocore "github.com/goliatone/go-services/core"
	servicesquery "github.com/goliatone/go-services/query"
	"github.com/uptrace/bun"
)

type activityListFilter struct {
	Limit       int        `json:"limit"`
	Offset      int        `json:"offset"`
	ProviderID  string     `json:"provider_id,omitempty"`
	ScopeType   string     `json:"scope_type,omitempty"`
	ScopeID     string     `json:"scope_id,omitempty"`
	Channel     string     `json:"channel,omitempty"`
	Channels    []string   `json:"channels,omitempty"`
	Action      string     `json:"action,omitempty"`
	ObjectType  string     `json:"object_type,omitempty"`
	ObjectID    string     `json:"object_id,omitempty"`
	Status      string     `json:"status,omitempty"`
	Connections []string   `json:"connections,omitempty"`
	Q           string     `json:"q,omitempty"`
	Since       *time.Time `json:"since,omitempty"`
	Until       *time.Time `json:"until,omitempty"`
}

func (f activityListFilter) toMap() map[string]any {
	return map[string]any{
		"provider_id": f.ProviderID,
		"scope_type":  f.ScopeType,
		"scope_id":    f.ScopeID,
		"channel":     f.Channel,
		"channels":    append([]string(nil), f.Channels...),
		"action":      f.Action,
		"object_type": f.ObjectType,
		"object_id":   f.ObjectID,
		"status":      f.Status,
		"connections": append([]string(nil), f.Connections...),
		"q":           f.Q,
		"since":       f.Since,
		"until":       f.Until,
	}
}

type activityListPage struct {
	Entries    []map[string]any
	Total      int
	Limit      int
	Offset     int
	HasMore    bool
	NextOffset int
}

type activityFeedRecord struct {
	bun.BaseModel `bun:"table:service_activity_entries,alias:sae"`

	ID             string         `bun:"id"`
	ProviderID     string         `bun:"provider_id"`
	ScopeType      string         `bun:"scope_type"`
	ScopeID        string         `bun:"scope_id"`
	ConnectionID   *string        `bun:"connection_id"`
	InstallationID *string        `bun:"installation_id"`
	SubscriptionID *string        `bun:"subscription_id"`
	SyncJobID      *string        `bun:"sync_job_id"`
	Channel        string         `bun:"channel"`
	Action         string         `bun:"action"`
	ObjectType     string         `bun:"object_type"`
	ObjectID       string         `bun:"object_id"`
	Actor          string         `bun:"actor"`
	ActorType      string         `bun:"actor_type"`
	Status         string         `bun:"status"`
	Metadata       map[string]any `bun:"metadata"`
	CreatedAt      time.Time      `bun:"created_at"`
}

func (r activityFeedRecord) toMap() map[string]any {
	object := strings.TrimSpace(r.ObjectType)
	if strings.TrimSpace(r.ObjectID) != "" {
		if object != "" {
			object += ":"
		}
		object += strings.TrimSpace(r.ObjectID)
	}
	return map[string]any{
		"id":              strings.TrimSpace(r.ID),
		"provider_id":     strings.TrimSpace(r.ProviderID),
		"scope_type":      strings.TrimSpace(r.ScopeType),
		"scope_id":        strings.TrimSpace(r.ScopeID),
		"connection_id":   trimPointerString(r.ConnectionID),
		"installation_id": trimPointerString(r.InstallationID),
		"subscription_id": trimPointerString(r.SubscriptionID),
		"sync_job_id":     trimPointerString(r.SyncJobID),
		"channel":         strings.TrimSpace(r.Channel),
		"action":          strings.TrimSpace(r.Action),
		"object_type":     strings.TrimSpace(r.ObjectType),
		"object_id":       strings.TrimSpace(r.ObjectID),
		"object":          object,
		"actor":           strings.TrimSpace(r.Actor),
		"actor_type":      strings.TrimSpace(r.ActorType),
		"status":          strings.TrimSpace(r.Status),
		"metadata":        copyAnyMap(r.Metadata),
		"created_at":      r.CreatedAt.UTC(),
	}
}

func parseActivityListFilter(c router.Context) (activityListFilter, error) {
	limit := toInt(c.Query("limit"), 0)
	offset := toInt(c.Query("offset"), 0)
	if limit <= 0 {
		page := toInt(c.Query("page"), 1)
		if page <= 0 {
			page = 1
		}
		perPage := toInt(c.Query("per_page"), 25)
		if perPage <= 0 {
			perPage = 25
		}
		limit = perPage
		offset = (page - 1) * perPage
	}
	if limit <= 0 {
		limit = 25
	}
	if offset < 0 {
		offset = 0
	}

	since, err := toTime(primitives.FirstNonEmpty(c.Query("since"), c.Query("from")))
	if err != nil {
		return activityListFilter{}, validationError("since must be RFC3339", map[string]any{"field": "since"})
	}
	until, err := toTime(primitives.FirstNonEmpty(c.Query("until"), c.Query("to")))
	if err != nil {
		return activityListFilter{}, validationError("until must be RFC3339", map[string]any{"field": "until"})
	}
	channels := normalizeStringList(append(
		toStringSlice(c.Query("channels")),
		strings.TrimSpace(c.Query("channel")),
	))
	channel := ""
	if len(channels) == 1 {
		channel = channels[0]
	}
	connections := normalizeStringList(append(
		toStringSlice(c.Query("connections")),
		strings.TrimSpace(c.Query("connection_id")),
	))

	return activityListFilter{
		Limit:       limit,
		Offset:      offset,
		ProviderID:  strings.TrimSpace(c.Query("provider_id")),
		ScopeType:   strings.TrimSpace(c.Query("scope_type")),
		ScopeID:     strings.TrimSpace(c.Query("scope_id")),
		Channel:     channel,
		Channels:    channels,
		Action:      strings.TrimSpace(c.Query("action")),
		ObjectType:  strings.TrimSpace(c.Query("object_type")),
		ObjectID:    strings.TrimSpace(c.Query("object_id")),
		Status:      strings.TrimSpace(c.Query("status")),
		Connections: connections,
		Q:           strings.TrimSpace(c.Query("q")),
		Since:       since,
		Until:       until,
	}, nil
}

func normalizeStringList(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		out = append(out, trimmed)
	}
	return out
}

func (m *Module) listActivityFeed(ctx context.Context, filter activityListFilter) (activityListPage, error) {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db != nil {
		return listActivityFeedSQL(ctx, db, filter)
	}
	if m.facade == nil {
		return activityListPage{}, providerUnavailableError("services facade is not configured", nil)
	}

	coreFilter := gocore.ServicesActivityFilter{
		ProviderID:  filter.ProviderID,
		ScopeType:   filter.ScopeType,
		ScopeID:     filter.ScopeID,
		Action:      filter.Action,
		Status:      gocore.ServiceActivityStatus(filter.Status),
		From:        filter.Since,
		To:          filter.Until,
		Page:        (filter.Offset / filter.Limit) + 1,
		PerPage:     filter.Limit,
		Connections: append([]string(nil), filter.Connections...),
	}
	page, err := m.facade.Queries().ListServicesActivity.Query(ctx, servicesquery.ListServicesActivityMessage{Filter: coreFilter})
	if err != nil {
		return activityListPage{}, err
	}
	entries := make([]map[string]any, 0, len(page.Items))
	for _, entry := range page.Items {
		objectType, objectID := parseSimpleObject(entry.Object)
		entries = append(entries, map[string]any{
			"id":          strings.TrimSpace(entry.ID),
			"channel":     strings.TrimSpace(entry.Channel),
			"action":      strings.TrimSpace(entry.Action),
			"status":      strings.TrimSpace(string(entry.Status)),
			"actor":       strings.TrimSpace(entry.Actor),
			"object":      strings.TrimSpace(entry.Object),
			"object_type": objectType,
			"object_id":   objectID,
			"metadata":    copyAnyMap(entry.Metadata),
			"created_at":  entry.CreatedAt.UTC(),
		})
	}
	nextOffset := filter.Offset + len(entries)
	return activityListPage{
		Entries:    entries,
		Total:      page.Total,
		Limit:      filter.Limit,
		Offset:     filter.Offset,
		HasMore:    nextOffset < page.Total,
		NextOffset: nextOffset,
	}, nil
}

func listActivityFeedSQL(ctx context.Context, db *bun.DB, filter activityListFilter) (activityListPage, error) {
	if db == nil {
		return activityListPage{}, providerUnavailableError("persistence client is not configured", nil)
	}
	rows := []activityFeedRecord{}
	query := db.NewSelect().Model(&rows).Order("created_at DESC").Limit(filter.Limit).Offset(filter.Offset)
	countQuery := db.NewSelect().Table("service_activity_entries")

	query = applyActivityFilterQuery(query, filter)
	countQuery = applyActivityFilterQuery(countQuery, filter)

	if err := query.Scan(ctx); err != nil {
		if !errorsIsNoRows(err) {
			return activityListPage{}, err
		}
		rows = []activityFeedRecord{}
	}
	total, err := countQuery.Count(ctx)
	if err != nil {
		return activityListPage{}, err
	}
	entries := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		entries = append(entries, row.toMap())
	}
	nextOffset := filter.Offset + len(entries)
	return activityListPage{
		Entries:    entries,
		Total:      total,
		Limit:      filter.Limit,
		Offset:     filter.Offset,
		HasMore:    nextOffset < total,
		NextOffset: nextOffset,
	}, nil
}

func applyActivityFilterQuery(query *bun.SelectQuery, filter activityListFilter) *bun.SelectQuery {
	if providerID := strings.TrimSpace(filter.ProviderID); providerID != "" {
		query = query.Where("provider_id = ?", providerID)
	}
	if scopeType := strings.TrimSpace(filter.ScopeType); scopeType != "" {
		query = query.Where("scope_type = ?", scopeType)
	}
	if scopeID := strings.TrimSpace(filter.ScopeID); scopeID != "" {
		query = query.Where("scope_id = ?", scopeID)
	}
	if action := strings.TrimSpace(filter.Action); action != "" {
		query = query.Where("action = ?", action)
	}
	if objectType := strings.TrimSpace(filter.ObjectType); objectType != "" {
		query = query.Where("object_type = ?", objectType)
	}
	if objectID := strings.TrimSpace(filter.ObjectID); objectID != "" {
		query = query.Where("object_id = ?", objectID)
	}
	if status := strings.TrimSpace(filter.Status); status != "" {
		query = query.Where("status = ?", status)
	}
	if len(filter.Channels) == 1 {
		query = query.Where("channel = ?", filter.Channels[0])
	} else if len(filter.Channels) > 1 {
		query = query.Where("channel IN (?)", bun.In(filter.Channels))
	}
	if len(filter.Connections) == 1 {
		query = query.Where("connection_id = ?", filter.Connections[0])
	} else if len(filter.Connections) > 1 {
		query = query.Where("connection_id IN (?)", bun.In(filter.Connections))
	}
	if filter.Since != nil {
		query = query.Where("created_at >= ?", filter.Since.UTC())
	}
	if filter.Until != nil {
		query = query.Where("created_at <= ?", filter.Until.UTC())
	}
	if search := strings.TrimSpace(filter.Q); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query = query.Where("(LOWER(channel) LIKE ? OR LOWER(action) LIKE ? OR LOWER(object_type) LIKE ? OR LOWER(object_id) LIKE ? OR LOWER(actor) LIKE ?)", like, like, like, like, like)
	}
	return query
}

func parseSimpleObject(value string) (string, string) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", ""
	}
	parts := strings.SplitN(trimmed, ":", 2)
	if len(parts) != 2 {
		return "", trimmed
	}
	return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
}

func (m *Module) handleServiceStatus(c router.Context, _ map[string]any) (int, any, error) {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}
	outboxStatus, err := collectStatusCounts(c.Context(), db, "service_lifecycle_outbox")
	if err != nil {
		return 0, nil, err
	}
	notificationStatus, err := collectStatusCounts(c.Context(), db, "service_notification_dispatches")
	if err != nil {
		return 0, nil, err
	}
	pendingLagSeconds := 0
	if oldest, err := selectOldestPendingOutbox(c.Context(), db); err == nil && oldest != nil {
		pendingLagSeconds = int(time.Since(oldest.UTC()).Seconds())
		if pendingLagSeconds < 0 {
			pendingLagSeconds = 0
		}
	}

	activityStatus := activityRuntimeStatus{}
	if m.activityRuntime != nil {
		activityStatus = m.activityRuntime.Status()
	}
	degraded := activityStatus.FallbackWrites > 0 || strings.TrimSpace(activityStatus.LastCleanupError) != ""
	if failed, ok := outboxStatus["failed"].(int); ok && failed > 0 {
		degraded = true
	}

	response := map[string]any{
		"lifecycle": map[string]any{
			"dispatcher": map[string]any{
				"enabled":         m.config.Lifecycle.Dispatcher.Enabled,
				"batch_size":      m.config.Lifecycle.Dispatcher.BatchSize,
				"max_attempts":    m.config.Lifecycle.Dispatcher.MaxAttempts,
				"initial_backoff": m.config.Lifecycle.Dispatcher.InitialBackoff.String(),
			},
			"projectors": map[string]any{
				"activity_enabled":      m.config.Lifecycle.Projectors.Activity.Enabled,
				"notifications_enabled": m.config.Lifecycle.Projectors.Notifications.Enabled,
				"custom_subscribers":    len(m.config.Lifecycle.Projectors.Subscribers),
			},
			"outbox": map[string]any{
				"status_counts":       outboxStatus,
				"pending_lag_seconds": pendingLagSeconds,
			},
			"notifications": map[string]any{
				"dispatch_status_counts": notificationStatus,
			},
			"activity": activityStatus,
			"degraded": degraded,
		},
	}
	if m.config.Extensions.DiagnosticsEnabled {
		diag := m.ExtensionDiagnostics()
		response["extensions"] = map[string]any{
			"registered_provider_packs":   append([]string(nil), diag.RegisteredProviderPacks...),
			"enabled_provider_packs":      append([]string(nil), diag.EnabledProviderPacks...),
			"disabled_provider_packs":     append([]string(nil), diag.DisabledProviderPacks...),
			"command_query_bundles":       append([]string(nil), diag.CommandQueryBundles...),
			"built_command_query_bundles": append([]string(nil), diag.BuiltCommandQueryBundles...),
			"lifecycle_subscribers":       append([]string(nil), diag.LifecycleSubscribers...),
			"feature_flags":               copyBoolMap(diag.FeatureFlags),
		}
	}
	return http.StatusOK, response, nil
}

func (m *Module) handleRunActivityRetentionCleanup(c router.Context, body map[string]any) (int, any, error) {
	if m.activityRuntime == nil {
		return 0, nil, providerUnavailableError("activity runtime is not configured", nil)
	}
	if toBool(body["async"], false) && m.worker != nil && m.config.Worker.Enabled && m.worker.HasEnqueuer() {
		if err := m.worker.EnqueueActivityRetentionRun(c.Context(), strings.TrimSpace(c.Header("Idempotency-Key"))); err != nil {
			return 0, nil, providerUnavailableError("unable to enqueue activity retention cleanup", map[string]any{"reason": err.Error()})
		}
		return http.StatusAccepted, map[string]any{"queued": true, "job_id": jobIDActivityRetentionRun}, nil
	}
	deleted, err := m.activityRuntime.EnforceRetention(c.Context())
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{
		"deleted": deleted,
		"status":  m.activityRuntime.Status(),
	}, nil
}

type statusCountRow struct {
	Status string `bun:"status"`
	Count  int    `bun:"count"`
}

func collectStatusCounts(ctx context.Context, db *bun.DB, table string) (map[string]any, error) {
	if db == nil {
		return map[string]any{}, nil
	}
	rows := []statusCountRow{}
	if err := db.NewSelect().
		Table(table).
		Column("status").
		ColumnExpr("COUNT(*) AS count").
		Group("status").
		Scan(ctx, &rows); err != nil {
		if errorsIsNoRows(err) {
			return map[string]any{}, nil
		}
		return nil, err
	}
	out := map[string]any{}
	for _, row := range rows {
		out[strings.TrimSpace(row.Status)] = row.Count
	}
	return out, nil
}

type oldestPendingOutboxRow struct {
	OccurredAt *time.Time `bun:"occurred_at"`
}

func selectOldestPendingOutbox(ctx context.Context, db *bun.DB) (*time.Time, error) {
	if db == nil {
		return nil, nil
	}
	row := oldestPendingOutboxRow{}
	err := db.NewSelect().
		Table("service_lifecycle_outbox").
		ColumnExpr("MIN(occurred_at) AS occurred_at").
		Where("status = ?", "pending").
		Scan(ctx, &row)
	if err != nil {
		if errorsIsNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	if row.OccurredAt == nil || row.OccurredAt.IsZero() {
		return nil, nil
	}
	tm := row.OccurredAt.UTC()
	return &tm, nil
}

func trimPointerString(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}
