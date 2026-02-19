package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	gocore "github.com/goliatone/go-services/core"
)

// List implements go-services query.ServicesActivityReader for facade activity queries.
func (m *Module) List(ctx context.Context, filter gocore.ServicesActivityFilter) (gocore.ServicesActivityPage, error) {
	if m == nil {
		return gocore.ServicesActivityPage{}, fmt.Errorf("modules/services: module is nil")
	}

	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db != nil {
		page, err := listActivityFeedSQL(ctx, db, toActivityListFilter(filter))
		if err != nil {
			return gocore.ServicesActivityPage{}, err
		}
		return toCoreActivityPage(page), nil
	}

	if m.activityRuntime != nil && m.activityRuntime.Sink() != nil {
		return m.activityRuntime.Sink().List(ctx, filter)
	}

	return gocore.ServicesActivityPage{}, providerUnavailableError("activity reader is not configured", nil)
}

func toActivityListFilter(filter gocore.ServicesActivityFilter) activityListFilter {
	perPage := filter.PerPage
	if perPage <= 0 {
		perPage = 25
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}

	return activityListFilter{
		Limit:       perPage,
		Offset:      (page - 1) * perPage,
		ProviderID:  strings.TrimSpace(filter.ProviderID),
		ScopeType:   strings.TrimSpace(filter.ScopeType),
		ScopeID:     strings.TrimSpace(filter.ScopeID),
		Action:      strings.TrimSpace(filter.Action),
		Status:      strings.TrimSpace(string(filter.Status)),
		Connections: normalizeStringList(filter.Connections),
		Since:       filter.From,
		Until:       filter.To,
	}
}

func toCoreActivityPage(page activityListPage) gocore.ServicesActivityPage {
	perPage := page.Limit
	if perPage <= 0 {
		perPage = 25
	}
	pageNumber := 1
	if page.Offset > 0 {
		pageNumber = (page.Offset / perPage) + 1
	}

	items := make([]gocore.ServiceActivityEntry, 0, len(page.Entries))
	for _, raw := range page.Entries {
		object := strings.TrimSpace(toString(raw["object"]))
		if object == "" {
			objectType := strings.TrimSpace(toString(raw["object_type"]))
			objectID := strings.TrimSpace(toString(raw["object_id"]))
			if objectType != "" && objectID != "" {
				object = objectType + ":" + objectID
			} else if objectType != "" {
				object = objectType
			} else if objectID != "" {
				object = objectID
			}
		}
		items = append(items, gocore.ServiceActivityEntry{
			ID:        strings.TrimSpace(toString(raw["id"])),
			Actor:     strings.TrimSpace(toString(raw["actor"])),
			Action:    strings.TrimSpace(toString(raw["action"])),
			Object:    object,
			Channel:   strings.TrimSpace(toString(raw["channel"])),
			Status:    gocore.ServiceActivityStatus(strings.TrimSpace(toString(raw["status"]))),
			Metadata:  extractMap(raw["metadata"]),
			CreatedAt: toActivityTime(raw["created_at"]),
		})
	}

	return gocore.ServicesActivityPage{
		Items:   items,
		Page:    pageNumber,
		PerPage: perPage,
		Total:   page.Total,
		HasNext: page.HasMore,
	}
}

func toActivityTime(value any) time.Time {
	switch typed := value.(type) {
	case time.Time:
		return typed.UTC()
	case *time.Time:
		if typed == nil {
			return time.Time{}
		}
		return typed.UTC()
	case string:
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(typed))
		if err == nil {
			return parsed.UTC()
		}
	}
	return time.Time{}
}
