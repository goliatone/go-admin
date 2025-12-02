package main

import (
	"context"
	"fmt"
	"path"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/commerce/stores"
)

func registerSearch(adm *admin.Admin, data *stores.CommerceStores, basePath string) {
	engine := adm.SearchService()
	if engine == nil {
		return
	}
	engine.Register("users", &repoSearchAdapter{
		repo:        data.Users,
		typeName:    "user",
		titleField:  "name",
		summaryField:"email",
		urlPrefix:   path.Join(basePath, "users"),
		permission:  "commerce.users.view",
	})
	engine.Register("products", &repoSearchAdapter{
		repo:        data.Products,
		typeName:    "product",
		titleField:  "name",
		summaryField:"sku",
		urlPrefix:   path.Join(basePath, "products"),
		permission:  "commerce.products.view",
	})
	engine.Register("orders", &repoSearchAdapter{
		repo:        data.Orders,
		typeName:    "order",
		titleField:  "number",
		summaryField:"user_name",
		urlPrefix:   path.Join(basePath, "orders"),
		permission:  "commerce.orders.view",
	})
}

type repoSearchAdapter struct {
	repo         *admin.MemoryRepository
	typeName     string
	titleField   string
	summaryField string
	urlPrefix    string
	permission   string
}

func (a *repoSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	if a.repo == nil {
		return nil, nil
	}
	opts := admin.ListOptions{
		Page:    1,
		PerPage: limit,
		Filters: map[string]any{"_search": query},
	}
	records, _, err := a.repo.List(ctx, opts)
	if err != nil {
		return nil, err
	}
	results := []admin.SearchResult{}
	for _, rec := range records {
		id := stringVal(rec["id"])
		if id == "" {
			continue
		}
		results = append(results, admin.SearchResult{
			Type:        a.typeName,
			ID:          id,
			Title:       stringVal(rec[a.titleField]),
			Description: stringVal(rec[a.summaryField]),
			URL:         fmt.Sprintf("%s/%s", a.urlPrefix, id),
		})
		if len(results) >= limit {
			break
		}
	}
	return results, nil
}

func (a *repoSearchAdapter) Permission() string {
	return a.permission
}

func stringVal(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case fmt.Stringer:
		return t.String()
	case int:
		return fmt.Sprintf("%d", t)
	case int64:
		return fmt.Sprintf("%d", t)
	case float64:
		return fmt.Sprintf("%.2f", t)
	default:
		return ""
	}
}
