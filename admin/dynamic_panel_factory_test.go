package admin

import (
	"context"
	"strings"
	"testing"
)

func TestDynamicPanelFactoryCreatesPageAndPostPanelsFromActiveContentTypes(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	factory := NewDynamicPanelFactory(adm)

	page := CMSContentType{
		ID:           "ct-page",
		Name:         "Page",
		Slug:         "page",
		Status:       "active",
		Schema:       minimalContentTypeSchema(),
		Capabilities: map[string]any{"panel_slug": "pages", "permissions": "admin.pages"},
	}
	post := CMSContentType{
		ID:           "ct-post",
		Name:         "Post",
		Slug:         "post",
		Status:       "active",
		Schema:       minimalContentTypeSchema(),
		Capabilities: map[string]any{"panel_slug": "posts", "permissions": "admin.posts"},
	}

	if _, err := factory.CreatePanelFromContentType(context.Background(), &page); err != nil {
		t.Fatalf("create page panel failed: %v", err)
	}
	if _, err := factory.CreatePanelFromContentType(context.Background(), &post); err != nil {
		t.Fatalf("create post panel failed: %v", err)
	}

	pagesPanel, ok := adm.Registry().Panel("pages")
	if !ok || pagesPanel == nil {
		t.Fatalf("expected pages panel registered")
	}
	postsPanel, ok := adm.Registry().Panel("posts")
	if !ok || postsPanel == nil {
		t.Fatalf("expected posts panel registered")
	}

	pagesPerms := pagesPanel.Schema().Permissions
	if pagesPerms.View != "admin.pages.view" || pagesPerms.Create != "admin.pages.create" || pagesPerms.Edit != "admin.pages.edit" || pagesPerms.Delete != "admin.pages.delete" {
		t.Fatalf("expected admin.pages permissions, got %+v", pagesPerms)
	}
	postsPerms := postsPanel.Schema().Permissions
	if postsPerms.View != "admin.posts.view" || postsPerms.Create != "admin.posts.create" || postsPerms.Edit != "admin.posts.edit" || postsPerms.Delete != "admin.posts.delete" {
		t.Fatalf("expected admin.posts permissions, got %+v", postsPerms)
	}
}

func TestDynamicPanelFactoryCreatesPostsPanelForBlogPostPanelSlug(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	factory := NewDynamicPanelFactory(adm)

	blogPost := CMSContentType{
		ID:           "ct-blog",
		Name:         "Blog Post",
		Slug:         "blog_post",
		Status:       "active",
		Schema:       minimalContentTypeSchema(),
		Capabilities: map[string]any{"panel_slug": "posts", "permissions": "admin.posts"},
	}

	if _, err := factory.CreatePanelFromContentType(context.Background(), &blogPost); err != nil {
		t.Fatalf("create blog_post panel failed: %v", err)
	}
	if panel, ok := adm.Registry().Panel("posts"); !ok || panel == nil {
		t.Fatalf("expected posts panel registered for blog_post")
	}
}

func TestDynamicPanelFactoryAddsWorkflowActionsForPageAndPostPanels(t *testing.T) {
	t.Run("pages", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
		adm.WithWorkflow(workflowEngineWithPagesAndPosts())
		factory := NewDynamicPanelFactory(adm)

		page := CMSContentType{
			ID:     "ct-page",
			Name:   "Page",
			Slug:   "page",
			Status: "active",
			Schema: minimalContentTypeSchema(),
			Capabilities: map[string]any{
				"panel_slug":   "pages",
				"workflow":     "pages",
				"panel_traits": []any{"editorial"},
				"translations": true,
			},
		}

		panel, err := factory.CreatePanelFromContentType(context.Background(), &page)
		if err != nil {
			t.Fatalf("create page panel failed: %v", err)
		}
		assertWorkflowActions(t, panel)
	})

	t.Run("posts", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
		adm.WithWorkflow(workflowEngineWithPagesAndPosts())
		factory := NewDynamicPanelFactory(adm)

		blogPost := CMSContentType{
			ID:     "ct-blog",
			Name:   "Blog Post",
			Slug:   "blog_post",
			Status: "active",
			Schema: minimalContentTypeSchema(),
			Capabilities: map[string]any{
				"panel_slug":   "posts",
				"workflow":     "posts",
				"panel_traits": []any{"editorial"},
				"translations": true,
			},
		}

		panel, err := factory.CreatePanelFromContentType(context.Background(), &blogPost)
		if err != nil {
			t.Fatalf("create blog_post panel failed: %v", err)
		}
		assertWorkflowActions(t, panel)
	})
}

