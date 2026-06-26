package config

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDefaultsEnableFullTranslationProfileForReleaseQA(t *testing.T) {
	cfg := Defaults()
	if cfg.Translation.Profile != "full" {
		t.Fatalf("expected default translation profile full, got %q", cfg.Translation.Profile)
	}
	if cfg.Translation.Suggestions.Enabled {
		t.Fatalf("expected translation suggestions disabled by default")
	}
	if cfg.Translation.Suggestions.Provider != "openai" {
		t.Fatalf("expected default suggestion provider openai, got %q", cfg.Translation.Suggestions.Provider)
	}
	if cfg.Site.Fallback.Mode == "" {
		t.Fatalf("expected site fallback mode default to be configured")
	}
	if !cfg.Site.Fallback.AllowRoot {
		t.Fatalf("expected site fallback root handling enabled by default")
	}
	if cfg.Site.InternalOps.HealthzPath == "" || cfg.Site.InternalOps.StatusPath == "" {
		t.Fatalf("expected internal ops defaults to expose healthz/status paths")
	}
	if cfg.ProtectedApp.Enabled {
		t.Fatalf("expected protected app opt-in to be disabled by default")
	}
	if cfg.Navigation.PermissionDeniedMode != "hide" {
		t.Fatalf("expected navigation permission denied mode hide by default, got %q", cfg.Navigation.PermissionDeniedMode)
	}
}

func TestLoadTranslationSuggestionRuntimeConfigFromEnv(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__ENABLED", "true")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__PROVIDER", "openai-compatible")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__BASE_URL", "http://127.0.0.1:1234/v1")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__MODEL", "local-model")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__API_KEY", "local-key")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__ORGANIZATION", "local-org")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__TIMEOUT", "15s")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__MAX_TOKENS", "128")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__MAX_TOKENS_FIELD", "max_completion_tokens")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__EXTRA_BODY_JSON", `{"chat_template_kwargs":{"enable_thinking":false}}`)
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__OPENAI__TEMPERATURE", "0.2")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__PROMPT__SYSTEM_PROMPT", "Use product terminology.")
	t.Setenv("APP_TRANSLATION__SUGGESTIONS__PROMPT__INSTRUCTION", "Return only translated text.")

	cfg, _, err := Load(context.Background(), configPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	suggestions := cfg.Translation.Suggestions
	if !suggestions.Enabled {
		t.Fatalf("expected translation suggestions enabled from env")
	}
	if suggestions.Provider != "openai-compatible" {
		t.Fatalf("expected provider from env, got %q", suggestions.Provider)
	}
	if suggestions.OpenAI.BaseURL != "http://127.0.0.1:1234/v1" {
		t.Fatalf("expected LM Studio base URL, got %q", suggestions.OpenAI.BaseURL)
	}
	if suggestions.OpenAI.Model != "local-model" || suggestions.OpenAI.APIKey != "local-key" {
		t.Fatalf("expected OpenAI model/API key from env, got %+v", suggestions.OpenAI)
	}
	if suggestions.OpenAI.Organization != "local-org" {
		t.Fatalf("expected organization from env, got %q", suggestions.OpenAI.Organization)
	}
	if suggestions.OpenAI.Timeout != 15*time.Second {
		t.Fatalf("expected timeout 15s, got %s", suggestions.OpenAI.Timeout)
	}
	if suggestions.OpenAI.MaxTokens != 128 {
		t.Fatalf("expected max tokens 128, got %d", suggestions.OpenAI.MaxTokens)
	}
	if suggestions.OpenAI.MaxTokensField != "max_completion_tokens" {
		t.Fatalf("expected max tokens field from env, got %q", suggestions.OpenAI.MaxTokensField)
	}
	if suggestions.OpenAI.ExtraBodyJSON != `{"chat_template_kwargs":{"enable_thinking":false}}` {
		t.Fatalf("expected extra body json from env, got %q", suggestions.OpenAI.ExtraBodyJSON)
	}
	if suggestions.OpenAI.Temperature == nil || *suggestions.OpenAI.Temperature != 0.2 {
		t.Fatalf("expected temperature 0.2, got %v", suggestions.OpenAI.Temperature)
	}
	if suggestions.Prompt.SystemPrompt != "Use product terminology." {
		t.Fatalf("expected prompt system prompt from env, got %q", suggestions.Prompt.SystemPrompt)
	}
	if suggestions.Prompt.Instruction != "Return only translated text." {
		t.Fatalf("expected prompt instruction from env, got %q", suggestions.Prompt.Instruction)
	}
}

