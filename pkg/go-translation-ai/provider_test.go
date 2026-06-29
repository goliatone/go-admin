package translationai

import (
	"strings"
	"testing"
)

func TestDefaultPromptBuilderIncludesTranslationContext(t *testing.T) {
	req, err := (DefaultPromptBuilder{}).BuildTranslationPrompt(PromptInput{
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
	for _, want := range []string{"Return only the final translated text", "Do not include reasoning", "markdown", "JSON"} {
		if !strings.Contains(req.Prompt, want) && !strings.Contains(req.SystemPrompt, want) {
			t.Fatalf("expected prompt instructions to contain %q, got system=%q prompt=%q", want, req.SystemPrompt, req.Prompt)
		}
	}
	if req.SystemPrompt == "" {
		t.Fatalf("expected default system prompt")
	}
}
