package admin

import "github.com/goliatone/go-admin/admin/internal/helpers"

// Translator resolves i18n keys into localized strings.
// Implementations can wrap go-i18n or any translation engine.
type Translator = helpers.Translator

// NoopTranslator returns the key unchanged.
type NoopTranslator struct{}

func (NoopTranslator) Translate(locale, key string, args ...any) (string, error) {
	_ = locale
	_ = args
	return key, nil
}
