package admin

func minimalContentTypeSchema() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{"type": "string"},
		},
	}
}

func workflowEngineWithPagesAndPosts() *SimpleWorkflowEngine {
	engine := NewSimpleWorkflowEngine()
	base := WorkflowDefinition{
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{
				Name:        "submit_for_approval",
				Description: "Submit for approval",
				From:        "draft",
				To:          "approval",
			},
			{
				Name:        "publish",
				Description: "Publish",
				From:        "approval",
				To:          "published",
			},
		},
	}
	pages := base
	pages.EntityType = "pages"
	engine.RegisterWorkflow("pages", pages)

	posts := base
	posts.EntityType = "posts"
	engine.RegisterWorkflow("posts", posts)
	return engine
}

func workflowEngineWithPagesPostsAndNews() *SimpleWorkflowEngine {
	engine := workflowEngineWithPagesAndPosts()
	news := WorkflowDefinition{
		EntityType:   "news",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{
				Name:        "submit_for_approval",
				Description: "Submit for approval",
				From:        "draft",
				To:          "approval",
			},
			{
				Name:        "publish",
				Description: "Publish",
				From:        "approval",
				To:          "published",
			},
		},
	}
	engine.RegisterWorkflow("news", news)
	return engine
}

func hasAction(actions []Action, name string) bool {
	for _, action := range actions {
		if action.Name == name {
			return true
		}
	}
	return false
}

func hasTransition(transitions []WorkflowTransition, name string) bool {
	for _, transition := range transitions {
		if transition.Name == name {
			return true
		}
	}
	return false
}
