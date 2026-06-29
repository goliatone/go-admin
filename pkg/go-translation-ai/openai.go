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
	MaxTokens    int
	// MaxTokensField selects the OpenAI-compatible request field used for
	// MaxTokens. Supported values are "max_tokens", "max_completion_tokens",
	// and "none". Empty defaults to "max_tokens".
	MaxTokensField string
	Temperature    *float64
	SystemPrompt   string
	ExtraBody      map[string]any
}

type OpenAIClient interface {
	CreateChatCompletion(context.Context, OpenAIChatCompletionRequest) (OpenAIChatCompletionResponse, error)
}

type OpenAIChatCompletionRequest struct {
	Model          string                    `json:"model"`
	Messages       []OpenAIChatMessage       `json:"messages"`
	MaxTokens      int                       `json:"-"`
	MaxTokensField string                    `json:"-"`
	Temperature    *float64                  `json:"temperature,omitempty"`
	Metadata       map[string]map[string]any `json:"metadata,omitempty"`
	ExtraBody      map[string]any            `json:"-"`
}

func (r OpenAIChatCompletionRequest) MarshalJSON() ([]byte, error) {
	merged := map[string]any{
		"model":    r.Model,
		"messages": r.Messages,
	}
	if r.Temperature != nil {
		merged["temperature"] = r.Temperature
	}
	if len(r.Metadata) > 0 {
		merged["metadata"] = r.Metadata
	}
	if r.MaxTokens > 0 {
		if field := openAITokenLimitRequestField(r.MaxTokensField); field != "" {
			merged[field] = r.MaxTokens
		}
	}
	for key, value := range r.ExtraBody {
		key = strings.TrimSpace(key)
		if key == "" || openAIReservedRequestField(key) {
			continue
		}
		merged[key] = value
	}
	return json.Marshal(merged)
}

type OpenAIChatMessage struct {
	Role             string `json:"role"`
	Content          any    `json:"content,omitempty"`
	ReasoningContent string `json:"reasoning_content,omitempty"`
}

type OpenAIChatContentPart struct {
	Type string `json:"type,omitempty"`
	Text string `json:"text,omitempty"`
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

func (p *OpenAIProvider) GenerateTranslation(ctx context.Context, req ProviderRequest) (ProviderResponse, error) {
	if p == nil || p.client == nil {
		return ProviderResponse{}, errors.New("openai client is not configured")
	}
	model := firstNonEmpty(req.Model, p.config.Model)
	if model == "" {
		return ProviderResponse{}, errors.New("openai model is required")
	}
	systemPrompt := firstNonEmpty(req.SystemPrompt, p.config.SystemPrompt, "You are a professional localization assistant.")
	maxTokens := p.config.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 256
	}
	resp, err := p.client.CreateChatCompletion(ctx, OpenAIChatCompletionRequest{
		Model: model,
		Messages: []OpenAIChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: req.Prompt},
		},
		MaxTokens:      maxTokens,
		MaxTokensField: p.config.MaxTokensField,
		Temperature:    p.config.Temperature,
		Metadata: map[string]map[string]any{
			"translation_suggestion": req.Metadata,
		},
		ExtraBody: cloneOpenAIExtraBody(p.config.ExtraBody),
	})
	if err != nil {
		return ProviderResponse{}, err
	}
	if resp.Error != nil {
		return ProviderResponse{}, errors.New(firstNonEmpty(resp.Error.Message, "openai request failed"))
	}
	text := ""
	reasoningText := ""
	if len(resp.Choices) > 0 {
		message := resp.Choices[0].Message
		text = openAIMessageContentText(message.Content)
		reasoningText = strings.TrimSpace(message.ReasoningContent)
	}
	if strings.TrimSpace(text) == "" && reasoningText != "" {
		return ProviderResponse{}, errors.New("openai response contained reasoning_content but no final assistant content; configure the model to return only the translated text")
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

func openAIMessageContentText(value any) string {
	switch content := value.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(content)
	case []OpenAIChatContentPart:
		parts := make([]string, 0, len(content))
		for _, part := range content {
			if text := strings.TrimSpace(part.Text); text != "" {
				parts = append(parts, text)
			}
		}
		return strings.TrimSpace(strings.Join(parts, "\n"))
	case []any:
		parts := make([]string, 0, len(content))
		for _, part := range content {
			switch typed := part.(type) {
			case string:
				if text := strings.TrimSpace(typed); text != "" {
					parts = append(parts, text)
				}
			case map[string]any:
				if text, ok := typed["text"].(string); ok && strings.TrimSpace(text) != "" {
					parts = append(parts, strings.TrimSpace(text))
				}
			}
		}
		return strings.TrimSpace(strings.Join(parts, "\n"))
	default:
		return ""
	}
}

func cloneOpenAIExtraBody(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		if strings.TrimSpace(key) != "" {
			out[strings.TrimSpace(key)] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func openAIReservedRequestField(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "model", "messages", "max_tokens", "max_completion_tokens", "temperature", "metadata":
		return true
	default:
		return false
	}
}

func normalizeOpenAITokenLimitField(field string) string {
	switch strings.ToLower(strings.TrimSpace(field)) {
	case "", "max_tokens":
		return "max_tokens"
	case "max_completion_tokens":
		return "max_completion_tokens"
	case "none", "disabled", "off":
		return "none"
	default:
		return "max_tokens"
	}
}

func openAITokenLimitRequestField(field string) string {
	normalized := normalizeOpenAITokenLimitField(field)
	if normalized == "none" {
		return ""
	}
	return normalized
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
	if cfg.MaxTokens < 0 {
		cfg.MaxTokens = 0
	}
	cfg.MaxTokensField = normalizeOpenAITokenLimitField(cfg.MaxTokensField)
	cfg.ExtraBody = cloneOpenAIExtraBody(cfg.ExtraBody)
	return cfg
}
