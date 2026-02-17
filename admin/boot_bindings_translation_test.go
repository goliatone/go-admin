package admin

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin/internal/boot"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type translationActionRepoStub struct {
	records                 map[string]map[string]any
	created                 []map[string]any
	list                    []map[string]any
	nextID                  int
	createTranslationCalls  int
	createTranslationInput  TranslationCreateInput
	createTranslationResult map[string]any
	createTranslationErr    error
}

func (s *translationActionRepoStub) List(context.Context, ListOptions) ([]map[string]any, int, error) {
	if len(s.list) > 0 {
		out := make([]map[string]any, 0, len(s.list))
		for _, record := range s.list {
			out = append(out, cloneAnyMap(record))
		}
		return out, len(out), nil
	}
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

func (s *translationActionRepoStub) CreateTranslation(_ context.Context, input TranslationCreateInput) (map[string]any, error) {
	s.createTranslationCalls++
	s.createTranslationInput = input
	if s.createTranslationErr != nil {
		return nil, s.createTranslationErr
	}
	if s.createTranslationResult != nil {
		return cloneAnyMap(s.createTranslationResult), nil
	}
	return nil, ErrTranslationCreateUnsupported
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
	calls     []string
	entityIDs []string
}

func (s *translationWorkflowAliasStub) Transition(_ context.Context, input TransitionInput) (*TransitionResult, error) {
	s.calls = append(s.calls, input.Transition)
	s.entityIDs = append(s.entityIDs, input.EntityID)
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

type translationWorkflowStateStub struct {
	transitionsByState map[string][]WorkflowTransition
	err                error
}

func (s translationWorkflowStateStub) Transition(_ context.Context, input TransitionInput) (*TransitionResult, error) {
	return &TransitionResult{
		EntityID:   input.EntityID,
		EntityType: input.EntityType,
		Transition: input.Transition,
		FromState:  input.CurrentState,
		ToState:    input.TargetState,
	}, nil
}

func (s translationWorkflowStateStub) AvailableTransitions(_ context.Context, _ string, state string) ([]WorkflowTransition, error) {
	if s.err != nil {
		return nil, s.err
	}
	if len(s.transitionsByState) == 0 {
		return nil, nil
	}
	transitions := s.transitionsByState[state]
	out := make([]WorkflowTransition, len(transitions))
	copy(out, transitions)
	return out, nil
}

type readinessRequirementsPolicyRecorder struct {
	calls      int
	delay      time.Duration
	defaultReq TranslationRequirements
}

func (s *readinessRequirementsPolicyRecorder) Validate(context.Context, TranslationPolicyInput) error {
	return nil
}

func (s *readinessRequirementsPolicyRecorder) Requirements(_ context.Context, _ TranslationPolicyInput) (TranslationRequirements, bool, error) {
	s.calls++
	if s.delay > 0 {
		time.Sleep(s.delay)
	}
	return s.defaultReq, true, nil
}

func percentile95(samples []time.Duration) time.Duration {
	if len(samples) == 0 {
		return 0
	}
	out := append([]time.Duration{}, samples...)
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	idx := (len(out)*95 + 99) / 100
	if idx <= 0 {
		return out[0]
	}
	if idx > len(out) {
		idx = len(out)
	}
	return out[idx-1]
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

func TestPanelBindingCreateTranslationUsesRepositoryCommandWhenAvailable(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":                   "post_123",
				"title":                "Post",
				"slug":                 "post",
				"locale":               "en",
				"status":               "draft",
				"translation_group_id": "tg_123",
			},
		},
		createTranslationResult: map[string]any{
			"id":                   "post_456",
			"locale":               "es",
			"status":               "draft",
			"translation_group_id": "tg_123",
			"available_locales":    []string{"en", "es"},
			"requested_locale":     "es",
			"resolved_locale":      "es",
		},
	}
	panel := &Panel{name: "posts", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	data, err := binding.Action(c, "en", "create_translation", map[string]any{
		"id":     "post_123",
		"locale": "es",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.createTranslationCalls != 1 {
		t.Fatalf("expected one repository translation command call, got %d", repo.createTranslationCalls)
	}
	if len(repo.created) != 0 {
		t.Fatalf("expected legacy clone path to be skipped, got %d create calls", len(repo.created))
	}
	if data["id"] != "post_456" {
		t.Fatalf("expected response id post_456, got %v", data["id"])
	}
	if data["locale"] != "es" {
		t.Fatalf("expected locale es, got %v", data["locale"])
	}
	if got, ok := data["available_locales"].([]string); !ok || len(got) != 2 {
		t.Fatalf("expected available locales in response, got %T %v", data["available_locales"], data["available_locales"])
	}
	if data["requested_locale"] != "es" || data["resolved_locale"] != "es" {
		t.Fatalf("expected locale resolution metadata in response, got %+v", data)
	}
	if repo.createTranslationInput.SourceID != "post_123" {
		t.Fatalf("expected source id post_123, got %q", repo.createTranslationInput.SourceID)
	}
	if repo.createTranslationInput.Locale != "es" {
		t.Fatalf("expected target locale es, got %q", repo.createTranslationInput.Locale)
	}
}

func TestPanelBindingCreateTranslationReturnsErrorWhenRepositoryCommandUnsupported(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":                   "post_123",
				"title":                "Post",
				"slug":                 "post",
				"locale":               "en",
				"status":               "draft",
				"translation_group_id": "tg_123",
				"available_locales":    []string{"en"},
			},
		},
	}
	panel := &Panel{name: "posts", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "create_translation", map[string]any{
		"id":     "post_123",
		"locale": "fr",
	})
	if err == nil {
		t.Fatalf("expected unsupported translation create error")
	}
	if repo.createTranslationCalls != 1 {
		t.Fatalf("expected one repository translation command call, got %d", repo.createTranslationCalls)
	}
	if !errors.Is(err, ErrTranslationCreateUnsupported) {
		t.Fatalf("expected ErrTranslationCreateUnsupported, got %v", err)
	}
	if len(repo.created) != 0 {
		t.Fatalf("expected no legacy clone fallback create call, got %d", len(repo.created))
	}
}