func TestDynamicPanelFactoryAddsCreateTranslationActionForEditorialPanels(t *testing.T) {
	tests := []struct {
		name         string
		contentType  CMSContentType
		expectedSlug string
	}{
		{
			name: "pages",
			contentType: CMSContentType{
				ID:     "ct-page",
				Name:   "Page",
				Slug:   "page",
				Status: "active",
				Schema: minimalContentTypeSchema(),
				Capabilities: map[string]any{
					"panel_slug":   "pages",
					"workflow":     "pages",
					"panel_traits": []any{"editorial"},
					"translations": true,
				},
			},
			expectedSlug: "pages",
		},
		{
			name: "posts",
			contentType: CMSContentType{
				ID:     "ct-post",
				Name:   "Post",
				Slug:   "post",
				Status: "active",
				Schema: minimalContentTypeSchema(),
				Capabilities: map[string]any{
					"panel_slug":   "posts",
					"workflow":     "posts",
					"panel_traits": []any{"editorial"},
					"translations": true,
				},
			},
			expectedSlug: "posts",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
			adm.WithWorkflow(workflowEngineWithPagesAndPosts())
			factory := NewDynamicPanelFactory(adm)

			panel, err := factory.CreatePanelFromContentType(context.Background(), &tt.contentType)
			if err != nil {
				t.Fatalf("create panel failed: %v", err)
			}
			actions := panel.Schema().Actions
			translationAction, ok := findActionByName(actions, CreateTranslationKey)
			if !ok {
				t.Fatalf("expected %s action in schema, got %+v", CreateTranslationKey, actions)
			}
			if len(translationAction.PayloadRequired) != 1 || translationAction.PayloadRequired[0] != "locale" {
				t.Fatalf("expected locale payload requirement, got %+v", translationAction.PayloadRequired)
			}
			if translationAction.PayloadSchema == nil {
				t.Fatalf("expected payload schema for create_translation")
			}
			if !hasAction(actions, "submit_for_approval") || !hasAction(actions, "publish") {
				t.Fatalf("expected workflow actions on %s panel, got %+v", tt.expectedSlug, actions)
			}
			if !hasAction(actions, "view") || !hasAction(actions, "edit") || !hasAction(actions, "delete") {
				t.Fatalf("expected default CRUD actions on %s panel, got %+v", tt.expectedSlug, actions)
			}
		})
	}
}

func TestDynamicPanelFactorySkipsEditorialActionsWhenTraitMissing(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	adm.WithWorkflow(workflowEngineWithPagesAndPosts())
	factory := NewDynamicPanelFactory(adm)

	panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
		ID:     "ct-post",
		Name:   "Post",
		Slug:   "post",
		Status: "active",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"panel_slug": "posts",
			"workflow":   "posts",
		},
	})
	if err != nil {
		t.Fatalf("create panel failed: %v", err)
	}
	actions := panel.Schema().Actions
	if hasAction(actions, CreateTranslationKey) {
		t.Fatalf("did not expect %s action without editorial trait, got %+v", CreateTranslationKey, actions)
	}
	if hasAction(actions, "submit_for_approval") || hasAction(actions, "publish") {
		t.Fatalf("did not expect workflow actions without editorial trait, got %+v", actions)
	}
}

func TestDynamicPanelFactoryAppliesEditorialColumnsAndFilters(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	factory := NewDynamicPanelFactory(adm)

	panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
		ID:     "ct-page",
		Name:   "Page",
		Slug:   "page",
		Status: "active",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"panel_slug":        "pages",
			"panel_preset":      "editorial",
			"permissions":       "admin.pages",
			"translations":      true,
			"structural_fields": true,
		},
	})
	if err != nil {
		t.Fatalf("create panel failed: %v", err)
	}
	schema := panel.Schema()
	for _, field := range []string{"translation_status", "available_locales", "translation_readiness", "missing_translations"} {
		if !hasField(schema.ListFields, field) {
			t.Fatalf("expected editorial list field %s, got %+v", field, schema.ListFields)
		}
	}
	if !hasPanelFilter(schema.Filters, "incomplete") {
		t.Fatalf("expected editorial incomplete filter, got %+v", schema.Filters)
	}
}

