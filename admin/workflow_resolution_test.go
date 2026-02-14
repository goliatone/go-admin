package admin

import (
	"context"
	"reflect"
	"testing"
)

func TestResolveWorkflowIDForContentTypePrefersWorkflowID(t *testing.T) {
	resolution := resolveWorkflowIDForContentType(map[string]any{
		"workflow_id": "editorial.news",
		"workflow":    "legacy.pages",
		"panel_traits": []any{
			"editorial",
		},
	}, map[string]string{
		"editorial": "editorial.default",
	})
	if resolution.id != "editorial.news" {
		t.Fatalf("expected workflow_id to win, got %q", resolution.id)
	}
	if resolution.source != workflowResolutionSourceWorkflowID {
		t.Fatalf("expected source %q, got %q", workflowResolutionSourceWorkflowID, resolution.source)
	}
}

func TestResolveWorkflowIDForContentTypeSupportsWorkflowIDAliases(t *testing.T) {
	tests := []struct {
		name         string
		capabilities map[string]any
	}{
		{
			name: "camelCase",
			capabilities: map[string]any{
				"workflowId": "editorial.news",
			},
		},
		{
			name: "kebabCase",
			capabilities: map[string]any{
				"workflow-id": "editorial.news",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resolution := resolveWorkflowIDForContentType(tt.capabilities, nil)
			if resolution.id != "editorial.news" {
				t.Fatalf("expected alias to resolve workflow_id, got %q", resolution.id)
			}
			if resolution.source != workflowResolutionSourceWorkflowID {
				t.Fatalf("expected source %q, got %q", workflowResolutionSourceWorkflowID, resolution.source)
			}
		})
	}
}

func TestResolveWorkflowIDForContentTypeFallsBackToTraitDefaultDeterministically(t *testing.T) {
	capabilities := map[string]any{
		"panel_traits": map[string]any{
			"zeta":     true,
			" alpha ":  true,
			"disabled": false,
		},
		"panel_preset": "Editorial",
	}
	resolution := resolveWorkflowIDForContentType(capabilities, map[string]string{
		"zeta":      "editorial.zeta",
		"editorial": "editorial.default",
	})
	if resolution.id != "editorial.zeta" {
		t.Fatalf("expected zeta trait default, got %q", resolution.id)
	}
	if resolution.source != workflowResolutionSourceTraitDefault {
		t.Fatalf("expected source %q, got %q", workflowResolutionSourceTraitDefault, resolution.source)
	}
	expectedTraits := []string{"alpha", "zeta", "editorial"}
	if !reflect.DeepEqual(resolution.traits, expectedTraits) {
		t.Fatalf("expected traits %v, got %v", expectedTraits, resolution.traits)
	}
}

func TestResolveWorkflowIDForContentTypeFallsBackToLegacyWorkflow(t *testing.T) {
	resolution := resolveWorkflowIDForContentType(map[string]any{
		"workflow": "legacy.pages",
	}, nil)
	if resolution.id != "legacy.pages" {
		t.Fatalf("expected legacy workflow fallback, got %q", resolution.id)
	}
	if resolution.source != workflowResolutionSourceWorkflow {
		t.Fatalf("expected source %q, got %q", workflowResolutionSourceWorkflow, resolution.source)
	}
}

func TestWorkflowEngineForContentTypePrefersWorkflowIDCapability(t *testing.T) {
	engine := NewSimpleWorkflowEngine()
	engine.RegisterWorkflow("legacy.pages", WorkflowDefinition{
		EntityType:   "legacy.pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "legacy_publish", From: "draft", To: "published"},
		},
	})
	engine.RegisterWorkflow("editorial.news", WorkflowDefinition{
		EntityType:   "editorial.news",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "canonical_publish", From: "draft", To: "published"},
		},
	})

	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	adm.WithWorkflow(engine)

	workflow := workflowEngineForContentType(context.Background(), adm, &CMSContentType{
		Slug: "news",
		Capabilities: map[string]any{
			"workflow_id": "editorial.news",
			"workflow":    "legacy.pages",
		},
	})
	if workflow == nil {
		t.Fatalf("expected workflow to resolve")
	}

	transitions, err := workflow.AvailableTransitions(context.Background(), "ignored", "draft")
	if err != nil {
		t.Fatalf("available transitions failed: %v", err)
	}
	if !hasTransition(transitions, "canonical_publish") {
		t.Fatalf("expected canonical workflow transitions, got %+v", transitions)
	}
	if hasTransition(transitions, "legacy_publish") {
		t.Fatalf("did not expect legacy workflow transitions, got %+v", transitions)
	}
}

func TestAdminWithTraitWorkflowDefaultsNormalizesAndClones(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})

	input := map[string]string{
		" Editorial ": " editorial.default ",
		"":            "ignored",
		"news":        "",
	}
	adm.WithTraitWorkflowDefaults(input)
	input["editorial"] = "mutated"

	defaults := adm.traitWorkflowDefaultsForLookup()
	if got := defaults["editorial"]; got != "editorial.default" {
		t.Fatalf("expected normalized trait defaults clone, got %+v", defaults)
	}
	if _, ok := defaults[""]; ok {
		t.Fatalf("expected empty trait key removed, got %+v", defaults)
	}
	if _, ok := defaults["news"]; ok {
		t.Fatalf("expected empty workflow ID removed, got %+v", defaults)
	}

	defaults["editorial"] = "changed"
	next := adm.traitWorkflowDefaultsForLookup()
	if got := next["editorial"]; got != "editorial.default" {
		t.Fatalf("expected snapshot clone from admin defaults, got %+v", next)
	}
}

