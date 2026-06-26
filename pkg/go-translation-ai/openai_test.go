package translationai

import (
	"context"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
)

type fakeOpenAIClient struct {
	last OpenAIChatCompletionRequest
}

func (c *fakeOpenAIClient) CreateChatCompletion(_ context.Context, req OpenAIChatCompletionRequest) (OpenAIChatCompletionResponse, error) {
	c.last = req
	return OpenAIChatCompletionResponse{
		ID:    "chatcmpl-1",
		Model: req.Model,
		Choices: []OpenAIChoice{{
			Message: OpenAIChatMessage{Role: "assistant", Content: "Bonjour"},
		}},
		Usage: map[string]any{"total_tokens": float64(12)},
	}, nil
}

func TestOpenAIClientProviderUsesInjectedClient(t *testing.T) {
	client := &fakeOpenAIClient{}
	provider := NewOpenAIClientProvider(client, OpenAIConfig{Model: "gpt-test"})
	resp, err := provider.GenerateTranslation(context.Background(), ProviderRequest{
		Prompt:       "Translate Hello",
		SystemPrompt: "System",
		Metadata: map[string]any{
			"assignment_id": "asg-1",
		},
	})
	if err != nil {
		t.Fatalf("GenerateTranslation: %v", err)
	}
	if resp.Text != "Bonjour" || resp.Provider != "openai" || resp.Model != "gpt-test" {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if client.last.Model != "gpt-test" {
		t.Fatalf("expected model gpt-test, got %q", client.last.Model)
	}
	if len(client.last.Messages) != 2 || client.last.Messages[1].Content != "Translate Hello" {
		t.Fatalf("unexpected messages: %+v", client.last.Messages)
	}
	if client.last.Metadata["translation_suggestion"]["assignment_id"] != "asg-1" {
		t.Fatalf("metadata not forwarded: %+v", client.last.Metadata)
	}
}

func TestWithOpenAIClientConfiguresServiceProvider(t *testing.T) {
	client := &fakeOpenAIClient{}
	assignment := suggestionTestAssignment()
	svc := NewService(
		WithRepository(fakeAssignmentRepo{assignment: assignment}),
		WithContextLoader(fakeContextLoader{loaded: suggestionTestContext(assignment)}),
		WithAuthorizer(allowAuthorizer{}),
		WithEligibility(coreadmin.TranslationSuggestionAllowAllEligibility{}),
		WithOpenAIClient(client, OpenAIConfig{Model: "gpt-test"}),
	)
	result, err := svc.SuggestTranslation(context.Background(), coreadmin.TranslationSuggestionInput{
		AssignmentID: "asg-ai-1",
		FieldPath:    "title",
	})
	if err != nil {
		t.Fatalf("SuggestTranslation: %v", err)
	}
	if result.SuggestedText != "Bonjour" || result.Provider != "openai" {
		t.Fatalf("unexpected result: %+v", result)
	}
	if !strings.Contains(client.last.Messages[1].Content, "Translation publish guide") {
		t.Fatalf("expected prompt text, got %+v", client.last.Messages)
	}
}
