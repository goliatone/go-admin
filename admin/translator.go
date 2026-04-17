package admin

import "github.com/goliatone/go-admin/admin/internal/helpers"

// Translator resolves i18n keys into localized strings.
// Implementations can wrap go-i18n or any translation engine.
type Translator = helpers.Translator

// CountTranslator resolves pluralized i18n keys into localized strings.
// Implementations can opt into this richer contract without replacing the
// baseline Translator interface.
type CountTranslator interface {
	TranslateCount(locale, key string, count int, args ...any) (string, error)
}

// NoopTranslator returns the key unchanged.
type NoopTranslator struct{}

func (NoopTranslator) Translate(locale, key string, args ...any) (string, error) {
	_ = locale
	_ = args
	return key, nil
}

func (NoopTranslator) TranslateCount(locale, key string, count int, args ...any) (string, error) {
	_ = locale
	_ = count
	_ = args
	return key, nil
}