func TestDynamicPanelFactorySkipsCreateTranslationWhenTranslationsDisabled(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	adm.WithWorkflow(workflowEngineWithPagesAndPosts())
	factory := NewDynamicPanelFactory(adm)

	panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
		ID:     "ct-page",
		Name:   "Page",
		Slug:   "page",
		Status: "active",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"panel_slug":   "pages",
			"workflow":     "pages",
			"panel_traits": []any{"editorial"},
			"translations": false,
		},
	})
	if err != nil {
		t.Fatalf("create panel failed: %v", err)
	}
	if hasAction(panel.Schema().Actions, CreateTranslationKey) {
		t.Fatalf("did not expect %s action when translations are disabled", CreateTranslationKey)
	}
}

func TestDynamicPanelFactoryEditorialActionsRespectWorkflowTransitions(t *testing.T) {
	engine := NewSimpleWorkflowEngine()
	engine.RegisterWorkflow("news", WorkflowDefinition{
		EntityType:   "news",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "publish", From: "draft", To: "published"},
		},
	})

	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	adm.WithWorkflow(engine)
	factory := NewDynamicPanelFactory(adm)

	panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
		ID:     "ct-news",
		Name:   "News",
		Slug:   "news",
		Status: "active",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"panel_slug":   "news",
			"panel_traits": []any{"editorial"},
			"translations": true,
			"workflow":     "news",
		},
	})
	if err != nil {
		t.Fatalf("create panel failed: %v", err)
	}
	actions := panel.Schema().Actions
	if !hasAction(actions, "publish") {
		t.Fatalf("expected publish action, got %+v", actions)
	}
	if hasAction(actions, "submit_for_approval") {
		t.Fatalf("did not expect submit_for_approval action without workflow transition, got %+v", actions)
	}
}

func TestDynamicPanelFactoryWorkflowLookupUsesResolvedWorkflowID(t *testing.T) {
	engine := NewSimpleWorkflowEngine()
	engine.RegisterWorkflow("editorial.news", WorkflowDefinition{
		EntityType:   "editorial.news",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "submit_for_approval", From: "draft", To: "approval"},
			{Name: "publish", From: "approval", To: "published"},
		},
	})

	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	adm.WithWorkflow(engine)
	factory := NewDynamicPanelFactory(adm)

	panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
		ID:     "ct-news",
		Name:   "News",
		Slug:   "news",
		Status: "active",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"panel_slug":   "newsroom",
			"panel_traits": []any{"editorial"},
			"translations": true,
			"workflow_id":  "editorial.news",
		},
	})
	if err != nil {
		t.Fatalf("create panel failed: %v", err)
	}
	if panel.workflow == nil {
		t.Fatalf("expected workflow attached from resolved workflow_id")
	}

	transitions, err := panel.workflow.AvailableTransitions(context.Background(), panel.name, "draft")
	if err != nil {
		t.Fatalf("available transitions failed: %v", err)
	}
	if !hasTransition(transitions, "submit_for_approval") {
		t.Fatalf("expected transition from resolved workflow ID, got %+v", transitions)
	}
	if !hasAction(panel.Schema().Actions, "submit_for_approval") || !hasAction(panel.Schema().Actions, "publish") {
		t.Fatalf("expected editorial workflow actions from resolved workflow ID, got %+v", panel.Schema().Actions)
	}
}

