package translationai

import (
	"context"
	"testing"
)

type fakeAnthropicClient struct {
	last AnthropicMessageRequest
}

func (c *fakeAnthropicClient) CreateMessage(_ context.Context, req AnthropicMessageRequest) (AnthropicMessageResponse, error) {
	c.last = req
	return AnthropicMessageResponse{
		ID:    "msg-1",
		Model: req.Model,
		Content: []AnthropicContentBlock{{
			Type: "text",
			Text: "Bonjour",
		}},
		Usage: map[string]any{"input_tokens": float64(10)},
	}, nil
}

func TestAnthropicClientProviderUsesInjectedClient(t *testing.T) {
	client := &fakeAnthropicClient{}
	provider := NewAnthropicClientProvider(client, AnthropicConfig{Model: "claude-test", MaxTokens: 256})
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
	if resp.Text != "Bonjour" || resp.Provider != "anthropic" || resp.Model != "claude-test" {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if client.last.Model != "claude-test" || client.last.MaxTokens != 256 {
		t.Fatalf("unexpected request config: %+v", client.last)
	}
	if len(client.last.Messages) != 1 || client.last.Messages[0].Content != "Translate Hello" {
		t.Fatalf("unexpected messages: %+v", client.last.Messages)
	}
	if client.last.Metadata["assignment_id"] != "asg-1" {
		t.Fatalf("metadata not forwarded: %+v", client.last.Metadata)
	}
}
