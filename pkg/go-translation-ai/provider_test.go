package translationai

import (
	"context"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
)

func TestDefaultPromptBuilderIncludesTranslationContext(t *testing.T) {
	req, err := (DefaultPromptBuilder{}).BuildTranslationPrompt(coreadmin.TranslationSuggestionProviderInput{
		AssignmentID:  "asg-1",
		FieldPath:     "body",
		EntityType:    "article",
		SourceLocale:  "en",
		TargetLocale:  "es",
		SourceText:    "Publish now",
		TargetText:    "Publicar",
		AssistContext: map[string]any{"style": "Use formal tone"},
	}, PromptConfig{})
	if err != nil {
		t.Fatalf("BuildTranslationPrompt: %v", err)
	}
	for _, want := range []string{"Source locale: en", "Target locale: es", "Field path: body", "Entity type: article", "Publish now", "Use formal tone"} {
		if !strings.Contains(req.Prompt, want) {
			t.Fatalf("expected prompt to contain %q, got %q", want, req.Prompt)
		}
	}
	if req.SystemPrompt == "" {
		t.Fatalf("expected default system prompt")
	}
}

func TestPromptProviderSanitizesDiagnostics(t *testing.T) {
	provider := &fakeProvider{
		resp: ProviderResponse{
			Text:     "Hola",
			Provider: "fake",
			Diagnostics: map[string]any{
				"token":       "secret",
				"raw_prompt":  "source",
				"request_id":  "req-1",
				"safe_metric": 3,
			},
		},
	}
	adapter := NewPromptProvider(provider, WithProviderModel("model-a"))
	result, err := adapter.SuggestTranslation(context.Background(), coreadmin.TranslationSuggestionProviderInput{
		AssignmentID:  "asg-1",
		FieldPath:     "title",
		SourceLocale:  "en",
		TargetLocale:  "es",
		SourceText:    "Hello",
		CorrelationID: "corr-1",
	})
	if err != nil {
		t.Fatalf("SuggestTranslation: %v", err)
	}
	if result.Text != "Hola" || result.Provider != "fake" || result.Model != "model-a" {
		t.Fatalf("unexpected result: %+v", result)
	}
	if _, ok := result.Diagnostics["token"]; ok {
		t.Fatalf("token diagnostic leaked: %+v", result.Diagnostics)
	}
	if _, ok := result.Diagnostics["raw_prompt"]; ok {
		t.Fatalf("prompt diagnostic leaked: %+v", result.Diagnostics)
	}
	if result.Diagnostics["request_id"] != "req-1" || result.Diagnostics["safe_metric"] != 3 {
		t.Fatalf("safe diagnostics missing: %+v", result.Diagnostics)
	}
}
