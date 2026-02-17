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
	listErr                 error
	nextID                  int
	createTranslationCalls  int
	createTranslationInput  TranslationCreateInput
	createTranslationResult map[string]any
	createTranslationErr    error
}

func (s *translationActionRepoStub) List(context.Context, ListOptions) ([]map[string]any, int, error) {
	if s.listErr != nil {
		return nil, 0, s.listErr
	}
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

func (s *translationActionRepoStub) Update(_ context.Context, id string, update map[string]any) (map[string]any, error) {
	if s.records == nil {
		return nil, ErrNotFound
	}
	current, ok := s.records[id]
	if !ok {
		return nil, ErrNotFound
	}
	next := cloneAnyMap(current)
	for key, value := range update {
		next[key] = value
	}
	s.records[id] = cloneAnyMap(next)
	return next, nil
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

func TestPanelBindingDetailAndUpdateNormalizeFallbackContext(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":                   "post_123",
				"title":                "Post",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_123",
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

	detail, err := binding.Detail(c, "es", "post_123")
	if err != nil {
		t.Fatalf("detail failed: %v", err)
	}
	data, _ := detail["data"].(map[string]any)
	if data["requested_locale"] != "es" {
		t.Fatalf("expected requested_locale=es, got %v", data["requested_locale"])
	}
	if data["resolved_locale"] != "en" {
		t.Fatalf("expected resolved_locale=en, got %v", data["resolved_locale"])
	}
	if missing, _ := data["missing_requested_locale"].(bool); !missing {
		t.Fatalf("expected missing_requested_locale=true, got %v", data["missing_requested_locale"])
	}
	if fallback, _ := data["fallback_used"].(bool); !fallback {
		t.Fatalf("expected fallback_used=true, got %v", data["fallback_used"])
	}

	updated, err := binding.Update(c, "es", "post_123", map[string]any{
		"title": "Updated",
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["requested_locale"] != "es" {
		t.Fatalf("expected updated requested_locale=es, got %v", updated["requested_locale"])
	}
	if updated["resolved_locale"] != "en" {
		t.Fatalf("expected updated resolved_locale=en, got %v", updated["resolved_locale"])
	}
	if missing, _ := updated["missing_requested_locale"].(bool); !missing {
		t.Fatalf("expected updated missing_requested_locale=true, got %v", updated["missing_requested_locale"])
	}
	if fallback, _ := updated["fallback_used"].(bool); !fallback {
		t.Fatalf("expected updated fallback_used=true, got %v", updated["fallback_used"])
	}
}

func TestPanelBindingDetailIncludesSourceTargetDriftMetadata(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_en": {
				"id":                   "post_en",
				"title":                "Post EN",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
				"source_hash":          "abc123",
				"source_version":       "42",
				"changed_fields":       []string{"title", "seo.description"},
			},
		},
		list: []map[string]any{
			{
				"id":                   "post_en",
				"title":                "Post EN",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
				"source_hash":          "abc123",
				"source_version":       "42",
				"changed_fields":       []string{"title", "seo.description"},
			},
			{
				"id":                   "post_es",
				"title":                "Post ES",
				"status":               "draft",
				"locale":               "es",
				"translation_group_id": "tg_123",
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

	detail, err := binding.Detail(c, "es", "post_en")
	if err != nil {
		t.Fatalf("detail failed: %v", err)
	}
	data, _ := detail["data"].(map[string]any)
	drift, ok := data[translationSourceTargetDriftKey].(map[string]any)
	if !ok {
		t.Fatalf("expected %q map in detail data, got %T", translationSourceTargetDriftKey, data[translationSourceTargetDriftKey])
	}
	if toString(drift[translationSourceTargetDriftSourceHashKey]) != "abc123" {
		t.Fatalf("expected source hash abc123, got %+v", drift)
	}
	if toString(drift[translationSourceTargetDriftSourceVersionKey]) != "42" {
		t.Fatalf("expected source version 42, got %+v", drift)
	}
	summary, _ := drift[translationSourceTargetDriftChangedSummaryKey].(map[string]any)
	if summary == nil {
		t.Fatalf("expected changed_fields_summary in drift payload, got %+v", drift)
	}
	if got := atoiDefault(toString(summary[translationSourceTargetDriftSummaryCountKey]), -1); got != 2 {
		t.Fatalf("expected changed_fields_summary.count=2, got %+v", summary)
	}

	siblings, _ := detail["siblings"].([]map[string]any)
	if len(siblings) == 0 {
		t.Fatalf("expected siblings payload")
	}
	foundCurrent := false
	for _, sibling := range siblings {
		if toString(sibling["id"]) != "post_en" {
			continue
		}
		foundCurrent = true
		siblingDrift, ok := sibling[translationSourceTargetDriftKey].(map[string]any)
		if !ok {
			t.Fatalf("expected current sibling drift payload, got %+v", sibling)
		}
		if toString(siblingDrift[translationSourceTargetDriftSourceHashKey]) != "abc123" {
			t.Fatalf("expected sibling source hash abc123, got %+v", siblingDrift)
		}
	}
	if !foundCurrent {
		t.Fatalf("expected current sibling entry in payload")
	}
}

func TestPanelBindingDetailIncludesTranslationSiblingsPayload(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_en": {
				"id":                   "post_en",
				"title":                "Post EN",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
			},
		},
		list: []map[string]any{
			{
				"id":                   "post_fr",
				"title":                "Post FR",
				"status":               "draft",
				"locale":               "fr",
				"translation_group_id": "tg_123",
			},
			{
				"id":                   "post_en",
				"title":                "Post EN",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
			},
			{
				"id":                   "post_es",
				"title":                "Post ES",
				"status":               "approval",
				"locale":               "es",
				"translation_group_id": "tg_123",
			},
			{
				"id":                   "post_other",
				"title":                "Other",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_other",
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

	detail, err := binding.Detail(c, "es", "post_en")
	if err != nil {
		t.Fatalf("detail failed: %v", err)
	}
	siblings, ok := detail["siblings"].([]map[string]any)
	if !ok {
		t.Fatalf("expected siblings payload, got %T", detail["siblings"])
	}
	if len(siblings) != 3 {
		t.Fatalf("expected three siblings for translation group, got %d (%+v)", len(siblings), siblings)
	}
	gotLocales := []string{
		toString(siblings[0]["locale"]),
		toString(siblings[1]["locale"]),
		toString(siblings[2]["locale"]),
	}
	if gotLocales[0] != "en" || gotLocales[1] != "es" || gotLocales[2] != "fr" {
		t.Fatalf("expected locale-sorted siblings [en es fr], got %+v", gotLocales)
	}
	for _, sibling := range siblings {
		if _, ok := sibling["requested_locale"]; !ok {
			t.Fatalf("expected requested_locale in sibling payload, got %+v", sibling)
		}
		if _, ok := sibling["resolved_locale"]; !ok {
			t.Fatalf("expected resolved_locale in sibling payload, got %+v", sibling)
		}
		if _, ok := sibling["missing_requested_locale"]; !ok {
			t.Fatalf("expected missing_requested_locale in sibling payload, got %+v", sibling)
		}
		if _, ok := sibling["fallback_used"]; !ok {
			t.Fatalf("expected fallback_used in sibling payload, got %+v", sibling)
		}
	}
	if current, _ := siblings[0]["is_current"].(bool); !current {
		t.Fatalf("expected english sibling to be marked is_current=true, got %+v", siblings[0])
	}
}

func TestPanelBindingDetailFlagsSiblingsDegradedWhenListFails(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_en": {
				"id":                   "post_en",
				"title":                "Post EN",
				"status":               "published",
				"locale":               "en",
				"translation_group_id": "tg_123",
			},
		},
		listErr: errors.New("list unavailable"),
	}
	panel := &Panel{name: "posts", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	detail, err := binding.Detail(c, "en", "post_en")
	if err != nil {
		t.Fatalf("detail failed: %v", err)
	}
	siblings, ok := detail["siblings"].([]map[string]any)
	if !ok || len(siblings) != 1 {
		t.Fatalf("expected fallback sibling payload with one entry, got %T %+v", detail["siblings"], detail["siblings"])
	}
	if toString(siblings[0]["id"]) != "post_en" {
		t.Fatalf("expected fallback sibling id=post_en, got %+v", siblings[0])
	}
	if degraded, _ := detail["siblings_degraded"].(bool); !degraded {
		t.Fatalf("expected siblings_degraded=true, got %+v", detail)
	}
	if reason := strings.TrimSpace(toString(detail["siblings_degraded_reason"])); reason != "siblings_query_failed" {
		t.Fatalf("expected siblings_degraded_reason=siblings_query_failed, got %q", reason)
	}
}

func TestPanelBindingUpdateReturnsAutosaveConflictWhenVersionIsStale(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":                   "post_123",
				"title":                "Post",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_123",
				"version":              2,
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

	_, err := binding.Update(c, "en", "post_123", map[string]any{
		"autosave": true,
		"version":  1,
		"title":    "Updated",
	})
	if err == nil {
		t.Fatalf("expected autosave conflict")
	}
	var conflict AutosaveConflictError
	if !errors.As(err, &conflict) {
		t.Fatalf("expected AutosaveConflictError, got %T", err)
	}
	if conflict.Version != "2" {
		t.Fatalf("expected current version 2, got %q", conflict.Version)
	}
	if conflict.ExpectedVersion != "1" {
		t.Fatalf("expected expected version 1, got %q", conflict.ExpectedVersion)
	}
	if conflict.LatestStatePath != "/admin/api/posts/post_123" {
		t.Fatalf("expected latest state pointer /admin/api/posts/post_123, got %q", conflict.LatestStatePath)
	}
	if repo.records["post_123"]["title"] != "Post" {
		t.Fatalf("expected stale autosave update to be rejected before persistence, got title=%v", repo.records["post_123"]["title"])
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

func TestPanelBindingListSupportsReadinessStateFilterValues(t *testing.T) {
	panelNames := []string{"pages", "posts", "news"}
	for _, panelName := range panelNames {
		t.Run(panelName, func(t *testing.T) {
			repo := &translationActionRepoStub{
				list: []map[string]any{
					{
						"id":                   "ready",
						"title":                "Ready",
						"path":                 "/ready",
						"status":               "draft",
						"locale":               "en",
						"translation_group_id": "tg_ready",
						"available_locales":    []string{"en", "fr"},
					},
					{
						"id":                   "missing_locales",
						"title":                "Missing Locales",
						"path":                 "/missing-locales",
						"status":               "draft",
						"locale":               "en",
						"translation_group_id": "tg_missing_locales",
						"available_locales":    []string{"en"},
					},
					{
						"id":                   "missing_fields",
						"title":                "Missing Fields",
						"status":               "draft",
						"locale":               "en",
						"translation_group_id": "tg_missing_fields",
						"available_locales":    []string{"en", "fr"},
					},
					{
						"id":                   "missing_locales_and_fields",
						"title":                "Missing Both",
						"status":               "draft",
						"locale":               "en",
						"translation_group_id": "tg_missing_both",
						"available_locales":    []string{"en"},
					},
				},
			}
			panel := &Panel{
				name: panelName,
				repo: repo,
				translationPolicy: readinessPolicyStub{
					ok: true,
					req: TranslationRequirements{
						Locales: []string{"en", "fr"},
						RequiredFields: map[string][]string{
							"en": {"title", "path"},
							"fr": {"title", "path"},
						},
					},
				},
			}
			binding := &panelBinding{
				admin: &Admin{config: Config{DefaultLocale: "en"}},
				name:  panelName,
				panel: panel,
			}
			c := router.NewMockContext()
			c.On("Context").Return(context.Background())

			tests := []struct {
				state      string
				expectedID string
			}{
				{state: "ready", expectedID: "ready"},
				{state: "missing_locales", expectedID: "missing_locales"},
				{state: "missing_fields", expectedID: "missing_fields"},
				{state: "missing_locales_and_fields", expectedID: "missing_locales_and_fields"},
			}
			for _, tc := range tests {
				t.Run(tc.state, func(t *testing.T) {
					records, total, _, _, err := binding.List(c, "en", boot.ListOptions{
						Page:    1,
						PerPage: 10,
						Filters: map[string]any{
							"readiness_state": tc.state,
							"environment":     "production",
						},
						Predicates: []boot.ListPredicate{
							{Field: "readiness_state", Operator: "eq", Values: []string{tc.state}},
							{Field: "environment", Operator: "eq", Values: []string{"production"}},
						},
					})
					if err != nil {
						t.Fatalf("list failed: %v", err)
					}
					if total != 1 {
						t.Fatalf("expected one record for state %q, got total=%d", tc.state, total)
					}
					if len(records) != 1 {
						t.Fatalf("expected one record for state %q, got %d", tc.state, len(records))
					}
					if got := strings.TrimSpace(toString(records[0]["id"])); got != tc.expectedID {
						t.Fatalf("expected id %q, got %q", tc.expectedID, got)
					}
					if got := strings.TrimSpace(toString(records[0]["readiness_state"])); got != tc.state {
						t.Fatalf("expected readiness_state %q, got %q", tc.state, got)
					}
				})
			}
		})
	}
}

func TestPanelBindingListGroupedByTranslationGroupSupportsStableGroupPagination(t *testing.T) {
	panelNames := []string{"pages", "posts", "news"}
	for _, panelName := range panelNames {
		t.Run(panelName, func(t *testing.T) {
			repo := &translationActionRepoStub{
				list: []map[string]any{
					{
						"id":                   "alpha_en",
						"title":                "Alpha EN",
						"path":                 "/alpha",
						"status":               "draft",
						"locale":               "en",
						"translation_group_id": "tg_alpha",
						"available_locales":    []string{"en"},
						"updated_at":           "2026-02-15T10:00:00Z",
					},
					{
						"id":                   "alpha_fr",
						"title":                "Alpha FR",
						"path":                 "/alpha-fr",
						"status":               "draft",
						"locale":               "fr",
						"translation_group_id": "tg_alpha",
						"available_locales":    []string{"fr"},
						"updated_at":           "2026-02-15T12:00:00Z",
					},
					{
						"id":                   "beta_en",
						"title":                "Beta EN",
						"path":                 "/beta",
						"status":               "draft",
						"locale":               "en",
						"translation_group_id": "tg_beta",
						"available_locales":    []string{"en"},
						"updated_at":           "2026-02-16T08:00:00Z",
					},
					{
						"id":                   "beta_es",
						"title":                "Beta ES",
						"path":                 "/beta-es",
						"status":               "draft",
						"locale":               "es",
						"translation_group_id": "tg_beta",
						"available_locales":    []string{"es"},
						"updated_at":           "2026-02-16T09:00:00Z",
					},
				},
			}
			panel := &Panel{
				name: panelName,
				repo: repo,
				translationPolicy: readinessPolicyStub{
					ok: true,
					req: TranslationRequirements{
						Locales: []string{"en", "es", "fr"},
						RequiredFields: map[string][]string{
							"en": {"title", "path"},
							"es": {"title", "path"},
							"fr": {"title", "path"},
						},
					},
				},
				actions: []Action{
					{Name: "publish"},
					{Name: CreateTranslationKey},
				},
			}
			binding := &panelBinding{
				admin: &Admin{config: Config{DefaultLocale: "en"}},
				name:  panelName,
				panel: panel,
			}
			c := router.NewMockContext()
			c.On("Context").Return(context.Background())

			pageOne, pageOneTotal, _, _, err := binding.List(c, "en", boot.ListOptions{
				Page:    1,
				PerPage: 1,
				Filters: map[string]any{
					"group_by":    "translation_group_id",
					"environment": "production",
				},
				Predicates: []boot.ListPredicate{
					{Field: "group_by", Operator: "eq", Values: []string{"translation_group_id"}},
					{Field: "environment", Operator: "eq", Values: []string{"production"}},
				},
			})
			if err != nil {
				t.Fatalf("grouped list page one failed: %v", err)
			}
			if pageOneTotal != 2 {
				t.Fatalf("expected two groups on page one total, got %d", pageOneTotal)
			}
			if len(pageOne) != 1 {
				t.Fatalf("expected one grouped record on page one, got %d", len(pageOne))
			}
			assertGroupedTranslationRecord(t, pageOne[0], "tg_alpha", 2)

			pageTwo, pageTwoTotal, _, _, err := binding.List(c, "en", boot.ListOptions{
				Page:    2,
				PerPage: 1,
				Filters: map[string]any{
					"group_by":    "translation_group_id",
					"environment": "production",
				},
				Predicates: []boot.ListPredicate{
					{Field: "group_by", Operator: "eq", Values: []string{"translation_group_id"}},
					{Field: "environment", Operator: "eq", Values: []string{"production"}},
				},
			})
			if err != nil {
				t.Fatalf("grouped list page two failed: %v", err)
			}
			if pageTwoTotal != 2 {
				t.Fatalf("expected two groups on page two total, got %d", pageTwoTotal)
			}
			if len(pageTwo) != 1 {
				t.Fatalf("expected one grouped record on page two, got %d", len(pageTwo))
			}
			assertGroupedTranslationRecord(t, pageTwo[0], "tg_beta", 2)
		})
	}
}

func TestPanelBindingBulkCreateMissingTranslationsReturnsTypedResults(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"page_1": {
				"id":                   "page_1",
				"title":                "Source",
				"path":                 "/source",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_1",
				"available_locales":    []string{"en"},
			},
		},
		createTranslationResult: map[string]any{
			"id":                   "page_es",
			"locale":               "es",
			"status":               "draft",
			"translation_group_id": "tg_1",
		},
	}
	panel := &Panel{
		name: "pages",
		repo: repo,
		translationPolicy: readinessPolicyStub{
			ok: true,
			req: TranslationRequirements{
				Locales: []string{"en", "es"},
			},
		},
		actions: []Action{
			{Name: CreateTranslationKey},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	result, err := binding.Bulk(c, "en", "create-missing-translations", map[string]any{
		"ids": []string{"page_1"},
	})
	if err != nil {
		t.Fatalf("bulk create missing translations failed: %v", err)
	}
	if strings.TrimSpace(toString(result["action"])) != "create-missing-translations" {
		t.Fatalf("expected action create-missing-translations, got %q", toString(result["action"]))
	}
	summary, ok := result["summary"].(map[string]int)
	if !ok {
		t.Fatalf("expected typed summary map, got %#v", result["summary"])
	}
	if summary["succeeded"] != 1 || summary["failed"] != 0 {
		t.Fatalf("unexpected summary counts: %+v", summary)
	}
	rawResults, ok := result["results"].([]map[string]any)
	if !ok || len(rawResults) != 1 {
		t.Fatalf("expected one result record, got %#v", result["results"])
	}
	if status := strings.TrimSpace(toString(rawResults[0]["status"])); status != "ok" {
		t.Fatalf("expected ok status, got %q", status)
	}
	created, ok := rawResults[0]["created"].([]map[string]any)
	if !ok || len(created) != 1 {
		t.Fatalf("expected one created locale result, got %#v", rawResults[0]["created"])
	}
	if created[0]["locale"] != "es" {
		t.Fatalf("expected created locale es, got %#v", created[0])
	}
}

func TestPanelBindingBulkCreateMissingTranslationsIncludesPerLocaleFailures(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"page_1": {
				"id":                   "page_1",
				"title":                "Source",
				"path":                 "/source",
				"status":               "draft",
				"locale":               "en",
				"translation_group_id": "tg_1",
				"available_locales":    []string{"en"},
			},
		},
		createTranslationErr: TranslationAlreadyExistsError{
			Panel:              "pages",
			EntityID:           "page_1",
			Locale:             "es",
			SourceLocale:       "en",
			TranslationGroupID: "tg_1",
		},
	}
	panel := &Panel{
		name: "pages",
		repo: repo,
		translationPolicy: readinessPolicyStub{
			ok: true,
			req: TranslationRequirements{
				Locales: []string{"en", "es"},
			},
		},
		actions: []Action{
			{Name: CreateTranslationKey},
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	result, err := binding.Bulk(c, "en", "create_missing_translations", map[string]any{
		"ids": []string{"page_1"},
	})
	if err != nil {
		t.Fatalf("bulk create missing translations failed: %v", err)
	}
	summary, ok := result["summary"].(map[string]int)
	if !ok {
		t.Fatalf("expected typed summary map, got %#v", result["summary"])
	}
	if summary["failed"] != 1 || summary["failed_locales"] != 1 {
		t.Fatalf("unexpected failure summary counts: %+v", summary)
	}
	rawResults, ok := result["results"].([]map[string]any)
	if !ok || len(rawResults) != 1 {
		t.Fatalf("expected one result record, got %#v", result["results"])
	}
	if status := strings.TrimSpace(toString(rawResults[0]["status"])); status != "failed" {
		t.Fatalf("expected failed status, got %q", status)
	}
	failures, ok := rawResults[0]["failures"].([]map[string]any)
	if !ok || len(failures) != 1 {
		t.Fatalf("expected one failure, got %#v", rawResults[0]["failures"])
	}
	if code := strings.TrimSpace(toString(failures[0]["text_code"])); code != TextCodeTranslationExists {
		t.Fatalf("expected text_code %q, got %#v", TextCodeTranslationExists, failures[0]["text_code"])
	}
}

func assertGroupedTranslationRecord(t *testing.T, record map[string]any, expectedGroupID string, expectedChildren int) {
	t.Helper()
	if got := strings.TrimSpace(toString(record["translation_group_id"])); got != expectedGroupID {
		t.Fatalf("expected group id %q, got %q", expectedGroupID, got)
	}
	if got := strings.TrimSpace(toString(record["group_by"])); got != listGroupByTranslationGroupID {
		t.Fatalf("expected group_by %q, got %q", listGroupByTranslationGroupID, got)
	}
	children, ok := record["children"].([]map[string]any)
	if !ok {
		t.Fatalf("expected children []map[string]any, got %#v", record["children"])
	}
	if len(children) != expectedChildren {
		t.Fatalf("expected %d children, got %d", expectedChildren, len(children))
	}
	for _, child := range children {
		if childGroup := strings.TrimSpace(toString(child["translation_group_id"])); childGroup != expectedGroupID {
			t.Fatalf("expected child group id %q, got %q", expectedGroupID, childGroup)
		}
	}
	if locale := strings.TrimSpace(toString(children[0]["locale"])); locale != "en" {
		t.Fatalf("expected default locale parent first, got %q", locale)
	}

	summary, ok := record["translation_group_summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected translation_group_summary, got %#v", record["translation_group_summary"])
	}
	for _, key := range []string{"available_count", "required_count", "missing_locales", "last_updated_at"} {
		if _, exists := summary[key]; !exists {
			t.Fatalf("expected summary key %q, got %#v", key, summary)
		}
	}
	if strings.TrimSpace(toString(summary["last_updated_at"])) == "" {
		t.Fatalf("expected non-empty last_updated_at in summary: %#v", summary)
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