func TestLoadTranslationSuggestionOpenAIExtraBodyFromConfig(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{
  "translation": {
    "suggestions": {
      "enabled": true,
      "provider": "lm-studio",
      "openai": {
        "base_url": "http://127.0.0.1:1234/v1",
        "model": "local-model",
        "max_tokens": 96,
        "extra_body_json": "{\"chat_template_kwargs\":{\"enable_thinking\":false}}"
      }
    }
  }
}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}

	cfg, _, err := Load(context.Background(), configPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Translation.Suggestions.OpenAI.ExtraBodyJSON != `{"chat_template_kwargs":{"enable_thinking":false}}` {
		t.Fatalf("expected extra_body_json from config, got %q", cfg.Translation.Suggestions.OpenAI.ExtraBodyJSON)
	}
	if cfg.Translation.Suggestions.OpenAI.MaxTokens != 96 {
		t.Fatalf("expected max_tokens from config, got %d", cfg.Translation.Suggestions.OpenAI.MaxTokens)
	}
}

func TestLoadTranslationSuggestionOpenAIRejectsInvalidExtraBodyJSON(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{
  "translation": {
    "suggestions": {
      "openai": {
        "extra_body_json": "[1,2,3]"
      }
    }
  }
}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}

	_, _, err := Load(context.Background(), configPath)
	if err == nil {
		t.Fatalf("expected invalid extra_body_json to fail validation")
	}
}

func TestLoadTranslationSuggestionOpenAIRejectsInvalidMaxTokensField(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{
  "translation": {
    "suggestions": {
      "openai": {
        "max_tokens_field": "bad_field"
      }
    }
  }
}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}

	_, _, err := Load(context.Background(), configPath)
	if err == nil {
		t.Fatalf("expected invalid max_tokens_field to fail validation")
	}
}

func TestLoadProtectedAppRuntimeConfig(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{
  "app": {"name": "go-admin web", "env": "development"},
  "server": {"address": ":8080"},
  "protected_app": {
    "enabled": true,
    "root": "/portal",
    "api_root": "/portal/api"
  }
}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}

	cfg, _, err := Load(context.Background(), configPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if !cfg.ProtectedApp.Enabled {
		t.Fatalf("expected protected app enabled from config file")
	}
	if cfg.ProtectedApp.Root != "/portal" {
		t.Fatalf("expected protected app root /portal, got %q", cfg.ProtectedApp.Root)
	}
	if cfg.ProtectedApp.APIRoot != "/portal/api" {
		t.Fatalf("expected protected app api root /portal/api, got %q", cfg.ProtectedApp.APIRoot)
	}
}

func TestLoadNavigationPermissionDeniedModeRuntimeConfig(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{
  "app": {"name": "go-admin web", "env": "development"},
  "server": {"address": ":8080"},
  "navigation": {
    "permission_denied_mode": "disable"
  }
}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}

	cfg, _, err := Load(context.Background(), configPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Navigation.PermissionDeniedMode != "disable" {
		t.Fatalf("expected navigation permission denied mode disable, got %q", cfg.Navigation.PermissionDeniedMode)
	}
}

