package main

import (
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
)

func TestBuildExampleTranslationSuggestionServiceDisabledByDefault(t *testing.T) {
	service, reason := buildExampleTranslationSuggestionService(appcfg.TranslationSuggestionRuntimeConfig{}, true)
	if service != nil {
		t.Fatalf("expected nil service when suggestions are disabled")
	}
	if reason != "" {
		t.Fatalf("expected no warning reason for disabled suggestions, got %q", reason)
	}
}

func TestBuildExampleTranslationSuggestionServiceRequiresQueueAndModel(t *testing.T) {
	cfg := appcfg.TranslationSuggestionRuntimeConfig{
		Enabled: true,
		OpenAI: appcfg.TranslationSuggestionOpenAIConfig{
			BaseURL: "http://127.0.0.1:1234/v1",
			Model:   "local-model",
		},
	}
	service, reason := buildExampleTranslationSuggestionService(cfg, false)
	if service != nil || reason != "translation queue is disabled" {
		t.Fatalf("expected queue-disabled reason, service=%T reason=%q", service, reason)
	}

	cfg.OpenAI.Model = ""
	service, reason = buildExampleTranslationSuggestionService(cfg, true)
	if service != nil || reason != "translation.suggestions.openai.model is required" {
		t.Fatalf("expected model-required reason, service=%T reason=%q", service, reason)
	}
}

func TestBuildExampleTranslationSuggestionServiceAllowsLocalLMStudioWithoutExplicitAPIKey(t *testing.T) {
	temp := 0.2
	service, reason := buildExampleTranslationSuggestionService(appcfg.TranslationSuggestionRuntimeConfig{
		Enabled:  true,
		Provider: "lm-studio",
		Prompt: appcfg.TranslationSuggestionPromptConfig{
			SystemPrompt: "Use product terminology.",
			Instruction:  "Return only translated text.",
		},
		OpenAI: appcfg.TranslationSuggestionOpenAIConfig{
			BaseURL:     "http://127.0.0.1:1234/v1",
			Model:       "local-model",
			Timeout:     10 * time.Second,
			Temperature: &temp,
		},
	}, true)
	if reason != "" {
		t.Fatalf("expected no disabled reason, got %q", reason)
	}
	if service == nil {
		t.Fatalf("expected configured suggestion service")
	}
}

func TestBuildExampleTranslationSuggestionServiceRequiresAPIKeyForNonLocalOpenAI(t *testing.T) {
	service, reason := buildExampleTranslationSuggestionService(appcfg.TranslationSuggestionRuntimeConfig{
		Enabled: true,
		OpenAI: appcfg.TranslationSuggestionOpenAIConfig{
			Model: "gpt-test",
		},
	}, true)
	if service != nil || reason != "translation.suggestions.openai.api_key is required" {
		t.Fatalf("expected api-key-required reason, service=%T reason=%q", service, reason)
	}
}

func TestTranslationOperationRequiredPermissionsIncludesSuggestOnlyWhenConfigured(t *testing.T) {
	required, modules := translationOperationRequiredPermissions(nil, false)
	if modules["suggestions"] {
		t.Fatalf("expected suggestions module false")
	}
	if translationSuggestionTestContainsString(required, coreadmin.PermAdminTranslationsSuggest) {
		t.Fatalf("expected suggest permission omitted when suggestions are disabled, got %v", required)
	}

	required, modules = translationOperationRequiredPermissions(nil, true)
	if !modules["suggestions"] {
		t.Fatalf("expected suggestions module true")
	}
	if !translationSuggestionTestContainsString(required, coreadmin.PermAdminTranslationsSuggest) {
		t.Fatalf("expected suggest permission when suggestions are enabled, got %v", required)
	}
}

func translationSuggestionTestContainsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
