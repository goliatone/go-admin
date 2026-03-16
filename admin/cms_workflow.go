package admin

// WorkflowRegistrar registers workflow definitions for entity types.
type WorkflowRegistrar interface {
	RegisterWorkflow(entityType string, definition WorkflowDefinition) error
}

// WorkflowUnregistrar removes workflow definitions for entity types.
type WorkflowUnregistrar interface {
	UnregisterWorkflow(entityType string) error
}

// WorkflowDefinitionChecker reports whether a workflow exists for an entity type.
type WorkflowDefinitionChecker interface {
	HasWorkflow(entityType string) bool
}

// WorkflowDefinitionProvider exposes registered workflow definitions for introspection.
type WorkflowDefinitionProvider interface {
	WorkflowDefinition(entityType string) (WorkflowDefinition, bool)
}

func resolveCMSWorkflowEngine(a *Admin) WorkflowEngine {
	if a == nil {
		return nil
	}
	if a.workflow != nil {
		applyCMSWorkflowDefaults(a)
		return a.workflow
	}
	opts := []FSMWorkflowEngineOption{}
	if a.activity != nil {
		opts = append(opts, WithFSMWorkflowActivitySink(a.activity))
	}
	engine := NewFSMWorkflowEngine(opts...)
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
		_ = registrar.RegisterWorkflow(definition.EntityType, definition)
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
		blockDefinitionsWorkflow,
		contentTypesWorkflow,
	}
}

// DefaultCMSWorkflowActions returns the default workflow actions for CMS demo panels.
func DefaultCMSWorkflowActions() []Action {
	return []Action{
		{Name: "view", Label: "View", Scope: ActionScopeRow},
		{
			Name:            "view_family",
			Label:           "View Family",
			Type:            "navigation",
			Href:            "{translation_family_url}",
			Scope:           ActionScopeRow,
			ContextRequired: []string{"translation_family_url"},
			Icon:            "git-branch",
		},
		{Name: "edit", Label: "Edit", Scope: ActionScopeAny},
		{Name: "delete", Label: "Delete", Variant: "danger", Scope: ActionScopeAny},
		{
			Name:            CreateTranslationKey,
			Label:           "Add Translation",
			Scope:           ActionScopeAny,
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
		{Name: "submit_for_approval", Label: "Submit for approval", Scope: ActionScopeAny},
		{Name: "publish", Label: "Publish", Scope: ActionScopeAny},
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
