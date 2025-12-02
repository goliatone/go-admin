package admin

// Translator resolves i18n keys into localized strings.
// Implementations can wrap go-i18n or any translation engine.
type Translator interface {
	Translate(key, locale string) string
}

// NoopTranslator returns the key unchanged.
type NoopTranslator struct{}

func (NoopTranslator) Translate(key, locale string) string {
	_ = locale
	return key
}