func TestPanelBindingCreateTranslationAcceptsStrictSchemaWithContextFields(t *testing.T) {
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
	panel := &Panel{
		name: "pages",
		repo: repo,
		actions: []Action{
			{
				Name:            "create_translation",
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
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	data, err := binding.Action(c, "en", "create_translation", map[string]any{
		"id":            "page_123",
		"locale":        "es",
		"policy_entity": "pages",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if data["locale"] != "es" {
		t.Fatalf("expected locale es, got %v", data["locale"])
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

func TestPanelBindingCreateTranslationRepositoryCommandDuplicateReturnsTypedError(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":                   "post_123",
				"locale":               "en",
				"translation_group_id": "tg_123",
			},
		},
		createTranslationErr: TranslationAlreadyExistsError{
			Panel:              "posts",
			EntityID:           "post_123",
			Locale:             "fr",
			SourceLocale:       "en",
			TranslationGroupID: "tg_123",
		},
	}
	panel := &Panel{name: "posts", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "create_translation", map[string]any{
		"id":     "post_123",
		"locale": "fr",
	})
	if err == nil {
		t.Fatalf("expected duplicate error")
	}
	var dup TranslationAlreadyExistsError
	if !errors.As(err, &dup) {
		t.Fatalf("expected TranslationAlreadyExistsError, got %T", err)
	}
	if dup.Locale != "fr" {
		t.Fatalf("expected duplicate locale fr, got %q", dup.Locale)
	}
	if repo.createTranslationCalls != 1 {
		t.Fatalf("expected one repository translation command call, got %d", repo.createTranslationCalls)
	}
	if len(repo.created) != 0 {
		t.Fatalf("expected no legacy clone create call on duplicate, got %d", len(repo.created))
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

func TestPanelBindingWorkflowActionsUsePrimaryIDWhenSelectionContainsMultipleIDs(t *testing.T) {
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
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "submit_for_approval", map[string]any{
		"id":  "page_123",
		"ids": []any{"page_123", "page_456"},
	})
	if err != nil {
		t.Fatalf("submit_for_approval should resolve using primary id: %v", err)
	}
	if len(workflow.calls) != 1 || workflow.calls[0] != "request_approval" {
		t.Fatalf("expected request_approval transition, got %+v", workflow.calls)
	}
	if len(workflow.entityIDs) != 1 || workflow.entityIDs[0] != "page_123" {
		t.Fatalf("expected primary entity id page_123, got %+v", workflow.entityIDs)
	}
}

func TestPanelBindingWorkflowActionReturnsInvalidTransitionErrorWhenUnavailable(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":     "post_123",
				"status": "published",
			},
		},
	}
	panel := &Panel{
		name:     "posts",
		repo:     repo,
		workflow: translationWorkflowStateStub{transitionsByState: map[string][]WorkflowTransition{"published": {{Name: "unpublish", To: "draft"}}}},
		actions:  []Action{{Name: "submit_for_approval"}},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "submit_for_approval", map[string]any{"id": "post_123"})
	if err == nil {
		t.Fatalf("expected invalid transition error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected typed domain error, got %T", err)
	}
	if typedErr.TextCode != TextCodeWorkflowInvalidTransition {
		t.Fatalf("expected %s, got %q", TextCodeWorkflowInvalidTransition, typedErr.TextCode)
	}
	if got := toString(typedErr.Metadata["current_state"]); got != "published" {
		t.Fatalf("expected current_state published, got %q", got)
	}
	available, ok := typedErr.Metadata["available_transitions"].([]string)
	if !ok {
		t.Fatalf("expected []string available_transitions, got %#v", typedErr.Metadata["available_transitions"])
	}
	if len(available) != 1 || available[0] != "unpublish" {
		t.Fatalf("expected [unpublish], got %#v", available)
	}
}

func TestPanelBindingWorkflowActionReturnsWorkflowLookupError(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":     "post_123",
				"status": "draft",
			},
		},
	}
	panel := &Panel{
		name:     "posts",
		repo:     repo,
		workflow: translationWorkflowStateStub{err: ErrWorkflowNotFound},
		actions:  []Action{{Name: "submit_for_approval"}},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "submit_for_approval", map[string]any{"id": "post_123"})
	if err == nil {
		t.Fatalf("expected workflow lookup error")
	}
	if !errors.Is(err, ErrWorkflowNotFound) {
		t.Fatalf("expected ErrWorkflowNotFound, got %v", err)
	}
}

