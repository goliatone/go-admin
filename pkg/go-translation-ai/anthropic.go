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

type AnthropicConfig struct {
	APIKey       string
	BaseURL      string
	Model        string
	Version      string
	Timeout      time.Duration
	MaxTokens    int
	Temperature  *float64
	SystemPrompt string
}

type AnthropicClient interface {
	CreateMessage(context.Context, AnthropicMessageRequest) (AnthropicMessageResponse, error)
}

type AnthropicMessageRequest struct {
	Model       string             `json:"model"`
	System      string             `json:"system,omitempty"`
	MaxTokens   int                `json:"max_tokens"`
	Temperature *float64           `json:"temperature,omitempty"`
	Messages    []AnthropicMessage `json:"messages"`
	Metadata    map[string]any     `json:"metadata,omitempty"`
}

type AnthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AnthropicMessageResponse struct {
	ID      string                  `json:"id,omitempty"`
	Model   string                  `json:"model,omitempty"`
	Content []AnthropicContentBlock `json:"content,omitempty"`
	Usage   map[string]any          `json:"usage,omitempty"`
	Error   *AnthropicErrorResponse `json:"error,omitempty"`
}

type AnthropicContentBlock struct {
	Type string `json:"type,omitempty"`
	Text string `json:"text,omitempty"`
}

type AnthropicErrorResponse struct {
	Type    string `json:"type,omitempty"`
	Message string `json:"message,omitempty"`
}

type AnthropicProvider struct {
	client AnthropicClient
	config AnthropicConfig
}

var _ Provider = (*AnthropicProvider)(nil)

func NewAnthropicProvider(cfg AnthropicConfig) *AnthropicProvider {
	return &AnthropicProvider{
		client: newAnthropicHTTPClient(cfg),
		config: normalizeAnthropicConfig(cfg),
	}
}

func NewAnthropicClientProvider(client AnthropicClient, cfg AnthropicConfig) *AnthropicProvider {
	return &AnthropicProvider{
		client: client,
		config: normalizeAnthropicConfig(cfg),
	}
}

func WithAnthropicProvider(cfg AnthropicConfig) Option {
	return WithProvider(NewAnthropicProvider(cfg))
}

func WithAnthropicClient(client AnthropicClient, cfg AnthropicConfig) Option {
	return WithProvider(NewAnthropicClientProvider(client, cfg))
}

func (p *AnthropicProvider) GenerateTranslation(ctx context.Context, req ProviderRequest) (ProviderResponse, error) {
	if p == nil || p.client == nil {
		return ProviderResponse{}, errors.New("anthropic client is not configured")
	}
	model := firstNonEmpty(req.Model, p.config.Model)
	if model == "" {
		return ProviderResponse{}, errors.New("anthropic model is required")
	}
	maxTokens := p.config.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 1024
	}
	resp, err := p.client.CreateMessage(ctx, AnthropicMessageRequest{
		Model:       model,
		System:      firstNonEmpty(req.SystemPrompt, p.config.SystemPrompt, "You are a professional localization assistant."),
		MaxTokens:   maxTokens,
		Temperature: p.config.Temperature,
		Messages: []AnthropicMessage{
			{Role: "user", Content: req.Prompt},
		},
		Metadata: req.Metadata,
	})
	if err != nil {
		return ProviderResponse{}, err
	}
	if resp.Error != nil {
		return ProviderResponse{}, errors.New(firstNonEmpty(resp.Error.Message, "anthropic request failed"))
	}
	text := ""
	for _, block := range resp.Content {
		if strings.EqualFold(block.Type, "text") || block.Type == "" {
			text = strings.TrimSpace(block.Text)
			if text != "" {
				break
			}
		}
	}
	return ProviderResponse{
		Text:     text,
		Provider: "anthropic",
		Model:    firstNonEmpty(resp.Model, model),
		Diagnostics: map[string]any{
			"provider_response_id": resp.ID,
			"usage":                resp.Usage,
		},
	}, nil
}

func (p *AnthropicProvider) Ready() bool {
	if p == nil || p.client == nil {
		return false
	}
	if httpClient, ok := p.client.(*anthropicHTTPClient); ok {
		return strings.TrimSpace(httpClient.apiKey) != ""
	}
	return true
}

type anthropicHTTPClient struct {
	apiKey     string
	baseURL    string
	version    string
	httpClient *http.Client
}

func newAnthropicHTTPClient(cfg AnthropicConfig) *anthropicHTTPClient {
	cfg = normalizeAnthropicConfig(cfg)
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &anthropicHTTPClient{
		apiKey:     strings.TrimSpace(cfg.APIKey),
		baseURL:    strings.TrimRight(cfg.BaseURL, "/"),
		version:    strings.TrimSpace(cfg.Version),
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (c *anthropicHTTPClient) CreateMessage(ctx context.Context, req AnthropicMessageRequest) (AnthropicMessageResponse, error) {
	if c == nil {
		return AnthropicMessageResponse{}, errors.New("anthropic http client is not configured")
	}
	if c.apiKey == "" {
		return AnthropicMessageResponse{}, errors.New("anthropic api key is required")
	}
	body, err := json.Marshal(req)
	if err != nil {
		return AnthropicMessageResponse{}, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return AnthropicMessageResponse{}, err
	}
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", c.version)
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return AnthropicMessageResponse{}, err
	}
	defer resp.Body.Close()

	var out AnthropicMessageResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return AnthropicMessageResponse{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		if out.Error != nil && strings.TrimSpace(out.Error.Message) != "" {
			return AnthropicMessageResponse{}, errors.New(out.Error.Message)
		}
		return AnthropicMessageResponse{}, fmt.Errorf("anthropic request failed with status %d", resp.StatusCode)
	}
	return out, nil
}

func normalizeAnthropicConfig(cfg AnthropicConfig) AnthropicConfig {
	cfg.APIKey = strings.TrimSpace(cfg.APIKey)
	cfg.BaseURL = strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.anthropic.com/v1"
	}
	cfg.Model = strings.TrimSpace(cfg.Model)
	cfg.Version = strings.TrimSpace(cfg.Version)
	if cfg.Version == "" {
		cfg.Version = "2023-06-01"
	}
	cfg.SystemPrompt = strings.TrimSpace(cfg.SystemPrompt)
	return cfg
}
