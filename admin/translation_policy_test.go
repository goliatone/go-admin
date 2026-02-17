package admin

import (
	"context"
	"errors"
	"reflect"
	"testing"

	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
)

type stubPageTranslationService struct {
	missing      []string
	calls        int
	lastID       uuid.UUID
	lastRequired []string
	lastOpts     cmsinterfaces.TranslationCheckOptions
}

func (s *stubPageTranslationService) CheckTranslations(_ context.Context, id uuid.UUID, required []string, opts cmsinterfaces.TranslationCheckOptions) ([]string, error) {
	s.calls++
	s.lastID = id
	s.lastRequired = append([]string{}, required...)
	s.lastOpts = opts
	return s.missing, nil
}

func (s *stubPageTranslationService) AvailableLocales(context.Context, uuid.UUID, cmsinterfaces.TranslationCheckOptions) ([]string, error) {
	return nil, nil
}

func (s *stubPageTranslationService) Create(context.Context, cmsinterfaces.PageCreateRequest) (*cmsinterfaces.PageRecord, error) {
	return nil, ErrNotFound
}

func (s *stubPageTranslationService) Update(context.Context, cmsinterfaces.PageUpdateRequest) (*cmsinterfaces.PageRecord, error) {
	return nil, ErrNotFound
}

func (s *stubPageTranslationService) GetBySlug(context.Context, string, cmsinterfaces.PageReadOptions) (*cmsinterfaces.PageRecord, error) {
	return nil, ErrNotFound
}

func (s *stubPageTranslationService) List(context.Context, cmsinterfaces.PageReadOptions) ([]*cmsinterfaces.PageRecord, error) {
	return nil, ErrNotFound
}

func (s *stubPageTranslationService) Delete(context.Context, cmsinterfaces.PageDeleteRequest) error {
	return ErrNotFound
}

func (s *stubPageTranslationService) UpdateTranslation(context.Context, cmsinterfaces.PageUpdateTranslationRequest) (*cmsinterfaces.PageTranslation, error) {
	return nil, ErrNotFound
}

func (s *stubPageTranslationService) DeleteTranslation(context.Context, cmsinterfaces.PageDeleteTranslationRequest) error {
	return ErrNotFound
}

func (s *stubPageTranslationService) Move(context.Context, cmsinterfaces.PageMoveRequest) (*cmsinterfaces.PageRecord, error) {
	return nil, ErrNotFound
}

func (s *stubPageTranslationService) Duplicate(context.Context, cmsinterfaces.PageDuplicateRequest) (*cmsinterfaces.PageRecord, error) {
	return nil, ErrNotFound
}

func TestGoCMSTranslationPolicyBlocksMissingLocales(t *testing.T) {
	pageSvc := &stubPageTranslationService{missing: []string{"es"}}
	resolver := TranslationRequirementsResolverFunc(func(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
		return TranslationRequirements{Locales: []string{"en", "es"}}, true, nil
	})
	policy := GoCMSTranslationPolicy{Pages: pageSvc, Resolver: resolver}
	id := uuid.New().String()

	err := policy.Validate(context.Background(), TranslationPolicyInput{
		EntityType: pageWorkflowEntityType,
		EntityID:   id,
		Transition: "publish",
	})
	if err == nil {
		t.Fatalf("expected missing translations error")
	}
	if !errors.Is(err, ErrMissingTranslations) {
		t.Fatalf("expected ErrMissingTranslations, got %v", err)
	}
	var missingErr MissingTranslationsError
	if !errors.As(err, &missingErr) {
		t.Fatalf("expected MissingTranslationsError, got %T", err)
	}
	if missingErr.EntityID != id {
		t.Fatalf("expected entity id %q, got %q", id, missingErr.EntityID)
	}
	if !reflect.DeepEqual(missingErr.MissingLocales, []string{"es"}) {
		t.Fatalf("expected missing locales [es], got %+v", missingErr.MissingLocales)
	}
	if pageSvc.calls != 1 {
		t.Fatalf("expected CheckTranslations called once, got %d", pageSvc.calls)
	}
}