func TestPanelBindingWorkflowActionReturnsRecordLookupError(t *testing.T) {
	panel := &Panel{
		name:     "posts",
		repo:     &translationActionRepoStub{},
		workflow: translationWorkflowStateStub{},
		actions:  []Action{{Name: "submit_for_approval"}},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "submit_for_approval", map[string]any{"id": "post_missing"})
	if err == nil {
		t.Fatalf("expected record lookup error")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestPanelBindingCommandBackedActionKeepsFallbackWhenWorkflowTransitionUnavailable(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":     "post_123",
				"status": "published",
			},
		},
	}
	panel := &Panel{
		name:     "posts",
		repo:     repo,
		workflow: translationWorkflowStateStub{transitionsByState: map[string][]WorkflowTransition{"published": {{Name: "unpublish", To: "draft"}}}},
		actions:  []Action{{Name: "publish", CommandName: "posts.bulk_publish"}},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	_, err := binding.Action(c, "en", "publish", map[string]any{"id": "post_123"})
	if err == nil {
		t.Fatalf("expected fallback action error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected typed domain error, got %T", err)
	}
	if typedErr.TextCode != TextCodeNotFound {
		t.Fatalf("expected %s fallback, got %q", TextCodeNotFound, typedErr.TextCode)
	}
}

