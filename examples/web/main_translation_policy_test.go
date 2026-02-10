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

func TestExampleTranslationPolicyUsesEnvironmentSpecificPublishRequirementsForPagesAndPosts(t *testing.T) {
	pagesChecker := &policyRecordingChecker{}
	postsChecker := &policyRecordingChecker{}
	policy := quickstart.NewTranslationPolicy(
		quickstart.DefaultContentTranslationPolicyConfig(),
		quickstart.TranslationPolicyServices{
			Pages:   pagesChecker,
			Content: postsChecker,
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
			checker:         postsChecker,
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
			checker:         postsChecker,
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
