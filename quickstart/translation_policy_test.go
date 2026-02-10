package quickstart

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
)

type recordingTranslationChecker struct {
	missing      []string
	calls        int
	lastRequired []string
	lastOpts     cmsinterfaces.TranslationCheckOptions
}

func (c *recordingTranslationChecker) CheckTranslations(_ context.Context, _ uuid.UUID, required []string, opts cmsinterfaces.TranslationCheckOptions) ([]string, error) {
	c.calls++
	c.lastRequired = append([]string{}, required...)
	c.lastOpts = opts
	return append([]string{}, c.missing...), nil
}

func TestTranslationPolicyValidateUsesEnvironmentCriteriaForPagesAndPosts(t *testing.T) {
	pagesChecker := &recordingTranslationChecker{}
	postsChecker := &recordingTranslationChecker{}
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
				"publish": {
					Locales: []string{"en"},
					Environments: map[string]TranslationCriteria{
						"production": {
							Locales:        []string{"en", "fr"},
							RequiredFields: map[string][]string{"fr": {"title"}},
						},
					},
				},
			},
			"posts": {
				"publish": {
					Locales: []string{"en"},
					Environments: map[string]TranslationCriteria{
						"production": {
							Locales:        []string{"en", "es"},
							RequiredFields: map[string][]string{"es": {"title", "excerpt"}},
						},
					},
				},
			},
		},
	}
	policy := NewTranslationPolicy(cfg, TranslationPolicyServices{
		Pages:   pagesChecker,
		Content: postsChecker,
	})

	pageID := uuid.NewString()
	if err := policy.Validate(context.Background(), admin.TranslationPolicyInput{
		EntityType:  "pages",
		EntityID:    pageID,
		Transition:  "publish",
		Environment: "production",
	}); err != nil {
		t.Fatalf("validate pages: %v", err)
	}
	if pagesChecker.calls != 1 {
		t.Fatalf("expected pages checker called once, got %d", pagesChecker.calls)
	}
	if !reflect.DeepEqual(pagesChecker.lastRequired, []string{"en", "fr"}) {
		t.Fatalf("expected pages required locales [en fr], got %+v", pagesChecker.lastRequired)
	}
	if !reflect.DeepEqual(pagesChecker.lastOpts.RequiredFields, map[string][]string{"fr": {"title"}}) {
		t.Fatalf("expected pages required fields, got %+v", pagesChecker.lastOpts.RequiredFields)
	}

	postID := uuid.NewString()
	if err := policy.Validate(context.Background(), admin.TranslationPolicyInput{
		EntityType:  "posts",
		EntityID:    postID,
		Transition:  "publish",
		Environment: "production",
	}); err != nil {
		t.Fatalf("validate posts: %v", err)
	}
	if postsChecker.calls != 1 {
		t.Fatalf("expected posts checker called once, got %d", postsChecker.calls)
	}
	if !reflect.DeepEqual(postsChecker.lastRequired, []string{"en", "es"}) {
		t.Fatalf("expected posts required locales [en es], got %+v", postsChecker.lastRequired)
	}
	if !reflect.DeepEqual(postsChecker.lastOpts.RequiredFields, map[string][]string{"es": {"title", "excerpt"}}) {
		t.Fatalf("expected posts required fields, got %+v", postsChecker.lastOpts.RequiredFields)
	}
}

func TestTranslationPolicyValidateIncludesMissingFieldsByLocale(t *testing.T) {
	pagesChecker := &recordingTranslationChecker{missing: []string{"fr"}}
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
				"publish": {
					Locales:        []string{"en", "fr"},
					RequiredFields: map[string][]string{"fr": {"title", "path"}},
				},
			},
		},
	}
	policy := NewTranslationPolicy(cfg, TranslationPolicyServices{
		Pages: pagesChecker,
	})

	err := policy.Validate(context.Background(), admin.TranslationPolicyInput{
		EntityType: "pages",
		EntityID:   uuid.NewString(),
		Transition: "publish",
	})
	if err == nil {
		t.Fatalf("expected missing translations error")
	}
	var missing admin.MissingTranslationsError
	if !errors.As(err, &missing) {
		t.Fatalf("expected MissingTranslationsError, got %T", err)
	}
	if !missing.RequiredFieldsEvaluated {
		t.Fatalf("expected required fields evaluated")
	}
	if !reflect.DeepEqual(missing.MissingFieldsByLocale, map[string][]string{"fr": {"path", "title"}}) {
		t.Fatalf("expected missing fields by locale, got %+v", missing.MissingFieldsByLocale)
	}
}

