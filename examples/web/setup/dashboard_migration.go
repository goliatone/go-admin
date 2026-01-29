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
		"admin.widget.user_stats":        {"User Statistics", "User Stats", "Stats", "stats"},
		"admin.widget.activity_feed":     {"Activity Feed", "User Activity"},
		"admin.widget.quick_actions":     {"Quick Actions", "User Quick Actions"},
		"admin.widget.chart_sample":      {"Sample Chart", "Disabled Legacy Chart"},
		"admin.widget.settings_overview": {"Settings Overview"},
		"admin.widget.notifications":     {"Notifications"},
		"admin.widget.content_stats":     {"Content Stats"},
		"admin.widget.storage_stats":     {"Storage Stats"},
		"admin.widget.bar_chart":         {"Monthly Content", "Monthly Content Creation"},
		"admin.widget.line_chart":        {"User Growth"},
		"admin.widget.pie_chart":         {"Content Distribution"},
		"admin.widget.gauge_chart":       {"Storage Usage"},
		"admin.widget.scatter_chart":     {"Engagement vs Retention"},
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