func TestLoadTranslationExchangeUIRuntimeConfig(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "app.json")
	if err := os.WriteFile(configPath, []byte(`{
  "app": {"name": "go-admin web", "env": "development"},
  "server": {"address": ":8080"},
  "translation": {
    "profile": "core+exchange",
    "exchange_ui": {
      "source_locale": "en",
      "target_locales": [
        {"code": "bo", "label": "BO"},
        {"code": "zh", "label": "ZH"}
      ],
      "resources": [
        {"id": "Archive_Items", "label": "Archive items"}
      ],
      "default_resources": ["Archive_Items"],
      "default_target_locales": ["bo"],
      "include_source_hash": false,
      "include_examples": false,
      "template": {
        "label": "Download Archive Template",
        "format": "xlsx",
        "href": "/admin/api/archive/template",
        "filename": "archive_translation_template.xlsx"
      },
      "apply": {
        "allow_create_missing": true,
        "allow_source_hash_override": true,
        "continue_on_error": false,
        "dry_run": true
      }
    }
  }
}`), 0o600); err != nil {
		t.Fatalf("write config fixture: %v", err)
	}

	cfg, _, err := Load(context.Background(), configPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	ui := cfg.Translation.ExchangeUI
	if ui.SourceLocale != "en" {
		t.Fatalf("expected source locale en, got %q", ui.SourceLocale)
	}
	if len(ui.TargetLocales) != 2 || ui.TargetLocales[0].Code != "bo" || ui.TargetLocales[1].Label != "ZH" {
		t.Fatalf("expected target locale options decoded, got %+v", ui.TargetLocales)
	}
	if len(ui.Resources) != 1 || ui.Resources[0].ID != "Archive_Items" {
		t.Fatalf("expected resource option decoded with preserved ID, got %+v", ui.Resources)
	}
	if len(ui.DefaultResources) != 1 || ui.DefaultResources[0] != "Archive_Items" {
		t.Fatalf("expected default resources decoded, got %+v", ui.DefaultResources)
	}
	if ui.Template.Format != "xlsx" || ui.Template.Filename != "archive_translation_template.xlsx" {
		t.Fatalf("expected template metadata decoded, got %+v", ui.Template)
	}
	if ui.IncludeSourceHash == nil || *ui.IncludeSourceHash != false {
		t.Fatalf("expected include_source_hash=false decoded")
	}
	if ui.IncludeExamples == nil || *ui.IncludeExamples != false {
		t.Fatalf("expected include_examples=false decoded")
	}
	if ui.Apply.AllowCreateMissing == nil || *ui.Apply.AllowCreateMissing != true {
		t.Fatalf("expected allow_create_missing=true decoded")
	}
	if ui.Apply.AllowSourceHashOverride == nil || *ui.Apply.AllowSourceHashOverride != true {
		t.Fatalf("expected allow_source_hash_override=true decoded")
	}
	if ui.Apply.ContinueOnError == nil || *ui.Apply.ContinueOnError != false {
		t.Fatalf("expected continue_on_error=false decoded")
	}
	if ui.Apply.DryRun == nil || *ui.Apply.DryRun != true {
		t.Fatalf("expected dry_run=true decoded")
	}
}

func TestExampleAppDeclaresTranslationExchangeUIConfig(t *testing.T) {
	cfg, _, err := Load(context.Background(), "app.json")
	if err != nil {
		t.Fatalf("load example app config: %v", err)
	}
	ui := cfg.Translation.ExchangeUI
	if ui.SourceLocale != "en" {
		t.Fatalf("expected source locale en, got %q", ui.SourceLocale)
	}
	if len(ui.SourceLocales) != 1 || ui.SourceLocales[0].Code != "en" {
		t.Fatalf("expected explicit source locale options, got %+v", ui.SourceLocales)
	}
	if len(ui.TargetLocales) != 2 || ui.TargetLocales[0].Code != "es" || ui.TargetLocales[1].Code != "fr" {
		t.Fatalf("expected explicit es/fr target locale options, got %+v", ui.TargetLocales)
	}
	if len(ui.DefaultTargetLocales) != 2 || ui.DefaultTargetLocales[0] != "es" || ui.DefaultTargetLocales[1] != "fr" {
		t.Fatalf("expected explicit default targets, got %+v", ui.DefaultTargetLocales)
	}
	if len(ui.Resources) != 2 || ui.Resources[0].ID != "pages" || ui.Resources[1].ID != "posts" {
		t.Fatalf("expected explicit pages/posts resources, got %+v", ui.Resources)
	}
	if len(ui.DefaultResources) != 2 || ui.DefaultResources[0] != "pages" || ui.DefaultResources[1] != "posts" {
		t.Fatalf("expected explicit default resources, got %+v", ui.DefaultResources)
	}
}
