package admin

import (
	"context"
	"errors"
	"strings"
)

// ErrTranslationCreateUnsupported indicates the backing provider does not expose
// a first-class translation create command.
var ErrTranslationCreateUnsupported = errors.New("translation create unsupported")

// TranslationCreateInput captures canonical translation creation intent.
type TranslationCreateInput struct {
	SourceID     string         `json:"source_id"`
	Locale       string         `json:"locale"`
	Environment  string         `json:"environment"`
	PolicyEntity string         `json:"policy_entity"`
	ContentType  string         `json:"content_type"`
	Status       string         `json:"status"`
	Path         string         `json:"path"`
	RouteKey     string         `json:"route_key"`
	Metadata     map[string]any `json:"metadata"`
}

// RepositoryTranslationCreator allows repositories to provide a first-class
// translation creation command.
type RepositoryTranslationCreator interface {
	CreateTranslation(ctx context.Context, input TranslationCreateInput) (map[string]any, error)
}

// CMSContentTranslationCreator allows CMS content services/adapters to expose a
// first-class translation creation command.
type CMSContentTranslationCreator interface {
	CreateTranslation(ctx context.Context, input TranslationCreateInput) (*CMSContent, error)
}

func normalizeTranslationCreateInput(input TranslationCreateInput) TranslationCreateInput {
	input.SourceID = strings.TrimSpace(input.SourceID)
	input.Locale = normalizeCreateTranslationLocale(input.Locale)
	input.Environment = strings.TrimSpace(input.Environment)
	input.PolicyEntity = strings.TrimSpace(input.PolicyEntity)
	input.ContentType = strings.TrimSpace(input.ContentType)
	input.Status = strings.TrimSpace(input.Status)
	input.Path = strings.TrimSpace(input.Path)
	input.RouteKey = strings.TrimSpace(input.RouteKey)
	if len(input.Metadata) > 0 {
		input.Metadata = cloneAnyMap(input.Metadata)
	}
	if input.Path == "" {
		input.Path = strings.TrimSpace(toString(input.Metadata["path"]))
	}
	if input.RouteKey == "" {
		input.RouteKey = strings.TrimSpace(toString(input.Metadata["route_key"]))
	}
	if input.Path != "" || input.RouteKey != "" {
		if input.Metadata == nil {
			input.Metadata = map[string]any{}
		}
		if input.Path != "" {
			input.Metadata["path"] = input.Path
		}
		if input.RouteKey != "" {
			input.Metadata["route_key"] = input.RouteKey
		}
	}
	return input
}