func TestGoCMSTranslationPolicyUsesCheckTranslations(t *testing.T) {
	pageSvc := &stubPageTranslationService{}
	resolver := TranslationRequirementsResolverFunc(func(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
		return TranslationRequirements{
			Locales:                []string{" en ", "es", "EN"},
			RequiredFields:         map[string][]string{"en": {"title", "seo.title"}},
			RequiredFieldsStrategy: RequiredFieldsValidationWarn,
		}, true, nil
	})
	policy := GoCMSTranslationPolicy{Pages: pageSvc, Resolver: resolver}
	id := uuid.New().String()

	err := policy.Validate(context.Background(), TranslationPolicyInput{
		EntityType:  pageWorkflowEntityType,
		EntityID:    id,
		Transition:  "promote",
		State:       "draft",
		Environment: "prod",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pageSvc.calls != 1 {
		t.Fatalf("expected CheckTranslations called once, got %d", pageSvc.calls)
	}
	if !reflect.DeepEqual(pageSvc.lastRequired, []string{"en", "es"}) {
		t.Fatalf("expected normalized locales [en es], got %+v", pageSvc.lastRequired)
	}
	if pageSvc.lastOpts.State != "draft" || pageSvc.lastOpts.Environment != "prod" {
		t.Fatalf("unexpected options passed: %+v", pageSvc.lastOpts)
	}
	if pageSvc.lastOpts.RequiredFieldsStrategy != RequiredFieldsValidationWarn {
		t.Fatalf("expected required fields strategy warn, got %v", pageSvc.lastOpts.RequiredFieldsStrategy)
	}
	if !reflect.DeepEqual(pageSvc.lastOpts.RequiredFields, map[string][]string{"en": {"title", "seo.title"}}) {
		t.Fatalf("expected required fields copied, got %+v", pageSvc.lastOpts.RequiredFields)
	}
}

func TestGoCMSTranslationPolicyIncludesMissingFieldsByLocale(t *testing.T) {
	pageSvc := &stubPageTranslationService{missing: []string{"fr"}}
	resolver := TranslationRequirementsResolverFunc(func(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
		return TranslationRequirements{
			Locales:                []string{"en", "fr"},
			RequiredFields:         map[string][]string{"fr": {"title", "path"}},
			RequiredFieldsStrategy: RequiredFieldsValidationError,
		}, true, nil
	})
	policy := GoCMSTranslationPolicy{Pages: pageSvc, Resolver: resolver}

	err := policy.Validate(context.Background(), TranslationPolicyInput{
		EntityType: pageWorkflowEntityType,
		EntityID:   uuid.New().String(),
		Transition: "publish",
	})
	if err == nil {
		t.Fatalf("expected missing translations error")
	}
	var missingErr MissingTranslationsError
	if !errors.As(err, &missingErr) {
		t.Fatalf("expected MissingTranslationsError, got %T", err)
	}
	if !missingErr.RequiredFieldsEvaluated {
		t.Fatalf("expected required fields evaluated")
	}
	if !reflect.DeepEqual(missingErr.MissingFieldsByLocale, map[string][]string{"fr": {"path", "title"}}) {
		t.Fatalf("expected missing fields by locale, got %+v", missingErr.MissingFieldsByLocale)
	}
}

func TestGoCMSTranslationPolicySkipsMissingFieldsForIgnoreStrategy(t *testing.T) {
	pageSvc := &stubPageTranslationService{missing: []string{"fr"}}
	resolver := TranslationRequirementsResolverFunc(func(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
		return TranslationRequirements{
			Locales:                []string{"en", "fr"},
			RequiredFields:         map[string][]string{"fr": {"title", "path"}},
			RequiredFieldsStrategy: RequiredFieldsValidationIgnore,
		}, true, nil
	})
	policy := GoCMSTranslationPolicy{Pages: pageSvc, Resolver: resolver}

	err := policy.Validate(context.Background(), TranslationPolicyInput{
		EntityType: pageWorkflowEntityType,
		EntityID:   uuid.New().String(),
		Transition: "publish",
	})
	if err == nil {
		t.Fatalf("expected missing translations error")
	}
	var missingErr MissingTranslationsError
	if !errors.As(err, &missingErr) {
		t.Fatalf("expected MissingTranslationsError, got %T", err)
	}
	if missingErr.RequiredFieldsEvaluated {
		t.Fatalf("expected required fields to be skipped for ignore strategy")
	}
	if len(missingErr.MissingFieldsByLocale) != 0 {
		t.Fatalf("expected missing fields map omitted, got %+v", missingErr.MissingFieldsByLocale)
	}
}

func TestGoCMSTranslationPolicyNormalizesEntityMetadata(t *testing.T) {
	pageSvc := &stubPageTranslationService{missing: []string{"fr"}}
	resolver := TranslationRequirementsResolverFunc(func(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error) {
		return TranslationRequirements{
			Locales: []string{"en", "fr"},
		}, true, nil
	})
	policy := GoCMSTranslationPolicy{Pages: pageSvc, Resolver: resolver}

	err := policy.Validate(context.Background(), TranslationPolicyInput{
		EntityType:      "pages@staging",
		PolicyEntity:    "pages@staging",
		EntityID:        uuid.New().String(),
		Transition:      "publish",
		RequestedLocale: "en",
	})
	if err == nil {
		t.Fatalf("expected missing translations error")
	}
	var missingErr MissingTranslationsError
	if !errors.As(err, &missingErr) {
		t.Fatalf("expected MissingTranslationsError, got %T", err)
	}
	if missingErr.EntityType != "pages" {
		t.Fatalf("expected normalized entity type pages, got %q", missingErr.EntityType)
	}
	if missingErr.PolicyEntity != "pages" {
		t.Fatalf("expected normalized policy entity pages, got %q", missingErr.PolicyEntity)
	}
}

func TestCanonicalPolicyEntityKeyNormalizesSingularAliases(t *testing.T) {
	tests := map[string]string{
		"post":          "posts",
		"posts":         "posts",
		"page":          "pages",
		"pages@staging": "pages",
		"news":          "news",
	}
	for input, expected := range tests {
		if got := CanonicalPolicyEntityKey(input); got != expected {
			t.Fatalf("expected %q -> %q, got %q", input, expected, got)
		}
	}
}
