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
	Panel        string `json:"panel"`
	EntityID     string `json:"entity_id"`
	SourceLocale string `json:"source_locale"`
	Locale       string `json:"locale"`
	FamilyID     string `json:"family_id"`
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
