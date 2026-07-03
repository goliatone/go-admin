package quickstart

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	cms "github.com/goliatone/go-cms"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/stretchr/testify/mock"
)

func newTranslationFamilyURLManager(t *testing.T) *urlkit.RouteManager {
	t.Helper()
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/admin",
				Routes: map[string]string{
					"dashboard":                "/",
					"translations.families.id": "/translations/families/:family_id",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}
	return manager
}

type contentEntryRouteCaptureRouter struct {
	prefix string
	paths  map[string]bool
}

func contentEntryTestInt(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}

func contentEntryTestString(t *testing.T, payload map[string]any, key string) string {
	t.Helper()
	value, ok := payload[key].(string)
	if !ok {
		t.Fatalf("expected %s to be string, got %T (%v)", key, payload[key], payload[key])
	}
	return value
}

func contentEntryTestBool(t *testing.T, payload map[string]any, key string) bool {
	t.Helper()
	value, ok := payload[key].(bool)
	if !ok {
		t.Fatalf("expected %s to be bool, got %T (%v)", key, payload[key], payload[key])
	}
	return value
}

func contentEntryTestMap(t *testing.T, value any, label string) map[string]any {
	t.Helper()
	typed, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected %s to be map[string]any, got %T (%v)", label, value, value)
	}
	return typed
}

type countingListRepository struct {
	admin.Repository
	listCalls int
}

func (r *countingListRepository) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	_, _ = ctx, opts
	r.listCalls++
	return []map[string]any{{"id": "unexpected"}}, 1, nil
}

func newContentEntryRouteCaptureRouter() *contentEntryRouteCaptureRouter {
	return &contentEntryRouteCaptureRouter{paths: map[string]bool{}}
}

func (r *contentEntryRouteCaptureRouter) fullPath(routePath string) string {
	return prefixBasePath(strings.TrimSpace(r.prefix), strings.TrimSpace(routePath))
}

func (r *contentEntryRouteCaptureRouter) record(routePath string) {
	if r == nil {
		return
	}
	r.paths[r.fullPath(routePath)] = true
}

func (r *contentEntryRouteCaptureRouter) Handle(method router.HTTPMethod, routePath string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _, _ = method, handler, middlewares, routePath
	r.record(routePath)
	return nil
}

func (r *contentEntryRouteCaptureRouter) Group(prefix string) router.Router[*fiber.App] {
	return &contentEntryRouteCaptureRouter{
		prefix: r.fullPath(prefix),
		paths:  r.paths,
	}
}

func (r *contentEntryRouteCaptureRouter) Mount(prefix string) router.Router[*fiber.App] {
	return r.Group(prefix)
}

func (r *contentEntryRouteCaptureRouter) WithGroup(groupPath string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	group := r.Group(groupPath)
	if cb != nil {
		cb(group)
	}
	return group
}

func (r *contentEntryRouteCaptureRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return r
}

func (r *contentEntryRouteCaptureRouter) Get(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record(routePath)
	return nil
}

func (r *contentEntryRouteCaptureRouter) Post(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record(routePath)
	return nil
}

func (r *contentEntryRouteCaptureRouter) Put(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = routePath, handler, mw
	return nil
}

func (r *contentEntryRouteCaptureRouter) Delete(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = routePath, handler, mw
	return nil
}

func (r *contentEntryRouteCaptureRouter) Patch(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = routePath, handler, mw
	return nil
}

func (r *contentEntryRouteCaptureRouter) Head(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = routePath, handler, mw
	return nil
}

func (r *contentEntryRouteCaptureRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _, _ = prefix, root, config
	return r
}

func (r *contentEntryRouteCaptureRouter) WebSocket(routePath string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = routePath, config, handler
	return nil
}

func (r *contentEntryRouteCaptureRouter) Routes() []router.RouteDefinition { return nil }
func (r *contentEntryRouteCaptureRouter) ValidateRoutes() []error          { return nil }
func (r *contentEntryRouteCaptureRouter) PrintRoutes()                     {}
func (r *contentEntryRouteCaptureRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

func TestRegisterContentEntryUIRoutesUsesResolvedAdminContentBasePath(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/control",
				Routes: map[string]string{
					"dashboard":     "/",
					"content.panel": "/content/:panel",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}

	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm, err := admin.New(cfg, admin.Dependencies{URLManager: manager})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	r := newContentEntryRouteCaptureRouter()
	if err := RegisterContentEntryUIRoutes(r, cfg, adm, nil); err != nil {
		t.Fatalf("RegisterContentEntryUIRoutes: %v", err)
	}

	paths := r.paths
	for _, want := range []string{
		"/control/content/:name",
		"/control/content/:name/new",
		"/control/content/:name/:id/preview",
		"/control/content/:name/:id",
		"/control/content/:name/:id/edit",
	} {
		if !paths[want] {
			t.Fatalf("expected runtime route %q registered, got %v", want, sortedRoutePaths(paths))
		}
	}
	if paths["/admin/content/:name"] {
		t.Fatalf("expected generic content routes to avoid stale cfg.BasePath prefix, got %v", sortedRoutePaths(paths))
	}
}

func TestContentEntryColumnsMarksFilterableFields(t *testing.T) {
	panel := mustBuildContentEntryTestPanel(t)

	filters := contentEntryFilters(panel)
	columns := contentEntryColumns(panel, nil, filters, nil)
	if len(columns) != 3 {
		t.Fatalf("expected 3 columns, got %d", len(columns))
	}

	byField := map[string]map[string]any{}
	for _, column := range columns {
		byField[contentEntryTestString(t, column, "field")] = column
	}

	if filterable := contentEntryTestBool(t, byField["title"], "filterable"); !filterable {
		t.Fatalf("expected title column to be filterable, got %+v", byField["title"])
	}
	if sortable := contentEntryTestBool(t, byField["title"], "sortable"); !sortable {
		t.Fatalf("expected title column to be sortable, got %+v", byField["title"])
	}
	if filterable := contentEntryTestBool(t, byField["status"], "filterable"); !filterable {
		t.Fatalf("expected status column to be filterable, got %+v", byField["status"])
	}
	if sortable := contentEntryTestBool(t, byField["status"], "sortable"); !sortable {
		t.Fatalf("expected status column to be sortable, got %+v", byField["status"])
	}
	if filterable := contentEntryTestBool(t, byField["slug"], "filterable"); filterable {
		t.Fatalf("expected slug column to be non-filterable, got %+v", byField["slug"])
	}
	if sortable := contentEntryTestBool(t, byField["slug"], "sortable"); !sortable {
		t.Fatalf("expected slug column to be sortable, got %+v", byField["slug"])
	}
}

func TestContentEntryColumnsWiresRenderersAndUISchemaHints(t *testing.T) {
	panel, err := newInMemoryPanelBuilder().
		ListFields(
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "tags", Label: "Tags", Type: "array"},
			admin.Field{Name: "metadata", Label: "Metadata", Type: "json"},
			admin.Field{Name: "blocks", Label: "Blocks", Type: "block-library-picker"},
		).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	contentType := &admin.CMSContentType{
		UISchema: map[string]any{
			"fields": map[string]any{
				"/metadata": map[string]any{
					"display_key": "name",
				},
				"blocks": map[string]any{
					"renderer": "blocks_summary",
					"renderer_options": map[string]any{
						"display_key": "title",
					},
				},
			},
		},
	}

	columns := contentEntryColumns(panel, contentType, nil, nil)
	if len(columns) != 4 {
		t.Fatalf("expected 4 columns, got %d", len(columns))
	}

	byField := map[string]map[string]any{}
	for _, column := range columns {
		byField[contentEntryTestString(t, column, "field")] = column
	}

	if got := strings.TrimSpace(anyToString(byField["tags"]["renderer"])); got != "_array" {
		t.Fatalf("expected tags renderer _array, got %q", got)
	}
	if got := strings.TrimSpace(anyToString(byField["metadata"]["renderer"])); got != "_object" {
		t.Fatalf("expected metadata renderer _object, got %q", got)
	}
	metadataOptions := contentEntryTestMap(t, byField["metadata"]["renderer_options"], "metadata renderer_options")
	if got := strings.TrimSpace(anyToString(metadataOptions["display_key"])); got != "name" {
		t.Fatalf("expected metadata display_key=name, got %q", got)
	}
	if got := strings.TrimSpace(anyToString(byField["blocks"]["renderer"])); got != "blocks_summary" {
		t.Fatalf("expected blocks renderer override, got %q", got)
	}
	blocksOptions := contentEntryTestMap(t, byField["blocks"]["renderer_options"], "blocks renderer_options")
	if got := strings.TrimSpace(anyToString(blocksOptions["display_key"])); got != "title" {
		t.Fatalf("expected blocks display_key=title, got %q", got)
	}
}

func TestDetailFieldsForRecordFormatsArraysAndObjects(t *testing.T) {
	panel, err := newInMemoryPanelBuilder().
		DetailFields(
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "tags", Label: "Tags", Type: "array"},
			admin.Field{Name: "author", Label: "Author", Type: "json"},
			admin.Field{Name: "blocks", Label: "Blocks", Type: "block-library-picker"},
		).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	contentType := &admin.CMSContentType{
		UISchema: map[string]any{
			"fields": map[string]any{
				"blocks": map[string]any{
					"display_key": "title",
				},
			},
		},
	}

	record := map[string]any{
		"title": "Homepage",
		"tags":  []any{"news", "featured"},
		"author": map[string]any{
			"id":   "author-1",
			"name": "Ada Lovelace",
		},
		"blocks": []any{
			map[string]any{"title": "Hero"},
			map[string]any{"id": "block-2"},
		},
	}

	fields := detailFieldsForRecord(panel, contentType, record)
	if len(fields) != 4 {
		t.Fatalf("expected 4 fields, got %d", len(fields))
	}

	byLabel := map[string]string{}
	for _, field := range fields {
		byLabel[strings.TrimSpace(anyToString(field["label"]))] = strings.TrimSpace(anyToString(field["value"]))
	}

	if got := byLabel["Tags"]; got != "news, featured" {
		t.Fatalf("expected formatted tags, got %q", got)
	}
	if got := byLabel["Author"]; got != "Ada Lovelace" {
		t.Fatalf("expected object label lookup, got %q", got)
	}
	if got := byLabel["Blocks"]; got != "Hero, block-2" {
		t.Fatalf("expected block list summary, got %q", got)
	}
}

func TestContentEntryColumnsAppliesConfiguredDefaultRenderers(t *testing.T) {
	panel, err := newInMemoryPanelBuilder().
		ListFields(
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "blocks", Label: "Blocks", Type: "block-library-picker"},
			admin.Field{Name: "sections", Label: "Sections", Type: "blocks"},
			admin.Field{Name: "metadata", Label: "Metadata", Type: "json"},
		).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	contentType := &admin.CMSContentType{
		UISchema: map[string]any{
			"fields": map[string]any{
				"blocks": map[string]any{
					"renderer": "blocks_summary",
				},
			},
		},
	}

	defaultRenderers := map[string]string{
		"block-library-picker": "blocks_chips",
		"blocks":               "blocks_chips",
	}
	columns := contentEntryColumns(panel, contentType, nil, defaultRenderers)

	byField := map[string]map[string]any{}
	for _, column := range columns {
		byField[contentEntryTestString(t, column, "field")] = column
	}

	if got := strings.TrimSpace(anyToString(byField["blocks"]["renderer"])); got != "blocks_summary" {
		t.Fatalf("expected ui_schema renderer override for blocks, got %q", got)
	}
	if got := strings.TrimSpace(anyToString(byField["sections"]["renderer"])); got != "blocks_chips" {
		t.Fatalf("expected sections renderer from configured defaults, got %q", got)
	}
	if got := strings.TrimSpace(anyToString(byField["metadata"]["renderer"])); got != "_object" {
		t.Fatalf("expected metadata renderer fallback _object, got %q", got)
	}
}