func TestWorkflowEngineForContentTypeUsesAdminTraitWorkflowDefaults(t *testing.T) {
	engine := NewSimpleWorkflowEngine()
	engine.RegisterWorkflow("editorial.default", WorkflowDefinition{
		EntityType:   "editorial.default",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "publish", From: "draft", To: "published"},
		},
	})

	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	adm.WithWorkflow(engine)
	adm.WithTraitWorkflowDefaults(map[string]string{
		"editorial": "editorial.default",
	})

	workflow := workflowEngineForContentType(context.Background(), adm, &CMSContentType{
		Slug: "news",
		Capabilities: map[string]any{
			"panel_traits": []any{"editorial"},
		},
	})
	if workflow == nil {
		t.Fatalf("expected workflow resolved from trait defaults")
	}

	transitions, err := workflow.AvailableTransitions(context.Background(), "ignored", "draft")
	if err != nil {
		t.Fatalf("available transitions failed: %v", err)
	}
	if !hasTransition(transitions, "publish") {
		t.Fatalf("expected workflow transitions from trait default, got %+v", transitions)
	}
}

func TestWorkflowEngineForContentTypeUsesPersistedBindingPrecedence(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	engine := NewSimpleWorkflowEngine()
	adm.WithWorkflow(engine)
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())
	adm.WithWorkflowRuntime(runtime)

	register := func(id, transition string) {
		_, err := runtime.CreateWorkflow(context.Background(), PersistedWorkflow{
			ID:     id,
			Name:   id,
			Status: WorkflowStatusActive,
			Definition: WorkflowDefinition{
				InitialState: "draft",
				Transitions: []WorkflowTransition{
					{Name: transition, From: "draft", To: "published"},
				},
			},
		})
		if err != nil {
			t.Fatalf("create workflow %s: %v", id, err)
		}
	}
	register("editorial.global", "publish_global")
	register("editorial.trait", "publish_trait")
	register("editorial.news", "publish_news")

	_, err := runtime.CreateBinding(context.Background(), WorkflowBinding{
		ScopeType:  WorkflowBindingScopeGlobal,
		WorkflowID: "editorial.global",
		Priority:   100,
		Status:     WorkflowBindingStatusActive,
	})
	if err != nil {
		t.Fatalf("create global binding: %v", err)
	}
	_, err = runtime.CreateBinding(context.Background(), WorkflowBinding{
		ScopeType:  WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "editorial.trait",
		Priority:   50,
		Status:     WorkflowBindingStatusActive,
	})
	if err != nil {
		t.Fatalf("create trait binding: %v", err)
	}
	_, err = runtime.CreateBinding(context.Background(), WorkflowBinding{
		ScopeType:  WorkflowBindingScopeContentType,
		ScopeRef:   "news",
		WorkflowID: "editorial.news",
		Priority:   10,
		Status:     WorkflowBindingStatusActive,
	})
	if err != nil {
		t.Fatalf("create content-type binding: %v", err)
	}

	workflow := workflowEngineForContentType(context.Background(), adm, &CMSContentType{
		Slug: "news",
		Capabilities: map[string]any{
			"panel_traits": []any{"editorial"},
		},
	})
	if workflow == nil {
		t.Fatalf("expected persisted binding workflow")
	}
	transitions, err := workflow.AvailableTransitions(context.Background(), "ignored", "draft")
	if err != nil {
		t.Fatalf("available transitions failed: %v", err)
	}
	if !hasTransition(transitions, "publish_news") {
		t.Fatalf("expected content_type binding transition, got %+v", transitions)
	}
}

func TestWorkflowEngineForContentTypeExplicitWorkflowIDStillWinsPersistedBindings(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	engine := NewSimpleWorkflowEngine()
	adm.WithWorkflow(engine)
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())
	adm.WithWorkflowRuntime(runtime)

	_, err := runtime.CreateWorkflow(context.Background(), PersistedWorkflow{
		ID:     "editorial.bound",
		Name:   "editorial.bound",
		Status: WorkflowStatusActive,
		Definition: WorkflowDefinition{
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish_bound", From: "draft", To: "published"},
			},
		},
	})
	if err != nil {
		t.Fatalf("create bound workflow: %v", err)
	}
	_, err = runtime.CreateWorkflow(context.Background(), PersistedWorkflow{
		ID:     "editorial.explicit",
		Name:   "editorial.explicit",
		Status: WorkflowStatusActive,
		Definition: WorkflowDefinition{
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish_explicit", From: "draft", To: "published"},
			},
		},
	})
	if err != nil {
		t.Fatalf("create explicit workflow: %v", err)
	}

	_, err = runtime.CreateBinding(context.Background(), WorkflowBinding{
		ScopeType:  WorkflowBindingScopeContentType,
		ScopeRef:   "news",
		WorkflowID: "editorial.bound",
		Priority:   10,
		Status:     WorkflowBindingStatusActive,
	})
	if err != nil {
		t.Fatalf("create binding: %v", err)
	}

	workflow := workflowEngineForContentType(context.Background(), adm, &CMSContentType{
		Slug: "news",
		Capabilities: map[string]any{
			"workflow_id": "editorial.explicit",
		},
	})
	if workflow == nil {
		t.Fatalf("expected workflow")
	}
	transitions, err := workflow.AvailableTransitions(context.Background(), "ignored", "draft")
	if err != nil {
		t.Fatalf("available transitions failed: %v", err)
	}
	if !hasTransition(transitions, "publish_explicit") {
		t.Fatalf("expected explicit workflow transition, got %+v", transitions)
	}
	if hasTransition(transitions, "publish_bound") {
		t.Fatalf("did not expect persisted binding workflow to override explicit workflow")
	}
}
