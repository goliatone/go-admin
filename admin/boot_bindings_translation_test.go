package admin

import (
	"context"
	"errors"
	"fmt"
	"testing"

	router "github.com/goliatone/go-router"
)

type translationActionRepoStub struct {
	records map[string]map[string]any
	created []map[string]any
	nextID  int
}

func (s *translationActionRepoStub) List(context.Context, ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (s *translationActionRepoStub) Get(_ context.Context, id string) (map[string]any, error) {
	if s.records == nil {
		return nil, ErrNotFound
	}
	record, ok := s.records[id]
	if !ok {
		return nil, ErrNotFound
	}
	return cloneAnyMap(record), nil
}

func (s *translationActionRepoStub) Create(_ context.Context, record map[string]any) (map[string]any, error) {
	s.nextID++
	id := fmt.Sprintf("page_%d", s.nextID)
	created := cloneAnyMap(record)
	created["id"] = id
	s.created = append(s.created, cloneAnyMap(created))
	if s.records == nil {
		s.records = map[string]map[string]any{}
	}
	s.records[id] = cloneAnyMap(created)
	return created, nil
}

func (s *translationActionRepoStub) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, ErrNotFound
}

func (s *translationActionRepoStub) Delete(context.Context, string) error {
	return ErrNotFound
}

type translationWorkflowStub struct{}

func (translationWorkflowStub) Transition(_ context.Context, input TransitionInput) (*TransitionResult, error) {
	return &TransitionResult{
		EntityID:   input.EntityID,
		EntityType: input.EntityType,
		Transition: input.Transition,
		FromState:  input.CurrentState,
		ToState:    input.TargetState,
	}, nil
}

func (translationWorkflowStub) AvailableTransitions(context.Context, string, string) ([]WorkflowTransition, error) {
	return []WorkflowTransition{{Name: "publish", To: "published"}}, nil
}

type translationWorkflowAliasStub struct {
	calls []string
}

func (s *translationWorkflowAliasStub) Transition(_ context.Context, input TransitionInput) (*TransitionResult, error) {
	s.calls = append(s.calls, input.Transition)
	return &TransitionResult{
		EntityID:   input.EntityID,
		EntityType: input.EntityType,
		Transition: input.Transition,
		FromState:  input.CurrentState,
		ToState:    input.TargetState,
	}, nil
}

func (s *translationWorkflowAliasStub) AvailableTransitions(context.Context, string, string) ([]WorkflowTransition, error) {
	return []WorkflowTransition{
		{Name: "request_approval", To: "pending_approval"},
		{Name: "approve", To: "published"},
	}, nil
}

func TestPanelBindingCreateTranslationReturnsStablePayload(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"page_123": {
				"id":                   "page_123",
				"title":                "Home",
				"slug":                 "home",
				"locale":               "en",
				"status":               "approval",
				"translation_group_id": "tg_123",
				"available_locales":    []string{"en"},
			},
		},
	}
	feed := NewActivityFeed()
	panel := &Panel{
		name:     "pages",
		repo:     repo,
		activity: feed,
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	data, err := binding.Action(c, "en", "create_translation", map[string]any{
		"id":     "page_123",
		"locale": "es",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if data["locale"] != "es" {
		t.Fatalf("expected locale es, got %v", data["locale"])
	}
	if data["translation_group_id"] != "tg_123" {
		t.Fatalf("expected translation_group_id tg_123, got %v", data["translation_group_id"])
	}
	if data["status"] != "draft" {
		t.Fatalf("expected status draft, got %v", data["status"])
	}
	if _, ok := data["id"].(string); !ok {
		t.Fatalf("expected response id, got %v", data["id"])
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected one created record, got %d", len(repo.created))
	}
	if got := repo.created[0]["translation_group_id"]; got != "tg_123" {
		t.Fatalf("expected created translation_group_id tg_123, got %v", got)
	}
	entries, err := feed.List(context.Background(), 10)
	if err != nil {
		t.Fatalf("activity list: %v", err)
	}
	if len(entries) == 0 || entries[0].Action != "panel.translation.create" {
		t.Fatalf("expected panel.translation.create activity entry, got %+v", entries)
	}
}

func TestPanelBindingCreateTranslationDuplicateReturnsTypedError(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"page_123": {
				"id":                   "page_123",
				"locale":               "en",
				"translation_group_id": "tg_123",
				"available_locales":    []string{"en", "es"},
			},
		},
	}
	panel := &Panel{name: "pages", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "create_translation", map[string]any{
		"id":     "page_123",
		"locale": "es",
	})
	if err == nil {
		t.Fatalf("expected duplicate error")
	}
	var dup TranslationAlreadyExistsError
	if !errors.As(err, &dup) {
		t.Fatalf("expected TranslationAlreadyExistsError, got %T", err)
	}
	if dup.Locale != "es" {
		t.Fatalf("expected duplicate locale es, got %q", dup.Locale)
	}
	if len(repo.created) != 0 {
		t.Fatalf("expected no create call on duplicate, got %d", len(repo.created))
	}
}

