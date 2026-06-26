package translationai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type OpenAIConfig struct {
	APIKey       string
	BaseURL      string
	Model        string
	Organization string
	Timeout      time.Duration
	Temperature  *float64
	SystemPrompt string
}

type OpenAIClient interface {
	CreateChatCompletion(context.Context, OpenAIChatCompletionRequest) (OpenAIChatCompletionResponse, error)
}

type OpenAIChatCompletionRequest struct {
	Model       string                    `json:"model"`
	Messages    []OpenAIChatMessage       `json:"messages"`
	Temperature *float64                  `json:"temperature,omitempty"`
	Metadata    map[string]map[string]any `json:"metadata,omitempty"`
}

type OpenAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIChatCompletionResponse struct {
	ID      string               `json:"id,omitempty"`
	Model   string               `json:"model,omitempty"`
	Choices []OpenAIChoice       `json:"choices,omitempty"`
	Usage   map[string]any       `json:"usage,omitempty"`
	Error   *OpenAIErrorResponse `json:"error,omitempty"`
}

type OpenAIChoice struct {
	Message OpenAIChatMessage `json:"message"`
}

type OpenAIErrorResponse struct {
	Message string `json:"message,omitempty"`
	Type    string `json:"type,omitempty"`
	Code    string `json:"code,omitempty"`
}

type OpenAIProvider struct {
	client OpenAIClient
	config OpenAIConfig
}

var _ Provider = (*OpenAIProvider)(nil)

func NewOpenAIProvider(cfg OpenAIConfig) *OpenAIProvider {
	return &OpenAIProvider{
		client: newOpenAIHTTPClient(cfg),
		config: normalizeOpenAIConfig(cfg),
	}
}

func NewOpenAIClientProvider(client OpenAIClient, cfg OpenAIConfig) *OpenAIProvider {
	return &OpenAIProvider{
		client: client,
		config: normalizeOpenAIConfig(cfg),
	}
}

func WithOpenAIProvider(cfg OpenAIConfig) Option {
	return WithProvider(NewOpenAIProvider(cfg))
}

func WithOpenAIClient(client OpenAIClient, cfg OpenAIConfig) Option {
	return WithProvider(NewOpenAIClientProvider(client, cfg))
}

func (p *OpenAIProvider) GenerateTranslation(ctx context.Context, req ProviderRequest) (ProviderResponse, error) {
	if p == nil || p.client == nil {
		return ProviderResponse{}, errors.New("openai client is not configured")
	}
	model := firstNonEmpty(req.Model, p.config.Model)
	if model == "" {
		return ProviderResponse{}, errors.New("openai model is required")
	}
	systemPrompt := firstNonEmpty(req.SystemPrompt, p.config.SystemPrompt, "You are a professional localization assistant.")
	resp, err := p.client.CreateChatCompletion(ctx, OpenAIChatCompletionRequest{
		Model: model,
		Messages: []OpenAIChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: req.Prompt},
		},
		Temperature: p.config.Temperature,
		Metadata: map[string]map[string]any{
			"translation_suggestion": req.Metadata,
		},
	})
	if err != nil {
		return ProviderResponse{}, err
	}
	if resp.Error != nil {
		return ProviderResponse{}, errors.New(firstNonEmpty(resp.Error.Message, "openai request failed"))
	}
	text := ""
	if len(resp.Choices) > 0 {
		text = resp.Choices[0].Message.Content
	}
	return ProviderResponse{
		Text:     strings.TrimSpace(text),
		Provider: "openai",
		Model:    firstNonEmpty(resp.Model, model),
		Diagnostics: map[string]any{
			"provider_response_id": resp.ID,
			"usage":                resp.Usage,
		},
	}, nil
}

func (p *OpenAIProvider) Ready() bool {
	if p == nil || p.client == nil {
		return false
	}
	if httpClient, ok := p.client.(*openAIHTTPClient); ok {
		return strings.TrimSpace(httpClient.apiKey) != ""
	}
	return true
}

type openAIHTTPClient struct {
	apiKey       string
	baseURL      string
	organization string
	httpClient   *http.Client
}

func newOpenAIHTTPClient(cfg OpenAIConfig) *openAIHTTPClient {
	cfg = normalizeOpenAIConfig(cfg)
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &openAIHTTPClient{
		apiKey:       strings.TrimSpace(cfg.APIKey),
		baseURL:      strings.TrimRight(cfg.BaseURL, "/"),
		organization: strings.TrimSpace(cfg.Organization),
		httpClient:   &http.Client{Timeout: timeout},
	}
}

func (c *openAIHTTPClient) CreateChatCompletion(ctx context.Context, req OpenAIChatCompletionRequest) (OpenAIChatCompletionResponse, error) {
	if c == nil {
		return OpenAIChatCompletionResponse{}, errors.New("openai http client is not configured")
	}
	if c.apiKey == "" {
		return OpenAIChatCompletionResponse{}, errors.New("openai api key is required")
	}
	body, err := json.Marshal(req)
	if err != nil {
		return OpenAIChatCompletionResponse{}, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return OpenAIChatCompletionResponse{}, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	if c.organization != "" {
		httpReq.Header.Set("OpenAI-Organization", c.organization)
	}
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return OpenAIChatCompletionResponse{}, err
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			return
		}
	}()

	var out OpenAIChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return OpenAIChatCompletionResponse{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		if out.Error != nil && strings.TrimSpace(out.Error.Message) != "" {
			return OpenAIChatCompletionResponse{}, errors.New(out.Error.Message)
		}
		return OpenAIChatCompletionResponse{}, fmt.Errorf("openai request failed with status %d", resp.StatusCode)
	}
	return out, nil
}

func normalizeOpenAIConfig(cfg OpenAIConfig) OpenAIConfig {
	cfg.APIKey = strings.TrimSpace(cfg.APIKey)
	cfg.BaseURL = strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.openai.com/v1"
	}
	cfg.Model = strings.TrimSpace(cfg.Model)
	cfg.Organization = strings.TrimSpace(cfg.Organization)
	cfg.SystemPrompt = strings.TrimSpace(cfg.SystemPrompt)
	return cfg
}