func TestPanelBindingListIncludesRowActionStateFromWorkflowAvailability(t *testing.T) {
	repo := &translationActionRepoStub{
		list: []map[string]any{
			{
				"id":     "post_123",
				"title":  "Published Post",
				"status": "published",
			},
		},
	}
	panel := &Panel{
		name:     "posts",
		repo:     repo,
		workflow: translationWorkflowStateStub{transitionsByState: map[string][]WorkflowTransition{"published": {{Name: "unpublish", To: "draft"}}}},
		actions: []Action{
			{Name: "submit_for_approval"},
			{Name: "publish"},
			{Name: "unpublish"},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	records, total, schemaAny, _, err := binding.List(c, "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(records) != 1 {
		t.Fatalf("expected one record, got total=%d len=%d", total, len(records))
	}
	schema, ok := schemaAny.(Schema)
	if !ok {
		t.Fatalf("expected schema payload, got %T", schemaAny)
	}
	if len(schema.Actions) != 5 {
		t.Fatalf("expected 5 row actions, got %+v", schema.Actions)
	}

	rawState, ok := records[0]["_action_state"]
	if !ok {
		t.Fatalf("expected _action_state on record: %#v", records[0])
	}
	state, ok := rawState.(map[string]map[string]any)
	if !ok {
		t.Fatalf("expected map[string]map[string]any action state, got %#v", rawState)
	}

	for _, action := range schema.Actions {
		entry, exists := state[action.Name]
		if !exists {
			t.Fatalf("expected _action_state entry for action %q, got %+v", action.Name, state)
		}
		enabled, enabledOK := entry["enabled"].(bool)
		if !enabledOK {
			t.Fatalf("expected enabled bool for action %q, got %+v", action.Name, entry["enabled"])
		}
		if !enabled {
			if strings.TrimSpace(toString(entry["reason"])) == "" {
				t.Fatalf("expected disabled reason for action %q, got %+v", action.Name, entry)
			}
			if strings.TrimSpace(toString(entry["reason_code"])) == "" {
				t.Fatalf("expected disabled reason_code for action %q, got %+v", action.Name, entry)
			}
		}
	}

	submitState := state["submit_for_approval"]
	if enabled, _ := submitState["enabled"].(bool); enabled {
		t.Fatalf("expected submit_for_approval disabled, got %#v", submitState)
	}
	if toString(submitState["reason_code"]) != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected %s, got %#v", ActionDisabledReasonCodeInvalidStatus, submitState["reason_code"])
	}

	publishState := state["publish"]
	if enabled, _ := publishState["enabled"].(bool); enabled {
		t.Fatalf("expected publish disabled, got %#v", publishState)
	}
	if toString(publishState["reason_code"]) != ActionDisabledReasonCodeInvalidStatus {
		t.Fatalf("expected %s, got %#v", ActionDisabledReasonCodeInvalidStatus, publishState["reason_code"])
	}

	unpublishState := state["unpublish"]
	if enabled, _ := unpublishState["enabled"].(bool); !enabled {
		t.Fatalf("expected unpublish enabled, got %#v", unpublishState)
	}
	available, ok := unpublishState["available_transitions"].([]string)
	if !ok {
		t.Fatalf("expected []string available_transitions, got %#v", unpublishState["available_transitions"])
	}
	if len(available) != 1 || available[0] != "unpublish" {
		t.Fatalf("expected [unpublish], got %#v", available)
	}
}

func TestPanelBindingListSetsTranslationMissingReasonCodeForBlockedPublish(t *testing.T) {
	repo := &translationActionRepoStub{
		list: []map[string]any{
			{
				"id":                   "post_123",
				"title":                "Published Post",
				"status":               "approval",
				"locale":               "en",
				"translation_group_id": "tg_123",
				"available_locales":    []string{"en"},
			},
		},
	}
	panel := &Panel{
		name: "posts",
		repo: repo,
		translationPolicy: readinessPolicyStub{
			ok: true,
			req: TranslationRequirements{
				Locales: []string{"en", "es"},
			},
		},
		workflow: translationWorkflowStateStub{
			transitionsByState: map[string][]WorkflowTransition{
				"approval": {{Name: "publish", To: "published"}},
			},
		},
		actions: []Action{
			{Name: "publish"},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	records, total, _, _, err := binding.List(c, "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(records) != 1 {
		t.Fatalf("expected one record, got total=%d len=%d", total, len(records))
	}

	rawState, ok := records[0]["_action_state"]
	if !ok {
		t.Fatalf("expected _action_state on record")
	}
	state, ok := rawState.(map[string]map[string]any)
	if !ok {
		t.Fatalf("expected map[string]map[string]any action state, got %#v", rawState)
	}
	publishState := state["publish"]
	if enabled, _ := publishState["enabled"].(bool); enabled {
		t.Fatalf("expected publish disabled by readiness, got %#v", publishState)
	}
	if toString(publishState["reason_code"]) != ActionDisabledReasonCodeTranslationMissing {
		t.Fatalf("expected %s, got %#v", ActionDisabledReasonCodeTranslationMissing, publishState["reason_code"])
	}
	if reason := strings.TrimSpace(toString(publishState["reason"])); !strings.Contains(reason, "ES") {
		t.Fatalf("expected locale details in reason, got %q", reason)
	}
}

func TestPanelBindingListAndDetailIncludeTranslationReadiness(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":                   "post_123",
				"title":                "Published Post",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
				"available_locales":    []string{"en", "es"},
			},
		},
		list: []map[string]any{
			{
				"id":                   "post_123",
				"title":                "Published Post",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
				"available_locales":    []string{"en", "es"},
			},
		},
	}
	panel := &Panel{
		name: "posts",
		repo: repo,
		translationPolicy: readinessPolicyStub{
			ok: true,
			req: TranslationRequirements{
				Locales: []string{"en", "es", "fr"},
			},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	records, _, _, _, err := binding.List(c, "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("expected one record, got %d", len(records))
	}
	readiness, ok := records[0]["translation_readiness"].(map[string]any)
	if !ok {
		t.Fatalf("expected translation_readiness on list record, got %#v", records[0]["translation_readiness"])
	}
	if state := toString(readiness["readiness_state"]); state != "missing_locales" {
		t.Fatalf("expected readiness_state missing_locales, got %q", state)
	}
	missing := toStringSlice(readiness["missing_required_locales"])
	if len(missing) != 1 || missing[0] != "fr" {
		t.Fatalf("expected missing_required_locales [fr], got %v", missing)
	}

	detail, err := binding.Detail(c, "en", "post_123")
	if err != nil {
		t.Fatalf("detail failed: %v", err)
	}
	data, _ := detail["data"].(map[string]any)
	readiness, ok = data["translation_readiness"].(map[string]any)
	if !ok {
		t.Fatalf("expected translation_readiness on detail record, got %#v", data["translation_readiness"])
	}
	readyFor, _ := readiness["ready_for_transition"].(map[string]bool)
	if readyFor["publish"] {
		t.Fatalf("expected publish readiness false when required locale is missing")
	}
}

func TestPanelBindingListSupportsCanonicalIncompleteFilter(t *testing.T) {
	repo := &translationActionRepoStub{
		list: []map[string]any{
			{
				"id":                   "post_ready",
				"title":                "Ready Post",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_ready",
				"available_locales":    []string{"en", "es", "fr"},
			},
			{
				"id":                   "post_incomplete_1",
				"title":                "Incomplete One",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_incomplete_1",
				"available_locales":    []string{"en"},
			},
			{
				"id":                   "post_incomplete_2",
				"title":                "Incomplete Two",
				"status":               "draft",
				"locale":               "es",
				"translation_group_id": "tg_incomplete_2",
				"available_locales":    []string{"es"},
			},
		},
	}
	panel := &Panel{
		name: "posts",
		repo: repo,
		translationPolicy: readinessPolicyStub{
			ok: true,
			req: TranslationRequirements{
				Locales: []string{"en", "es", "fr"},
			},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	records, total, _, _, err := binding.List(c, "en", boot.ListOptions{
		Page:    1,
		PerPage: 10,
		Filters: map[string]any{
			"incomplete":  "true",
			"environment": "production",
		},
		Predicates: []boot.ListPredicate{
			{Field: "incomplete", Operator: "eq", Values: []string{"true"}},
			{Field: "environment", Operator: "eq", Values: []string{"production"}},
		},
	})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected total=2 for incomplete filter, got %d", total)
	}
	if len(records) != 2 {
		t.Fatalf("expected two incomplete records, got %d", len(records))
	}

	gotIDs := []string{toString(records[0]["id"]), toString(records[1]["id"])}
	if gotIDs[0] != "post_incomplete_1" || gotIDs[1] != "post_incomplete_2" {
		t.Fatalf("unexpected incomplete order/ids: %+v", gotIDs)
	}
	for _, record := range records {
		if !toBool(record["incomplete"]) {
			t.Fatalf("expected record marked incomplete=true, got %#v", record["incomplete"])
		}
		if state := strings.TrimSpace(toString(record["readiness_state"])); state == "" || strings.EqualFold(state, translationReadinessStateReady) {
			t.Fatalf("expected non-ready readiness_state, got %q", state)
		}
	}

	pageTwo, pageTwoTotal, _, _, err := binding.List(c, "en", boot.ListOptions{
		Page:    2,
		PerPage: 1,
		Filters: map[string]any{
			"incomplete":  "true",
			"environment": "production",
		},
		Predicates: []boot.ListPredicate{
			{Field: "incomplete", Operator: "eq", Values: []string{"true"}},
			{Field: "environment", Operator: "eq", Values: []string{"production"}},
		},
	})
	if err != nil {
		t.Fatalf("second page list failed: %v", err)
	}
	if pageTwoTotal != 2 {
		t.Fatalf("expected second page total=2, got %d", pageTwoTotal)
	}
	if len(pageTwo) != 1 {
		t.Fatalf("expected one record on page two, got %d", len(pageTwo))
	}
	if got := strings.TrimSpace(toString(pageTwo[0]["id"])); got != "post_incomplete_2" {
		t.Fatalf("expected second incomplete record on page two, got %q", got)
	}
}

func TestPanelBindingListSupportsReadinessStatePredicateAlias(t *testing.T) {
	repo := &translationActionRepoStub{
		list: []map[string]any{
			{
				"id":                   "post_ready",
				"title":                "Ready Post",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_ready",
				"available_locales":    []string{"en", "es", "fr"},
			},
			{
				"id":                   "post_incomplete",
				"title":                "Incomplete Post",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_incomplete",
				"available_locales":    []string{"en"},
			},
		},
	}
	panel := &Panel{
		name: "posts",
		repo: repo,
		translationPolicy: readinessPolicyStub{
			ok: true,
			req: TranslationRequirements{
				Locales: []string{"en", "es", "fr"},
			},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	records, total, _, _, err := binding.List(c, "en", boot.ListOptions{
		Page:    1,
		PerPage: 10,
		Filters: map[string]any{
			"translation_readiness.readiness_state__ne": "ready",
			"environment": "production",
		},
		Predicates: []boot.ListPredicate{
			{Field: "translation_readiness.readiness_state", Operator: "ne", Values: []string{"ready"}},
			{Field: "environment", Operator: "eq", Values: []string{"production"}},
		},
	})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected one filtered record, got total=%d", total)
	}
	if len(records) != 1 {
		t.Fatalf("expected one filtered row, got %d", len(records))
	}
	if got := strings.TrimSpace(toString(records[0]["id"])); got != "post_incomplete" {
		t.Fatalf("expected post_incomplete, got %q", got)
	}
}

func TestPanelBindingListTranslationReadinessMemoizesRequirementsForBatch(t *testing.T) {
	repo := &translationActionRepoStub{list: make([]map[string]any, 0, 50)}
	for i := 0; i < 50; i++ {
		repo.list = append(repo.list, map[string]any{
			"id":                   fmt.Sprintf("post_%d", i),
			"title":                fmt.Sprintf("Post %d", i),
			"status":               "draft",
			"locale":               "en",
			"translation_group_id": fmt.Sprintf("tg_%d", i),
			"available_locales":    []string{"en"},
		})
	}
	policy := &readinessRequirementsPolicyRecorder{
		defaultReq: TranslationRequirements{Locales: []string{"en", "fr"}},
	}
	panel := &Panel{
		name:              "posts",
		repo:              repo,
		translationPolicy: policy,
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	records, _, _, _, err := binding.List(c, "en", boot.ListOptions{
		Page:    1,
		PerPage: 50,
		Filters: map[string]any{"environment": "production"},
	})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(records) != 50 {
		t.Fatalf("expected 50 records, got %d", len(records))
	}
	if policy.calls != 1 {
		t.Fatalf("expected one requirements call for 50-row batch, got %d", policy.calls)
	}
}

func TestPanelBindingListTranslationReadinessAggregatesLocalesByGroup(t *testing.T) {
	repo := &translationActionRepoStub{
		list: []map[string]any{
			{
				"id":                   "post_en",
				"title":                "Post EN",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_shared",
				"available_locales":    []string{"en"},
			},
			{
				"id":                   "post_fr",
				"title":                "Post FR",
				"status":               "draft",
				"locale":               "fr",
				"translation_group_id": "tg_shared",
				"available_locales":    []string{"fr"},
			},
		},
	}
	panel := &Panel{
		name: "posts",
		repo: repo,
		translationPolicy: readinessPolicyStub{
			ok:  true,
			req: TranslationRequirements{Locales: []string{"en", "fr"}},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	records, _, _, _, err := binding.List(c, "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(records) != 2 {
		t.Fatalf("expected two records, got %d", len(records))
	}
	for _, record := range records {
		readiness, _ := record["translation_readiness"].(map[string]any)
		if readiness == nil {
			t.Fatalf("expected readiness payload, got %#v", record["translation_readiness"])
		}
		missing := toStringSlice(readiness["missing_required_locales"])
		if len(missing) != 0 {
			t.Fatalf("expected no missing locales after group aggregation, got %v", missing)
		}
		if state := toString(readiness["readiness_state"]); state != translationReadinessStateReady {
			t.Fatalf("expected readiness state %q, got %q", translationReadinessStateReady, state)
		}
	}
}

func TestPanelBindingListTranslationReadinessLatencyBudgetFor50Rows(t *testing.T) {
	repo := &translationActionRepoStub{list: make([]map[string]any, 0, 50)}
	for i := 0; i < 50; i++ {
		repo.list = append(repo.list, map[string]any{
			"id":                   fmt.Sprintf("post_%d", i),
			"title":                fmt.Sprintf("Post %d", i),
			"status":               "draft",
			"locale":               "en",
			"translation_group_id": fmt.Sprintf("tg_%d", i),
			"available_locales":    []string{"en"},
		})
	}
	const warmupRuns = 5
	const runs = 40
	filters := map[string]any{"environment": "production"}

	makeBinding := func(policy TranslationPolicy) *panelBinding {
		return &panelBinding{
			admin: &Admin{config: Config{DefaultLocale: "en"}},
			name:  "posts",
			panel: &Panel{
				name:              "posts",
				repo:              repo,
				translationPolicy: policy,
			},
		}
	}
	measure := func(binding *panelBinding) ([]time.Duration, int) {
		invocations := 0
		for i := 0; i < warmupRuns; i++ {
			c := router.NewMockContext()
			c.On("Context").Return(context.Background())
			_, _, _, _, err := binding.List(c, "en", boot.ListOptions{
				Page:    1,
				PerPage: 50,
				Filters: filters,
			})
			if err != nil {
				t.Fatalf("list failed: %v", err)
			}
			invocations++
		}
		out := make([]time.Duration, 0, runs)
		for i := 0; i < runs; i++ {
			c := router.NewMockContext()
			c.On("Context").Return(context.Background())
			started := time.Now()
			_, _, _, _, err := binding.List(c, "en", boot.ListOptions{
				Page:    1,
				PerPage: 50,
				Filters: filters,
			})
			if err != nil {
				t.Fatalf("list failed: %v", err)
			}
			out = append(out, time.Since(started))
			invocations++
		}
		return out, invocations
	}

	baselineSamples, _ := measure(makeBinding(nil))
	baselineP95 := percentile95(baselineSamples)
	policy := &readinessRequirementsPolicyRecorder{
		delay:      2 * time.Millisecond,
		defaultReq: TranslationRequirements{Locales: []string{"en", "fr"}},
	}
	readinessSamples, readinessInvocations := measure(makeBinding(policy))
	readinessP95 := percentile95(readinessSamples)
	if policy.calls != readinessInvocations {
		t.Fatalf("expected one requirements call per request, got %d calls for %d requests", policy.calls, readinessInvocations)
	}

	increase := readinessP95 - baselineP95
	if increase < 0 {
		increase = 0
	}
	const maxAllowed = 20 * time.Millisecond
	if increase > maxAllowed {
		t.Fatalf("readiness p95 latency increase %v exceeds budget %v (baseline=%v readiness=%v)", increase, maxAllowed, baselineP95, readinessP95)
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
