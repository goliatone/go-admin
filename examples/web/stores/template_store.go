package stores

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// TemplateStore provides read access to CMS templates for relationship selectors.
type TemplateStore struct {
	db *bun.DB
}

type templateRow struct {
	bun.BaseModel `bun:"table:templates,alias:tpl"`

	ID           uuid.UUID `bun:",pk,type:uuid"`
	Name         string    `bun:"name"`
	Slug         string    `bun:"slug"`
	TemplatePath string    `bun:"template_path"`
	CreatedAt    time.Time `bun:"created_at"`
}

// TemplateOption is a minimal payload for relationship selectors.
type TemplateOption struct {
	ID           string `json:"id"`
	Label        string `json:"label"`
	Name         string `json:"name,omitempty"`
	Slug         string `json:"slug,omitempty"`
	TemplatePath string `json:"template_path,omitempty"`
}

// NewTemplateStore returns a store backed by the CMS content database.
func NewTemplateStore(db *bun.DB) *TemplateStore {
	return &TemplateStore{db: db}
}

// List returns templates filtered by optional ids or query.
func (s *TemplateStore) List(ctx context.Context, query string, ids []string, limit int) ([]TemplateOption, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("template store not configured")
	}
	if limit <= 0 {
		limit = 25
	}
	query = strings.TrimSpace(query)
	ids = normalizeStringList(ids)

	rows := []templateRow{}
	selectQuery := s.db.NewSelect().Model(&rows)
	if len(ids) > 0 {
		selectQuery = selectQuery.Where("id IN (?)", bun.In(ids))
	}
	if query != "" {
		needle := "%" + strings.ToLower(query) + "%"
		selectQuery = selectQuery.Where(
			"LOWER(name) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(template_path) LIKE ?",
			needle,
			needle,
			needle,
		)
	}
	selectQuery = selectQuery.Order("name ASC").Limit(limit)

	if err := selectQuery.Scan(ctx); err != nil {
		return nil, err
	}

	out := make([]TemplateOption, 0, len(rows))
	for _, row := range rows {
		label := strings.TrimSpace(row.Name)
		if label == "" {
			label = strings.TrimSpace(row.TemplatePath)
		}
		if label == "" {
			label = strings.TrimSpace(row.Slug)
		}
		out = append(out, TemplateOption{
			ID:           row.ID.String(),
			Label:        label,
			Name:         row.Name,
			Slug:         row.Slug,
			TemplatePath: row.TemplatePath,
		})
	}

	return out, nil
}

func normalizeStringList(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, raw := range values {
		item := strings.TrimSpace(raw)
		if item == "" || seen[item] {
			continue
		}
		seen[item] = true
		out = append(out, item)
	}
	return out
}