func TestDynamicPanelFactoryWorkflowResolutionPrecedenceRegression(t *testing.T) {
	t.Run("legacy workflow still works", func(t *testing.T) {
		engine := NewSimpleWorkflowEngine()
		engine.RegisterWorkflow("legacy.pages", WorkflowDefinition{
			EntityType:   "legacy.pages",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish", From: "draft", To: "published"},
			},
		})
		engine.RegisterWorkflow("editorial.default", WorkflowDefinition{
			EntityType:   "editorial.default",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "submit_for_approval", From: "draft", To: "approval"},
				{Name: "publish", From: "approval", To: "published"},
			},
		})

		adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
		adm.WithWorkflow(engine)
		adm.WithTraitWorkflowDefaults(map[string]string{"editorial": "editorial.default"})
		factory := NewDynamicPanelFactory(adm)

		panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
			ID:     "ct-legacy",
			Name:   "Legacy",
			Slug:   "legacy",
			Status: "active",
			Schema: minimalContentTypeSchema(),
			Capabilities: map[string]any{
				"panel_slug":   "legacy",
				"panel_traits": []any{"editorial"},
				"translations": true,
				"workflow":     "legacy.pages",
			},
		})
		if err != nil {
			t.Fatalf("create panel failed: %v", err)
		}
		actions := panel.Schema().Actions
		if !hasAction(actions, "publish") {
			t.Fatalf("expected publish action from legacy workflow, got %+v", actions)
		}
		if hasAction(actions, "submit_for_approval") {
			t.Fatalf("did not expect submit_for_approval from legacy workflow-only transitions, got %+v", actions)
		}
	})

	t.Run("trait default works", func(t *testing.T) {
		engine := NewSimpleWorkflowEngine()
		engine.RegisterWorkflow("editorial.default", WorkflowDefinition{
			EntityType:   "editorial.default",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "submit_for_approval", From: "draft", To: "approval"},
				{Name: "publish", From: "approval", To: "published"},
			},
		})

		adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
		adm.WithWorkflow(engine)
		adm.WithTraitWorkflowDefaults(map[string]string{"editorial": "editorial.default"})
		factory := NewDynamicPanelFactory(adm)

		panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
			ID:     "ct-trait",
			Name:   "Trait",
			Slug:   "trait",
			Status: "active",
			Schema: minimalContentTypeSchema(),
			Capabilities: map[string]any{
				"panel_slug":   "trait",
				"panel_traits": []any{"editorial"},
				"translations": true,
			},
		})
		if err != nil {
			t.Fatalf("create panel failed: %v", err)
		}
		if !hasAction(panel.Schema().Actions, "submit_for_approval") || !hasAction(panel.Schema().Actions, "publish") {
			t.Fatalf("expected workflow actions from trait default, got %+v", panel.Schema().Actions)
		}
	})

	t.Run("explicit workflow_id override works", func(t *testing.T) {
		engine := NewSimpleWorkflowEngine()
		engine.RegisterWorkflow("editorial.default", WorkflowDefinition{
			EntityType:   "editorial.default",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish", From: "draft", To: "published"},
			},
		})
		engine.RegisterWorkflow("editorial.news", WorkflowDefinition{
			EntityType:   "editorial.news",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "submit_for_approval", From: "draft", To: "approval"},
				{Name: "publish", From: "approval", To: "published"},
			},
		})

		adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
		adm.WithWorkflow(engine)
		adm.WithTraitWorkflowDefaults(map[string]string{"editorial": "editorial.default"})
		factory := NewDynamicPanelFactory(adm)

		panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
			ID:     "ct-explicit",
			Name:   "Explicit",
			Slug:   "explicit",
			Status: "active",
			Schema: minimalContentTypeSchema(),
			Capabilities: map[string]any{
				"panel_slug":   "explicit",
				"panel_traits": []any{"editorial"},
				"translations": true,
				"workflow_id":  "editorial.news",
			},
		})
		if err != nil {
			t.Fatalf("create panel failed: %v", err)
		}
		if !hasAction(panel.Schema().Actions, "submit_for_approval") || !hasAction(panel.Schema().Actions, "publish") {
			t.Fatalf("expected workflow actions from explicit workflow_id override, got %+v", panel.Schema().Actions)
		}
	})

	t.Run("conflicting keys prefer workflow_id", func(t *testing.T) {
		engine := NewSimpleWorkflowEngine()
		engine.RegisterWorkflow("legacy.pages", WorkflowDefinition{
			EntityType:   "legacy.pages",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish", From: "draft", To: "published"},
			},
		})
		engine.RegisterWorkflow("editorial.news", WorkflowDefinition{
			EntityType:   "editorial.news",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "submit_for_approval", From: "draft", To: "approval"},
				{Name: "publish", From: "approval", To: "published"},
			},
		})

		adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
		adm.WithWorkflow(engine)
		factory := NewDynamicPanelFactory(adm)

		panel, err := factory.CreatePanelFromContentType(context.Background(), &CMSContentType{
			ID:     "ct-conflict",
			Name:   "Conflict",
			Slug:   "conflict",
			Status: "active",
			Schema: minimalContentTypeSchema(),
			Capabilities: map[string]any{
				"panel_slug":   "conflict",
				"panel_traits": []any{"editorial"},
				"translations": true,
				"workflow":     "legacy.pages",
				"workflow_id":  "editorial.news",
			},
		})
		if err != nil {
			t.Fatalf("create panel failed: %v", err)
		}
		actions := panel.Schema().Actions
		if !hasAction(actions, "submit_for_approval") || !hasAction(actions, "publish") {
			t.Fatalf("expected workflow_id transitions to win conflict, got %+v", actions)
		}
	})
}