func TestContentEntryDefaultRendererFallsBackByFieldName(t *testing.T) {
	got := contentEntryDefaultRenderer(admin.Field{Name: "blocks", Type: ""}, map[string]string{
		"blocks": "blocks_chips",
	})
	if got != "_array" {
		t.Fatalf("expected field-name fallback _array for blocks when type is empty, got %q", got)
	}
}

func TestWithContentEntryDefaultRenderersReplacesAndNormalizes(t *testing.T) {
	input := map[string]string{
		" BLOCKS ": " blocks_chips ",
		"":         "_array",
		"json":     "",
	}
	opts := contentEntryUIOptions{
		defaultRenderers: map[string]string{
			"array": "_array",
		},
	}

	WithContentEntryDefaultRenderers(input)(&opts)

	if got := opts.defaultRenderers["blocks"]; got != "blocks_chips" {
		t.Fatalf("expected normalized blocks renderer blocks_chips, got %q", got)
	}
	if _, ok := opts.defaultRenderers["array"]; ok {
		t.Fatalf("expected replace semantics to remove previous keys")
	}
	input[" BLOCKS "] = "_array"
	if got := opts.defaultRenderers["blocks"]; got != "blocks_chips" {
		t.Fatalf("expected renderer map to be cloned, got %q", got)
	}
}

func TestWithContentEntryMergeDefaultRenderersMergesAndOverrides(t *testing.T) {
	opts := contentEntryUIOptions{}
	WithContentEntryDefaultRenderers(map[string]string{
		"array": "_array",
	})(&opts)

	WithContentEntryMergeDefaultRenderers(map[string]string{
		"blocks":  "blocks_chips",
		" ARRAY ": "_tags",
	})(&opts)

	if got := opts.defaultRenderers["blocks"]; got != "blocks_chips" {
		t.Fatalf("expected merged blocks renderer blocks_chips, got %q", got)
	}
	if got := opts.defaultRenderers["array"]; got != "_tags" {
		t.Fatalf("expected merge override for array renderer _tags, got %q", got)
	}
}

func TestWithContentEntryRecommendedDefaultsMerges(t *testing.T) {
	opts := contentEntryUIOptions{
		defaultRenderers: map[string]string{
			"json": "json_card",
		},
	}

	WithContentEntryRecommendedDefaults()(&opts)

	if got := opts.defaultRenderers["json"]; got != "json_card" {
		t.Fatalf("expected existing json renderer preserved, got %q", got)
	}
	if got := opts.defaultRenderers["blocks"]; got != "blocks_chips" {
		t.Fatalf("expected recommended blocks renderer blocks_chips, got %q", got)
	}
	if got := opts.defaultRenderers["block-library-picker"]; got != "blocks_chips" {
		t.Fatalf("expected recommended block-library-picker renderer blocks_chips, got %q", got)
	}
}

func TestContentEntryFiltersUsesSchemaAndFormFieldOptions(t *testing.T) {
	panel := mustBuildContentEntryTestPanel(t)

	filters := contentEntryFilters(panel)
	if len(filters) != 2 {
		t.Fatalf("expected 2 filters, got %d", len(filters))
	}

	byName := map[string]map[string]any{}
	for _, filter := range filters {
		byName[contentEntryTestString(t, filter, "name")] = filter
	}

	statusFilter := byName["status"]
	if statusFilter["label"] != "Status" {
		t.Fatalf("expected status label fallback, got %+v", statusFilter["label"])
	}
	if statusFilter["type"] != "select" {
		t.Fatalf("expected status type select, got %+v", statusFilter["type"])
	}
	options, ok := statusFilter["options"].([]map[string]any)
	if !ok || len(options) != 2 {
		t.Fatalf("expected status options from form field, got %+v", statusFilter["options"])
	}
	if options[0]["value"] != "draft" || options[1]["value"] != "published" {
		t.Fatalf("unexpected status options %+v", options)
	}

	titleFilter := byName["title"]
	if titleFilter["label"] != "Title contains" {
		t.Fatalf("expected explicit title label, got %+v", titleFilter["label"])
	}
	if titleFilter["type"] != "text" {
		t.Fatalf("expected title type text, got %+v", titleFilter["type"])
	}
	if _, ok := titleFilter["options"]; ok {
		t.Fatalf("expected title filter without options, got %+v", titleFilter["options"])
	}
}

func TestContentEntryFiltersFallsBackToColumns(t *testing.T) {
	panel, err := newInMemoryPanelBuilder().
		ListFields(
			admin.Field{Name: "title", Label: "Title"},
			admin.Field{Name: "status", Label: "Status"},
		).
		FormFields(
			admin.Field{Name: "title", Type: "text"},
			admin.Field{
				Name: "status",
				Type: "select",
				Options: []admin.Option{
					{Value: "draft", Label: "Draft"},
					{Value: "published", Label: "Published"},
				},
			},
		).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	filters := contentEntryFilters(panel)
	if len(filters) != 2 {
		t.Fatalf("expected 2 fallback filters, got %d", len(filters))
	}

	byName := map[string]map[string]any{}
	for _, filter := range filters {
		byName[contentEntryTestString(t, filter, "name")] = filter
	}
	if byName["title"]["type"] != "text" {
		t.Fatalf("expected title fallback type text, got %+v", byName["title"]["type"])
	}
	if byName["status"]["type"] != "select" {
		t.Fatalf("expected status fallback type select, got %+v", byName["status"]["type"])
	}
	options, ok := byName["status"]["options"].([]map[string]any)
	if !ok || len(options) != 2 {
		t.Fatalf("expected status options from form field, got %+v", byName["status"]["options"])
	}
}

func mustBuildContentEntryTestPanel(t *testing.T) *admin.Panel {
	t.Helper()
	return mustBuildInMemoryPanel(t, func(builder *admin.PanelBuilder) {
		builder.
			ListFields(
				admin.Field{Name: "title", Label: "Title"},
				admin.Field{Name: "status", Label: "Status"},
				admin.Field{Name: "slug", Label: "Slug"},
			).
			FormFields(
				admin.Field{Name: "title", Type: "text"},
				admin.Field{
					Name: "status",
					Type: "select",
					Options: []admin.Option{
						{Value: "draft", Label: "Draft"},
						{Value: "published", Label: "Published"},
					},
				},
			).
			Filters(
				admin.Filter{Name: "status", Type: "select"},
				admin.Filter{Name: "title", Type: "text", Label: "Title contains"},
			)
	})
}

func TestResolveContentEntryPreviewPathUsesGenericSlugFallback(t *testing.T) {
	tests := []struct {
		name      string
		panelName string
		record    map[string]any
		expected  string
	}{
		{
			name:      "pages path",
			panelName: "pages",
			record:    map[string]any{"path": "about"},
			expected:  "/about",
		},
		{
			name:      "slug fallback disabled by default",
			panelName: "pages",
			record:    map[string]any{"slug": "home"},
			expected:  "",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := admin.ResolveContentPreviewPath(tc.record)
			if got != tc.expected {
				t.Fatalf("expected %q got %q", tc.expected, got)
			}
		})
	}
}

func TestResolveContentPreviewPathAllowsSlugFallbackWhenRequested(t *testing.T) {
	got := admin.ResolveContentPreviewPathWithOptions(map[string]any{"slug": "home"}, admin.ContentPreviewPathOptions{
		AllowSlugFallback: true,
	})
	if got != "/home" {
		t.Fatalf("expected slug fallback /home, got %q", got)
	}
}

func TestBuildSitePreviewURLAppendsTokenQueryParam(t *testing.T) {
	got := admin.BuildSitePreviewURL("/about?lang=en", "token-123")
	if got != "/about?lang=en&preview_token=token-123" {
		t.Fatalf("expected preview token appended, got %q", got)
	}
}

func TestCanonicalPanelRouteBindingsResolvesCorePanels(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	adm := fixture.Admin

	mustRegisterPanel := func(name string) {
		t.Helper()
		mustRegisterInMemoryPanel(t, adm, name, nil)
	}

	mustRegisterPanel("users")
	mustRegisterPanel("roles")
	mustRegisterPanel("profile")
	mustRegisterPanel("user-profiles")

	bindings := canonicalPanelRouteBindings(adm.URLs(), adm.Registry().Panels())
	got := map[string]string{}
	for _, binding := range bindings {
		got[binding.Panel] = binding.Path
	}

	if got["users"] != "/admin/users" {
		t.Fatalf("expected users canonical path /admin/users, got %q", got["users"])
	}
	if got["roles"] != "/admin/roles" {
		t.Fatalf("expected roles canonical path /admin/roles, got %q", got["roles"])
	}
	if got["profile"] != "/admin/profile" {
		t.Fatalf("expected profile canonical path /admin/profile, got %q", got["profile"])
	}
	if got["user-profiles"] != "/admin/user-profiles" {
		t.Fatalf("expected user-profiles canonical path /admin/user-profiles, got %q", got["user-profiles"])
	}
}

func TestCanonicalPanelRouteBindingsSkipsPanelsWithoutNamedAdminRoute(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	adm := fixture.Admin
	if _, err := adm.RegisterPanel("esign_documents", newInMemoryPanelBuilder()); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	bindings := canonicalPanelRouteBindings(adm.URLs(), adm.Registry().Panels())
	for _, binding := range bindings {
		if binding.Panel == "esign_documents" {
			t.Fatalf("expected esign_documents to be excluded from canonical bindings, got %+v", binding)
		}
	}
}

func TestCanonicalPanelRouteBindingsSkipsPanelsWithCustomRouteOwners(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	adm := fixture.Admin
	builder := newInMemoryPanelBuilder().
		WithUIRouteMode(admin.PanelUIRouteModeCustom)
	if _, err := adm.RegisterPanel("preferences", builder); err != nil {
		t.Fatalf("register preferences panel: %v", err)
	}
	if _, err := adm.RegisterPanel("users", newInMemoryPanelBuilder()); err != nil {
		t.Fatalf("register users panel: %v", err)
	}

	bindings := canonicalPanelRouteBindings(adm.URLs(), adm.Registry().Panels())
	foundUsers := false
	for _, binding := range bindings {
		if binding.Panel == "preferences" {
			t.Fatalf("expected preferences to be excluded from canonical bindings, got %+v", binding)
		}
		if binding.Panel == "users" {
			foundUsers = true
		}
	}
	if !foundUsers {
		t.Fatalf("expected non-custom panel users to remain in canonical bindings")
	}
}

func TestCanonicalPanelRouteBindingsIncludesEntryModes(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	adm := fixture.Admin
	if _, err := adm.RegisterPanel("users", newInMemoryPanelBuilder()); err != nil {
		t.Fatalf("register users panel: %v", err)
	}
	if _, err := adm.RegisterPanel("profile", newInMemoryPanelBuilder().
		WithEntryMode(admin.PanelEntryModeDetailCurrentUser)); err != nil {
		t.Fatalf("register profile panel: %v", err)
	}

	bindings := canonicalPanelRouteBindings(adm.URLs(), adm.Registry().Panels())
	modes := map[string]admin.PanelEntryMode{}
	for _, binding := range bindings {
		modes[binding.Panel] = binding.EntryMode
	}
	if got := modes["users"]; got != admin.PanelEntryModeList {
		t.Fatalf("expected users entry mode %q, got %q", admin.PanelEntryModeList, got)
	}
	if got := modes["profile"]; got != admin.PanelEntryModeDetailCurrentUser {
		t.Fatalf("expected profile entry mode %q, got %q", admin.PanelEntryModeDetailCurrentUser, got)
	}
}

