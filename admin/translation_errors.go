package admin

import (
	"errors"
	"fmt"
	"strings"
)

// ErrTranslationAlreadyExists marks duplicate translation creation attempts.
var ErrTranslationAlreadyExists = errors.New("translation already exists")

// TranslationAlreadyExistsError reports locale-level duplicate translation attempts.
type TranslationAlreadyExistsError struct {
	Panel              string
	EntityID           string
	SourceLocale       string
	Locale             string
	TranslationGroupID string
}

func (e TranslationAlreadyExistsError) Error() string {
	locale := strings.TrimSpace(e.Locale)
	if locale == "" {
		return ErrTranslationAlreadyExists.Error()
	}
	return fmt.Sprintf("translation already exists for locale %q", locale)
}

func (e TranslationAlreadyExistsError) Unwrap() error {
	return ErrTranslationAlreadyExists
}
