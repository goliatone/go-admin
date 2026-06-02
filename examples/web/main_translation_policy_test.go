package main

import (
	"context"
	"reflect"
	"testing"

	adminpkg "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
)

type policyRecordingChecker struct {
	calls        int
	lastRequired []string
	lastOpts     cmsinterfaces.TranslationCheckOptions
}

func (c *policyRecordingChecker) CheckTranslations(_ context.Context, _ uuid.UUID, required []string, opts cmsinterfaces.TranslationCheckOptions) ([]string, error) {
	c.calls++
	c.lastRequired = append([]string{}, required...)
	c.lastOpts = opts
	return nil, nil
}

func TestExampleTranslationPolicyUsesEnvironmentSpecificPublishRequirementsForPagesPostsAndNews(t *testing.T) {
	pagesChecker := &policyRecordingChecker{}
	contentChecker := &policyRecordingChecker{}
	policy := quickstart.NewTranslationPolicy(
		exampleTranslationPolicyConfig(),
		quickstart.TranslationPolicyServices{
			Pages:   pagesChecker,
			Content: contentChecker,
		},
	)

	testCases := []struct {
		name                string
		input               adminpkg.TranslationPolicyInput
		checker             *policyRecordingChecker
		expectedLocales     []string
		expectedFieldByLang map[string][]string
	}{
		{
			name: "pages staging",
			input: adminpkg.TranslationPolicyInput{
				EntityType:  "pages",
				EntityID:    uuid.NewString(),
				Transition:  "publish",
				Environment: "staging",
			},
			checker:         pagesChecker,
			expectedLocales: []string{"en", "es"},
			expectedFieldByLang: map[string][]string{
				"en": {"title", "path"},
				"es": {"title", "path"},
			},
		},
		{
			name: "pages production",
			input: adminpkg.TranslationPolicyInput{
				EntityType:  "pages",
				EntityID:    uuid.NewString(),
				Transition:  "publish",
				Environment: "production",
			},
			checker:         pagesChecker,
			expectedLocales: []string{"en", "es", "fr"},
			expectedFieldByLang: map[string][]string{
				"en": {"title", "path"},
				"es": {"title", "path"},
				"fr": {"title", "path"},
			},
		},
		{
			name: "posts staging",
			input: adminpkg.TranslationPolicyInput{
				EntityType:  "posts",
				EntityID:    uuid.NewString(),
				Transition:  "publish",
				Environment: "staging",
			},
			checker:         contentChecker,
			expectedLocales: []string{"en", "es"},
			expectedFieldByLang: map[string][]string{
				"en": {"title", "path", "excerpt"},
				"es": {"title", "path", "excerpt"},
			},
		},
		{
			name: "posts production",
			input: adminpkg.TranslationPolicyInput{
				EntityType:  "posts",
				EntityID:    uuid.NewString(),
				Transition:  "publish",
				Environment: "production",
			},
			checker:         contentChecker,
			expectedLocales: []string{"en", "es", "fr"},
			expectedFieldByLang: map[string][]string{
				"en": {"title", "path", "excerpt"},
				"es": {"title", "path", "excerpt"},
				"fr": {"title", "path", "excerpt"},
			},
		},
		{
			name: "news default",
			input: adminpkg.TranslationPolicyInput{
				EntityType: "news",
				EntityID:   uuid.NewString(),
				Transition: "publish",
			},
			checker:         contentChecker,
			expectedLocales: []string{"en", "es", "fr"},
			expectedFieldByLang: map[string][]string{
				"en": {"title", "path", "excerpt"},
				"es": {"title", "path", "excerpt"},
				"fr": {"title", "path", "excerpt"},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			beforeCalls := tc.checker.calls
			if err := policy.Validate(context.Background(), tc.input); err != nil {
				t.Fatalf("validate policy: %v", err)
			}
			if tc.checker.calls != beforeCalls+1 {
				t.Fatalf("expected checker call increment, got %d -> %d", beforeCalls, tc.checker.calls)
			}
			if !reflect.DeepEqual(tc.expectedLocales, tc.checker.lastRequired) {
				t.Fatalf("expected locales %+v got %+v", tc.expectedLocales, tc.checker.lastRequired)
			}
			if !reflect.DeepEqual(tc.expectedFieldByLang, tc.checker.lastOpts.RequiredFields) {
				t.Fatalf("expected required fields %+v got %+v", tc.expectedFieldByLang, tc.checker.lastOpts.RequiredFields)
			}
		})
	}
}

func TestExampleTranslationPolicyValidationCatalogIncludesNews(t *testing.T) {
	result, err := quickstart.ValidateTranslationPolicyConfig(
		exampleTranslationPolicyConfig(),
		exampleTranslationPolicyValidationCatalog(),
	)
	if err != nil {
		t.Fatalf("validate example translation policy config: %v", err)
	}
	if len(result.Warnings) != 0 {
		t.Fatalf("expected no validation warnings, got %+v", result.Warnings)
	}
}

func TestExampleTranslationPolicyCoversFamilyContentTypes(t *testing.T) {
	result, err := quickstart.ValidateTranslationPolicyCoverage(
		exampleTranslationPolicyConfig(),
		exampleTranslationFamilyContentTypes(),
	)
	if err != nil {
		t.Fatalf("validate example translation policy coverage: %v", err)
	}
	if len(result.Warnings) != 0 {
		t.Fatalf("expected no coverage warnings, got %+v", result.Warnings)
	}
}