func TestCanonicalPanelNameStripsEnvironmentSuffix(t *testing.T) {
	if got := canonicalPanelName("users@staging"); got != "users" {
		t.Fatalf("expected canonical panel users, got %q", got)
	}
	if got := canonicalPanelName(" profile "); got != "profile" {
		t.Fatalf("expected trimmed panel profile, got %q", got)
	}
}

func TestEntryForPanelUsesCurrentUserDetailEntryMode(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	repo := admin.NewMemoryRepository()
	record, err := repo.Create(context.Background(), map[string]any{
		"display_name": "Jane Doe",
	})
	if err != nil {
		t.Fatalf("seed profile: %v", err)
	}
	if _, err := adm.RegisterPanel("profile", (&admin.PanelBuilder{}).
		WithRepository(repo).
		WithEntryMode(admin.PanelEntryModeDetailCurrentUser).
		DetailFields(
			admin.Field{Name: "display_name", Label: "Name", Type: "text"},
		)); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	h := &contentEntryHandlers{
		admin:          adm,
		cfg:            cfg,
		detailTemplate: "resources/content/detail",
		templateExists: func(name string) bool {
			return name == "resources/content/detail"
		},
	}
	ctx := router.NewMockContext()
	ctx.HeadersM["X-User-ID"] = strings.TrimSpace(anyToString(record["id"]))
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/detail", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		item, ok := viewCtx["resource_item"].(map[string]any)
		if !ok {
			return false
		}
		return strings.TrimSpace(anyToString(item["id"])) == strings.TrimSpace(anyToString(record["id"])) &&
			strings.TrimSpace(anyToString(item["display_name"])) == "Jane Doe" &&
			strings.TrimSpace(anyToString(viewCtx["panel_name"])) == "profile"
	})).Return(nil).Once()

	if err := h.entryForPanel(ctx, "profile", admin.PanelEntryModeDetailCurrentUser); err != nil {
		t.Fatalf("entryForPanel: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestEntryForPanelRejectsCurrentUserModeWhenUserIDMissing(t *testing.T) {
	h := &contentEntryHandlers{cfg: admin.Config{DefaultLocale: "en"}}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())

	if err := h.entryForPanel(ctx, "profile", admin.PanelEntryModeDetailCurrentUser); !errors.Is(err, admin.ErrForbidden) {
		t.Fatalf("expected ErrForbidden when user id missing, got %v", err)
	}
}

func TestHydrateDetailRelationLinksBuildsPanelLinks(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	builder := newInMemoryPanelBuilder()
	if _, err := adm.RegisterPanel("esign_documents", builder); err != nil {
		t.Fatalf("register documents panel: %v", err)
	}
	if _, err := adm.RegisterPanel("esign_agreements", builder); err != nil {
		t.Fatalf("register agreements panel: %v", err)
	}
	handlers := &contentEntryHandlers{
		admin: adm,
		cfg:   cfg,
	}

	record := map[string]any{
		"id":          "agreement-1",
		"document_id": "doc-1",
	}
	hydrated := handlers.hydrateDetailRelationLinks("esign_agreements", record, "")

	if got := strings.TrimSpace(anyToString(hydrated["document_url"])); got != "/admin/content/esign_documents/doc-1" {
		t.Fatalf("expected hydrated document_url, got %q", got)
	}
	links, ok := hydrated["links"].(map[string]string)
	if !ok {
		t.Fatalf("expected links map[string]string, got %T", hydrated["links"])
	}
	if links["document"] != "/admin/content/esign_documents/doc-1" {
		t.Fatalf("expected relation link for document, got %q", links["document"])
	}
	if links["document_id"] != "/admin/content/esign_documents/doc-1" {
		t.Fatalf("expected relation link for document_id, got %q", links["document_id"])
	}
}

func TestHydrateDetailRelationLinksAddsChannelQuery(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	builder := newInMemoryPanelBuilder()
	if _, err := adm.RegisterPanel("esign_documents@staging", builder); err != nil {
		t.Fatalf("register staging documents panel: %v", err)
	}
	if _, err := adm.RegisterPanel("esign_agreements@staging", builder); err != nil {
		t.Fatalf("register staging agreements panel: %v", err)
	}
	handlers := &contentEntryHandlers{
		admin: adm,
		cfg:   cfg,
	}

	record := map[string]any{
		"id":          "agreement-1",
		"document_id": "doc-1",
	}
	hydrated := handlers.hydrateDetailRelationLinks("esign_agreements@staging", record, "staging")
	got := strings.TrimSpace(anyToString(hydrated["document_url"]))
	if got != "/admin/content/esign_documents/doc-1?channel=staging" {
		t.Fatalf("expected channel-aware document_url, got %q", got)
	}
}

func TestContentEntryCreateRedirectTargetDefaultsToEdit(t *testing.T) {
	routes := newContentEntryRoutes("/admin", "pages", "")
	got := contentEntryCreateRedirectTarget("pages", "42", routes)
	if got != "/admin/content/pages/42/edit" {
		t.Fatalf("expected edit redirect, got %q", got)
	}
}

func TestContentEntryCreateRedirectTargetUsesDetailForESignDocuments(t *testing.T) {
	routes := newContentEntryRoutes("/admin", "esign_documents", "staging")
	got := contentEntryCreateRedirectTarget("esign_documents", "abc-123", routes)
	if got != "/admin/content/esign_documents/abc-123?channel=staging&created=1" {
		t.Fatalf("expected detail redirect with success marker, got %q", got)
	}
}

func TestContentEntryCreateRedirectTargetUsesEditWithMarkerForESignAgreements(t *testing.T) {
	routes := newContentEntryRoutes("/admin", "esign_agreements", "staging")
	got := contentEntryCreateRedirectTarget("esign_agreements", "abc-123", routes)
	if got != "/admin/content/esign_agreements/abc-123/edit?channel=staging&created=1" {
		t.Fatalf("expected edit redirect with success marker, got %q", got)
	}
}

func TestContentEntryCreateRedirectTargetFallsBackToIndexWhenMissingID(t *testing.T) {
	routes := newContentEntryRoutes("/admin", "esign_documents", "")
	got := contentEntryCreateRedirectTarget("esign_documents", "", routes)
	if got != "/admin/content/esign_documents" {
		t.Fatalf("expected index redirect when id missing, got %q", got)
	}
}

func TestMediaContentEntryViewContextUsesSharedMediaEndpoints(t *testing.T) {
	ctx := mediaContentEntryViewContext("/admin", "grid")

	expected := map[string]string{
		"media_view":                  "grid",
		"media_gallery_path":          "/admin/content/media?view=grid",
		"media_list_path":             "/admin/content/media?view=list",
		"media_library_path":          "/admin/api/media/assets",
		"media_item_path":             "/admin/api/media/assets/:id",
		"media_resolve_path":          "/admin/api/media/resolve",
		"media_upload_path":           "/admin/api/media/upload",
		"media_presign_path":          "/admin/api/media/presign",
		"media_confirm_path":          "/admin/api/media/confirm",
		"media_capabilities_path":     "/admin/api/media/capabilities",
		"media_asset_url_template":    "/admin/api/media/delivery/:id/asset",
		"media_stream_url_template":   "/admin/api/media/delivery/:id/stream",
		"media_poster_url_template":   "/admin/api/media/delivery/:id/poster",
		"media_download_url_template": "/admin/api/media/delivery/:id/download",
		"media_default_value_mode":    "url",
	}
	for key, want := range expected {
		if got := anyToString(ctx[key]); got != want {
			t.Fatalf("expected %s to be %q, got %q", key, want, got)
		}
	}
}

func TestListForPanelInjectsExportConfigForPanelTemplates(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	for _, panelName := range []string{"users", "media"} {
		builder := newInMemoryPanelBuilder().
			ListFields(admin.Field{Name: "title", Label: "Title", Type: "text"})
		if _, err := adm.RegisterPanel(panelName, builder); err != nil {
			t.Fatalf("register panel %s: %v", panelName, err)
		}
	}

	handler := &contentEntryHandlers{
		admin:        adm,
		cfg:          cfg,
		listTemplate: "resources/content/list",
		templateExists: func(name string) bool {
			return name == "resources/users/list" || name == "resources/media/list"
		},
	}

	tests := []struct {
		panel    string
		template string
	}{
		{panel: "users", template: "resources/users/list"},
		{panel: "media", template: "resources/media/list"},
	}

	for _, tc := range tests {
		t.Run(tc.panel, func(t *testing.T) {
			ctx := router.NewMockContext()
			ctx.On("Context").Return(context.Background())
			ctx.On("Render", tc.template, mock.MatchedBy(func(arg any) bool {
				viewCtx, ok := arg.(router.ViewContext)
				if !ok {
					return false
				}
				exportCfg, ok := viewCtx["export_config"].(map[string]any)
				if !ok {
					return false
				}
				endpoint := strings.TrimSpace(anyToString(exportCfg["endpoint"]))
				definition := strings.TrimSpace(anyToString(exportCfg["definition"]))
				dataGridCfg, ok := viewCtx["datagrid_config"].(map[string]any)
				if !ok {
					return false
				}
				tableID := strings.TrimSpace(anyToString(dataGridCfg["table_id"]))
				apiEndpoint := strings.TrimSpace(anyToString(dataGridCfg["api_endpoint"]))
				actionBase := strings.TrimSpace(anyToString(dataGridCfg["action_base"]))
				columnStorage := strings.TrimSpace(anyToString(dataGridCfg["column_storage_key"]))

				return endpoint == "/admin/exports" &&
					definition == tc.panel &&
					tableID == "content-"+tc.panel &&
					apiEndpoint == "/admin/api/panels/"+tc.panel &&
					actionBase == "/admin/content/"+tc.panel &&
					columnStorage == "content_"+tc.panel+"_datatable_columns"
			})).Return(nil).Once()

			if err := handler.listForPanel(ctx, tc.panel); err != nil {
				t.Fatalf("listForPanel(%s): %v", tc.panel, err)
			}
			ctx.AssertExpectations(t)
		})
	}
}