func TestDynamicPanelFactoryConvergesLegacyNavigationItemToCanonicalID(t *testing.T) {
	ctx := context.Background()
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en", NavMenuCode: "admin.main"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	if adm.menuSvc == nil {
		t.Fatalf("menu service unavailable")
	}
	if err := adm.menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{
		ID:       "legacy.pages.item",
		Label:    "Pages",
		Icon:     "old-icon",
		Locale:   "en",
		Target:   map[string]any{"type": "url", "path": "/admin/content/pages"},
		Menu:     "admin.main",
		Position: intPtr(3),
	}); err != nil {
		t.Fatalf("seed existing menu item failed: %v", err)
	}

	factory := NewDynamicPanelFactory(adm)
	_, err := factory.CreatePanelFromContentType(ctx, &CMSContentType{
		ID:     "ct-page",
		Name:   "Page",
		Slug:   "page",
		Icon:   "file-text",
		Status: "active",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"panel_slug":  "pages",
			"permissions": "admin.pages",
		},
	})
	if err != nil {
		t.Fatalf("create panel failed: %v", err)
	}

	menu, err := adm.menuSvc.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("fetch menu failed: %v", err)
	}
	if _, ok := menuItemByID(menu.Items, "legacy.pages.item"); ok {
		t.Fatalf("expected legacy item to be replaced by canonical ID")
	}
	item, ok := menuItemByID(menu.Items, "admin_main.pages")
	if !ok {
		t.Fatalf("expected canonical pages menu item, got %+v", menu.Items)
	}
	if item.Icon != "file-text" {
		t.Fatalf("expected icon updated to file-text, got %q", item.Icon)
	}
	if len(item.Permissions) != 1 || item.Permissions[0] != "admin.pages.view" {
		t.Fatalf("expected permissions updated, got %+v", item.Permissions)
	}
	if countMenuItemsByPath(menu.Items, "/admin/content/pages") != 1 {
		t.Fatalf("expected single pages menu item after converge, got %+v", menu.Items)
	}
}

func TestDynamicPanelFactoryDoesNotRewriteContentParentOnPathCollision(t *testing.T) {
	ctx := context.Background()
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en", NavMenuCode: "admin.main"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	if adm.menuSvc == nil {
		t.Fatalf("menu service unavailable")
	}

	menuCode := "admin.main"
	mainGroupID := "admin_main.nav-group-main"
	contentID := "admin_main.nav-group-main.content"
	pagesID := "admin_main.nav-group-main.content.pages"

	if _, err := adm.menuSvc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := adm.menuSvc.AddMenuItem(ctx, menuCode, MenuItem{
		ID:            mainGroupID,
		Type:          MenuItemTypeGroup,
		GroupTitle:    "Navigation",
		GroupTitleKey: "menu.group.main",
		Menu:          menuCode,
		Locale:        "en",
	}); err != nil {
		t.Fatalf("add main group: %v", err)
	}
	if err := adm.menuSvc.AddMenuItem(ctx, menuCode, MenuItem{
		ID:          contentID,
		Type:        MenuItemTypeItem,
		Label:       "Content",
		LabelKey:    "menu.content",
		Icon:        "page",
		Menu:        menuCode,
		Locale:      "en",
		ParentID:    mainGroupID,
		Collapsible: true,
		Target: map[string]any{
			"type": "url",
			"path": "/admin/content/pages",
			"key":  "content",
		},
	}); err != nil {
		t.Fatalf("add content parent: %v", err)
	}
	if err := adm.menuSvc.AddMenuItem(ctx, menuCode, MenuItem{
		ID:       pagesID,
		Type:     MenuItemTypeItem,
		Label:    "Pages",
		LabelKey: "menu.content.pages",
		Menu:     menuCode,
		Locale:   "en",
		ParentID: contentID,
		Target: map[string]any{
			"type": "url",
			"path": "/admin/content/pages",
			"key":  "pages",
		},
	}); err != nil {
		t.Fatalf("add pages child: %v", err)
	}

	factory := NewDynamicPanelFactory(adm,
		WithDynamicPanelMenu("/admin", menuCode, contentID, "en"),
	)
	_, err := factory.CreatePanelFromContentType(ctx, &CMSContentType{
		ID:     "ct-page",
		Name:   "Page",
		Slug:   "page",
		Icon:   "file-text",
		Status: "active",
		Schema: minimalContentTypeSchema(),
		Capabilities: map[string]any{
			"panel_slug":  "pages",
			"permissions": "admin.pages",
		},
	})
	if err != nil {
		t.Fatalf("create panel failed: %v", err)
	}

	menu, err := adm.menuSvc.Menu(ctx, menuCode, "en")
	if err != nil {
		t.Fatalf("fetch menu failed: %v", err)
	}
	content, ok := menuItemByID(menu.Items, contentID)
	if !ok {
		t.Fatalf("expected content parent in menu, got %+v", menu.Items)
	}
	if content.ParentID != mainGroupID {
		t.Fatalf("expected content parent to remain under %s, got %s", mainGroupID, content.ParentID)
	}
	if toString(content.Target["key"]) != "content" {
		t.Fatalf("expected content parent target key to remain content, got %+v", content.Target)
	}
	if hasSelfParent(menu.Items) {
		t.Fatalf("expected no self-parent relationships after panel sync, got %+v", menu.Items)
	}
}