func TestPanelBindingLogsBlockedWorkflowTransition(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"page_123": {
				"id":                   "page_123",
				"status":               "approval",
				"locale":               "en",
				"translation_group_id": "tg_123",
			},
		},
	}
	feed := NewActivityFeed()
	panel := &Panel{
		name:     "pages",
		repo:     repo,
		workflow: translationWorkflowStub{},
		actions:  []Action{{Name: "publish"}},
		activity: feed,
		translationPolicy: TranslationPolicyFunc(func(context.Context, TranslationPolicyInput) error {
			return MissingTranslationsError{
				EntityType:      "pages",
				EntityID:        "page_123",
				Transition:      "publish",
				RequestedLocale: "en",
				MissingLocales:  []string{"es"},
			}
		}),
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "publish", map[string]any{
		"id":     "page_123",
		"locale": "en",
	})
	if err == nil {
		t.Fatalf("expected translation policy blocker")
	}
	if !errors.Is(err, ErrMissingTranslations) {
		t.Fatalf("expected ErrMissingTranslations, got %v", err)
	}
	entries, err := feed.List(context.Background(), 10)
	if err != nil {
		t.Fatalf("activity list: %v", err)
	}
	if len(entries) == 0 {
		t.Fatalf("expected blocked transition activity entry")
	}
	if entries[0].Action != "panel.transition.blocked" {
		t.Fatalf("expected panel.transition.blocked action, got %q", entries[0].Action)
	}
	if entries[0].Metadata["transition"] != "publish" {
		t.Fatalf("expected transition publish metadata, got %+v", entries[0].Metadata)
	}
}

func TestPanelBindingWorkflowActionAliasesSupportLegacyTransitions(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"page_123": {
				"id":                   "page_123",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_123",
			},
		},
	}
	workflow := &translationWorkflowAliasStub{}
	panel := &Panel{
		name:     "pages",
		repo:     repo,
		workflow: workflow,
		actions: []Action{
			{Name: "submit_for_approval"},
			{Name: "publish"},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	if _, err := binding.Action(c, "en", "submit_for_approval", map[string]any{"id": "page_123"}); err != nil {
		t.Fatalf("submit_for_approval alias should resolve: %v", err)
	}
	if _, err := binding.Action(c, "en", "publish", map[string]any{"id": "page_123"}); err != nil {
		t.Fatalf("publish alias should resolve: %v", err)
	}

	if len(workflow.calls) != 2 {
		t.Fatalf("expected 2 workflow transitions, got %d (%+v)", len(workflow.calls), workflow.calls)
	}
	if workflow.calls[0] != "request_approval" {
		t.Fatalf("expected submit_for_approval to map to request_approval, got %q", workflow.calls[0])
	}
	if workflow.calls[1] != "approve" {
		t.Fatalf("expected publish to map to approve, got %q", workflow.calls[1])
	}
}

func TestPanelBindingPublishEnforcesTranslationPolicyForPagesAndPosts(t *testing.T) {
	tests := []struct {
		name      string
		panelName string
		entityID  string
	}{
		{name: "pages", panelName: "pages", entityID: "page_123"},
		{name: "posts", panelName: "posts", entityID: "post_123"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &translationActionRepoStub{
				records: map[string]map[string]any{
					tt.entityID: {
						"id":                   tt.entityID,
						"status":               "approval",
						"locale":               "en",
						"translation_group_id": "tg_123",
					},
				},
			}
			var received TranslationPolicyInput
			panel := &Panel{
				name:     tt.panelName,
				repo:     repo,
				workflow: translationWorkflowStub{},
				actions:  []Action{{Name: "publish"}},
				translationPolicy: TranslationPolicyFunc(func(_ context.Context, input TranslationPolicyInput) error {
					received = input
					return MissingTranslationsError{
						EntityType:      input.EntityType,
						PolicyEntity:    input.PolicyEntity,
						EntityID:        input.EntityID,
						Transition:      input.Transition,
						Environment:     input.Environment,
						RequestedLocale: input.RequestedLocale,
						MissingLocales:  []string{"es"},
					}
				}),
			}
			binding := &panelBinding{
				admin: &Admin{config: Config{DefaultLocale: "en"}},
				name:  tt.panelName,
				panel: panel,
			}
			c := router.NewMockContext()
			c.QueriesM["environment"] = "production"
			c.On("Context").Return(context.Background())

			_, err := binding.Action(c, "en", "publish", map[string]any{
				"id":     tt.entityID,
				"locale": "en",
			})
			if err == nil {
				t.Fatalf("expected translation policy blocker")
			}
			if !errors.Is(err, ErrMissingTranslations) {
				t.Fatalf("expected ErrMissingTranslations, got %v", err)
			}
			if received.EntityType != tt.panelName {
				t.Fatalf("expected entity type %q, got %q", tt.panelName, received.EntityType)
			}
			if received.PolicyEntity != tt.panelName {
				t.Fatalf("expected policy entity %q, got %q", tt.panelName, received.PolicyEntity)
			}
			if received.Transition != "publish" {
				t.Fatalf("expected transition publish, got %q", received.Transition)
			}
			if received.Environment != "production" {
				t.Fatalf("expected environment production, got %q", received.Environment)
			}
		})
	}
}
