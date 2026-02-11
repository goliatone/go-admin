package admin

import (
	"context"
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
			ID:           "ct-page",
			Name:         "Page",
			Slug:         "page",
			Status:       "active",
			Schema:       minimalContentTypeSchema(),
			Capabilities: map[string]any{"panel_slug": "pages", "workflow": "pages"},
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
			ID:           "ct-blog",
			Name:         "Blog Post",
			Slug:         "blog_post",
			Status:       "active",
			Schema:       minimalContentTypeSchema(),
			Capabilities: map[string]any{"panel_slug": "posts", "workflow": "posts"},
		}

		panel, err := factory.CreatePanelFromContentType(context.Background(), &blogPost)
		if err != nil {
			t.Fatalf("create blog_post panel failed: %v", err)
		}
		assertWorkflowActions(t, panel)
	})
}

func TestDynamicPanelFactoryAddsCreateTranslationActionForPagesAndPosts(t *testing.T) {
	tests := []struct {
		name         string
		contentType  CMSContentType
		expectedSlug string
	}{
		{
			name: "pages",
			contentType: CMSContentType{
				ID:           "ct-page",
				Name:         "Page",
				Slug:         "page",
				Status:       "active",
				Schema:       minimalContentTypeSchema(),
				Capabilities: map[string]any{"panel_slug": "pages", "workflow": "pages"},
			},
			expectedSlug: "pages",
		},
		{
			name: "posts",
			contentType: CMSContentType{
				ID:           "ct-post",
				Name:         "Post",
				Slug:         "post",
				Status:       "active",
				Schema:       minimalContentTypeSchema(),
				Capabilities: map[string]any{"panel_slug": "posts", "workflow": "posts"},
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