func TestDynamicPanelFactorySkipsUnknownWorkflowAndLogs(t *testing.T) {
	logger := &captureAdminLogger{}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{Logger: logger})
	factory := NewDynamicPanelFactory(adm)

	missing := CMSContentType{
		ID:           "ct-missing",
		Name:         "Missing Workflow",
		Slug:         "missing-workflow",
		Status:       "active",
		Schema:       minimalContentTypeSchema(),
		Capabilities: map[string]any{"panel_slug": "missing-workflow", "workflow": "unknown"},
	}

	panel, err := factory.CreatePanelFromContentType(context.Background(), &missing)
	if err != nil {
		t.Fatalf("create panel failed: %v", err)
	}
	if panel == nil {
		t.Fatalf("expected panel returned")
	}
	if panel.workflow != nil {
		t.Fatalf("expected no workflow attached for unknown workflow")
	}
	if got := logger.count("warn", "workflow not found"); got == 0 {
		t.Fatalf("expected workflow warning to be logged via injected logger")
	}
}

func assertWorkflowActions(t *testing.T, panel *Panel) {
	t.Helper()
	if panel == nil {
		t.Fatalf("panel is nil")
	}
	if panel.workflow == nil {
		t.Fatalf("expected workflow attached")
	}
	actions := panel.Schema().Actions
	if !hasAction(actions, "submit_for_approval") || !hasAction(actions, "publish") {
		t.Fatalf("expected workflow actions, got %+v", actions)
	}
	if !hasAction(actions, "view") || !hasAction(actions, "edit") || !hasAction(actions, "delete") {
		t.Fatalf("expected default CRUD actions, got %+v", actions)
	}
	transitions, err := panel.workflow.AvailableTransitions(context.Background(), panel.name, "draft")
	if err != nil {
		t.Fatalf("available transitions failed: %v", err)
	}
	if !hasTransition(transitions, "submit_for_approval") {
		t.Fatalf("expected submit_for_approval transition, got %+v", transitions)
	}
	transitions, err = panel.workflow.AvailableTransitions(context.Background(), panel.name, "approval")
	if err != nil {
		t.Fatalf("available transitions failed: %v", err)
	}
	if !hasTransition(transitions, "publish") {
		t.Fatalf("expected publish transition, got %+v", transitions)
	}
}

func findActionByName(actions []Action, name string) (Action, bool) {
	for _, action := range actions {
		if action.Name == name {
			return action, true
		}
	}
	return Action{}, false
}

func hasField(fields []Field, name string) bool {
	for _, field := range fields {
		if field.Name == name {
			return true
		}
	}
	return false
}

func hasPanelFilter(filters []Filter, name string) bool {
	for _, filter := range filters {
		if filter.Name == name {
			return true
		}
	}
	return false
}

func menuItemByID(items []MenuItem, id string) (MenuItem, bool) {
	for _, item := range items {
		if item.ID == id {
			return item, true
		}
		if len(item.Children) > 0 {
			if nested, ok := menuItemByID(item.Children, id); ok {
				return nested, true
			}
		}
	}
	return MenuItem{}, false
}

func countMenuItemsByPath(items []MenuItem, targetPath string) int {
	count := 0
	for _, item := range items {
		if toString(item.Target["path"]) == targetPath {
			count++
		}
		count += countMenuItemsByPath(item.Children, targetPath)
	}
	return count
}

func hasSelfParent(items []MenuItem) bool {
	for _, item := range items {
		if strings.TrimSpace(item.ID) != "" && strings.TrimSpace(item.ID) == strings.TrimSpace(item.ParentID) {
			return true
		}
		if len(item.Children) > 0 && hasSelfParent(item.Children) {
			return true
		}
	}
	return false
}
