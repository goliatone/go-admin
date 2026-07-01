package goadmin

import (
	"context"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	translationai "github.com/goliatone/go-admin/pkg/go-translation-ai"
)

func TestPromptProviderSanitizesDiagnostics(t *testing.T) {
	provider := &fakeProvider{
		resp: translationai.ProviderResponse{
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

type fakeOpenAIClient struct {
	last translationai.OpenAIChatCompletionRequest
}

func (c *fakeOpenAIClient) CreateChatCompletion(_ context.Context, req translationai.OpenAIChatCompletionRequest) (translationai.OpenAIChatCompletionResponse, error) {
	c.last = req
	return translationai.OpenAIChatCompletionResponse{
		ID:    "chatcmpl-1",
		Model: req.Model,
		Choices: []translationai.OpenAIChoice{{
			Message: translationai.OpenAIChatMessage{Role: "assistant", Content: "Bonjour"},
		}},
		Usage: map[string]any{"total_tokens": float64(12)},
	}, nil
}

func TestWithOpenAIClientConfiguresServiceProvider(t *testing.T) {
	client := &fakeOpenAIClient{}
	assignment := suggestionTestAssignment()
	svc := NewService(
		WithRepository(fakeAssignmentRepo{assignment: assignment}),
		WithContextLoader(fakeContextLoader{loaded: suggestionTestContext(assignment)}),
		WithAuthorizer(allowAuthorizer{}),
		WithEligibility(coreadmin.TranslationSuggestionAllowAllEligibility{}),
		WithOpenAIClient(client, translationai.OpenAIConfig{Model: "gpt-test"}),
	)
	result, err := svc.SuggestTranslation(context.Background(), coreadmin.TranslationSuggestionInput{
		AssignmentID: "asg-ai-1",
		FieldPath:    "title",
		TenantID:     "tenant-1",
		OrgID:        "org-1",
	})
	if err != nil {
		t.Fatalf("SuggestTranslation: %v", err)
	}
	if result.SuggestedText != "Bonjour" || result.Provider != "openai" {
		t.Fatalf("unexpected result: %+v", result)
	}
	if !strings.Contains(openAIMessageContentText(client.last.Messages[1].Content), "Translation publish guide") {
		t.Fatalf("expected prompt text, got %+v", client.last.Messages)
	}
}

func openAIMessageContentText(value any) string {
	switch content := value.(type) {
	case string:
		return strings.TrimSpace(content)
	default:
		return ""
	}
}
