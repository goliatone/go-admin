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
	SourceID     string
	Locale       string
	Environment  string
	PolicyEntity string
	ContentType  string
	Status       string
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
	return input
}
