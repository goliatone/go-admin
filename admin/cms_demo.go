package admin

import (
	"context"
	"errors"
	"sort"

	router "github.com/goliatone/go-router"
)

// RegisterCMSDemoPanels seeds minimal CMS-like panels (content/pages/menus) using in-memory repositories.
// This is a lightweight stand-in for go-cms to exercise CMS-backed flows.
func (a *Admin) RegisterCMSDemoPanels() error {
	// Content
	contentRepo := NewMemoryRepository()
	contentSeed := []map[string]any{
		{"title": "Welcome", "status": "published", "locale": "en", "content_type": "article"},
		{"title": "Bienvenido", "status": "draft", "locale": "es", "content_type": "article"},
	}
	for _, rec := range contentSeed {
		if _, err := contentRepo.Create(a.ctx(), rec); err != nil {
			return err
		}
	}

	contentPanel := (&PanelBuilder{}).
		WithRepository(contentRepo).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: "title", Label: "Title", Type: "text", Required: true},
			Field{Name: "status", Label: "Status", Type: "select", Options: []Option{{Value: "draft", Label: "Draft"}, {Value: "published", Label: "Published"}}},
			Field{Name: "locale", Label: "Locale", Type: "text", Required: true},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		Filters(Filter{Name: "status", Type: "select"}, Filter{Name: "locale", Type: "text"}).
		UseBlocks(true)

	if _, err := a.RegisterPanel("content", contentPanel); err != nil {
		return err
	}

	// Pages
	pageRepo := NewMemoryRepository()
	pageSeed := []map[string]any{
		{"title": "Home", "slug": "/", "status": "published", "locale": "en", "parent_id": ""},
		{"title": "About", "slug": "/about", "status": "published", "locale": "en", "parent_id": ""},
		{"title": "Team", "slug": "/about/team", "status": "draft", "locale": "en", "parent_id": "2"},
	}
	for _, rec := range pageSeed {
		if _, err := pageRepo.Create(a.ctx(), rec); err != nil {
			return err
		}
	}

	pagePanel := (&PanelBuilder{}).
		WithRepository(pageRepo).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "slug", Label: "Path", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: "title", Label: "Title", Type: "text", Required: true},
			Field{Name: "slug", Label: "Path", Type: "text", Required: true},
			Field{Name: "status", Label: "Status", Type: "select", Options: []Option{{Value: "draft", Label: "Draft"}, {Value: "published", Label: "Published"}}},
			Field{Name: "locale", Label: "Locale", Type: "text", Required: true},
			Field{Name: "parent_id", Label: "Parent", Type: "text"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "slug", Label: "Path", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		UseBlocks(true).
		UseSEO(true).
		TreeView(true)

	if _, err := a.RegisterPanel("pages", pagePanel); err != nil {
		return err
	}

	// Menus: reuse CMS menu service seeded during bootstrap
	menuRepo := NewMemoryRepository()
	menu, _ := a.menuSvc.Menu(a.ctx(), "admin.main", a.config.DefaultLocale)
	for _, item := range menu.Items {
		if _, err := menuRepo.Create(a.ctx(), map[string]any{
			"label":    item.Label,
			"icon":     item.Icon,
			"position": item.Position,
			"locale":   item.Locale,
		}); err != nil {
			return err
		}
	}

	menuPanel := (&PanelBuilder{}).
		WithRepository(menuRepo).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "label", Label: "Label", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: "label", Label: "Label", Type: "text", Required: true},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "locale", Label: "Locale", Type: "text", Required: true},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "label", Label: "Label", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		)

	if _, err := a.RegisterPanel("menus", menuPanel); err != nil {
		return err
	}

	a.registerCMSRoutes(pageRepo, contentRepo)
	a.registerDemoSearchAdapters(contentRepo, pageRepo)
	return nil
}

func (a *Admin) registerCMSRoutes(pageRepo, contentRepo *MemoryRepository) {
	if a.router == nil {
		return
	}
	// Page tree endpoint
	a.router.Get(joinPath(a.config.BasePath, "api/pages/tree"), func(c router.Context) error {
		records, _, _ := pageRepo.List(a.ctx(), ListOptions{})
		tree := buildTree(records)
		return writeJSON(c, tree)
	})

	// Content blocks stub endpoint
	a.router.Get(joinPath(a.config.BasePath, "api/content/blocks"), func(c router.Context) error {
		id := c.Query("id")
		if id == "" {
			return writeError(c, errors.New("missing id"))
		}
		blocks := []map[string]any{
			{"id": "b1", "content_id": id, "type": "text", "value": "Sample block content"},
		}
		return writeJSON(c, map[string]any{"blocks": blocks})
	})
}

func buildTree(records []map[string]any) []map[string]any {
	byID := map[string]map[string]any{}
	for _, rec := range records {
		id := toString(rec["id"])
		node := map[string]any{
			"id":       id,
			"title":    rec["title"],
			"slug":     rec["slug"],
			"locale":   rec["locale"],
			"status":   rec["status"],
			"children": []map[string]any{},
			"parent":   toString(rec["parent_id"]),
		}
		byID[id] = node
	}
	var roots []map[string]any
	for _, node := range byID {
		parent := node["parent"].(string)
		if parent == "" {
			roots = append(roots, node)
			continue
		}
		if pnode, ok := byID[parent]; ok {
			pnode["children"] = append(pnode["children"].([]map[string]any), node)
		} else {
			roots = append(roots, node)
		}
	}
	// stable order by title
	sort.SliceStable(roots, func(i, j int) bool {
		return toString(roots[i]["title"]) < toString(roots[j]["title"])
	})
	return roots
}

func (a *Admin) ctx() context.Context {
	return context.Background()
}

// search adapters for demo content/pages
type repoSearchAdapter struct {
	repo       *MemoryRepository
	resource   string
	permission string
}

func (r *repoSearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	records, _, err := r.repo.List(ctx, ListOptions{Filters: map[string]any{"_search": query}, PerPage: limit})
	if err != nil {
		return nil, err
	}
	out := []SearchResult{}
	for _, rec := range records {
		out = append(out, SearchResult{
			Type:        r.resource,
			ID:          toString(rec["id"]),
			Title:       toString(rec["title"]),
			Description: toString(rec["status"]),
			URL:         "",
			Icon:        "file-text",
		})
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

func (r *repoSearchAdapter) Permission() string {
	return r.permission
}

func (a *Admin) registerDemoSearchAdapters(contentRepo, pageRepo *MemoryRepository) {
	if a.search == nil {
		a.search = NewSearchEngine(a.authorizer)
	}
	a.search.Register("content", &repoSearchAdapter{repo: contentRepo, resource: "content", permission: ""})
	a.search.Register("pages", &repoSearchAdapter{repo: pageRepo, resource: "page", permission: ""})
}