func TestTranslationPolicyValidateSkipsMissingFieldsByLocaleForIgnoreStrategy(t *testing.T) {
	pagesChecker := &recordingTranslationChecker{missing: []string{"fr"}}
	cfg := TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationIgnore,
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
				"publish": {
					Locales:        []string{"en", "fr"},
					RequiredFields: map[string][]string{"fr": {"title", "path"}},
				},
			},
		},
	}
	policy := NewTranslationPolicy(cfg, TranslationPolicyServices{
		Pages: pagesChecker,
	})

	err := policy.Validate(context.Background(), admin.TranslationPolicyInput{
		EntityType: "pages",
		EntityID:   uuid.NewString(),
		Transition: "publish",
	})
	if err == nil {
		t.Fatalf("expected missing translations error")
	}
	var missing admin.MissingTranslationsError
	if !errors.As(err, &missing) {
		t.Fatalf("expected MissingTranslationsError, got %T", err)
	}
	if missing.RequiredFieldsEvaluated {
		t.Fatalf("expected required fields to be skipped")
	}
	if len(missing.MissingFieldsByLocale) != 0 {
		t.Fatalf("expected missing fields metadata omitted, got %+v", missing.MissingFieldsByLocale)
	}
}

func TestTranslationPolicyValidateNormalizesEntityMetadata(t *testing.T) {
	postsChecker := &recordingTranslationChecker{missing: []string{"fr"}}
	cfg := TranslationPolicyConfig{
		Required: map[string]TranslationPolicyEntityConfig{
			"posts": {
				"publish": {
					Locales: []string{"en", "fr"},
				},
			},
		},
	}
	policy := NewTranslationPolicy(cfg, TranslationPolicyServices{
		Content: postsChecker,
	})

	err := policy.Validate(context.Background(), admin.TranslationPolicyInput{
		EntityType:      "posts@staging",
		PolicyEntity:    "posts@staging",
		EntityID:        uuid.NewString(),
		Transition:      "publish",
		RequestedLocale: "en",
	})
	if err == nil {
		t.Fatalf("expected missing translations error")
	}
	var missing admin.MissingTranslationsError
	if !errors.As(err, &missing) {
		t.Fatalf("expected MissingTranslationsError, got %T", err)
	}
	if missing.EntityType != "posts" {
		t.Fatalf("expected normalized entity type posts, got %q", missing.EntityType)
	}
	if missing.PolicyEntity != "posts" {
		t.Fatalf("expected normalized policy entity posts, got %q", missing.PolicyEntity)
	}
}

func TestTranslationPolicyValidateEnvironmentResolutionIsDeterministic(t *testing.T) {
	pagesChecker := &recordingTranslationChecker{}
	cfg := TranslationPolicyConfig{
		Required: map[string]TranslationPolicyEntityConfig{
			"pages": {
				"publish": {
					Locales: []string{"en"},
					Environments: map[string]TranslationCriteria{
						"Staging":    {Locales: []string{"en", "es"}},
						"production": {Locales: []string{"en", "es", "fr"}},
					},
				},
			},
		},
	}
	policy := NewTranslationPolicy(cfg, TranslationPolicyServices{
		Pages: pagesChecker,
	})
	pageID := uuid.NewString()

	if err := policy.Validate(context.Background(), admin.TranslationPolicyInput{
		EntityType:  "pages",
		EntityID:    pageID,
		Transition:  "publish",
		Environment: "staging",
	}); err != nil {
		t.Fatalf("validate staging: %v", err)
	}
	if !reflect.DeepEqual(pagesChecker.lastRequired, []string{"en", "es"}) {
		t.Fatalf("expected staging locales [en es], got %+v", pagesChecker.lastRequired)
	}

	if err := policy.Validate(context.Background(), admin.TranslationPolicyInput{
		EntityType:  "pages",
		EntityID:    pageID,
		Transition:  "publish",
		Environment: "PRODUCTION",
	}); err != nil {
		t.Fatalf("validate production: %v", err)
	}
	if !reflect.DeepEqual(pagesChecker.lastRequired, []string{"en", "es", "fr"}) {
		t.Fatalf("expected production locales [en es fr], got %+v", pagesChecker.lastRequired)
	}

	if err := policy.Validate(context.Background(), admin.TranslationPolicyInput{
		EntityType:  "pages",
		EntityID:    pageID,
		Transition:  "publish",
		Environment: "qa",
	}); err != nil {
		t.Fatalf("validate qa fallback: %v", err)
	}
	if !reflect.DeepEqual(pagesChecker.lastRequired, []string{"en"}) {
		t.Fatalf("expected transition-level fallback locales [en], got %+v", pagesChecker.lastRequired)
	}
}
