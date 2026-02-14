package admin

// WorkflowRegistrar registers workflow definitions for entity types.
type WorkflowRegistrar interface {
	RegisterWorkflow(entityType string, definition WorkflowDefinition)
}

// WorkflowDefinitionChecker reports whether a workflow exists for an entity type.
type WorkflowDefinitionChecker interface {
	HasWorkflow(entityType string) bool
}

func resolveCMSWorkflowEngine(a *Admin) WorkflowEngine {
	if a == nil {
		return nil
	}
	if a.workflow != nil {
		applyCMSWorkflowDefaults(a)
		return a.workflow
	}
	engine := NewSimpleWorkflowEngine()
	RegisterDefaultCMSWorkflows(engine)
	a.workflow = engine
	return a.workflow
}

func applyCMSWorkflowDefaults(a *Admin) {
	if a == nil || !a.cmsWorkflowDefaults || a.workflow == nil {
		return
	}
	registrar, ok := a.workflow.(WorkflowRegistrar)
	if !ok {
		return
	}
	if _, ok := registrar.(WorkflowDefinitionChecker); !ok {
		return
	}
	RegisterDefaultCMSWorkflows(registrar)
}

// RegisterDefaultCMSWorkflows registers the default CMS workflow definitions.
// If the registrar supports WorkflowDefinitionChecker, existing definitions are preserved.
func RegisterDefaultCMSWorkflows(registrar WorkflowRegistrar) {
	if registrar == nil {
		return
	}
	var checker WorkflowDefinitionChecker
	if typed, ok := registrar.(WorkflowDefinitionChecker); ok {
		checker = typed
	}
	for _, definition := range defaultCMSWorkflowDefinitions() {
		if checker != nil && checker.HasWorkflow(definition.EntityType) {
			continue
		}
		registrar.RegisterWorkflow(definition.EntityType, definition)
	}
}

func defaultCMSWorkflowDefinitions() []WorkflowDefinition {
	contentWorkflow := WorkflowDefinition{
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
	pagesWorkflow := contentWorkflow
	pagesWorkflow.EntityType = "pages"

	blockDefinitionsWorkflow := WorkflowDefinition{
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
	}

	contentTypesWorkflow := WorkflowDefinition{
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
	}

	return []WorkflowDefinition{
		contentWorkflow,
		pagesWorkflow,
		blockDefinitionsWorkflow,
		contentTypesWorkflow,
	}
}

// DefaultCMSWorkflowActions returns the default workflow actions for CMS demo panels.
func DefaultCMSWorkflowActions() []Action {
	return []Action{
		{Name: "view", Label: "View"},
		{Name: "edit", Label: "Edit"},
		{Name: "delete", Label: "Delete", Variant: "danger"},
		{
			Name:            CreateTranslationKey,
			Label:           "Add Translation",
			PayloadRequired: []string{"locale"},
			PayloadSchema: map[string]any{
				"type":                 "object",
				"additionalProperties": false,
				"required":             []string{"locale"},
				"properties": map[string]any{
					"locale": map[string]any{
						"type": "string",
					},
				},
			},
		},
		{Name: "submit_for_approval", Label: "Submit for approval"},
		{Name: "publish", Label: "Publish"},
	}
}

func resolveCMSWorkflowActions(a *Admin) []Action {
	if a == nil {
		return nil
	}
	if a.cmsWorkflowActionsSet {
		return append([]Action{}, a.cmsWorkflowActions...)
	}
	return DefaultCMSWorkflowActions()
}
