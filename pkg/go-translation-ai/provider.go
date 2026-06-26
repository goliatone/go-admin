package translationai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
)

// Provider is the small LLM boundary used by this package.
type Provider interface {
	GenerateTranslation(context.Context, ProviderRequest) (ProviderResponse, error)
}

type readyProvider interface {
	Ready() bool
}

// ProviderRequest contains the prompt and safe translation context sent to a
// host-supplied provider implementation.
type ProviderRequest struct {
	Model        string         `json:"model,omitempty"`
	SystemPrompt string         `json:"system_prompt,omitempty"`
	Prompt       string         `json:"prompt"`
	SourceLocale string         `json:"source_locale,omitempty"`
	TargetLocale string         `json:"target_locale,omitempty"`
	FieldPath    string         `json:"field_path,omitempty"`
	EntityType   string         `json:"entity_type,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

// ProviderResponse is the provider result before core admin normalization.
type ProviderResponse struct {
	Text        string         `json:"text"`
	Provider    string         `json:"provider,omitempty"`
	Model       string         `json:"model,omitempty"`
	Diagnostics map[string]any `json:"diagnostics,omitempty"`
}

// PromptConfig controls the default prompt builder.
type PromptConfig struct {
	SystemPrompt string
	Instruction  string
}

// PromptBuilder builds the provider request after core policy checks pass.
type PromptBuilder interface {
	BuildTranslationPrompt(coreadmin.TranslationSuggestionProviderInput, PromptConfig) (ProviderRequest, error)
}

type promptBuilderFunc func(coreadmin.TranslationSuggestionProviderInput, PromptConfig) (ProviderRequest, error)

func (f promptBuilderFunc) BuildTranslationPrompt(input coreadmin.TranslationSuggestionProviderInput, cfg PromptConfig) (ProviderRequest, error) {
	return f(input, cfg)
}

// DefaultPromptBuilder builds a concise translation prompt from sanitized input.
type DefaultPromptBuilder struct{}

func (DefaultPromptBuilder) BuildTranslationPrompt(input coreadmin.TranslationSuggestionProviderInput, cfg PromptConfig) (ProviderRequest, error) {
	sourceText := strings.TrimSpace(input.SourceText)
	if sourceText == "" {
		return ProviderRequest{}, errors.New("source text is required")
	}
	instruction := strings.TrimSpace(cfg.Instruction)
	if instruction == "" {
		instruction = "Translate the source text into the target locale. Preserve placeholders, variables, HTML tags, product names, and formatting intent. Return only the translated text."
	}
	systemPrompt := strings.TrimSpace(cfg.SystemPrompt)
	if systemPrompt == "" {
		systemPrompt = "You are a professional localization assistant."
	}

	parts := []string{
		instruction,
		fmt.Sprintf("Source locale: %s", strings.TrimSpace(input.SourceLocale)),
		fmt.Sprintf("Target locale: %s", strings.TrimSpace(input.TargetLocale)),
		fmt.Sprintf("Field path: %s", strings.TrimSpace(input.FieldPath)),
	}
	if entityType := strings.TrimSpace(input.EntityType); entityType != "" {
		parts = append(parts, fmt.Sprintf("Entity type: %s", entityType))
	}
	if targetText := strings.TrimSpace(input.TargetText); targetText != "" {
		parts = append(parts, "Current target draft:", targetText)
	}
	if assist := formatAssistContext(input.AssistContext); assist != "" {
		parts = append(parts, "Assist context:", assist)
	}
	parts = append(parts, "Source text:", sourceText)

	return ProviderRequest{
		SystemPrompt: systemPrompt,
		Prompt:       strings.Join(parts, "\n\n"),
		SourceLocale: strings.TrimSpace(input.SourceLocale),
		TargetLocale: strings.TrimSpace(input.TargetLocale),
		FieldPath:    strings.TrimSpace(input.FieldPath),
		EntityType:   strings.TrimSpace(input.EntityType),
		Metadata: map[string]any{
			"assignment_id":   strings.TrimSpace(input.AssignmentID),
			"field_path":      strings.TrimSpace(input.FieldPath),
			"correlation_id":  strings.TrimSpace(input.CorrelationID),
			"idempotency_key": strings.TrimSpace(input.IdempotencyKey),
		},
	}, nil
}

// PromptProvider adapts a package Provider to core admin's provider boundary.
type PromptProvider struct {
	provider Provider
	model    string
	builder  PromptBuilder
	config   PromptConfig
}

// ProviderOption configures a PromptProvider.
type ProviderOption func(*PromptProvider)

func NewPromptProvider(provider Provider, opts ...ProviderOption) *PromptProvider {
	p := &PromptProvider{
		provider: provider,
		builder:  DefaultPromptBuilder{},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(p)
		}
	}
	return p
}

func WithProviderModel(model string) ProviderOption {
	return func(p *PromptProvider) {
		p.model = strings.TrimSpace(model)
	}
}

func WithPromptBuilder(builder PromptBuilder) ProviderOption {
	return func(p *PromptProvider) {
		if builder != nil {
			p.builder = builder
		}
	}
}

func WithPromptBuilderFunc(fn func(coreadmin.TranslationSuggestionProviderInput, PromptConfig) (ProviderRequest, error)) ProviderOption {
	return WithPromptBuilder(promptBuilderFunc(fn))
}

func WithPromptConfig(cfg PromptConfig) ProviderOption {
	return func(p *PromptProvider) {
		p.config = cfg
	}
}

func (p *PromptProvider) SuggestTranslation(ctx context.Context, input coreadmin.TranslationSuggestionProviderInput) (coreadmin.TranslationSuggestionProviderResult, error) {
	if p == nil || p.provider == nil {
		return coreadmin.TranslationSuggestionProviderResult{}, errors.New("translation AI provider is not configured")
	}
	builder := p.builder
	if builder == nil {
		builder = DefaultPromptBuilder{}
	}
	req, err := builder.BuildTranslationPrompt(input, p.config)
	if err != nil {
		return coreadmin.TranslationSuggestionProviderResult{}, err
	}
	if strings.TrimSpace(req.Model) == "" {
		req.Model = strings.TrimSpace(p.model)
	}
	resp, err := p.provider.GenerateTranslation(ctx, req)
	if err != nil {
		return coreadmin.TranslationSuggestionProviderResult{}, err
	}
	return coreadmin.TranslationSuggestionProviderResult{
		Text:        strings.TrimSpace(resp.Text),
		Provider:    strings.TrimSpace(resp.Provider),
		Model:       firstNonEmpty(resp.Model, req.Model),
		Diagnostics: sanitizeDiagnostics(resp.Diagnostics),
	}, nil
}

func (p *PromptProvider) Ready() bool {
	if p == nil || p.provider == nil {
		return false
	}
	if ready, ok := p.provider.(readyProvider); ok {
		return ready.Ready()
	}
	return true
}

func formatAssistContext(value map[string]any) string {
	if len(value) == 0 {
		return ""
	}
	keys := make([]string, 0, len(value))
	for key := range value {
		if strings.TrimSpace(key) != "" {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	ordered := make(map[string]any, len(keys))
	for _, key := range keys {
		ordered[key] = value[key]
	}
	data, err := json.MarshalIndent(ordered, "", "  ")
	if err != nil {
		return ""
	}
	return string(data)
}

func sanitizeDiagnostics(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		normalized := strings.ToLower(strings.TrimSpace(key))
		if normalized == "" || diagnosticKeySensitive(normalized) {
			continue
		}
		out[strings.TrimSpace(key)] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func diagnosticKeySensitive(key string) bool {
	sensitive := []string{"api_key", "apikey", "secret", "token", "password", "authorization", "prompt", "source_text", "raw_request", "raw_response"}
	for _, marker := range sensitive {
		if strings.Contains(key, marker) {
			return true
		}
	}
	return false
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
