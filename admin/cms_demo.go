package admin

import (
	"context"
	"errors"
	"sort"

	router "github.com/goliatone/go-router"
)

// RegisterCMSDemoPanels seeds CMS-backed panels (content/pages/blocks/widgets/menus) using the configured CMS services.
// It provides tree/blocks/SEO metadata needed for the CMS management UI and demo block editor routes.
func (a *Admin) RegisterCMSDemoPanels() error {
	if a.contentSvc == nil || a.menuSvc == nil || a.widgetSvc == nil {
		return errors.New("cms services not configured")
	}
	ctx := a.ctx()
	a.seedCMSDemoData(ctx)

	contentPanel := (&PanelBuilder{}).
		WithRepository(NewCMSContentRepository(a.contentSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "content_type", Label: "Type", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "select"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: "title", Label: "Title", Type: "text", Required: true},
			Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			Field{Name: "content_type", Label: "Type", Type: "select", Required: true, Options: []Option{
				{Value: "article", Label: "Article"},
				{Value: "page", Label: "Page"},
			}},
			Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []Option{
				{Value: "draft", Label: "Draft"},
				{Value: "published", Label: "Published"},
			}},
			Field{Name: "locale", Label: "Locale", Type: "text", Required: true},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "content_type", Label: "Type", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		Filters(
			Filter{Name: "locale", Type: "text"},
			Filter{Name: "status", Type: "select"},
		).
		UseBlocks(true)
	if _, err := a.RegisterPanel("content", contentPanel); err != nil {
		return err
	}

	pagePanel := (&PanelBuilder{}).
		WithRepository(NewCMSPageRepository(a.contentSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "slug", Label: "Path", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "select"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "preview_url", Label: "Preview", Type: "text"},
		).
		FormFields(
			Field{Name: "title", Label: "Title", Type: "text", Required: true},
			Field{Name: "slug", Label: "Path", Type: "text", Required: true},
			Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []Option{
				{Value: "draft", Label: "Draft"},
				{Value: "published", Label: "Published"},
			}},
			Field{Name: "locale", Label: "Locale", Type: "text", Required: true},
			Field{Name: "parent_id", Label: "Parent", Type: "text"},
			Field{Name: "preview_url", Label: "Preview URL", Type: "text", ReadOnly: true},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "slug", Label: "Path", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "preview_url", Label: "Preview URL", Type: "text"},
			Field{Name: "parent_id", Label: "Parent", Type: "text"},
		).
		Filters(
			Filter{Name: "locale", Type: "text"},
			Filter{Name: "status", Type: "select"},
		).
		UseBlocks(true).
		UseSEO(true).
		TreeView(true)
	if _, err := a.RegisterPanel("pages", pagePanel); err != nil {
		return err
	}

	blockDefinitions := (&PanelBuilder{}).
		WithRepository(NewCMSBlockDefinitionRepository(a.contentSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "type", Label: "Type", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "type", Label: "Type", Type: "text", Required: true},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "schema", Label: "Schema", Type: "textarea"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "type", Label: "Type", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		Filters(Filter{Name: "locale", Type: "text"})
	if _, err := a.RegisterPanel("block_definitions", blockDefinitions); err != nil {
		return err
	}

	blockPanel := (&PanelBuilder{}).
		WithRepository(NewCMSBlockRepository(a.contentSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "definition_id", Label: "Definition", Type: "text"},
			Field{Name: "content_id", Label: "Content/Page", Type: "text"},
			Field{Name: "region", Label: "Region", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: "definition_id", Label: "Definition", Type: "text", Required: true},
			Field{Name: "content_id", Label: "Content/Page", Type: "text", Required: true},
			Field{Name: "region", Label: "Region", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "select", Options: []Option{
				{Value: "draft", Label: "Draft"},
				{Value: "published", Label: "Published"},
			}},
			Field{Name: "data", Label: "Data", Type: "textarea"},
		).
		Filters(
			Filter{Name: "locale", Type: "text"},
			Filter{Name: "content_id", Type: "text"},
		)
	if _, err := a.RegisterPanel("blocks", blockPanel); err != nil {
		return err
	}

	widgetDefs := (&PanelBuilder{}).
		WithRepository(NewWidgetDefinitionRepository(a.widgetSvc)).
		ListFields(
			Field{Name: "code", Label: "Code", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
		).
		FormFields(
			Field{Name: "code", Label: "Code", Type: "text", Required: true},
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "schema", Label: "Schema", Type: "textarea"},
		).
		DetailFields(
			Field{Name: "code", Label: "Code", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
		)
	if _, err := a.RegisterPanel("widget_definitions", widgetDefs); err != nil {
		return err
	}

	widgetInstances := (&PanelBuilder{}).
		WithRepository(NewWidgetInstanceRepository(a.widgetSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "definition_code", Label: "Definition", Type: "text"},
			Field{Name: "area", Label: "Area", Type: "text"},
			Field{Name: "page_id", Label: "Page", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
		).
		FormFields(
			Field{Name: "definition_code", Label: "Definition", Type: "text", Required: true},
			Field{Name: "area", Label: "Area", Type: "text", Required: true},
			Field{Name: "page_id", Label: "Page", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "config", Label: "Config", Type: "textarea"},
		).
		Filters(
			Filter{Name: "area", Type: "text"},
			Filter{Name: "locale", Type: "text"},
		)
	if _, err := a.RegisterPanel("widget_instances", widgetInstances); err != nil {
		return err
	}

	menuPanel := (&PanelBuilder{}).
		WithRepository(NewCMSMenuRepository(a.menuSvc, a.navMenuCode)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "label", Label: "Label", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "parent_id", Label: "Parent", Type: "text"},
		).
		FormFields(
			Field{Name: "label", Label: "Label", Type: "text", Required: true},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "locale", Label: "Locale", Type: "text", Required: true},
			Field{Name: "parent_id", Label: "Parent", Type: "text"},
			Field{Name: "menu", Label: "Menu", Type: "text"},
			Field{Name: "badge", Label: "Badge", Type: "textarea"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "label", Label: "Label", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "position", Label: "Position", Type: "number"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "parent_id", Label: "Parent", Type: "text"},
		).
		Filters(
			Filter{Name: "locale", Type: "text"},
			Filter{Name: "menu", Type: "text"},
		).
		TreeView(true)
	if _, err := a.RegisterPanel("menus", menuPanel); err != nil {
		return err
	}

	a.registerCMSRoutesFromService()
	a.registerDemoSearchAdapters(contentPanel.repo, pagePanel.repo)
	return nil
}

