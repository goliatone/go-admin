package helpers

// SimpleTranslator provides basic translation functionality
type SimpleTranslator struct {
	translations map[string]map[string]string
}

// NewSimpleTranslator creates a new translator instance
func NewSimpleTranslator() *SimpleTranslator {
	return &SimpleTranslator{
		translations: make(map[string]map[string]string),
	}
}

// Translate translates a key to the specified locale
// Falls back to English if the locale is not found, or returns the key if no translation exists
func (t *SimpleTranslator) Translate(key, locale string) string {
	if t.translations == nil {
		return key
	}
	if localeMap, ok := t.translations[locale]; ok {
		if translation, ok := localeMap[key]; ok {
			return translation
		}
	}
	// Fallback to English
	if localeMap, ok := t.translations["en"]; ok {
		if translation, ok := localeMap[key]; ok {
			return translation
		}
	}
	return key
}
