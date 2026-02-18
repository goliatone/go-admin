package quickstart

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestContentEntryColumnsMarksFilterableFields(t *testing.T) {
	panel := mustBuildContentEntryTestPanel(t)

	filters := contentEntryFilters(panel)
	columns := contentEntryColumns(panel, nil, filters, nil)
	if len(columns) != 3 {
		t.Fatalf("expected 3 columns, got %d", len(columns))
	}

	byField := map[string]map[string]any{}
	for _, column := range columns {
		byField[column["field"].(string)] = column
	}

	if filterable, _ := byField["title"]["filterable"].(bool); !filterable {
		t.Fatalf("expected title column to be filterable, got %+v", byField["title"])
	}
	if sortable, _ := byField["title"]["sortable"].(bool); !sortable {
		t.Fatalf("expected title column to be sortable, got %+v", byField["title"])
	}
	if filterable, _ := byField["status"]["filterable"].(bool); !filterable {
		t.Fatalf("expected status column to be filterable, got %+v", byField["status"])
	}
	if sortable, _ := byField["status"]["sortable"].(bool); !sortable {
		t.Fatalf("expected status column to be sortable, got %+v", byField["status"])
	}
	if filterable, _ := byField["slug"]["filterable"].(bool); filterable {
		t.Fatalf("expected slug column to be non-filterable, got %+v", byField["slug"])
	}
	if sortable, _ := byField["slug"]["sortable"].(bool); !sortable {
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
		byField[column["field"].(string)] = column
	}

	if got := strings.TrimSpace(anyToString(byField["tags"]["renderer"])); got != "_array" {
		t.Fatalf("expected tags renderer _array, got %q", got)
	}
	if got := strings.TrimSpace(anyToString(byField["metadata"]["renderer"])); got != "_object" {
		t.Fatalf("expected metadata renderer _object, got %q", got)
	}
	metadataOptions, _ := byField["metadata"]["renderer_options"].(map[string]any)
	if got := strings.TrimSpace(anyToString(metadataOptions["display_key"])); got != "name" {
		t.Fatalf("expected metadata display_key=name, got %q", got)
	}
	if got := strings.TrimSpace(anyToString(byField["blocks"]["renderer"])); got != "blocks_summary" {
		t.Fatalf("expected blocks renderer override, got %q", got)
	}
	blocksOptions, _ := byField["blocks"]["renderer_options"].(map[string]any)
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
		byField[column["field"].(string)] = column
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
		byName[filter["name"].(string)] = filter
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
		byName[filter["name"].(string)] = filter
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
			name:      "pages slug fallback",
			panelName: "pages",
			record:    map[string]any{"slug": "home"},
			expected:  "/home",
		},
		{
			name:      "slug fallback",
			panelName: "posts",
			record:    map[string]any{"slug": "launch"},
			expected:  "/launch",
		},
		{
			name:      "default path-like slug",
			panelName: "article",
			record:    map[string]any{"slug": "/legal/privacy"},
			expected:  "/legal/privacy",
		},
		{
			name:      "generic panel slug fallback",
			panelName: "article",
			record:    map[string]any{"slug": "plain-slug"},
			expected:  "/plain-slug",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := resolveContentEntryPreviewPath(tc.panelName, tc.record)
			if got != tc.expected {
				t.Fatalf("expected %q got %q", tc.expected, got)
			}
		})
	}
}

func TestBuildSitePreviewURLAppendsTokenQueryParam(t *testing.T) {
	got := buildSitePreviewURL("/about?lang=en", "token-123")
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

	if err := h.entryForPanel(ctx, "profile", admin.PanelEntryModeDetailCurrentUser); err != admin.ErrForbidden {
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

func TestHydrateDetailRelationLinksAddsEnvironmentQuery(t *testing.T) {
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
	if got != "/admin/content/esign_documents/doc-1?env=staging" {
		t.Fatalf("expected env-aware document_url, got %q", got)
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
	if got != "/admin/content/esign_documents/abc-123?created=1&env=staging" {
		t.Fatalf("expected detail redirect with success marker, got %q", got)
	}
}

func TestContentEntryCreateRedirectTargetUsesEditWithMarkerForESignAgreements(t *testing.T) {
	routes := newContentEntryRoutes("/admin", "esign_agreements", "staging")
	got := contentEntryCreateRedirectTarget("esign_agreements", "abc-123", routes)
	if got != "/admin/content/esign_agreements/abc-123/edit?created=1&env=staging" {
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
		tc := tc
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

func TestListForPanelEnablesTranslationDataGridUXWhenConfigured(t *testing.T) {
	fixture := newContentEntryAdminFixture(t)
	cfg := fixture.Config
	adm := fixture.Admin
	if _, err := adm.RegisterPanel("pages", newInMemoryPanelBuilder().
		ListFields(
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "translation_group_id", Label: "Translation Group", Type: "text", Hidden: true},
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
			strings.TrimSpace(anyToString(dataGridCfg["group_by_field"])) == "translation_group_id"
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
			Mode:            "preferences",
			SyncDebounceMS:  1200,
			MaxShareEntries: 30,
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
		routes, ok := viewCtx["routes"].(map[string]string)
		if !ok {
			return false
		}
		return strings.TrimSpace(routes["new"]) == "" &&
			strings.TrimSpace(routes["create"]) == ""
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
	if err := h.newForPanel(ctx, "translations"); err != admin.ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
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
		"translation_group_id":     "tg-page-123",
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
		if edit, _ := viewCtx["is_edit"].(bool); !edit {
			return false
		}
		item, ok := viewCtx["resource_item"].(map[string]any)
		if !ok {
			return false
		}
		return strings.TrimSpace(anyToString(item["translation_group_id"])) == "tg-page-123" &&
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
		"id":                   "page-123",
		"translation_group_id": "tg-page-123",
		"requested_locale":     "fr",
		"resolved_locale":      "en",
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
		"translation_group_id":     "tg-fallback-page",
		"requested_locale":         "fr",
		"resolved_locale":          "en",
		"missing_requested_locale": true,
		"fallback_used":            false,
	})
	if err != nil {
		t.Fatalf("seed record: %v", err)
	}

	if _, err := adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
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

func TestAdminContextFromRequestResolvesLocaleFromQuery(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.QueriesM["locale"] = "fr"

	adminCtx := adminContextFromRequest(ctx, "en")
	if adminCtx.Locale != "fr" {
		t.Fatalf("expected locale from query, got %q", adminCtx.Locale)
	}
	if got := strings.TrimSpace(admin.LocaleFromContext(adminCtx.Context)); got != "fr" {
		t.Fatalf("expected locale in context, got %q", got)
	}
}

func TestAdminContextFromRequestFallsBackToRequestedLocaleQuery(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.QueriesM["requested_locale"] = "es"

	adminCtx := adminContextFromRequest(ctx, "en")
	if adminCtx.Locale != "es" {
		t.Fatalf("expected locale from requested_locale query, got %q", adminCtx.Locale)
	}
	if got := strings.TrimSpace(admin.LocaleFromContext(adminCtx.Context)); got != "es" {
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
	})
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