func TestListForPanelIncludesBulkActionToolbarContext(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	if _, err := adm.RegisterPanel("pages", newInMemoryPanelBuilder().
		WithActionDefaults(admin.PanelActionDefaultsModeCRUD).
		ListFields(admin.Field{Name: "title", Label: "Title", Type: "text"}).
		Permissions(admin.PanelPermissions{
			Delete: "admin.pages.delete",
		})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handler := &contentEntryHandlers{
		admin:        adm,
		cfg:          cfg,
		listTemplate: "resources/content/list",
		templateExists: func(name string) bool {
			return name == "resources/content/list"
		},
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/list", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		primary, ok := viewCtx["bulk_actions_primary"].([]admin.Action)
		if !ok || len(primary) != 1 {
			return false
		}
		if strings.TrimSpace(primary[0].Name) != "delete" {
			return false
		}
		if strings.TrimSpace(primary[0].Permission) != "admin.pages.delete" {
			return false
		}
		return strings.TrimSpace(anyToString(viewCtx["bulk_base"])) == "/admin/api/panels/pages/bulk"
	})).Return(nil).Once()

	if err := handler.listForPanel(ctx, "pages"); err != nil {
		t.Fatalf("listForPanel(pages): %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestListForPanelRendersDataGridShellWithoutPrefetchingRows(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	repo := &countingListRepository{Repository: admin.NewMemoryRepository()}
	if _, err := adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		ListFields(admin.Field{Name: "title", Label: "Title", Type: "text"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handler := &contentEntryHandlers{
		admin:        adm,
		cfg:          cfg,
		listTemplate: "resources/content/list",
		templateExists: func(name string) bool {
			return name == "resources/content/list"
		},
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/list", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		items, ok := viewCtx["items"].([]map[string]any)
		if ok && len(items) != 0 {
			return false
		}
		return contentEntryTestInt(viewCtx["total"]) == 0 &&
			viewCtx["render_datagrid_shell"] == true &&
			strings.TrimSpace(anyToString(viewCtx["list_api"])) == "/admin/api/panels/pages"
	})).Return(nil).Once()

	if err := handler.listForPanel(ctx, "pages"); err != nil {
		t.Fatalf("listForPanel(pages): %v", err)
	}
	if repo.listCalls != 0 {
		t.Fatalf("expected list page render to skip row prefetch, got %d list calls", repo.listCalls)
	}
	ctx.AssertExpectations(t)
}

func TestListForPanelEnablesTranslationDataGridUXWhenConfigured(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	if _, err := adm.RegisterPanel("pages", newInMemoryPanelBuilder().
		ListFields(
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "family_id", Label: "Translation Group", Type: "text", Hidden: true},
		).
		Actions(admin.Action{Name: admin.CreateTranslationKey, Label: "Add Translation"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handler := newContentEntryHandlers(adm, cfg, nil, contentEntryUIOptions{
		listTemplate:   "resources/content/list",
		templateExists: func(name string) bool { return name == "resources/content/list" },
		translationUX:  true,
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/list", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		dataGridCfg, ok := viewCtx["datagrid_config"].(map[string]any)
		if !ok {
			return false
		}
		return dataGridCfg["translation_ux_enabled"] == true &&
			dataGridCfg["enable_grouped_mode"] == true &&
			strings.TrimSpace(anyToString(dataGridCfg["default_view_mode"])) == "grouped" &&
			strings.TrimSpace(anyToString(dataGridCfg["group_by_field"])) == "family_id"
	})).Return(nil).Once()

	if err := handler.listForPanel(ctx, "pages"); err != nil {
		t.Fatalf("listForPanel(pages): %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestListForPanelIncludesDataGridPersistenceConfigWhenConfigured(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	if _, err := adm.RegisterPanel("pages", newInMemoryPanelBuilder().
		ListFields(admin.Field{Name: "title", Label: "Title", Type: "text"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	enableStateToken := true
	handler := newContentEntryHandlers(adm, cfg, nil, contentEntryUIOptions{
		listTemplate:   "resources/content/list",
		templateExists: func(name string) bool { return name == "resources/content/list" },
		dataGridStateStore: PanelDataGridStateStoreOptions{
			Mode:             "preferences",
			SyncDebounceMS:   1200,
			HydrateTimeoutMS: 1500,
			MaxShareEntries:  30,
		},
		dataGridURLState: PanelDataGridURLStateOptions{
			MaxURLLength:     1700,
			MaxFiltersLength: 500,
			EnableStateToken: &enableStateToken,
		},
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/list", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		dataGridCfg, ok := viewCtx["datagrid_config"].(map[string]any)
		if !ok {
			return false
		}
		stateStore, ok := dataGridCfg["state_store"].(map[string]any)
		if !ok {
			return false
		}
		urlState, ok := dataGridCfg["url_state"].(map[string]any)
		if !ok {
			return false
		}
		toInt := func(value any) int {
			switch typed := value.(type) {
			case int:
				return typed
			case int64:
				return int(typed)
			case float64:
				return int(typed)
			default:
				return 0
			}
		}
		toBool := func(value any) bool {
			typed, ok := value.(bool)
			return ok && typed
		}
		return strings.TrimSpace(anyToString(stateStore["mode"])) == "preferences" &&
			strings.TrimSpace(anyToString(stateStore["resource"])) == "pages" &&
			strings.TrimSpace(anyToString(dataGridCfg["preferences_endpoint"])) == "/admin/api/panels/preferences" &&
			strings.TrimSpace(anyToString(viewCtx["preferences_api_path"])) == "/admin/api/panels/preferences" &&
			toInt(stateStore["sync_debounce_ms"]) == 1200 &&
			toInt(stateStore["hydrate_timeout_ms"]) == 1500 &&
			toInt(stateStore["max_share_entries"]) == 30 &&
			toInt(urlState["max_url_length"]) == 1700 &&
			toInt(urlState["max_filters_length"]) == 500 &&
			toBool(urlState["enable_state_token"]) == true
	})).Return(nil).Once()

	if err := handler.listForPanel(ctx, "pages"); err != nil {
		t.Fatalf("listForPanel(pages): %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestContentEntryListStateStoreConfigDefaultsResourceForHydrateTimeoutOnly(t *testing.T) {
	handler := &contentEntryHandlers{
		dataGridStateStore: PanelDataGridStateStoreOptions{
			HydrateTimeoutMS: 1500,
		},
	}

	cfg := handler.listStateStoreConfig("pages")

	if cfg.Resource != "pages" {
		t.Fatalf("expected resource pages, got %q", cfg.Resource)
	}
	if cfg.HydrateTimeoutMS != 1500 {
		t.Fatalf("expected hydrate timeout 1500, got %d", cfg.HydrateTimeoutMS)
	}
}

func TestListForPanelOmitsCreateRoutesWhenPanelHasNoRenderableFormSchema(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	if _, err := adm.RegisterPanel("translations", newInMemoryPanelBuilder().
		ListFields(admin.Field{Name: "status", Label: "Status", Type: "text"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handler := &contentEntryHandlers{
		admin:        adm,
		cfg:          cfg,
		listTemplate: "resources/content/list",
		templateExists: func(name string) bool {
			return name == "resources/content/list"
		},
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/list", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		switch routes := viewCtx["routes"].(type) {
		case map[string]string:
			return strings.TrimSpace(routes["new"]) == "" &&
				strings.TrimSpace(routes["create"]) == ""
		case map[string]any:
			return strings.TrimSpace(anyToString(routes["new"])) == "" &&
				strings.TrimSpace(anyToString(routes["create"])) == ""
		default:
			return false
		}
	})).Return(nil).Once()

	if err := handler.listForPanel(ctx, "translations"); err != nil {
		t.Fatalf("listForPanel(translations): %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestNewForPanelReturnsNotFoundWhenPanelHasNoRenderableFormSchema(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	if _, err := adm.RegisterPanel("translations", newInMemoryPanelBuilder().
		ListFields(admin.Field{Name: "status", Label: "Status", Type: "text"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	h := &contentEntryHandlers{admin: adm, cfg: cfg}
	if err := h.newForPanel(ctx, "translations"); !errors.Is(err, admin.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestEditForPanelUsesClickTimePreviewRefreshURL(t *testing.T) {
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	repo := admin.NewMemoryRepository()
	created, err := repo.Create(context.Background(), map[string]any{
		"title": "About",
		"path":  "/about?preview_token=stale-token",
	})
	if err != nil {
		t.Fatalf("seed page: %v", err)
	}
	if _, registerErr := adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		FormFields(admin.Field{Name: "title", Type: "text"})); registerErr != nil {
		t.Fatalf("register panel: %v", registerErr)
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = anyToString(created["id"])
	ctx.QueriesM["locale"] = "es"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		previewURL := strings.TrimSpace(anyToString(viewCtx["preview_url"]))
		if strings.Contains(previewURL, "preview_token=") {
			return false
		}
		return previewURL == "/admin/content/pages/"+anyToString(created["id"])+"/preview?locale=es"
	})).Return(nil).Once()

	handler := &contentEntryHandlers{
		admin:        adm,
		cfg:          cfg,
		formTemplate: "resources/content/form",
		formRenderer: validator,
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}
	if err := handler.editForPanel(ctx, "pages"); err != nil {
		t.Fatalf("edit page: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestPreviewActionURLForRecordUsesResolvedAdminBasePath(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/control",
				Routes: map[string]string{
					"dashboard":     "/",
					"content.panel": "/content/:panel",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		PreviewSecret: "quickstart-preview-test-secret",
	}
	adm, err := admin.New(cfg, admin.Dependencies{URLManager: manager})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	handler := &contentEntryHandlers{admin: adm, cfg: cfg}
	ctx := router.NewMockContext()

	got := handler.previewActionURLForRecord(ctx, "pages", "42", map[string]any{
		"path": "/about",
	}, nil)
	if got != "/control/content/pages/42/preview" {
		t.Fatalf("expected preview action to use resolved admin base path, got %q", got)
	}
	if base := resolveAdminContentEntryBasePath(adm.URLs(), cfg.BasePath); base != "/control/content" {
		t.Fatalf("expected content entry base /control/content, got %q", base)
	}
}

func TestPreviewActionURLForRecordUsesResolvedContentPanelRouteBase(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/control",
				Routes: map[string]string{
					"dashboard":     "/",
					"content.panel": "/cms/:panel",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		PreviewSecret: "quickstart-preview-test-secret",
	}
	adm, err := admin.New(cfg, admin.Dependencies{URLManager: manager})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	handler := &contentEntryHandlers{admin: adm, cfg: cfg}
	ctx := router.NewMockContext()
	ctx.QueriesM["channel"] = "staging"

	got := handler.previewActionURLForRecord(ctx, "pages", "42", map[string]any{
		"path": "/about",
	}, nil)
	if got != "/control/cms/pages/42/preview?channel=staging" {
		t.Fatalf("expected preview action to use content.panel route base, got %q", got)
	}
}

func TestPreviewActionURLForRecordUsesRegisteredContentPanelRouteWhenExplicitPreviewRouteDiffers(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/control",
				Routes: map[string]string{
					"dashboard":             "/",
					"content.panel":         "/cms/:panel",
					"content.panel.preview": "/cms/:panel/:id/fresh-preview",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		PreviewSecret: "quickstart-preview-test-secret",
	}
	adm, err := admin.New(cfg, admin.Dependencies{URLManager: manager})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	handler := &contentEntryHandlers{admin: adm, cfg: cfg}
	ctx := router.NewMockContext()

	got := handler.previewActionURLForRecord(ctx, "pages", "42", map[string]any{
		"path": "/about",
	}, nil)
	if got != "/control/cms/pages/42/preview" {
		t.Fatalf("expected preview action to use registered content.panel route base, got %q", got)
	}
}

func TestPreviewActionURLForRecordHidesDisallowedAbsolutePreviewURL(t *testing.T) {
	cfg := admin.Config{
		BasePath:               "/admin",
		DefaultLocale:          "en",
		PreviewSecret:          "quickstart-preview-test-secret",
		PreviewURLAllowedHosts: []string{"preview.example.test"},
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	handler := &contentEntryHandlers{admin: adm, cfg: cfg}
	ctx := router.NewMockContext()

	got := handler.previewActionURLForRecord(ctx, "pages", "42", map[string]any{
		"preview_url": "https://evil.example.test/about",
	}, nil)
	if got != "" {
		t.Fatalf("expected disallowed absolute preview URL to hide preview action, got %q", got)
	}
}

func TestPreviewForPanelRedirectsWithFreshRouteAwareToken(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	repo := admin.NewMemoryRepository()
	created, err := repo.Create(context.Background(), map[string]any{
		"title": "About",
		"path":  "/about?lang=en&preview_token=stale-token#draft",
	})
	if err != nil {
		t.Fatalf("seed page: %v", err)
	}
	if _, registerErr := adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		FormFields(admin.Field{Name: "title", Type: "text"})); registerErr != nil {
		t.Fatalf("register panel: %v", registerErr)
	}
	handler := &contentEntryHandlers{admin: adm, cfg: cfg}

	redirectOnce := func() string {
		t.Helper()
		var redirected string
		ctx := router.NewMockContext()
		ctx.ParamsM["id"] = anyToString(created["id"])
		ctx.On("Context").Return(context.Background())
		ctx.On("Redirect", mock.MatchedBy(func(target string) bool {
			redirected = strings.TrimSpace(target)
			return true
		})).Return(nil).Once()

		if previewErr := handler.previewForPanel(ctx, "pages"); previewErr != nil {
			t.Fatalf("preview redirect: %v", previewErr)
		}
		ctx.AssertExpectations(t)
		if redirected == "" {
			t.Fatalf("expected redirect target")
		}
		return redirected
	}

	first := redirectOnce()
	if !strings.HasPrefix(first, "/about?lang=en&preview_token=") || !strings.HasSuffix(first, "#draft") {
		t.Fatalf("expected route-aware preview redirect with replacement token, got %q", first)
	}
	if strings.Contains(first, "stale-token") {
		t.Fatalf("expected stale token to be replaced, got %q", first)
	}
	firstParsed, err := url.Parse(first)
	if err != nil {
		t.Fatalf("parse first redirect: %v", err)
	}
	firstToken := strings.TrimSpace(firstParsed.Query().Get("preview_token"))
	if firstToken == "" {
		t.Fatalf("expected preview token in %q", first)
	}
	decoded, err := adm.Preview().Validate(firstToken)
	if err != nil {
		t.Fatalf("validate first preview token: %v", err)
	}
	if decoded.EntityType != "pages" || decoded.ContentID != anyToString(created["id"]) {
		t.Fatalf("unexpected token scope: %+v", decoded)
	}

	time.Sleep(1100 * time.Millisecond)
	second := redirectOnce()
	secondParsed, err := url.Parse(second)
	if err != nil {
		t.Fatalf("parse second redirect: %v", err)
	}
	secondToken := strings.TrimSpace(secondParsed.Query().Get("preview_token"))
	if secondToken == "" {
		t.Fatalf("expected second preview token in %q", second)
	}
	if firstToken == secondToken {
		t.Fatalf("expected fresh token per preview request, got same token %q", firstToken)
	}
}

func TestRenderFormIncludesCreateActionInViewContext(t *testing.T) {
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}
	panel, err := newInMemoryPanelBuilder().
		FormFields(admin.Field{Name: "title", Type: "text", Required: true}).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		if strings.TrimSpace(anyToString(viewCtx["form_action"])) != "/admin/content/posts" {
			return false
		}
		routes, ok := viewCtx["routes"].(map[string]string)
		if !ok {
			return false
		}
		return routes["create"] == "/admin/content/posts"
	})).Return(nil).Once()

	handler := &contentEntryHandlers{
		cfg: admin.Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		},
		formTemplate: "resources/content/form",
		formRenderer: validator,
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}
	err = handler.renderForm(
		ctx,
		"posts",
		panel,
		nil,
		admin.AdminContext{Context: context.Background()},
		map[string]any{},
		nil,
		false,
		"",
	)
	if err != nil {
		t.Fatalf("render form: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestRenderFormRolesPanelIncludesPermissionMatrixHTML(t *testing.T) {
	panel, err := newInMemoryPanelBuilder().
		FormSchema(map[string]any{
			"type": "object",
			"properties": map[string]any{
				"permissions": map[string]any{
					"type": "string",
					"x-formgen": map[string]any{
						"widget":         "permission-matrix",
						"component.name": "permission-matrix",
						"component.config": map[string]any{
							"resources": []string{"admin.users", "admin.debug"},
							"actions":   []string{"view", "edit"},
						},
					},
				},
				"permissions_debug": map[string]any{
					"type": "string",
					"x-formgen": map[string]any{
						"widget":         "permission-matrix",
						"component.name": "permission-matrix",
						"component.config": map[string]any{
							"showExtra": false,
							"resources": []string{"admin.debug"},
							"actions":   []string{"repl"},
						},
					},
				},
				"permissions_translation": map[string]any{
					"type": "string",
					"x-formgen": map[string]any{
						"widget":         "permission-matrix",
						"component.name": "permission-matrix",
						"component.config": map[string]any{
							"showExtra": false,
							"resources": []string{"admin.translations"},
							"actions":   []string{"view", "manage", "import.apply"},
						},
					},
				},
			},
		}).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.LocalsMock[csrfmw.DefaultTemplateHelpersKey] = map[string]any{
		"csrf_field": `<input type="hidden" name="_token" value="csrf-token">`,
	}
	ctx.On("Render", "resources/content/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		html := strings.TrimSpace(anyToString(viewCtx["form_html"]))
		return strings.Contains(html, `class="permission-matrix"`) &&
			strings.Contains(html, `name="permissions_debug"`) &&
			strings.Contains(html, `name="permissions_translation"`) &&
			strings.Contains(html, `name="_token" value="csrf-token"`) &&
			strings.Contains(html, `permission_matrix.js`)
	})).Return(nil).Once()

	handler := &contentEntryHandlers{
		cfg:          cfg,
		formTemplate: "resources/content/form",
		formRenderer: validator,
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}
	err = handler.renderForm(
		ctx,
		"roles",
		panel,
		nil,
		admin.AdminContext{Context: context.Background()},
		map[string]any{
			"name":              "Admins",
			"permissions":       []string{"admin.users.view", "admin.debug.repl"},
			"permissions_debug": []string{"admin.debug.repl"},
			"permissions_translation": []string{
				"admin.translations.manage",
			},
		},
		nil,
		false,
		"",
	)
	if err != nil {
		t.Fatalf("render form: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestRenderFormIncludesResourceItemForEdit(t *testing.T) {
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}
	panel, err := newInMemoryPanelBuilder().
		FormFields(admin.Field{Name: "title", Type: "text", Required: true}).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	resourceItem := map[string]any{
		"id":                       "page-123",
		"family_id":                "tg-page-123",
		"requested_locale":         "fr",
		"resolved_locale":          "en",
		"missing_requested_locale": true,
		"fallback_used":            true,
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = "page-123"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		if got := strings.TrimSpace(anyToString(viewCtx["panel_name"])); got != "pages" {
			return false
		}
		edit, ok := viewCtx["is_edit"].(bool)
		if !ok || !edit {
			return false
		}
		item, ok := viewCtx["resource_item"].(map[string]any)
		if !ok {
			return false
		}
		return strings.TrimSpace(anyToString(item["family_id"])) == "tg-page-123" &&
			strings.TrimSpace(anyToString(item["requested_locale"])) == "fr" &&
			strings.TrimSpace(anyToString(item["resolved_locale"])) == "en" &&
			item["missing_requested_locale"] == true &&
			item["fallback_used"] == true
	})).Return(nil).Once()

	handler := &contentEntryHandlers{
		cfg: admin.Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		},
		formTemplate: "resources/content/form",
		formRenderer: validator,
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}

	err = handler.renderForm(
		ctx,
		"pages",
		panel,
		nil,
		admin.AdminContext{Context: context.Background()},
		map[string]any{"title": "Fallback page"},
		resourceItem,
		true,
		"",
	)
	if err != nil {
		t.Fatalf("render form: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestRenderFormIncludesEntryNavigationViewModel(t *testing.T) {
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}
	panel, err := newInMemoryPanelBuilder().
		FormFields(admin.Field{Name: "title", Type: "text", Required: true}).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}
	contentType := &admin.CMSContentType{
		Slug: "pages",
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":                 true,
				"eligible_locations":      []string{"site.main", "site.footer"},
				"default_locations":       []string{"site.main"},
				"default_visible":         true,
				"allow_instance_override": true,
			},
		},
	}
	resourceItem := map[string]any{
		"id": "_page_123",
		"_navigation": map[string]any{
			"site.footer": "show",
		},
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = "_page_123"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		model, ok := viewCtx["entry_navigation"].(map[string]any)
		if !ok {
			return false
		}
		eligible, ok := model["eligible_locations"].([]string)
		if !ok {
			return false
		}
		return model["visible"] == true &&
			model["editable"] == true &&
			strings.TrimSpace(anyToString(model["content_type"])) == "pages" &&
			strings.TrimSpace(anyToString(model["record_id"])) == "_page_123" &&
			strings.Contains(strings.TrimSpace(anyToString(model["endpoint"])), "/admin/api/content/pages/_page_123/navigation") &&
			len(eligible) == 2
	})).Return(nil).Once()

	handler := &contentEntryHandlers{
		cfg: admin.Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		},
		formTemplate: "resources/content/form",
		formRenderer: validator,
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}

	err = handler.renderForm(
		ctx,
		"pages",
		panel,
		contentType,
		admin.AdminContext{Context: context.Background()},
		map[string]any{"title": "Page"},
		resourceItem,
		true,
		"",
	)
	if err != nil {
		t.Fatalf("render form: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestRenderFormIncludesRequestedLocaleInEditFormAction(t *testing.T) {
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}
	panel, err := newInMemoryPanelBuilder().
		FormFields(admin.Field{Name: "title", Type: "text", Required: true}).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	resourceItem := map[string]any{
		"id":               "page-123",
		"family_id":        "tg-page-123",
		"requested_locale": "fr",
		"resolved_locale":  "en",
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["id"] = "page-123"
	ctx.QueriesM["locale"] = "fr"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		return strings.TrimSpace(anyToString(viewCtx["form_action"])) == "/admin/content/pages/page-123?locale=fr"
	})).Return(nil).Once()

	handler := &contentEntryHandlers{
		cfg: admin.Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		},
		formTemplate: "resources/content/form",
		formRenderer: validator,
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}
	err = handler.renderForm(
		ctx,
		"pages",
		panel,
		nil,
		admin.AdminContext{Context: context.Background(), Locale: "fr"},
		map[string]any{"title": "Fallback page"},
		resourceItem,
		true,
		"",
	)
	if err != nil {
		t.Fatalf("render form: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestRenderFormResolvesLateBreadcrumbOverrideFromViewContextHook(t *testing.T) {
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}
	panel, err := newInMemoryPanelBuilder().
		FormFields(admin.Field{Name: "title", Type: "text", Required: true}).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		breadcrumbs, ok := viewCtx["breadcrumbs"].([]BreadcrumbItem)
		if !ok || len(breadcrumbs) != 2 {
			return false
		}
		return breadcrumbs[0].Label == "Home" &&
			breadcrumbs[0].Href == "/admin" &&
			!breadcrumbs[0].Current &&
			breadcrumbs[1].Label == "Posts" &&
			breadcrumbs[1].Href == "" &&
			breadcrumbs[1].Current
	})).Return(nil).Once()

	handler := &contentEntryHandlers{
		cfg: admin.Config{
			BasePath:      "/admin",
			DefaultLocale: "en",
		},
		formTemplate: "resources/content/form",
		formRenderer: validator,
		viewContext: func(viewCtx router.ViewContext, _ string, _ router.Context) router.ViewContext {
			return WithBreadcrumbOverride(
				viewCtx,
				Breadcrumb("Home", "/admin"),
				CurrentBreadcrumb("Posts"),
			)
		},
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}

	err = handler.renderForm(
		ctx,
		"posts",
		panel,
		nil,
		admin.AdminContext{Context: context.Background()},
		map[string]any{},
		nil,
		false,
		"",
	)
	if err != nil {
		t.Fatalf("render form: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestContentEntryAttachTranslationFamilyLinkResolvesFamilyDetailURL(t *testing.T) {
	record := map[string]any{"family_id": "tg-page-123"}
	urls := newTranslationFamilyURLManager(t)

	mapped := contentEntryAttachTranslationFamilyLink(record, urls, true, "")
	if got := strings.TrimSpace(anyToString(mapped["translation_family_id"])); got != "tg-page-123" {
		t.Fatalf("expected translation_family_id tg-page-123, got %q", got)
	}
	if got := strings.TrimSpace(anyToString(mapped["translation_family_url"])); got != "/admin/translations/families/tg-page-123" {
		t.Fatalf("expected translation_family_url to resolve, got %q", got)
	}
	links := contentEntryTestMap(t, mapped["links"], "links")
	family := contentEntryTestMap(t, links["translation_family"], "links.translation_family")
	if got := strings.TrimSpace(anyToString(family["href"])); got != "/admin/translations/families/tg-page-123" {
		t.Fatalf("expected links.translation_family.href to resolve, got %q", got)
	}
}

func TestContentEntryAttachTranslationFamilyLinkPreservesChannelScope(t *testing.T) {
	record := map[string]any{"family_id": "tg-page-123"}
	urls := newTranslationFamilyURLManager(t)

	mapped := contentEntryAttachTranslationFamilyLink(record, urls, true, "staging")
	if got := strings.TrimSpace(anyToString(mapped["translation_family_url"])); got != "/admin/translations/families/tg-page-123?channel=staging" {
		t.Fatalf("expected channel-scoped translation_family_url, got %q", got)
	}
	links := contentEntryTestMap(t, mapped["links"], "links")
	family := contentEntryTestMap(t, links["translation_family"], "links.translation_family")
	if got := strings.TrimSpace(anyToString(family["href"])); got != "/admin/translations/families/tg-page-123?channel=staging" {
		t.Fatalf("expected channel-scoped links.translation_family.href, got %q", got)
	}
}

func TestContentEntryAttachTranslationLocaleLinksBuildsLocaleTargets(t *testing.T) {
	record := map[string]any{
		"id":                "page-123",
		"available_locales": []any{"en", "es", "fr"},
	}
	routes := newContentEntryRoutes("/admin", "pages", "")

	detailLinked := contentEntryAttachTranslationLocaleLinks(record, routes, false, true)
	detailURLs := contentEntryTestMap(t, detailLinked["translation_locale_urls"], "translation_locale_urls")
	if got := strings.TrimSpace(anyToString(detailURLs["es"])); got != "/admin/content/pages/page-123?locale=es" {
		t.Fatalf("expected detail locale link, got %q", got)
	}

	editLinked := contentEntryAttachTranslationLocaleLinks(record, routes, true, true)
	editURLs := contentEntryTestMap(t, editLinked["translation_locale_urls"], "translation_locale_urls")
	if got := strings.TrimSpace(anyToString(editURLs["fr"])); got != "/admin/content/pages/page-123/edit?locale=fr" {
		t.Fatalf("expected edit locale link, got %q", got)
	}
}

func TestDetailForPanelIncludesTranslationFamilyLinkWhenTranslationUXEnabled(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm, err := admin.New(cfg, admin.Dependencies{URLManager: newTranslationFamilyURLManager(t)})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	repo := admin.NewMemoryRepository()
	created, err := repo.Create(context.Background(), map[string]any{
		"id":                "page-123",
		"title":             "Page EN",
		"locale":            "en",
		"available_locales": []any{"en"},
		"family_id":         "tg-page-123",
	})
	if err != nil {
		t.Fatalf("seed record: %v", err)
	}
	if _, err = adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		Actions(admin.Action{Name: admin.CreateTranslationKey}).
		DetailFields(admin.Field{Name: "title", Label: "Title", Type: "text"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	h := &contentEntryHandlers{
		admin:          adm,
		cfg:            cfg,
		translationUX:  true,
		detailTemplate: "resources/content/detail",
		templateExists: func(name string) bool {
			return name == "resources/content/detail"
		},
	}
	ctx := router.NewMockContext()
	ctx.ParamsM["name"] = "pages"
	ctx.ParamsM["id"] = strings.TrimSpace(anyToString(created["id"]))
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/detail", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		item, ok := viewCtx["resource_item"].(map[string]any)
		if !ok {
			return false
		}
		localeURLs, ok := item["translation_locale_urls"].(map[string]any)
		if !ok {
			return false
		}
		return strings.TrimSpace(anyToString(item["translation_family_url"])) == "/admin/translations/families/tg-page-123" &&
			strings.TrimSpace(anyToString(localeURLs["en"])) == "/admin/content/pages/1?locale=en"
	})).Return(nil).Once()

	if err := h.detailForPanel(ctx, ""); err != nil {
		t.Fatalf("detailForPanel: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestDetailForPanelBuildsDashboardTrailWithoutRecordBreadcrumbByDefault(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(admin.NavigationItem{
		ID:         "nav-group-main",
		Type:       admin.MenuItemTypeGroup,
		GroupTitle: "Navigation",
		Target: map[string]any{
			"name":             "admin.dashboard",
			"key":              "dashboard",
			"breadcrumb_label": "Dashboard",
		},
		Children: []admin.NavigationItem{
			{
				ID:          "nav-group-main.content",
				Label:       "Content",
				Collapsible: true,
				Target: map[string]any{
					"type":              "url",
					"path":              "/admin/content/pages",
					"key":               "content",
					"breadcrumb_hidden": true,
				},
				Children: []admin.NavigationItem{
					{
						ID:    "nav-group-main.content.pages",
						Label: "Pages",
						Target: map[string]any{
							"type": "url",
							"path": "/admin/content/pages",
							"key":  "pages",
						},
					},
				},
			},
		},
	})

	repo := admin.NewMemoryRepository()
	created, err := repo.Create(context.Background(), map[string]any{
		"title": "About Us",
		"slug":  "about-us",
	})
	if err != nil {
		t.Fatalf("seed record: %v", err)
	}
	if _, err = adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		DetailFields(admin.Field{Name: "title", Label: "Title", Type: "text"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	h := &contentEntryHandlers{
		admin:          adm,
		cfg:            cfg,
		viewContext:    defaultUIViewContextBuilder(adm, cfg),
		detailTemplate: "resources/content/detail",
		templateExists: func(name string) bool {
			return name == "resources/content/detail"
		},
	}
	ctx := router.NewMockContext()
	ctx.ParamsM["name"] = "pages"
	ctx.ParamsM["id"] = strings.TrimSpace(anyToString(created["id"]))
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/detail", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		breadcrumbs, ok := viewCtx["breadcrumbs"].([]BreadcrumbItem)
		if !ok || len(breadcrumbs) != 2 {
			return false
		}
		dashboardHref := strings.TrimRight(breadcrumbs[0].Href, "/")
		return breadcrumbs[0].Label == "Dashboard" &&
			dashboardHref == "/admin" &&
			!breadcrumbs[0].Current &&
			breadcrumbs[1].Label == "Pages" &&
			breadcrumbs[1].Href == "" &&
			breadcrumbs[1].Current
	})).Return(nil).Once()

	if err := h.detailForPanel(ctx, ""); err != nil {
		t.Fatalf("detailForPanel: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestListForPanelBuildsPanelBreadcrumbTrail(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	repo := admin.NewMemoryRepository()
	if _, err := repo.Create(context.Background(), map[string]any{
		"title": "About Us",
		"slug":  "about-us",
	}); err != nil {
		t.Fatalf("seed record: %v", err)
	}
	if _, err := adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		WithBreadcrumbs(admin.PanelBreadcrumbConfig{
			RootLabel: "Home",
			RootHref:  "/admin",
			ListLabel: "Pages",
		}).
		ListFields(admin.Field{Name: "title", Label: "Title", Type: "text"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	h := &contentEntryHandlers{
		admin:        adm,
		cfg:          cfg,
		viewContext:  defaultUIViewContextBuilder(adm, cfg),
		listTemplate: "resources/content/list",
		templateExists: func(name string) bool {
			return name == "resources/content/list"
		},
	}
	ctx := router.NewMockContext()
	ctx.ParamsM["name"] = "pages"
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/list", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		breadcrumbs, ok := viewCtx["breadcrumbs"].([]BreadcrumbItem)
		if !ok || len(breadcrumbs) != 2 {
			return false
		}
		return breadcrumbs[0].Label == "Home" &&
			breadcrumbs[0].Href == "/admin" &&
			!breadcrumbs[0].Current &&
			breadcrumbs[1].Label == "Pages" &&
			breadcrumbs[1].Href == "" &&
			breadcrumbs[1].Current
	})).Return(nil).Once()

	if err := h.listForPanel(ctx, ""); err != nil {
		t.Fatalf("listForPanel: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestDetailForPanelAppendsRecordBreadcrumbWhenPanelOptsIn(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(admin.NavigationItem{
		ID:         "nav-group-main",
		Type:       admin.MenuItemTypeGroup,
		GroupTitle: "Navigation",
		Target: map[string]any{
			"name":             "admin.dashboard",
			"key":              "dashboard",
			"breadcrumb_label": "Dashboard",
		},
		Children: []admin.NavigationItem{
			{
				ID:          "nav-group-main.content",
				Label:       "Content",
				Collapsible: true,
				Target: map[string]any{
					"type":              "url",
					"path":              "/admin/content/pages",
					"key":               "content",
					"breadcrumb_hidden": true,
				},
				Children: []admin.NavigationItem{
					{
						ID:    "nav-group-main.content.pages",
						Label: "Pages",
						Target: map[string]any{
							"type": "url",
							"path": "/admin/content/pages",
							"key":  "pages",
						},
					},
				},
			},
		},
	})

	repo := admin.NewMemoryRepository()
	created, err := repo.Create(context.Background(), map[string]any{
		"title": "About Us",
		"slug":  "about-us",
	})
	if err != nil {
		t.Fatalf("seed record: %v", err)
	}
	if _, err := adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		WithBreadcrumbs(admin.PanelBreadcrumbConfig{
			ShowCurrentOnDetail: true,
		}).
		DetailFields(admin.Field{Name: "title", Label: "Title", Type: "text"})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	h := &contentEntryHandlers{
		admin:          adm,
		cfg:            cfg,
		viewContext:    defaultUIViewContextBuilder(adm, cfg),
		detailTemplate: "resources/content/detail",
		templateExists: func(name string) bool {
			return name == "resources/content/detail"
		},
	}
	ctx := router.NewMockContext()
	ctx.ParamsM["name"] = "pages"
	ctx.ParamsM["id"] = strings.TrimSpace(anyToString(created["id"]))
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/detail", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		breadcrumbs, ok := viewCtx["breadcrumbs"].([]BreadcrumbItem)
		if !ok || len(breadcrumbs) != 3 {
			return false
		}
		dashboardHref := strings.TrimRight(breadcrumbs[0].Href, "/")
		return breadcrumbs[0].Label == "Dashboard" &&
			dashboardHref == "/admin" &&
			!breadcrumbs[0].Current &&
			breadcrumbs[1].Label == "Pages" &&
			breadcrumbs[1].Href == "/admin/content/pages" &&
			!breadcrumbs[1].Current &&
			breadcrumbs[2].Label == "About Us" &&
			breadcrumbs[2].Href == "" &&
			breadcrumbs[2].Current
	})).Return(nil).Once()

	if err := h.detailForPanel(ctx, ""); err != nil {
		t.Fatalf("detailForPanel: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestContentEntryTranslationStateFromRecordInfersFallbackMode(t *testing.T) {
	record := map[string]any{
		"requested_locale":         "fr",
		"resolved_locale":          "en",
		"missing_requested_locale": true,
		"fallback_used":            false,
	}
	state := contentEntryTranslationStateFromRecord(record)
	if state.RequestedLocale != "fr" {
		t.Fatalf("expected requested locale fr, got %q", state.RequestedLocale)
	}
	if state.ResolvedLocale != "en" {
		t.Fatalf("expected resolved locale en, got %q", state.ResolvedLocale)
	}
	if !state.InFallbackMode {
		t.Fatalf("expected fallback mode true, got %+v", state)
	}
	if !state.MissingRequestedLocale {
		t.Fatalf("expected missing_requested_locale true, got %+v", state)
	}
	if !state.FallbackUsed {
		t.Fatalf("expected fallback_used inferred from locale mismatch, got %+v", state)
	}
}

func TestUpdateForPanelBlocksFallbackLocaleEdits(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	repo := admin.NewMemoryRepository()
	created, err := repo.Create(context.Background(), map[string]any{
		"title":                    "Fallback page",
		"slug":                     "fallback-page",
		"path":                     "/fallback-page",
		"status":                   "draft",
		"locale":                   "en",
		"family_id":                "tg-fallback-page",
		"requested_locale":         "fr",
		"resolved_locale":          "en",
		"missing_requested_locale": true,
		"fallback_used":            false,
	})
	if err != nil {
		t.Fatalf("seed record: %v", err)
	}

	if _, err = adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		FormFields(
			admin.Field{Name: "title", Type: "text", Required: true},
			admin.Field{Name: "slug", Type: "text", Required: true},
			admin.Field{Name: "path", Type: "text", Required: true},
			admin.Field{Name: "status", Type: "text", Required: true},
			admin.Field{Name: "locale", Type: "text"},
		)); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["name"] = "pages"
	ctx.ParamsM["id"] = strings.TrimSpace(anyToString(created["id"]))
	ctx.QueriesM["locale"] = "fr"
	ctx.HeadersM["Content-Type"] = "application/x-www-form-urlencoded"
	ctx.On("Context").Return(context.Background())
	ctx.On("Body").Return([]byte(url.Values{
		"title":  []string{"Fallback page update attempt"},
		"slug":   []string{"fallback-page"},
		"path":   []string{"/fallback-page"},
		"status": []string{"draft"},
		"locale": []string{"fr"},
	}.Encode()))

	h := &contentEntryHandlers{admin: adm, cfg: cfg}
	err = h.updateForPanel(ctx, "")
	if err == nil {
		t.Fatalf("expected fallback edit to be blocked")
	}

	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected typed goerrors.Error, got %T", err)
	}
	if typedErr.TextCode != textCodeTranslationFallbackEditBlocked {
		t.Fatalf("expected text code %q, got %q", textCodeTranslationFallbackEditBlocked, typedErr.TextCode)
	}
	if typedErr.Code != http.StatusConflict {
		t.Fatalf("expected status code %d, got %d", http.StatusConflict, typedErr.Code)
	}
	if got := strings.TrimSpace(anyToString(typedErr.Metadata["requested_locale"])); got != "fr" {
		t.Fatalf("expected requested_locale metadata fr, got %q", got)
	}
}

