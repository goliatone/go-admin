package translationai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
)

// Provider is the small LLM boundary used by this package.
type Provider interface {
	GenerateTranslation(context.Context, ProviderRequest) (ProviderResponse, error)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
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

// PromptInput contains generic translation context for prompt construction.
type PromptInput struct {
	AssignmentID   string
	FieldPath      string
	EntityType     string
	SourceLocale   string
	TargetLocale   string
	SourceText     string
	TargetText     string
	CorrelationID  string
	IdempotencyKey string
	AssistContext  map[string]any
}

// PromptBuilder builds the provider request after core policy checks pass.
type PromptBuilder interface {
	BuildTranslationPrompt(PromptInput, PromptConfig) (ProviderRequest, error)
}

type promptBuilderFunc func(PromptInput, PromptConfig) (ProviderRequest, error)

func (f promptBuilderFunc) BuildTranslationPrompt(input PromptInput, cfg PromptConfig) (ProviderRequest, error) {
	return f(input, cfg)
}

func PromptBuilderFunc(fn func(PromptInput, PromptConfig) (ProviderRequest, error)) PromptBuilder {
	if fn == nil {
		return nil
	}
	return promptBuilderFunc(fn)
}

// DefaultPromptBuilder builds a concise translation prompt from sanitized input.
type DefaultPromptBuilder struct{}

func (DefaultPromptBuilder) BuildTranslationPrompt(input PromptInput, cfg PromptConfig) (ProviderRequest, error) {
	sourceText := strings.TrimSpace(input.SourceText)
	if sourceText == "" {
		return ProviderRequest{}, errors.New("source text is required")
	}
	instruction := strings.TrimSpace(cfg.Instruction)
	if instruction == "" {
		instruction = "Translate the source text into the target locale. Preserve placeholders, variables, HTML tags, product names, and formatting intent. Return only the final translated text. Do not include reasoning, analysis, labels, markdown, or JSON."
	}
	systemPrompt := strings.TrimSpace(cfg.SystemPrompt)
	if systemPrompt == "" {
		systemPrompt = "You are a professional localization assistant. Return only the final translated text. Do not include reasoning, analysis, labels, markdown, or JSON."
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
