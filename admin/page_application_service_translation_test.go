package admin

import (
	"context"
	"errors"
	"testing"

	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
)

type stubAppPageReadService struct {
	lastListOpts AdminPageListOptions
	lastGetOpts  AdminPageGetOptions
	listRecords  []AdminPageRecord
	listTotal    int
	getRecord    *AdminPageRecord
}

func (s *stubAppPageReadService) List(ctx context.Context, opts AdminPageListOptions) ([]AdminPageRecord, int, error) {
	s.lastListOpts = opts
	if !opts.AllowMissingTranslations {
		return nil, 0, cmsinterfaces.ErrTranslationMissing
	}
	return s.listRecords, s.listTotal, nil
}

func (s *stubAppPageReadService) Get(ctx context.Context, id string, opts AdminPageGetOptions) (*AdminPageRecord, error) {
	s.lastGetOpts = opts
	if !opts.AllowMissingTranslations {
		return nil, cmsinterfaces.ErrTranslationMissing
	}
	return s.getRecord, nil
}

type stubAppPageWriteService struct {
	publishCalls int
	lastID       string
	lastPayload  map[string]any
}

func (s *stubAppPageWriteService) Create(context.Context, map[string]any) (*AdminPageRecord, error) {
	return nil, ErrNotFound
}

func (s *stubAppPageWriteService) Update(context.Context, string, map[string]any) (*AdminPageRecord, error) {
	return nil, ErrNotFound
}

func (s *stubAppPageWriteService) Delete(context.Context, string) error {
	return ErrNotFound
}

func (s *stubAppPageWriteService) Publish(ctx context.Context, id string, payload map[string]any) (*AdminPageRecord, error) {
	s.publishCalls++
	s.lastID = id
	s.lastPayload = payload
	return &AdminPageRecord{ID: id}, nil
}

func (s *stubAppPageWriteService) Unpublish(context.Context, string, map[string]any) (*AdminPageRecord, error) {
	return nil, ErrNotFound
}

type stubWorkflowEngine struct {
	transitions     []WorkflowTransition
	transitionCalls int
	lastInput       TransitionInput
}

func (s *stubWorkflowEngine) Transition(ctx context.Context, input TransitionInput) (*TransitionResult, error) {
	s.transitionCalls++
	s.lastInput = input
	return &TransitionResult{
		EntityID:   input.EntityID,
		EntityType: input.EntityType,
		Transition: input.Transition,
		FromState:  input.CurrentState,
		ToState:    input.TargetState,
	}, nil
}

func (s *stubWorkflowEngine) AvailableTransitions(context.Context, string, string) ([]WorkflowTransition, error) {
	return s.transitions, nil
}

type stubPanelRepository struct {
	record   map[string]any
	getCalls int
}

func (s *stubPanelRepository) List(context.Context, ListOptions) ([]map[string]any, int, error) {
	return nil, 0, ErrNotFound
}

func (s *stubPanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	s.getCalls++
	if s.record == nil {
		return nil, ErrNotFound
	}
	return cloneAnyMap(s.record), nil
}

func (s *stubPanelRepository) Create(context.Context, map[string]any) (map[string]any, error) {
	return nil, ErrNotFound
}

func (s *stubPanelRepository) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, ErrNotFound
}

func (s *stubPanelRepository) Delete(context.Context, string) error {
	return ErrNotFound
}

func TestPageApplicationServiceListAllowsMissingTranslations(t *testing.T) {
	ctx := context.Background()
	record := AdminPageRecord{
		ID:              "page-1",
		RequestedLocale: "es",
		ResolvedLocale:  "en",
		Translation: TranslationBundle[PageTranslation]{
			Meta: TranslationMeta{
				RequestedLocale:        "es",
				ResolvedLocale:         "en",
				AvailableLocales:       []string{"en"},
				MissingRequestedLocale: true,
				FallbackUsed:           true,
				PrimaryLocale:          "en",
			},
		},
	}
	read := &stubAppPageReadService{
		listRecords: []AdminPageRecord{record},
		listTotal:   1,
	}
	service := PageApplicationService{Read: read}

	items, total, err := service.List(ctx, PageListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("expected 1 record, got total=%d len=%d", total, len(items))
	}
	if !read.lastListOpts.AllowMissingTranslations {
		t.Fatalf("expected AllowMissingTranslations enforced")
	}
	if !items[0].Translation.Meta.MissingRequestedLocale {
		t.Fatalf("expected missing requested locale propagated, got %+v", items[0].Translation.Meta)
	}
}