func (a *Admin) registerCMSRoutesFromService() {
	if a.router == nil || a.contentSvc == nil {
		return
	}
	// Page tree endpoint
	a.router.Get(joinPath(a.config.BasePath, "api/pages/tree"), func(c router.Context) error {
		locale := c.Query("locale")
		pages, _ := a.contentSvc.Pages(a.ctx(), locale)
		tree := buildPageTree(pages)
		return writeJSON(c, tree)
	})

	// Content blocks endpoint for block editor
	a.router.Get(joinPath(a.config.BasePath, "api/content/:id/blocks"), func(c router.Context) error {
		id := c.Param("id", "")
		if id == "" {
			return writeError(c, errors.New("missing id"))
		}
		locale := c.Query("locale")
		blocks, err := a.contentSvc.BlocksForContent(a.ctx(), id, locale)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"blocks": blocks})
	})
}

// buildPageTree converts a flat page slice into a nested tree, preserving locale data.
func buildPageTree(records []CMSPage) []map[string]any {
	byID := map[string]map[string]any{}
	for _, page := range records {
		id := page.ID
		node := map[string]any{
			"id":       id,
			"title":    page.Title,
			"slug":     page.Slug,
			"locale":   page.Locale,
			"status":   page.Status,
			"children": []map[string]any{},
			"parent":   page.ParentID,
		}
		byID[id] = node
	}
	var roots []map[string]any
	for _, node := range byID {
		parent := toString(node["parent"])
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
	sort.SliceStable(roots, func(i, j int) bool {
		return toString(roots[i]["title"]) < toString(roots[j]["title"])
	})
	return roots
}

// seedCMSDemoData primes the in-memory CMS services with translatable content/pages/menus/widgets.
func (a *Admin) seedCMSDemoData(ctx context.Context) {
	if svc, ok := a.contentSvc.(*InMemoryContentService); ok {
		if len(svc.contents) == 0 {
			_, _ = svc.CreateContent(ctx, CMSContent{Title: "Welcome", Slug: "welcome", Locale: "en", Status: "published", ContentType: "article"})
			_, _ = svc.CreateContent(ctx, CMSContent{Title: "Bienvenido", Slug: "bienvenido", Locale: "es", Status: "draft", ContentType: "article"})
		}
		if len(svc.pages) == 0 {
			home, _ := svc.CreatePage(ctx, CMSPage{Title: "Home", Slug: "/",
				Locale: "en", Status: "published", PreviewURL: "/preview/home"})
			_, _ = svc.CreatePage(ctx, CMSPage{Title: "About", Slug: "/about", Locale: "en", Status: "published", ParentID: home.ID})
			esHome, _ := svc.CreatePage(ctx, CMSPage{Title: "Inicio", Slug: "/es", Locale: "es", Status: "draft"})
			_, _ = svc.SaveBlock(ctx, CMSBlock{DefinitionID: "hero", ContentID: home.ID, Locale: "en", Region: "main", Status: "published"})
			_, _ = svc.SaveBlock(ctx, CMSBlock{DefinitionID: "hero", ContentID: esHome.ID, Locale: "es", Region: "main", Status: "draft"})
		}
		if len(svc.blockDefs) == 0 {
			_, _ = svc.CreateBlockDefinition(ctx, CMSBlockDefinition{ID: "hero", Name: "Hero", Type: "text", Schema: map[string]any{"fields": []string{"title", "subtitle"}}})
		}
	}
	if svc, ok := a.widgetSvc.(*InMemoryWidgetService); ok {
		if len(svc.definitions) == 0 {
			_ = svc.RegisterDefinition(ctx, WidgetDefinition{Code: "stats", Name: "Stats", Schema: map[string]any{"type": "stats"}})
			_ = svc.RegisterAreaDefinition(ctx, WidgetAreaDefinition{Code: "admin.dashboard.main", Name: "Dashboard", Scope: "admin"})
		}
		if len(svc.instances) == 0 {
			_, _ = svc.SaveInstance(ctx, WidgetInstance{DefinitionCode: "stats", Area: "admin.dashboard.main", PageID: "", Locale: "en", Position: 1})
		}
	}
	if svc, ok := a.menuSvc.(*InMemoryMenuService); ok {
		if len(svc.menus) == 0 {
			_, _ = svc.CreateMenu(ctx, a.navMenuCode)
			dashboardTarget := map[string]any{"type": "url", "path": joinPath(a.config.BasePath, "")}
			contentTarget := map[string]any{"type": "url", "path": joinPath(a.config.BasePath, "content")}
			pagesTarget := map[string]any{"type": "url", "path": joinPath(a.config.BasePath, "pages")}
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Dashboard", Icon: "dashboard", Position: intPtr(1), Locale: "en", Target: dashboardTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Content", Icon: "file", Position: intPtr(2), Locale: "en", Target: contentTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Pages", Icon: "file-text", Position: intPtr(3), Locale: "en", Target: pagesTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Contenido", Icon: "file", Position: intPtr(2), Locale: "es", Target: contentTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Paginas", Icon: "file-text", Position: intPtr(3), Locale: "es", Target: pagesTarget})
		}
	}
}

// search adapter using generic repository for content/pages.
type repoSearchAdapter struct {
	repo       Repository
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

func (a *Admin) registerDemoSearchAdapters(contentRepo, pageRepo Repository) {
	if a.search == nil {
		a.search = NewSearchEngine(a.authorizer)
	}
	if contentRepo != nil {
		a.search.Register("content", &repoSearchAdapter{repo: contentRepo, resource: "content"})
	}
	if pageRepo != nil {
		a.search.Register("pages", &repoSearchAdapter{repo: pageRepo, resource: "page"})
	}
}

func (a *Admin) ctx() context.Context {
	return context.Background()
}
