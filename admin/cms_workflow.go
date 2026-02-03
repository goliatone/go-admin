package admin

func resolveCMSWorkflowEngine(a *Admin) WorkflowEngine {
	if a == nil {
		return nil
	}
	if a.workflow != nil {
		return a.workflow
	}
	engine := NewSimpleWorkflowEngine()
	registerCMSWorkflow(engine)
	return engine
}

func registerCMSWorkflow(engine *SimpleWorkflowEngine) {
	if engine == nil {
		return
	}
	definition := WorkflowDefinition{
		EntityType:   "content",
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
	engine.RegisterWorkflow("content", definition)
	definition.EntityType = "pages"
	engine.RegisterWorkflow("pages", definition)

	engine.RegisterWorkflow("block_definitions", WorkflowDefinition{
		EntityType:   "block_definitions",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{
				Name:        "publish",
				Description: "Publish",
				From:        "draft",
				To:          "active",
			},
			{
				Name:        "deprecate",
				Description: "Deprecate",
				From:        "active",
				To:          "deprecated",
			},
			{
				Name:        "republish",
				Description: "Republish",
				From:        "deprecated",
				To:          "active",
			},
		},
	})

	engine.RegisterWorkflow("content_types", WorkflowDefinition{
		EntityType:   "content_types",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{
				Name:        "publish",
				Description: "Publish",
				From:        "draft",
				To:          "active",
			},
			{
				Name:        "deprecate",
				Description: "Deprecate",
				From:        "active",
				To:          "deprecated",
			},
			{
				Name:        "republish",
				Description: "Republish",
				From:        "deprecated",
				To:          "active",
			},
		},
	})
}

func cmsWorkflowActions() []Action {
	return []Action{
		{Name: "submit_for_approval", Label: "Submit for approval"},
		{Name: "publish", Label: "Publish"},
	}
}
