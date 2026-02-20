package setup

import (
	"context"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type widgetDefinitionRow struct {
	ID   uuid.UUID `bun:"id"`
	Name string    `bun:"name"`
}

func migrateDashboardWidgetDefinitions(ctx context.Context, db *bun.DB, widgetSvc admin.CMSWidgetService) error {
	if db == nil || widgetSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	defs := []widgetDefinitionRow{}
	if err := db.NewSelect().
		Table("widget_definitions").
		Column("id", "name").
		Scan(ctx, &defs); err != nil {
		return err
	}

	byName := map[string]uuid.UUID{}
	for _, def := range defs {
		name := strings.TrimSpace(def.Name)
		if name == "" {
			continue
		}
		byName[name] = def.ID
	}

	aliases := map[string][]string{
		admin.WidgetUserStats:           {"User Statistics", "User Stats", "Stats", "stats"},
		admin.WidgetActivityFeed:        {"Activity Feed", "Recent Activity"},
		admin.WidgetQuickActions:        {"Quick Actions", "User Quick Actions"},
		admin.WidgetChartSample:         {"Sample Chart", "Disabled Legacy Chart"},
		admin.WidgetSettingsOverview:    {"Settings Overview"},
		admin.WidgetNotifications:       {"Notifications"},
		admin.WidgetContentStats:        {"Content Stats"},
		admin.WidgetStorageStats:        {"Storage Stats"},
		admin.WidgetBarChart:            {"Monthly Content", "Monthly Content Creation"},
		admin.WidgetLineChart:           {"User Growth"},
		admin.WidgetPieChart:            {"Content Distribution"},
		admin.WidgetGaugeChart:          {"Storage Usage"},
		admin.WidgetScatterChart:        {"Engagement vs Retention"},
		admin.WidgetSystemHealth:        {"System Health"},
		admin.WidgetUserProfileOverview: {"Profile Overview"},
		admin.WidgetUserActivityFeed:    {"User Activity"},
	}

	for code, names := range aliases {
		code = strings.TrimSpace(code)
		if code == "" {
			continue
		}
		codeID, codeExists := byName[code]
		for _, alias := range names {
			alias = strings.TrimSpace(alias)
			if alias == "" || alias == code {
				continue
			}
			aliasID, ok := byName[alias]
			if !ok {
				continue
			}
			if !codeExists {
				if _, err := db.NewUpdate().
					Table("widget_definitions").
					Set("name = ?", code).
					Where("id = ?", aliasID).
					Exec(ctx); err != nil {
					return err
				}
				delete(byName, alias)
				byName[code] = aliasID
				codeID = aliasID
				codeExists = true
				continue
			}
			if aliasID == codeID {
				continue
			}
			if _, err := db.NewUpdate().
				Table("widget_instances").
				Set("definition_id = ?", codeID).
				Where("definition_id = ?", aliasID).
				Exec(ctx); err != nil {
				return err
			}
			if _, err := db.NewDelete().
				Table("widget_definitions").
				Where("id = ?", aliasID).
				Exec(ctx); err != nil {
				return err
			}
			delete(byName, alias)
		}
	}

	minimalSchema := map[string]any{
		"type":       "object",
		"properties": map[string]any{},
	}
	for code := range aliases {
		if _, ok := byName[code]; ok {
			continue
		}
		_ = widgetSvc.RegisterDefinition(ctx, coreadmin.WidgetDefinition{
			Code:   code,
			Name:   code,
			Schema: minimalSchema,
		})
	}

	return nil
}
