package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"net/url"
	"path"
	"sort"
	"strings"

	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// RegisterCMSDemoPanels seeds CMS-backed panels (content/tree/blocks/widgets/menus) using the configured CMS services.
// It provides tree/blocks/SEO metadata needed for the CMS management UI and demo block editor routes.
func (a *Admin) RegisterCMSDemoPanels() error {
	if a.contentSvc == nil || a.menuSvc == nil || a.widgetSvc == nil || a.contentTypeSvc == nil {
		return serviceUnavailableDomainError("cms services not configured", map[string]any{
			"service": "cms",
		})
	}
	ctx := a.ctx()
	a.seedCMSDemoData(ctx)
	contentTypeOptions, err := a.contentTypeOptions(ctx)
	if err != nil {
		return err
	}
	workflow := resolveCMSWorkflowEngine(a)
	workflowActions := []Action{}
	if workflow != nil {
		workflowActions = resolveCMSWorkflowActions(a)
	}

	contentTypesPanel := (&PanelBuilder{}).
		WithRepository(NewCMSContentTypeRepository(a.contentTypeSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
		).
		FormFields(
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			Field{Name: "description", Label: "Description", Type: "textarea"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "schema", Label: "Schema", Type: "textarea", Required: true},
			Field{Name: "capabilities", Label: "Capabilities", Type: "textarea"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "description", Label: "Description", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
		)
	if _, err := a.RegisterPanel("content_types", contentTypesPanel); err != nil {
		return err
	}

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
			Field{Name: "content_type", Label: "Type", Type: "select", Required: true, Options: contentTypeOptions},
			Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []Option{
				{Value: "draft", Label: "Draft"},
				{Value: "approval", Label: "Approval"},
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
	if workflow != nil {
		contentPanel.WithWorkflow(workflow).Actions(workflowActions...)
	}
	if _, err := a.RegisterPanel("content", contentPanel); err != nil {
		return err
	}

	treePanel := (&PanelBuilder{}).
		WithRepository(NewCMSPageRepository(a.contentSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "path", Label: "Path", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "select"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "preview_url", Label: "Preview", Type: "text"},
		).
		FormFields(
			Field{Name: "title", Label: "Title", Type: "text", Required: true},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "path", Label: "Path", Type: "text", Required: true},
			Field{Name: "template_id", Label: "Template", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []Option{
				{Value: "draft", Label: "Draft"},
				{Value: "approval", Label: "Approval"},
				{Value: "published", Label: "Published"},
			}},
			Field{Name: "locale", Label: "Locale", Type: "text", Required: true},
			Field{Name: "parent_id", Label: "Parent", Type: "text"},
			Field{Name: "preview_url", Label: "Preview URL", Type: "text", ReadOnly: true},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "path", Label: "Path", Type: "text"},
			Field{Name: "template_id", Label: "Template", Type: "text"},
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
	if workflow != nil {
		if checker, ok := workflow.(WorkflowDefinitionChecker); !ok || checker.HasWorkflow("content_tree") {
			treePanel.WithWorkflow(workflow).Actions(workflowActions...)
		}
	}
	if _, err := a.RegisterPanel("content_tree", treePanel); err != nil {
		return err
	}

	blockDefinitions := (&PanelBuilder{}).
		WithRepository(NewCMSBlockDefinitionRepository(a.contentSvc, a.contentTypeSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "type", Label: "Type", Type: "text"},
			Field{Name: "schema_version", Label: "Schema Version", Type: "text"},
			Field{Name: "migration_status", Label: "Migration Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "type", Label: "Type", Type: "text", Required: true},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "schema", Label: "Schema", Type: "jsonschema"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "type", Label: "Type", Type: "text"},
			Field{Name: "schema_version", Label: "Schema Version", Type: "text"},
			Field{Name: "migration_status", Label: "Migration Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		Filters(
			Filter{Name: "locale", Type: "text"},
			Filter{Name: "content_type", Type: "text"},
		)
	if _, err := a.RegisterPanel("block_definitions", blockDefinitions); err != nil {
		return err
	}

	blockConflicts := (&PanelBuilder{}).
		WithRepository(NewCMSBlockConflictRepository(a.contentSvc)).
		ListFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "entity_type", Label: "Type", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "content_type", Label: "Content Type", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "embedded_count", Label: "Embedded Count", Type: "number"},
			Field{Name: "legacy_count", Label: "Legacy Count", Type: "number"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "entity_type", Label: "Type", Type: "text"},
			Field{Name: "entity_id", Label: "Entity ID", Type: "text"},
			Field{Name: "title", Label: "Title", Type: "text"},
			Field{Name: "content_type", Label: "Content Type", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "embedded_types", Label: "Embedded Types", Type: "text"},
			Field{Name: "legacy_types", Label: "Legacy Types", Type: "text"},
			Field{Name: "embedded_blocks", Label: "Embedded Blocks", Type: "textarea"},
			Field{Name: "legacy_blocks", Label: "Legacy Blocks", Type: "textarea"},
		).
		Filters(
			Filter{Name: "locale", Type: "text"},
			Filter{Name: "content_type", Type: "text"},
			Filter{Name: "entity_type", Type: "text"},
		)
	if _, err := a.RegisterPanel("block_conflicts", blockConflicts); err != nil {
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
	a.registerDemoSearchAdapters(contentPanel.repo, treePanel.repo)
	return nil
}

func (a *Admin) registerCMSRoutesFromService() {
	if a == nil || a.router == nil || a.contentSvc == nil || a.cmsRoutesRegistered {
		return
	}
	a.cmsRoutesRegistered = true
	// Page tree endpoint
	contentTreePath := adminAPIRoutePath(a, "cms.content_tree")
	a.router.Get(contentTreePath, func(c router.Context) error {
		locale := c.Query("locale")
		records, _ := a.contentSvc.Pages(a.ctx(), locale)
		tree := buildPageTree(records)
		return writeJSON(c, tree)
	})

	// Content blocks endpoint for block editor
	contentBlocksPath := adminAPIRoutePath(a, "cms.content.blocks")
	a.router.Get(contentBlocksPath, func(c router.Context) error {
		id := c.Param("id", "")
		if id == "" {
			return writeError(c, validationDomainError("missing id", map[string]any{
				"field": "id",
			}))
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

// seedCMSDemoData primes the in-memory CMS services with translatable content/tree/menus/widgets.
func (a *Admin) seedCMSDemoData(ctx context.Context) {
	if svc, ok := a.contentTypeSvc.(*InMemoryContentService); ok {
		if len(svc.types) == 0 {
			_, _ = svc.CreateContentType(ctx, CMSContentType{
				Name: "Article",
				Slug: "article",
				Schema: map[string]any{
					"fields": []map[string]any{
						{"name": "title", "type": "string", "required": true},
						{"name": "body", "type": "text"},
					},
				},
			})
			_, _ = svc.CreateContentType(ctx, CMSContentType{
				Name: "Page",
				Slug: "page",
				Schema: map[string]any{
					"fields": []map[string]any{
						{"name": "title", "type": "string", "required": true},
						{"name": "body", "type": "text"},
					},
				},
			})
		}
	}
	if svc, ok := a.contentSvc.(*InMemoryContentService); ok {
		if len(svc.contents) == 0 {
			_, _ = svc.CreateContent(ctx, CMSContent{Title: "Welcome", Slug: "welcome", Locale: "en", Status: "published", ContentType: "article", ContentTypeSlug: "article"})
			_, _ = svc.CreateContent(ctx, CMSContent{Title: "Bienvenido", Slug: "bienvenido", Locale: "es", Status: "draft", ContentType: "article", ContentTypeSlug: "article"})
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
			dashboardTarget := map[string]any{"type": "url", "path": resolveURLWith(a.urlManager, "admin", "dashboard", nil, nil)}
			contentTarget := map[string]any{"type": "url", "path": resolveURLWith(a.urlManager, "admin", "content", nil, nil)}
			treeTarget := map[string]any{"type": "url", "path": resolveURLWith(a.urlManager, "admin", "content.panel", map[string]string{"panel": "content_tree"}, nil)}
			conflictsTarget := map[string]any{"type": "url", "path": resolveURLWith(a.urlManager, "admin", "block_conflicts", nil, nil)}
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Dashboard", Icon: "dashboard", Position: primitives.Int(1), Locale: "en", Target: dashboardTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Content", Icon: "file", Position: primitives.Int(2), Locale: "en", Target: contentTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Content Tree", Icon: "file-text", Position: primitives.Int(3), Locale: "en", Target: treeTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Block Conflicts", Icon: "alert-triangle", Position: primitives.Int(4), Locale: "en", Target: conflictsTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Contenido", Icon: "file", Position: primitives.Int(2), Locale: "es", Target: contentTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Arbol de Contenido", Icon: "file-text", Position: primitives.Int(3), Locale: "es", Target: treeTarget})
			_ = svc.AddMenuItem(ctx, a.navMenuCode, MenuItem{Label: "Conflictos de Bloques", Icon: "alert-triangle", Position: primitives.Int(4), Locale: "es", Target: conflictsTarget})
		}
	}
}

// search adapter using generic repository for content/tree items.
type repoSearchAdapter struct {
	repo             Repository
	resource         string
	permission       string
	basePath         string
	panelSlug        string
	environment      string
	titleField       string
	descriptionField string
	urls             urlkit.Resolver
}

func (r *repoSearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if r == nil || r.repo == nil {
		return nil, nil
	}
	filters := map[string]any{"_search": query}
	if status := strings.TrimSpace(firstQueryValue(queryParamsFromContext(ctx), "status", "filter_status", "status_filter")); status != "" {
		filters["status"] = status
	}
	records, _, err := r.repo.List(ctx, ListOptions{
		Filters: filters,
		PerPage: limit,
		Search:  query,
	})
	if err != nil {
		return nil, err
	}
	out := []SearchResult{}
	for _, rec := range records {
		id := toString(rec["id"])
		if id == "" {
			continue
		}
		resource := strings.TrimSpace(r.resource)
		if resource == "" {
			resource = strings.TrimSpace(r.panelSlug)
		}
		out = append(out, SearchResult{
			Type:        resource,
			ID:          id,
			Title:       r.resolveTitle(rec, id),
			Description: r.resolveDescription(rec),
			URL:         r.resolveURL(id),
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

func (r *repoSearchAdapter) resolveTitle(record map[string]any, fallback string) string {
	if record == nil {
		return strings.TrimSpace(fallback)
	}
	if field := strings.TrimSpace(r.titleField); field != "" {
		if title := strings.TrimSpace(toString(record[field])); title != "" {
			return title
		}
	}
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["title"]),
		toString(record["name"]),
		toString(record["label"]),
		toString(record["slug"]),
		fallback,
	))
}

func (r *repoSearchAdapter) resolveDescription(record map[string]any) string {
	if record == nil {
		return ""
	}
	if field := strings.TrimSpace(r.descriptionField); field != "" {
		return strings.TrimSpace(toString(record[field]))
	}
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["status"]),
		toString(record["summary"]),
	))
}

func (r *repoSearchAdapter) resolveURL(id string) string {
	if id == "" {
		return ""
	}
	panelSlug := strings.TrimSpace(r.panelSlug)
	if panelSlug == "" {
		return ""
	}
	params := map[string]string{"panel": panelSlug, "id": id}
	query := map[string]string{}
	if env := strings.TrimSpace(r.environment); env != "" {
		query["env"] = env
	}
	resolved := resolveURLWith(r.urls, "admin", "content.panel.id", params, query)
	if resolved != "" {
		return resolved
	}
	base := joinBasePath(r.basePath, path.Join("content", panelSlug, id))
	if env := strings.TrimSpace(r.environment); env != "" {
		separator := "?"
		if strings.Contains(base, "?") {
			separator = "&"
		}
		base = base + separator + "env=" + url.QueryEscape(env)
	}
	return base
}

func (a *Admin) registerDemoSearchAdapters(contentRepo, treeRepo Repository) {
	if a.search == nil {
		a.search = NewSearchEngine(a.authorizer)
	}
	if contentRepo != nil {
		a.search.Register("content", &repoSearchAdapter{repo: contentRepo, resource: "content", urls: a.urlManager})
	}
	if treeRepo != nil {
		a.search.Register("content_tree", &repoSearchAdapter{repo: treeRepo, resource: "content_tree_item", urls: a.urlManager})
	}
}

func (a *Admin) ctx() context.Context {
	return context.Background()
}

func (a *Admin) contentTypeOptions(ctx context.Context) ([]Option, error) {
	if a == nil || a.contentTypeSvc == nil {
		return nil, nil
	}
	types, err := a.contentTypeSvc.ContentTypes(ctx)
	if err != nil {
		return nil, err
	}
	options := make([]Option, 0, len(types))
	seen := map[string]bool{}
	for _, ct := range types {
		value := strings.TrimSpace(primitives.FirstNonEmptyRaw(ct.Slug, ct.Name, ct.ID))
		if value == "" || seen[value] {
			continue
		}
		label := strings.TrimSpace(primitives.FirstNonEmptyRaw(ct.Name, ct.Slug, value))
		options = append(options, Option{Value: value, Label: label})
		seen[value] = true
	}
	sort.SliceStable(options, func(i, j int) bool {
		return strings.ToLower(options[i].Label) < strings.ToLower(options[j].Label)
	})
	return options, nil
}