func TestUpdateForPanelParsesSoftDeletedNestedArrayRows(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	repo := admin.NewMemoryRepository()
	created, err := repo.Create(context.Background(), map[string]any{
		"title": "Teaching topics",
		"columns": []any{
			map[string]any{
				"title": "Column 1",
				"entries": []any{
					map[string]any{"topic_id": "topic-1"},
					map[string]any{"topic_id": "topic-2"},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("seed record: %v", err)
	}

	if _, err = adm.RegisterPanel("teaching-topics-menu", (&admin.PanelBuilder{}).
		WithRepository(repo).
		FormSchema(map[string]any{
			"type": "object",
			"properties": map[string]any{
				"title": map[string]any{"type": "string"},
				"columns": map[string]any{
					"type": "array",
					"items": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"title": map[string]any{"type": "string"},
							"entries": map[string]any{
								"type": "array",
								"items": map[string]any{
									"type": "object",
									"properties": map[string]any{
										"topic_id": map[string]any{"type": "string"},
										"_delete":  map[string]any{"type": "string"},
									},
								},
							},
						},
					},
				},
			},
		})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.ParamsM["name"] = "teaching-topics-menu"
	ctx.ParamsM["id"] = strings.TrimSpace(anyToString(created["id"]))
	ctx.HeadersM["Content-Type"] = "application/x-www-form-urlencoded"
	ctx.On("Context").Return(context.Background())
	ctx.On("Body").Return([]byte(url.Values{
		"title":                          []string{"Teaching topics"},
		"columns[0].title":               []string{"Column 1"},
		"columns[0].entries[0]._delete":  []string{"true"},
		"columns[0].entries[1].topic_id": []string{"topic-2"},
		"columns[0].entries[1]._delete":  []string{"false"},
	}.Encode()))
	ctx.On("Redirect", mock.Anything).Return(nil).Once()

	h := &contentEntryHandlers{admin: adm, cfg: cfg}
	if err = h.updateForPanel(ctx, ""); err != nil {
		t.Fatalf("update content: %v", err)
	}

	updated, err := repo.Get(context.Background(), strings.TrimSpace(anyToString(created["id"])))
	if err != nil {
		t.Fatalf("get updated record: %v", err)
	}
	columns, ok := updated["columns"].([]any)
	if !ok || len(columns) != 1 {
		t.Fatalf("expected one parsed column, got %#v", updated["columns"])
	}
	column, ok := columns[0].(map[string]any)
	if !ok {
		t.Fatalf("expected parsed column object, got %#v", columns[0])
	}
	entries, ok := column["entries"].([]any)
	if !ok || len(entries) != 2 {
		t.Fatalf("expected two parsed entries, got %#v", column["entries"])
	}
	deleted, ok := entries[0].(map[string]any)
	if !ok {
		t.Fatalf("expected deleted entry object, got %#v", entries[0])
	}
	if got := deleted["_delete"]; got != "true" {
		t.Fatalf("expected first row delete sentinel true, got %#v", got)
	}
	if _, exists := deleted["topic_id"]; exists {
		t.Fatalf("expected browser-disabled topic_id to be omitted for deleted row, got %#v", deleted)
	}
	kept, ok := entries[1].(map[string]any)
	if !ok {
		t.Fatalf("expected kept entry object, got %#v", entries[1])
	}
	if got := kept["topic_id"]; got != "topic-2" {
		t.Fatalf("expected second row topic_id topic-2, got %#v", got)
	}
	if got := kept["_delete"]; got != "false" {
		t.Fatalf("expected second row delete sentinel false, got %#v", got)
	}
	ctx.AssertExpectations(t)
}

func TestContentEntryUpdateIntentPolicyExtractsSchemaMetadata(t *testing.T) {
	schema := teachingTopicsUpdateIntentSchema("preserve")
	policy := contentEntryUpdateIntentPolicy(schema, nil, nil, ContentEntryUpdateIntentPolicy{})
	if len(policy.Arrays) != 2 {
		t.Fatalf("expected two array policies, got %#v", policy.Arrays)
	}
	entries := policy.Arrays["columns[].entries"]
	if entries.Ambiguous != ContentEntryUpdateIntentPreserve {
		t.Fatalf("expected entries ambiguity preserve, got %q", entries.Ambiguous)
	}
	if !entries.AllowIndexFallback {
		t.Fatalf("expected entries index fallback enabled")
	}
	if got := strings.Join(entries.Identity, ","); got != "id,_row_key,topic_id,topic_slug" {
		t.Fatalf("unexpected identity precedence %q", got)
	}
}

func TestUpdateForPanelUpdateIntentPreservesSparseNestedRows(t *testing.T) {
	repo, created := registerTeachingTopicsUpdateIntentPanel(t, "preserve")
	ctx := teachingTopicsUpdateContext(created, url.Values{
		"title":            []string{"Teaching topics renamed"},
		"columns[0].title": []string{"Column renamed"},
	})
	ctx.On("Redirect", mock.Anything).Return(nil).Once()

	h := &contentEntryHandlers{admin: repo.Admin, cfg: repo.Config}
	if err := h.updateForPanel(ctx, ""); err != nil {
		t.Fatalf("update content: %v", err)
	}

	updated := mustGetTeachingTopicsRecord(t, repo.PanelRepo, created)
	columns := requireRecordSlice(t, updated, "columns")
	column := requireMapItem(t, columns, 0)
	if got := column["title"]; got != "Column renamed" {
		t.Fatalf("expected edited column title, got %#v", got)
	}
	entries := requireRecordSlice(t, column, "entries")
	if len(entries) != 2 {
		t.Fatalf("expected sparse submit to preserve two entries, got %#v", entries)
	}
	first := requireMapItem(t, entries, 0)
	if got := first["topic_id"]; got != "topic-1" {
		t.Fatalf("expected first preserved topic, got %#v", first)
	}
}

func TestUpdateForPanelUpdateIntentDeletesMarkedNestedRow(t *testing.T) {
	repo, created := registerTeachingTopicsUpdateIntentPanel(t, "preserve")
	ctx := teachingTopicsUpdateContext(created, url.Values{
		"title":                          []string{"Teaching topics"},
		"columns[0].title":               []string{"Column 1"},
		"columns[0].entries__present":    []string{"true"},
		"columns[0].entries[0]._delete":  []string{"true"},
		"columns[0].entries[1].topic_id": []string{"topic-2"},
	})
	ctx.On("Redirect", mock.Anything).Return(nil).Once()

	h := &contentEntryHandlers{admin: repo.Admin, cfg: repo.Config}
	if err := h.updateForPanel(ctx, ""); err != nil {
		t.Fatalf("update content: %v", err)
	}

	updated := mustGetTeachingTopicsRecord(t, repo.PanelRepo, created)
	entries := requireRecordSlice(t, requireMapItem(t, requireRecordSlice(t, updated, "columns"), 0), "entries")
	if len(entries) != 1 {
		t.Fatalf("expected one entry after explicit delete, got %#v", entries)
	}
	kept := requireMapItem(t, entries, 0)
	if got := kept["topic_id"]; got != "topic-2" {
		t.Fatalf("expected topic-2 to remain, got %#v", kept)
	}
	if _, exists := kept["_delete"]; exists {
		t.Fatalf("did not expect delete sentinel to persist: %#v", kept)
	}
}

func TestUpdateForPanelUpdateIntentClearsNestedArrayOnlyWithMarker(t *testing.T) {
	repo, created := registerTeachingTopicsUpdateIntentPanel(t, "preserve")
	ctx := teachingTopicsUpdateContext(created, url.Values{
		"title":                       []string{"Teaching topics"},
		"columns[0].title":            []string{"Column 1"},
		"columns[0].entries__present": []string{"true"},
		"columns[0].entries__clear":   []string{"true"},
	})
	ctx.On("Redirect", mock.Anything).Return(nil).Once()

	h := &contentEntryHandlers{admin: repo.Admin, cfg: repo.Config}
	if err := h.updateForPanel(ctx, ""); err != nil {
		t.Fatalf("update content: %v", err)
	}

	updated := mustGetTeachingTopicsRecord(t, repo.PanelRepo, created)
	entries := requireRecordSlice(t, requireMapItem(t, requireRecordSlice(t, updated, "columns"), 0), "entries")
	if len(entries) != 0 {
		t.Fatalf("expected explicit clear to persist empty entries, got %#v", entries)
	}
}

func TestUpdateForPanelUpdateIntentRejectsAmbiguousSparseSubmitByDefault(t *testing.T) {
	repo, created := registerTeachingTopicsUpdateIntentPanel(t, "")
	ctx := teachingTopicsUpdateContext(created, url.Values{
		"title":            []string{"Teaching topics renamed"},
		"columns[0].title": []string{"Column renamed"},
	})

	h := &contentEntryHandlers{admin: repo.Admin, cfg: repo.Config}
	err := h.updateForPanel(ctx, "")
	if err == nil {
		t.Fatalf("expected ambiguous sparse submit to fail")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected goerrors.Error, got %T", err)
	}
	if typedErr.Code != http.StatusBadRequest || typedErr.TextCode != "INVALID_FORM" {
		t.Fatalf("expected invalid form bad request, got code=%d text=%q", typedErr.Code, typedErr.TextCode)
	}
}

type teachingTopicsUpdateIntentFixture struct {
	Config    admin.Config
	Admin     *admin.Admin
	PanelRepo *admin.MemoryRepository
}

func registerTeachingTopicsUpdateIntentPanel(t *testing.T, ambiguity string) (teachingTopicsUpdateIntentFixture, map[string]any) {
	t.Helper()
	fixture := newContentEntryAdminFixture(t)
	repo := admin.NewMemoryRepository()
	created, err := repo.Create(context.Background(), map[string]any{
		"title": "Teaching topics",
		"columns": []any{
			map[string]any{
				"title": "Column 1",
				"entries": []any{
					map[string]any{"topic_id": "topic-1", "label": "Topic 1"},
					map[string]any{"topic_id": "topic-2", "label": "Topic 2"},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("seed record: %v", err)
	}
	if _, err = fixture.Admin.RegisterPanel("teaching-topics-menu", (&admin.PanelBuilder{}).
		WithRepository(repo).
		FormSchema(teachingTopicsUpdateIntentSchema(ambiguity))); err != nil {
		t.Fatalf("register panel: %v", err)
	}
	return teachingTopicsUpdateIntentFixture{
		Config:    fixture.Config,
		Admin:     fixture.Admin,
		PanelRepo: repo,
	}, created
}

func teachingTopicsUpdateIntentSchema(ambiguity string) map[string]any {
	entriesPolicy := map[string]any{
		"mode":               "patch",
		"identity":           []any{"topic_id"},
		"referenceFields":    []any{"topic_slug"},
		"allowIndexFallback": true,
	}
	columnsPolicy := map[string]any{
		"mode":               "patch",
		"allowIndexFallback": true,
	}
	if strings.TrimSpace(ambiguity) != "" {
		entriesPolicy["ambiguous"] = ambiguity
		columnsPolicy["ambiguous"] = ambiguity
	}
	return map[string]any{
		"type": "object",
		"x-go-admin": map[string]any{
			"updateIntent": map[string]any{
				"arrays": map[string]any{
					"columns":           columnsPolicy,
					"columns[].entries": entriesPolicy,
				},
			},
		},
		"properties": map[string]any{
			"title":    map[string]any{"type": "string"},
			"featured": map[string]any{"type": "boolean"},
			"tags": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
			"metadata": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"summary": map[string]any{"type": "string"},
				},
			},
			"columns": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"title": map[string]any{"type": "string"},
						"entries": map[string]any{
							"type": "array",
							"items": map[string]any{
								"type": "object",
								"properties": map[string]any{
									"topic_id": map[string]any{"type": "string"},
									"label":    map[string]any{"type": "string"},
									"_delete":  map[string]any{"type": "string"},
								},
							},
						},
					},
				},
			},
		},
	}
}

func teachingTopicsUpdateContext(created map[string]any, values url.Values) *router.MockContext {
	ctx := router.NewMockContext()
	ctx.ParamsM["name"] = "teaching-topics-menu"
	ctx.ParamsM["id"] = strings.TrimSpace(anyToString(created["id"]))
	ctx.HeadersM["Content-Type"] = "application/x-www-form-urlencoded"
	ctx.On("Context").Return(context.Background())
	if values != nil {
		ctx.On("Body").Return([]byte(values.Encode()))
	}
	return ctx
}

func mustGetTeachingTopicsRecord(t *testing.T, repo *admin.MemoryRepository, created map[string]any) map[string]any {
	t.Helper()
	updated, err := repo.Get(context.Background(), strings.TrimSpace(anyToString(created["id"])))
	if err != nil {
		t.Fatalf("get updated record: %v", err)
	}
	return updated
}

func requireRecordSlice(t *testing.T, values map[string]any, key string) []any {
	t.Helper()
	value, ok := values[key].([]any)
	if !ok {
		t.Fatalf("expected %s to be []any, got %#v", key, values[key])
	}
	return value
}

func TestAdminContextFromRequestResolvesLocaleFromQuery(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.QueriesM["locale"] = " FR_ca "

	adminCtx := adminContextFromRequest(nil, ctx, "en")
	if adminCtx.Locale != "fr-CA" {
		t.Fatalf("expected locale from query, got %q", adminCtx.Locale)
	}
	if got := strings.TrimSpace(admin.LocaleFromContext(adminCtx.Context)); got != "fr-CA" {
		t.Fatalf("expected locale in context, got %q", got)
	}
}

func TestAdminContextFromRequestFallsBackToRequestedLocaleQuery(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.QueriesM["requested_locale"] = " ES_mx "

	adminCtx := adminContextFromRequest(nil, ctx, "en")
	if adminCtx.Locale != "es-MX" {
		t.Fatalf("expected locale from requested_locale query, got %q", adminCtx.Locale)
	}
	if got := strings.TrimSpace(admin.LocaleFromContext(adminCtx.Context)); got != "es-MX" {
		t.Fatalf("expected locale in context, got %q", got)
	}
}

func TestAdminContextFromRequestMatchesAcceptLanguageAgainstAdminLocaleCatalog(t *testing.T) {
	cfg := cms.DefaultConfig()
	cfg.DefaultLocale = "en"
	cfg.I18N.Locales = []string{"en", "es-MX"}

	module, err := cms.New(cfg)
	if err != nil {
		t.Fatalf("new cms module: %v", err)
	}

	adm, err := admin.New(admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}, admin.Dependencies{
		CMSContainer: admin.NewGoCMSContainerAdapter(module),
	})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.HeadersM["Accept-Language"] = "ES_mx,es;q=0.9"

	adminCtx := adminContextFromRequest(adm, ctx, "en")
	if adminCtx.Locale != "es-MX" {
		t.Fatalf("expected locale from Accept-Language, got %q", adminCtx.Locale)
	}
	if got := strings.TrimSpace(admin.LocaleFromContext(adminCtx.Context)); got != "es-MX" {
		t.Fatalf("expected locale in context, got %q", got)
	}
}

func TestPreviewURLForRecordUsesSignedPreviewToken(t *testing.T) {
	adm, err := admin.New(admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		PreviewSecret: "quickstart-preview-test-secret",
	}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	handler := &contentEntryHandlers{admin: adm}
	urlWithToken, err := handler.previewURLForRecord(context.Background(), "pages", "42", map[string]any{
		"path": "/about",
	}, nil)
	if err != nil {
		t.Fatalf("preview url: %v", err)
	}
	if !strings.HasPrefix(urlWithToken, "/about?preview_token=") {
		t.Fatalf("expected /about preview url, got %q", urlWithToken)
	}
	parsed, err := url.Parse(urlWithToken)
	if err != nil {
		t.Fatalf("parse preview url: %v", err)
	}
	token := strings.TrimSpace(parsed.Query().Get("preview_token"))
	if token == "" {
		t.Fatalf("expected preview_token query param in %q", urlWithToken)
	}
	decoded, err := adm.Preview().Validate(token)
	if err != nil {
		t.Fatalf("validate preview token: %v", err)
	}
	if decoded.EntityType != "pages" {
		t.Fatalf("expected entity_type pages, got %q", decoded.EntityType)
	}
	if decoded.ContentID != "42" {
		t.Fatalf("expected content id 42, got %q", decoded.ContentID)
	}
}

func TestPreviewURLForRecordRequiresAllowlistedAbsolutePreviewURL(t *testing.T) {
	adm, err := admin.New(admin.Config{
		BasePath:               "/admin",
		DefaultLocale:          "en",
		PreviewSecret:          "quickstart-preview-test-secret",
		PreviewURLAllowedHosts: []string{"preview.example.test"},
	}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	handler := &contentEntryHandlers{admin: adm}
	urlWithToken, err := handler.previewURLForRecord(context.Background(), "pages", "42", map[string]any{
		"preview_url": "https://preview.example.test/about?lang=en#draft",
	}, nil)
	if err != nil {
		t.Fatalf("preview url: %v", err)
	}
	if !strings.HasPrefix(urlWithToken, "https://preview.example.test/about?lang=en&preview_token=") || !strings.HasSuffix(urlWithToken, "#draft") {
		t.Fatalf("expected allowlisted absolute preview url with token before fragment, got %q", urlWithToken)
	}

	deniedURL, err := handler.previewURLForRecord(context.Background(), "pages", "42", map[string]any{
		"preview_url": "https://evil.example.test/about",
	}, nil)
	if err != nil {
		t.Fatalf("preview url denied host: %v", err)
	}
	if deniedURL != "" {
		t.Fatalf("expected unlisted absolute preview url to be unavailable, got %q", deniedURL)
	}
}

func TestPreviewURLForRecordDoesNotUseSlugForNonDeliverableContentType(t *testing.T) {
	adm, err := admin.New(admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		PreviewSecret: "quickstart-preview-test-secret",
	}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	handler := &contentEntryHandlers{admin: adm}
	urlWithToken, err := handler.previewURLForRecord(context.Background(), "teaching-topics-menu", "42", map[string]any{
		"slug": "teaching-topics-menu",
	}, &admin.CMSContentType{
		Slug:         "site-teaching-topics-menu",
		Capabilities: map[string]any{"panel_slug": "teaching-topics-menu"},
	})
	if err != nil {
		t.Fatalf("preview url: %v", err)
	}
	if urlWithToken != "" {
		t.Fatalf("expected non-deliverable content type to omit slug-derived preview URL, got %q", urlWithToken)
	}
}

func TestPreviewURLForRecordUsesSlugForDeliverableContentType(t *testing.T) {
	adm, err := admin.New(admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		PreviewSecret: "quickstart-preview-test-secret",
	}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	handler := &contentEntryHandlers{admin: adm}
	urlWithToken, err := handler.previewURLForRecord(context.Background(), "pages", "42", map[string]any{
		"slug": "home",
	}, &admin.CMSContentType{
		Slug: "page",
		Capabilities: map[string]any{
			"delivery": map[string]any{"enabled": true},
		},
	})
	if err != nil {
		t.Fatalf("preview url: %v", err)
	}
	if !strings.HasPrefix(urlWithToken, "/home?preview_token=") {
		t.Fatalf("expected deliverable slug preview URL, got %q", urlWithToken)
	}
}