func TestPageApplicationServiceGetAllowsMissingTranslations(t *testing.T) {
	ctx := context.Background()
	record := &AdminPageRecord{
		ID:              "page-1",
		RequestedLocale: "es",
		ResolvedLocale:  "en",
		Translation: TranslationBundle[PageTranslation]{
			Meta: TranslationMeta{
				RequestedLocale:        "es",
				ResolvedLocale:         "en",
				AvailableLocales:       []string{"en"},
				MissingRequestedLocale: true,
				FallbackUsed:           true,
				PrimaryLocale:          "en",
			},
		},
	}
	read := &stubAppPageReadService{getRecord: record}
	service := PageApplicationService{Read: read}

	got, err := service.Get(ctx, "page-1", PageGetOptions{})
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatalf("expected record returned")
	}
	if !read.lastGetOpts.AllowMissingTranslations {
		t.Fatalf("expected AllowMissingTranslations enforced")
	}
	if !got.Translation.Meta.MissingRequestedLocale {
		t.Fatalf("expected missing requested locale propagated, got %+v", got.Translation.Meta)
	}
}

func TestPageApplicationServicePublishBlockedByTranslationPolicy(t *testing.T) {
	ctx := context.Background()
	id := uuid.New().String()
	read := &stubAppPageReadService{
		getRecord: &AdminPageRecord{
			ID:     id,
			Title:  "Home",
			Slug:   "home",
			Path:   "/home",
			Status: "approval",
		},
	}
	write := &stubAppPageWriteService{}
	workflow := &stubWorkflowEngine{
		transitions: []WorkflowTransition{
			{Name: "publish", From: "approval", To: "published"},
		},
	}
	pageSvc := &stubPageTranslationService{missing: []string{"es"}}
	resolver := TranslationRequirementsResolverFunc(func(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
		return TranslationRequirements{Locales: []string{"en", "es"}}, true, nil
	})
	policy := GoCMSTranslationPolicy{Pages: pageSvc, Resolver: resolver}
	service := PageApplicationService{
		Read:              read,
		Write:             write,
		Workflow:          workflow,
		TranslationPolicy: policy,
	}

	_, err := service.Publish(ctx, id, map[string]any{"locale": "es"})
	if err == nil {
		t.Fatalf("expected translation policy error")
	}
	if !errors.Is(err, ErrMissingTranslations) {
		t.Fatalf("expected ErrMissingTranslations, got %v", err)
	}
	if workflow.transitionCalls != 0 {
		t.Fatalf("expected workflow transition blocked, got %d calls", workflow.transitionCalls)
	}
	if write.publishCalls != 0 {
		t.Fatalf("expected publish blocked, got %d calls", write.publishCalls)
	}
	if pageSvc.calls != 1 {
		t.Fatalf("expected CheckTranslations called once, got %d", pageSvc.calls)
	}
}

func TestWorkflowUpdateHookBlocksMissingTranslations(t *testing.T) {
	ctx := AdminContext{Context: context.Background()}
	id := uuid.New().String()
	repo := &stubPanelRepository{record: map[string]any{"id": id, "status": "staging"}}
	workflow := &stubWorkflowEngine{
		transitions: []WorkflowTransition{
			{Name: "promote", From: "staging", To: "prod"},
		},
	}
	pageSvc := &stubPageTranslationService{missing: []string{"fr"}}
	resolver := TranslationRequirementsResolverFunc(func(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
		return TranslationRequirements{Locales: []string{"en", "fr"}}, true, nil
	})
	policy := GoCMSTranslationPolicy{Pages: pageSvc, Resolver: resolver}
	hook := buildWorkflowUpdateHook(repo, workflow, nil, policy, "pages")

	record := map[string]any{
		"status":     "prod",
		"transition": "promote",
		"locale":     "fr",
	}
	err := hook(ctx, id, record)
	if err == nil {
		t.Fatalf("expected translation policy error")
	}
	if !errors.Is(err, ErrMissingTranslations) {
		t.Fatalf("expected ErrMissingTranslations, got %v", err)
	}
	if workflow.transitionCalls != 0 {
		t.Fatalf("expected workflow transition blocked, got %d calls", workflow.transitionCalls)
	}
	if pageSvc.calls != 1 {
		t.Fatalf("expected CheckTranslations called once, got %d", pageSvc.calls)
	}
}
