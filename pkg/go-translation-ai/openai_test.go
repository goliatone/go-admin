package translationai

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
)

type fakeOpenAIClient struct {
	last OpenAIChatCompletionRequest
	resp OpenAIChatCompletionResponse
	err  error
}

func (c *fakeOpenAIClient) CreateChatCompletion(_ context.Context, req OpenAIChatCompletionRequest) (OpenAIChatCompletionResponse, error) {
	c.last = req
	if c.err != nil {
		return OpenAIChatCompletionResponse{}, c.err
	}
	if len(c.resp.Choices) > 0 || c.resp.Error != nil || c.resp.ID != "" || c.resp.Model != "" {
		return c.resp, nil
	}
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
	if len(client.last.Messages) != 2 || openAIMessageContentText(client.last.Messages[1].Content) != "Translate Hello" {
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

func TestOpenAIProviderExtractsContentParts(t *testing.T) {
	client := &fakeOpenAIClient{
		resp: OpenAIChatCompletionResponse{
			ID:    "chatcmpl-parts",
			Model: "gpt-test",
			Choices: []OpenAIChoice{{
				Message: OpenAIChatMessage{
					Role: "assistant",
					Content: []any{
						map[string]any{"type": "text", "text": "Bonjour"},
						map[string]any{"type": "text", "text": " le monde"},
					},
				},
			}},
		},
	}
	provider := NewOpenAIClientProvider(client, OpenAIConfig{Model: "gpt-test"})
	resp, err := provider.GenerateTranslation(context.Background(), ProviderRequest{Prompt: "Translate Hello"})
	if err != nil {
		t.Fatalf("GenerateTranslation: %v", err)
	}
	if resp.Text != "Bonjour\nle monde" {
		t.Fatalf("expected content parts to be joined, got %q", resp.Text)
	}
}

func TestOpenAIProviderSendsBoundedMaxTokensByDefault(t *testing.T) {
	client := &fakeOpenAIClient{}
	provider := NewOpenAIClientProvider(client, OpenAIConfig{Model: "gpt-test"})
	_, err := provider.GenerateTranslation(context.Background(), ProviderRequest{Prompt: "Translate Hello"})
	if err != nil {
		t.Fatalf("GenerateTranslation: %v", err)
	}
	if client.last.MaxTokens != 256 {
		t.Fatalf("expected default max tokens 256, got %d", client.last.MaxTokens)
	}
}

func TestOpenAIRequestMergesExtraBodyWithoutOverridingCanonicalFields(t *testing.T) {
	req := OpenAIChatCompletionRequest{
		Model:          "gpt-test",
		Messages:       []OpenAIChatMessage{{Role: "user", Content: "Translate Hello"}},
		MaxTokens:      128,
		MaxTokensField: "max_completion_tokens",
		ExtraBody: map[string]any{
			"model":                 "malicious-override",
			"max_tokens":            float64(999),
			"max_completion_tokens": float64(999),
			"chat_template_kwargs":  map[string]any{"enable_thinking": false},
		},
	}
	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	var body map[string]any
	if err := json.Unmarshal(data, &body); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if body["model"] != "gpt-test" {
		t.Fatalf("canonical model was overridden: %+v", body)
	}
	if _, ok := body["max_tokens"]; ok {
		t.Fatalf("unexpected max_tokens field for max_completion_tokens request: %+v", body)
	}
	if body["max_completion_tokens"] != float64(128) {
		t.Fatalf("canonical max_completion_tokens was overridden: %+v", body)
	}
	extra, ok := body["chat_template_kwargs"].(map[string]any)
	if !ok || extra["enable_thinking"] != false {
		t.Fatalf("expected extra body field to be merged, got %+v", body)
	}
}

func TestOpenAIRequestCanDisableCanonicalTokenLimitField(t *testing.T) {
	req := OpenAIChatCompletionRequest{
		Model:          "gpt-test",
		Messages:       []OpenAIChatMessage{{Role: "user", Content: "Translate Hello"}},
		MaxTokens:      128,
		MaxTokensField: "none",
		ExtraBody: map[string]any{
			"num_predict": 64,
		},
	}
	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	var body map[string]any
	if err := json.Unmarshal(data, &body); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if _, ok := body["max_tokens"]; ok {
		t.Fatalf("expected max_tokens to be omitted: %+v", body)
	}
	if _, ok := body["max_completion_tokens"]; ok {
		t.Fatalf("expected max_completion_tokens to be omitted: %+v", body)
	}
	if body["num_predict"] != float64(64) {
		t.Fatalf("expected provider-specific token field, got %+v", body)
	}
}

func TestOpenAIProviderConfigCanDisableCanonicalTokenLimitField(t *testing.T) {
	client := &fakeOpenAIClient{}
	provider := NewOpenAIClientProvider(client, OpenAIConfig{
		Model:          "gpt-test",
		MaxTokens:      128,
		MaxTokensField: "none",
		ExtraBody: map[string]any{
			"num_predict": 64,
		},
	})
	_, err := provider.GenerateTranslation(context.Background(), ProviderRequest{Prompt: "Translate Hello"})
	if err != nil {
		t.Fatalf("GenerateTranslation: %v", err)
	}
	data, err := json.Marshal(client.last)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	var body map[string]any
	if err := json.Unmarshal(data, &body); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if _, ok := body["max_tokens"]; ok {
		t.Fatalf("expected max_tokens to be omitted after config normalization: %+v", body)
	}
	if _, ok := body["max_completion_tokens"]; ok {
		t.Fatalf("expected max_completion_tokens to be omitted after config normalization: %+v", body)
	}
	if body["num_predict"] != float64(64) {
		t.Fatalf("expected provider-specific token field, got %+v", body)
	}
}

func TestOpenAIProviderRejectsReasoningOnlyResponse(t *testing.T) {
	client := &fakeOpenAIClient{
		resp: OpenAIChatCompletionResponse{
			ID:    "chatcmpl-reasoning",
			Model: "qwen3.6-27b-mtp",
			Choices: []OpenAIChoice{{
				Message: OpenAIChatMessage{
					Role:             "assistant",
					Content:          "",
					ReasoningContent: "I should translate this into Spanish.",
				},
			}},
		},
	}
	provider := NewOpenAIClientProvider(client, OpenAIConfig{Model: "qwen3.6-27b-mtp"})
	_, err := provider.GenerateTranslation(context.Background(), ProviderRequest{Prompt: "Translate Hello"})
	if err == nil {
		t.Fatalf("expected reasoning-only response error")
	}
	if !strings.Contains(err.Error(), "reasoning_content") || !strings.Contains(err.Error(), "translated text") {
		t.Fatalf("expected actionable reasoning-only error, got %v", err)
	}
}
